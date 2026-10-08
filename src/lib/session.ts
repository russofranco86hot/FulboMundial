import "server-only";
import { auth } from "@/auth";
import { db, players, groupMembers, groups, type Player, type Group } from "@/db";
import { eq, or, and } from "drizzle-orm";

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

/**
 * Resuelve el `Player` vinculado al usuario logueado.
 * Busca primero por google_id; si no, por email (vínculo "blando" hasta que el
 * admin lo confirme). Devuelve null si todavía no está vinculado.
 */
export async function getCurrentPlayer(): Promise<Player | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const conds = [];
  if (user.googleId) conds.push(eq(players.googleId, user.googleId));
  if (user.email) conds.push(eq(players.email, user.email));
  if (conds.length === 0) return null;

  const rows = await db
    .select()
    .from(players)
    .where(conds.length === 1 ? conds[0] : or(...conds))
    .limit(1);

  return rows[0] ?? null;
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
  return role === "admin";
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
