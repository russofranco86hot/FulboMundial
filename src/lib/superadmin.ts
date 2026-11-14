import "server-only";
import {
  db,
  groups,
  groupMembers,
  players,
  matches,
  results,
  matchVotes,
  playerPayments,
  matchPayments,
  matchGoals,
  attendanceLog,
  matchNotes,
  matchThirdHalf,
  teams,
  signups,
  groupPlayerComments,
  joinRequests,
  nameChangeRequests,
  subscriptionTransactions,
} from "@/db";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { getCurrentPlayer, getSessionUser } from "./session";
import { isGroupPro } from "./billing";
import { ensureAdminNotifyPreferenceColumn } from "./db-migrations";

const DEFAULT_OWNER_EMAILS = [
  "russofranco86@gmail.com",
  "russofranco86@hotmail.com",
];

/**
 * Determina si el usuario actual es el dueño / SuperAdmin de la plataforma FulboMundial.
 */
export async function isSuperAdmin(): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;

  const envEmails = (process.env.SUPERADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const allowedEmails = new Set([...DEFAULT_OWNER_EMAILS, ...envEmails]);

  if (user.email && allowedEmails.has(user.email.toLowerCase().trim())) {
    return true;
  }

  const player = await getCurrentPlayer();
  if (player) {
    if (player.email && allowedEmails.has(player.email.toLowerCase().trim())) {
      return true;
    }
    // Player ID 2 ('Fran') es el creador original en la base de producción
    if (player.id === 2) {
      return true;
    }
  }

  return false;
}

export async function requireSuperAdmin(): Promise<void> {
  if (!(await isSuperAdmin())) {
    throw new Error("Acceso denegado: se requieren permisos de Dueño (SuperAdmin).");
  }
}

export interface SuperAdminGroupMember {
  playerId: number;
  name: string;
  email: string | null;
  role: string;
  status: string;
  joinedAt: Date | null;
  stars: number;
  isGoalkeeper: boolean;
  preferredPosition: string | null;
}

export interface SuperAdminGroupMatch {
  id: number;
  matchDate: Date;
  status: string;
  format: string;
  scoreA: number | null;
  scoreB: number | null;
  result: string | null;
}

export interface SuperAdminGroupRow {
  id: number;
  name: string;
  slug: string;
  format: string;
  inviteCode: string;
  createdAt: Date;
  isProDb: boolean;
  isWhitelistPro: boolean;
  effectiveIsPro: boolean;
  proPlan: string | null;
  proExpiresAt: Date | null;
  memberCount: number;
  matchCount: number;
  lastMatchDate: Date | null;
  admins: { playerId: number; name: string; email: string | null }[];
  members: SuperAdminGroupMember[];
  matches: SuperAdminGroupMatch[];
}

export interface SuperAdminAllPlayer {
  id: number;
  name: string;
  email: string | null;
  stars: number;
  isGoalkeeper: boolean;
  preferredPosition: string | null;
  createdAt: Date;
  groupNames: string[];
}

export interface SuperAdminRecentMatch {
  id: number;
  groupId: number | null;
  groupName: string;
  groupSlug: string;
  matchDate: Date;
  status: string;
  format: string;
  scoreA: number | null;
  scoreB: number | null;
  result: string | null;
}

export interface SuperAdminDashboardData {
  groups: SuperAdminGroupRow[];
  allPlayers: SuperAdminAllPlayer[];
  recentMatches: SuperAdminRecentMatch[];
  kpis: {
    totalGroups: number;
    proGroupsCount: number;
    freeGroupsCount: number;
    totalPlayers: number;
    totalMatches: number;
  };
}

export async function getSuperAdminDashboardData(): Promise<SuperAdminDashboardData> {
  await requireSuperAdmin();
  await ensureAdminNotifyPreferenceColumn();

  const allGroups = await db.select().from(groups).orderBy(desc(groups.createdAt));

  const memberRows = await db
    .select({
      groupId: groupMembers.groupId,
      playerId: players.id,
      name: players.name,
      email: players.email,
      role: groupMembers.role,
      status: groupMembers.status,
      joinedAt: groupMembers.joinedAt,
      stars: players.stars,
      isGoalkeeper: players.isGoalkeeper,
      preferredPosition: players.preferredPosition,
    })
    .from(groupMembers)
    .innerJoin(players, eq(players.id, groupMembers.playerId));

  const allMatchesRows = await db
    .select({
      id: matches.id,
      groupId: matches.groupId,
      matchDate: matches.matchDate,
      status: matches.status,
      format: matches.format,
      scoreA: results.scoreA,
      scoreB: results.scoreB,
      result: results.result,
    })
    .from(matches)
    .leftJoin(results, eq(matches.id, results.matchId))
    .orderBy(desc(matches.matchDate));

  const allPlayersList = await db
    .select({
      id: players.id,
      name: players.name,
      email: players.email,
      stars: players.stars,
      isGoalkeeper: players.isGoalkeeper,
      preferredPosition: players.preferredPosition,
      createdAt: players.createdAt,
    })
    .from(players)
    .orderBy(desc(players.id));

  const whitelist = new Set(
    (process.env.PRO_WHITELIST_SLUGS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );

  const groupMap = new Map<number, string>(allGroups.map((g) => [g.id, g.name]));
  const playerGroupsMap = new Map<number, string[]>();
  for (const m of memberRows) {
    if (m.status === "active") {
      const gName = groupMap.get(m.groupId);
      if (gName) {
        const list = playerGroupsMap.get(m.playerId) || [];
        list.push(gName);
        playerGroupsMap.set(m.playerId, list);
      }
    }
  }

  const allPlayers: SuperAdminAllPlayer[] = allPlayersList.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    stars: Number(p.stars || 0),
    isGoalkeeper: p.isGoalkeeper,
    preferredPosition: p.preferredPosition,
    createdAt: p.createdAt,
    groupNames: playerGroupsMap.get(p.id) || [],
  }));

  const enrichedGroups: SuperAdminGroupRow[] = allGroups.map((g) => {
    const gMembers = memberRows.filter(
      (m) => m.groupId === g.id && m.status === "active"
    );
    const admins = gMembers
      .filter((m) => m.role === "admin")
      .map((m) => ({
        playerId: m.playerId,
        name: m.name,
        email: m.email,
      }));

    const gMatches = allMatchesRows.filter((m) => m.groupId === g.id);
    const lastMatch = gMatches[0] ?? null;

    const isWhitelistPro = whitelist.has(g.slug.toLowerCase());
    const effectiveIsPro = isGroupPro(g);

    return {
      id: g.id,
      name: g.name,
      slug: g.slug,
      format: g.format,
      inviteCode: g.inviteCode,
      createdAt: g.createdAt,
      isProDb: g.isPro,
      isWhitelistPro,
      effectiveIsPro,
      proPlan: g.proPlan,
      proExpiresAt: g.proExpiresAt,
      memberCount: gMembers.length,
      matchCount: gMatches.length,
      lastMatchDate: lastMatch ? lastMatch.matchDate : null,
      admins,
      members: gMembers.map((m) => ({
        playerId: m.playerId,
        name: m.name,
        email: m.email,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
        stars: Number(m.stars || 0),
        isGoalkeeper: m.isGoalkeeper,
        preferredPosition: m.preferredPosition,
      })),
      matches: gMatches.map((m) => ({
        id: m.id,
        matchDate: m.matchDate,
        status: m.status,
        format: m.format,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        result: m.result,
      })),
    };
  });

  const totalMatches = allMatchesRows.length;
  const proGroupsCount = enrichedGroups.filter((g) => g.effectiveIsPro).length;

  const recentMatches: SuperAdminRecentMatch[] = allMatchesRows.slice(0, 50).map((m) => {
    const grp = allGroups.find((g) => g.id === m.groupId);
    return {
      id: m.id,
      groupId: m.groupId,
      groupName: grp ? grp.name : "Desconocido",
      groupSlug: grp ? grp.slug : "",
      matchDate: m.matchDate,
      status: m.status,
      format: m.format,
      scoreA: m.scoreA,
      scoreB: m.scoreB,
      result: m.result,
    };
  });

  return {
    groups: enrichedGroups,
    allPlayers,
    recentMatches,
    kpis: {
      totalGroups: enrichedGroups.length,
      proGroupsCount,
      freeGroupsCount: enrichedGroups.length - proGroupsCount,
      totalPlayers: allPlayers.length,
      totalMatches,
    },
  };
}

/**
 * Elimina un grupo y limpia todas sus dependencias en cascada de manera segura.
 */
export async function deleteGroupCascade(groupId: number): Promise<{ name: string; slug: string }> {
  await requireSuperAdmin();

  const [targetGroup] = await db
    .select({ id: groups.id, name: groups.name, slug: groups.slug })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!targetGroup) {
    throw new Error(`Grupo #${groupId} no encontrado.`);
  }

  // 1. Partidos pertenecientes al grupo
  const groupMatches = await db
    .select({ id: matches.id })
    .from(matches)
    .where(eq(matches.groupId, groupId));
  const matchIds = groupMatches.map((m) => m.id);

  if (matchIds.length > 0) {
    await db.delete(matchVotes).where(inArray(matchVotes.matchId, matchIds));
    await db.delete(playerPayments).where(inArray(playerPayments.matchId, matchIds));
    await db.delete(matchPayments).where(inArray(matchPayments.matchId, matchIds));
    await db.delete(matchGoals).where(inArray(matchGoals.matchId, matchIds));
    await db.delete(attendanceLog).where(inArray(attendanceLog.matchId, matchIds));
    await db.delete(matchNotes).where(inArray(matchNotes.matchId, matchIds));
    await db.delete(matchThirdHalf).where(inArray(matchThirdHalf.matchId, matchIds));
    await db.delete(teams).where(inArray(teams.matchId, matchIds));
    await db.delete(results).where(inArray(results.matchId, matchIds));
    await db.delete(signups).where(inArray(signups.matchId, matchIds));
    await db.delete(matches).where(inArray(matches.id, matchIds));
  }

  // 2. Tablas asociadas a groups
  await db.delete(groupPlayerComments).where(eq(groupPlayerComments.groupId, groupId));
  await db.delete(joinRequests).where(eq(joinRequests.groupId, groupId));
  await db.delete(nameChangeRequests).where(eq(nameChangeRequests.groupId, groupId));
  await db.delete(subscriptionTransactions).where(eq(subscriptionTransactions.groupId, groupId));
  await db.delete(groupMembers).where(eq(groupMembers.groupId, groupId));

  // 3. Eliminar el grupo
  await db.delete(groups).where(eq(groups.id, groupId));

  return targetGroup;
}
