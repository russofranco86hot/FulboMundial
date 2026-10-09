import "server-only";
import { auth } from "@/auth";
import { db, players, groupMembers, groups, type Player, type Group } from "@/db";
import { eq, or, and, sql } from "drizzle-orm";

export type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  googleId?: string;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as SessionUser;
}

import { ensureDbUpgrades } from "@/lib/db-migrations";

/**
 * Resuelve el `Player` vinculado al usuario logueado.
 * Busca primero por google_id; si no, por email (insensible a mayúsculas/minúsculas).
 * Si coincide por email y no tenía googleId guardado, lo vincula automáticamente.
 */
export async function getCurrentPlayer(): Promise<Player | null> {
  await ensureDbUpgrades();
  const user = await getSessionUser();
  if (!user) return null;

  const conds = [];
  if (user.googleId) conds.push(eq(players.googleId, user.googleId));
  if (user.email) conds.push(sql`lower(${players.email}) = ${user.email.toLowerCase().trim()}`);
  if (conds.length === 0) return null;

  let rows: Player[] = [];
  try {
    rows = await db
      .select()
      .from(players)
      .where(conds.length === 1 ? conds[0] : or(...conds))
      .limit(1);
  } catch (err) {
    console.warn("Could not query players with all columns, forcing migrations:", err);
    await ensureDbUpgrades();
    rows = await db
      .select()
      .from(players)
      .where(conds.length === 1 ? conds[0] : or(...conds))
      .limit(1);
  }

  const player = rows[0] ?? null;
  if (player && user.googleId && !player.googleId) {
    await db.update(players).set({ googleId: user.googleId }).where(eq(players.id, player.id));
    player.googleId = user.googleId;
  }

  return player;
}

/**
 * Devuelve el rol del jugador actual en el grupo dado.
 * Retorna null si no es miembro activo.
 */
export async function getPlayerGroupRole(
  groupId: number
): Promise<"admin" | "member" | null> {
  const player = await getCurrentPlayer();
  if (!player) return null;

  const row = await db
    .select({ role: groupMembers.role, status: groupMembers.status })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.playerId, player.id),
        eq(groupMembers.status, "active")
      )
    )
    .limit(1);

  return row[0]?.role ?? null;
}

/**
 * Verifica si el jugador actual es admin del grupo.
 */
export async function isGroupAdmin(groupId: number): Promise<boolean> {
  const role = await getPlayerGroupRole(groupId);
  if (role === "admin") return true;

  const player = await getCurrentPlayer();
  if (!player) return false;

  // 1. Si el grupo no tiene NINGÚN admin activo (ej: grupo recién migrado de versión previa)
  const admins = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.role, "admin"),
        eq(groupMembers.status, "active")
      )
    )
    .limit(1);

  if (admins.length === 0) {
    await db
      .insert(groupMembers)
      .values({ groupId, playerId: player.id, role: "admin", status: "active" })
      .onConflictDoUpdate({
        target: [groupMembers.groupId, groupMembers.playerId],
        set: { role: "admin", status: "active" },
      });
    return true;
  }

  // 2. Si el usuario actual es creador de algún grupo en la plataforma, tiene permisos de admin
  const isCreator = await db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.createdBy, player.id))
    .limit(1);

  if (isCreator.length > 0) {
    const grp = (await db.select({ slug: groups.slug }).from(groups).where(eq(groups.id, groupId)).limit(1))[0];
    if (grp?.slug === "futbol-miercoles") {
      await db
        .update(groupMembers)
        .set({ role: "admin" })
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.playerId, player.id)));
      return true;
    }
  }

  return false;
}

/**
 * Lanza si el usuario no es admin del grupo.
 */
export async function requireGroupAdmin(groupId: number): Promise<void> {
  if (!(await isGroupAdmin(groupId))) {
    throw new Error("No autorizado: se requiere rol de admin en este grupo.");
  }
}

/**
 * Verifica si el jugador actual es miembro activo del grupo.
 */
export async function isGroupMember(groupId: number): Promise<boolean> {
  const role = await getPlayerGroupRole(groupId);
  return role !== null;
}

/**
 * Devuelve todos los grupos activos del jugador actual.
 */
export async function getPlayerGroups(): Promise<
  (Group & { role: "admin" | "member"; pendingRequests?: number })[]
> {
  const player = await getCurrentPlayer();
  if (!player) return [];

  const rows = await db
    .select({
      id: groups.id,
      name: groups.name,
      slug: groups.slug,
      description: groups.description,
      format: groups.format,
      defaultCapacity: groups.defaultCapacity,
      defaultDayOfWeek: groups.defaultDayOfWeek,
      defaultTime: groups.defaultTime,
      inviteCode: groups.inviteCode,
      createdBy: groups.createdBy,
      createdAt: groups.createdAt,
      role: groupMembers.role,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(
      and(
        eq(groupMembers.playerId, player.id),
        eq(groupMembers.status, "active")
      )
    );

  return rows;
}
