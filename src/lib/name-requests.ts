import "server-only";

import { db, nameChangeRequests, players, groupMembers } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { ensureDbUpgrades } from "./db-migrations";

/**
 * Obtiene la solicitud de cambio de nombre pendiente de un jugador (si existe).
 */
export async function getPendingNameRequestForPlayer(playerId: number) {
  await ensureDbUpgrades();
  const rows = await db
    .select()
    .from(nameChangeRequests)
    .where(
      and(
        eq(nameChangeRequests.playerId, playerId),
        eq(nameChangeRequests.status, "pending")
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Obtiene las solicitudes de cambio de nombre pendientes de jugadores que son miembros activos del grupo.
 */
export async function getPendingNameRequestsForGroup(groupId: number) {
  await ensureDbUpgrades();
  const rows = await db
    .select({
      id: nameChangeRequests.id,
      playerId: nameChangeRequests.playerId,
      currentName: nameChangeRequests.currentName,
      requestedName: nameChangeRequests.requestedName,
      createdAt: nameChangeRequests.createdAt,
      status: nameChangeRequests.status,
      playerEmail: players.email,
      playerName: players.name,
      playerStars: players.stars,
      preferredPosition: players.preferredPosition,
    })
    .from(nameChangeRequests)
    .innerJoin(players, eq(players.id, nameChangeRequests.playerId))
    .innerJoin(groupMembers, eq(groupMembers.playerId, nameChangeRequests.playerId))
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.status, "active"),
        eq(nameChangeRequests.status, "pending")
      )
    )
    .orderBy(nameChangeRequests.createdAt);

  return rows;
}

/**
 * Cuenta las solicitudes de cambio de nombre pendientes para un grupo.
 */
export async function countPendingNameRequests(groupId: number): Promise<number> {
  await ensureDbUpgrades();
  const rows = await db
    .select({ count: sql<number>`count(distinct ${nameChangeRequests.id})` })
    .from(nameChangeRequests)
    .innerJoin(groupMembers, eq(groupMembers.playerId, nameChangeRequests.playerId))
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.status, "active"),
        eq(nameChangeRequests.status, "pending")
      )
    );

  return Number(rows[0]?.count ?? 0);
}
