/**
 * lib/groups.ts — helpers de creación y gestión de grupos.
 */
import "server-only";
import { db, groups, groupMembers, joinRequests, players, matches, type Group } from "@/db";
import { eq, and, desc, sql } from "drizzle-orm";

/** Genera un código de invitación alfanumérico de 6 caracteres en mayúsculas. */
export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Convierte un nombre en slug URL-friendly. */
export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/** Asegura que el slug sea único (agrega sufijo numérico si colisiona). */
export async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let attempt = 0;
  while (true) {
    const existing = await db
      .select({ id: groups.id })
      .from(groups)
      .where(eq(groups.slug, slug))
      .limit(1);
    if (!existing[0]) return slug;
    attempt++;
    slug = `${base}-${attempt}`;
  }
}

/** Crea un grupo y agrega al creador como admin. */
export async function createGroup(opts: {
  name: string;
  description?: string;
  format: string;
  defaultCapacity: number;
  defaultDayOfWeek?: number;
  defaultTime?: string;
  creatorPlayerId: number;
}): Promise<Group> {
  const baseSlug = nameToSlug(opts.name);
  const slug = await uniqueSlug(baseSlug);

  // Generar invite code único
  let inviteCode = generateInviteCode();
  let codeOk = false;
  while (!codeOk) {
    const existing = await db
      .select({ id: groups.id })
      .from(groups)
      .where(eq(groups.inviteCode, inviteCode))
      .limit(1);
    if (!existing[0]) codeOk = true;
    else inviteCode = generateInviteCode();
  }

  const [group] = await db
    .insert(groups)
    .values({
      name: opts.name,
      slug,
      description: opts.description,
      format: opts.format,
      defaultCapacity: opts.defaultCapacity,
      defaultDayOfWeek: opts.defaultDayOfWeek,
      defaultTime: opts.defaultTime,
      inviteCode,
      createdBy: opts.creatorPlayerId,
    })
    .returning();

  // Agregar al creador como admin
  await db.insert(groupMembers).values({
    groupId: group.id,
    playerId: opts.creatorPlayerId,
    role: "admin",
    status: "active",
  });

  return group;
}

/** Busca un grupo por slug. */
export async function getGroupBySlug(slug: string): Promise<Group | null> {
  const rows = await db.select().from(groups).where(eq(groups.slug, slug)).limit(1);
  return rows[0] ?? null;
}

/** Busca un grupo por código de invitación. */
export async function getGroupByInviteCode(code: string): Promise<Group | null> {
  const rows = await db
    .select()
    .from(groups)
    .where(eq(groups.inviteCode, code.toUpperCase()))
    .limit(1);
  return rows[0] ?? null;
}

/** Devuelve los miembros activos de un grupo con sus datos de jugador. */
export async function getGroupMembers(groupId: number) {
  return db
    .select({
      memberId: groupMembers.id,
      playerId: players.id,
      name: players.name,
      email: players.email,
      role: groupMembers.role,
      status: groupMembers.status,
      joinedAt: groupMembers.joinedAt,
      priorityOrder: players.priorityOrder,
      isGoalkeeper: players.isGoalkeeper,
      stars: players.stars,
      isHistorico: players.isHistorico,
      googleId: players.googleId,
      preferredPosition: players.preferredPosition,
      preferredFoot: players.preferredFoot,
    })
    .from(groupMembers)
    .innerJoin(players, eq(players.id, groupMembers.playerId))
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.status, "active")));
}

/** Devuelve las solicitudes pendientes de un grupo. */
export async function getPendingJoinRequests(groupId: number) {
  return db
    .select({
      id: joinRequests.id,
      playerId: players.id,
      playerName: players.name,
      playerEmail: players.email,
      message: joinRequests.message,
      requestedAt: joinRequests.requestedAt,
    })
    .from(joinRequests)
    .innerJoin(players, eq(players.id, joinRequests.playerId))
    .where(
      and(
        eq(joinRequests.groupId, groupId),
        eq(joinRequests.status, "pending")
      )
    )
    .orderBy(joinRequests.requestedAt);
}

/** Verifica si el jugador ya tiene una solicitud activa para este grupo. */
export async function hasExistingRequest(
  groupId: number,
  playerId: number
): Promise<boolean> {
  const rows = await db
    .select({ id: joinRequests.id })
    .from(joinRequests)
    .where(
      and(
        eq(joinRequests.groupId, groupId),
        eq(joinRequests.playerId, playerId)
      )
    )
    .limit(1);
  return rows.length > 0;
}

/** Cuenta las solicitudes pendientes de un grupo. */
export async function countPendingRequests(groupId: number): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(joinRequests)
    .where(
      and(
        eq(joinRequests.groupId, groupId),
        eq(joinRequests.status, "pending")
      )
    );
  return rows[0]?.count ?? 0;
}

/** Último partido finalizado de un grupo. */
export async function getGroupLastFinishedMatch(groupId: number) {
  const { results } = await import("@/db/schema");
  return (
    await db
      .select({
        id: matches.id,
        matchDate: matches.matchDate,
        scoreA: results.scoreA,
        scoreB: results.scoreB,
        result: results.result,
        notes: results.notes,
      })
      .from(matches)
      .innerJoin(results, eq(matches.id, results.matchId))
      .where(
        and(
          eq(matches.groupId, groupId),
          eq(matches.status, "finished")
        )
      )
      .orderBy(desc(matches.matchDate))
      .limit(1)
  )[0] ?? null;
}
