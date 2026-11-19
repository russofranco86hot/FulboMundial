import { Hono } from "hono";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, groups, matches, matchThirdHalf, players, results } from "@/db";
import {
  getSessionUser,
  getCurrentPlayer,
  getPlayerGroups,
  getPlayerGroupRole,
  isGroupAdmin,
} from "@/lib/session";
import {
  getGroupBySlug,
  getGroupByInviteCode,
  getGroupMembers,
  getPendingJoinRequests,
  hasExistingRequest,
  countPendingRequests,
} from "@/lib/groups";
import {
  getPendingNameRequestForPlayer,
  getPendingNameRequestsForGroup,
} from "@/lib/name-requests";
import {
  getCurrentMatch,
  getSelection,
  getStandings,
  getLastFinishedMatch,
  getMatchTeams,
  getRecentMatches,
  getMatchDetails,
  getMatchVotes,
  getMatchNotes,
  getGroupPlayers,
} from "@/lib/queries";
import { getMatchGoals, getGroupTopScorers } from "@/lib/goals";
import { getAdvancedStats } from "@/lib/stats";
import { getPlayerComment, getAllGroupPlayerComments } from "@/lib/player-comments";
import { getMatchWeather } from "@/lib/weather";
import { getMatchPaymentConfig, getMatchPlayerPayments } from "@/lib/payments";
import {
  isGroupPro,
  getGroupProStatus,
  verifyAndActivateMercadoPagoPayment,
} from "@/lib/billing";
import { isSuperAdmin, getSuperAdminDashboardData } from "@/lib/superadmin";

export const pageDataApp = new Hono();

pageDataApp.get("/header", async (c) => {
  const user = await getSessionUser();
  const player = user ? await getCurrentPlayer() : null;
  return c.json({ user, player });
});

pageDataApp.get("/login", async (c) => {
  const user = await getSessionUser();
  const rawCb = c.req.query("callbackUrl");
  const codeParam = c.req.query("code");
  const fallbackCb = codeParam ? `/grupos/unirse?code=${codeParam}` : "/grupos";
  const safeCallbackUrl =
    rawCb && rawCb.startsWith("/") && !rawCb.startsWith("//") ? rawCb : fallbackCb;

  if (user) {
    return c.json({ authenticated: true, redirectTo: safeCallbackUrl });
  }

  let inviteCode: string | null = codeParam ? codeParam.trim().toUpperCase() : null;
  if (!inviteCode && safeCallbackUrl.includes("code=")) {
    try {
      const urlObj = new URL(safeCallbackUrl, "https://fulbomundial.com.ar");
      const cp = urlObj.searchParams.get("code");
      if (cp) inviteCode = cp.trim().toUpperCase();
    } catch {}
  }

  const invitedGroup = inviteCode ? await getGroupByInviteCode(inviteCode) : null;
  return c.json({
    authenticated: false,
    inviteCode,
    invitedGroup: invitedGroup
      ? { id: invitedGroup.id, name: invitedGroup.name, format: invitedGroup.format }
      : null,
  });
});

pageDataApp.get("/grupos", async (c) => {
  const user = await getSessionUser();
  if (!user) {
    return c.json({ user: null, player: null });
  }

  const player = await getCurrentPlayer();
  if (!player) {
    return c.json({ user, player: null });
  }

  const [playerGroups, superAdmin] = await Promise.all([
    getPlayerGroups(),
    isSuperAdmin(),
  ]);

  const groupIds = playerGroups.map((g) => g.id);

  const [commentsResults, openMatchesRows] =
    groupIds.length > 0
      ? await Promise.all([
          Promise.all(
            playerGroups.map(async (g) => {
              try {
                const comment = await getPlayerComment(g.id, player.id, {
                  playerName: player.name,
                  isGoalkeeper: player.isGoalkeeper,
                });
                return {
                  groupId: g.id,
                  groupName: g.name,
                  groupSlug: g.slug,
                  comment,
                };
              } catch {
                return null;
              }
            })
          ),
          db
            .select({
              id: matches.id,
              groupId: matches.groupId,
              matchDate: matches.matchDate,
              status: matches.status,
              capacity: matches.capacity,
              format: matches.format,
            })
            .from(matches)
            .where(and(inArray(matches.groupId, groupIds), sql`${matches.status} <> 'finished'`))
            .orderBy(matches.matchDate),
        ])
      : [[], []];

  const validComments = commentsResults.filter(
    (item): item is { groupId: number; groupName: string; groupSlug: string; comment: string } =>
      Boolean(item && item.comment && item.comment.trim())
  );

  const openMatchByGroup: Record<number, (typeof openMatchesRows)[0]> = {};
  for (const m of openMatchesRows) {
    if (m.groupId && !openMatchByGroup[m.groupId]) {
      openMatchByGroup[m.groupId] = m;
    }
  }

  const enrichedGroups = playerGroups.map((g) => ({
    ...g,
    proActive: isGroupPro(g),
  }));

  return c.json({
    user,
    player,
    superAdmin,
    playerGroups: enrichedGroups,
    validComments,
    openMatchByGroup,
  });
});

pageDataApp.get("/unirse", async (c) => {
  const user = await getSessionUser();
  if (!user) return c.json({ authRequired: true });
  await getCurrentPlayer();
  const cleanCode = (c.req.query("code") || "").trim().toUpperCase();
  const invitedGroup = cleanCode ? await getGroupByInviteCode(cleanCode) : null;
  return c.json({
    authRequired: false,
    invitedGroup: invitedGroup
      ? { id: invitedGroup.id, name: invitedGroup.name, format: invitedGroup.format }
      : null,
  });
});

pageDataApp.get("/perfil", async (c) => {
  const user = await getSessionUser();
  if (!user) return c.json({ authRequired: true });
  const player = await getCurrentPlayer();
  if (!player) return c.json({ authRequired: true });

  const [pendingNameRequest, playerGroups, superAdmin] = await Promise.all([
    getPendingNameRequestForPlayer(player.id),
    getPlayerGroups(),
    isSuperAdmin(),
  ]);

  return c.json({
    authRequired: false,
    user,
    player,
    pendingNameRequest,
    playerGroupsCount: playerGroups.length,
    superAdmin,
  });
});

pageDataApp.get("/superadmin", async (c) => {
  const allowed = await isSuperAdmin();
  if (!allowed) return c.json({ allowed: false });
  const data = await getSuperAdminDashboardData();
  return c.json({ allowed: true, data });
});

pageDataApp.get("/partido/:id", async (c) => {
  const matchId = parseInt(c.req.param("id"), 10);
  if (isNaN(matchId)) return c.json({ notFound: true }, 404);

  const [rows, teamsList, votes, notes, matchGoals, player] = await Promise.all([
    db
      .select({
        id: matches.id,
        groupId: matches.groupId,
        format: matches.format,
        status: matches.status,
        matchDate: matches.matchDate,
        scoreA: results.scoreA,
        scoreB: results.scoreB,
        result: results.result,
        notes: results.notes,
        teamAName: matches.teamAName,
        teamBName: matches.teamBName,
        groupRowId: groups.id,
        groupName: groups.name,
        groupSlug: groups.slug,
        groupTeamAName: groups.teamAName,
        groupTeamBName: groups.teamBName,
      })
      .from(matches)
      .leftJoin(results, eq(matches.id, results.matchId))
      .leftJoin(groups, eq(groups.id, matches.groupId))
      .where(eq(matches.id, matchId))
      .limit(1),
    getMatchTeams(matchId),
    getMatchVotes(matchId),
    getMatchNotes(matchId),
    getMatchGoals(matchId),
    getCurrentPlayer(),
  ]);

  const row = rows[0];
  if (!row) return c.json({ notFound: true }, 404);

  const match = {
    id: row.id,
    groupId: row.groupId,
    format: row.format,
    status: row.status,
    matchDate: row.matchDate,
    scoreA: row.scoreA,
    scoreB: row.scoreB,
    result: row.result,
    notes: row.notes,
    teamAName: row.teamAName,
    teamBName: row.teamBName,
    teams: teamsList,
  };

  const group =
    row.groupRowId !== null
      ? {
          id: row.groupRowId,
          name: row.groupName!,
          slug: row.groupSlug!,
          teamAName: row.groupTeamAName,
          teamBName: row.groupTeamBName,
        }
      : null;

  return c.json({
    notFound: false,
    match,
    group,
    votes,
    notes,
    matchGoals,
    player,
  });
});

// ─── Helper de acceso al grupo ──────────────────────────────────────────────
async function resolveGroupAccess(groupSlug: string) {
  const user = await getSessionUser();
  if (!user) return { authRequired: true as const };

  const group = await getGroupBySlug(groupSlug);
  if (!group) return { notFound: true as const };

  const [player, superAdmin] = await Promise.all([getCurrentPlayer(), isSuperAdmin()]);
  const role = player ? await getPlayerGroupRole(group.id) : null;

  if (!role && !superAdmin) {
    const hasPending = player ? await hasExistingRequest(group.id, player.id) : false;
    return {
      access: hasPending ? ("pending" as const) : ("denied" as const),
      group: { id: group.id, name: group.name, slug: group.slug },
    };
  }

  return {
    access: "granted" as const,
    user,
    player,
    group,
    role,
    isSuperAdmin: superAdmin,
    isReadOnlySuperAdmin: !role && superAdmin,
  };
}

pageDataApp.get("/group/:groupSlug/layout", async (c) => {
  const res = await resolveGroupAccess(c.req.param("groupSlug"));
  return c.json(res);
});

pageDataApp.get("/group/:groupSlug/home", async (c) => {
  const acc = await resolveGroupAccess(c.req.param("groupSlug"));
  if ("authRequired" in acc || "notFound" in acc || acc.access !== "granted") {
    return c.json({ blocked: true });
  }
  const { group, player, isReadOnlySuperAdmin } = acc;
  if (!player) return c.json({ blocked: true });

  const [standings, lastFinished, match] = await Promise.all([
    getStandings(group.id),
    getLastFinishedMatch(group.id),
    getCurrentMatch(group.id),
  ]);

  const topPts = standings[0]?.pts ?? 0;
  const topPlayers = standings.filter((s) => s.pts === topPts && s.pts > 0);
  const playerStanding = standings.find((s) => s.playerId === player.id);
  const rankIndex = standings.findIndex((s) => s.playerId === player.id);
  const playerRank = rankIndex !== -1 ? rankIndex + 1 : undefined;

  const playerComment = await getPlayerComment(group.id, player.id, {
    playerName: player.name,
    isGoalkeeper: player.isGoalkeeper,
    standing: playerStanding,
    rank: playerRank,
    totalRanked: standings.length,
  });

  const proStatus = getGroupProStatus(group);

  if (!match) {
    return c.json({
      group,
      player,
      isReadOnlySuperAdmin,
      proStatus,
      playerComment,
      playerStanding,
      playerRank,
      topPlayers,
      lastFinished,
      match: null,
    });
  }

  const isFinished = match.status === "finished";
  const [selection, currentResult, thirdHalfRows, weather, paymentConfig] = await Promise.all([
    getSelection(match),
    isFinished
      ? db.select().from(results).where(eq(results.matchId, match.id)).limit(1).then((r) => r[0] ?? null)
      : Promise.resolve(null),
    db
      .select({ name: players.name, staying: matchThirdHalf.staying, playerId: players.id })
      .from(matchThirdHalf)
      .innerJoin(players, eq(players.id, matchThirdHalf.playerId))
      .where(eq(matchThirdHalf.matchId, match.id)),
    getMatchWeather(match.matchDate),
    getMatchPaymentConfig(match.id),
  ]);

  const playerPaymentsList = paymentConfig ? await getMatchPlayerPayments(match.id) : [];

  return c.json({
    group,
    player,
    isReadOnlySuperAdmin,
    proStatus,
    playerComment,
    playerStanding,
    playerRank,
    topPlayers,
    lastFinished,
    match,
    selection,
    currentResult,
    thirdHalfRows,
    weather,
    paymentConfig,
    playerPaymentsList,
  });
});

pageDataApp.get("/group/:groupSlug/equipos", async (c) => {
  const acc = await resolveGroupAccess(c.req.param("groupSlug"));
  if ("authRequired" in acc || "notFound" in acc || acc.access !== "granted") {
    return c.json({ blocked: true });
  }
  const { group } = acc;
  const match = await getCurrentMatch(group.id);
  if (!match) return c.json({ group, match: null, allTeams: [] });
  const allTeams = await getMatchTeams(match.id);
  return c.json({ group, match, allTeams });
});

pageDataApp.get("/group/:groupSlug/estadisticas", async (c) => {
  const acc = await resolveGroupAccess(c.req.param("groupSlug"));
  if ("authRequired" in acc || "notFound" in acc || acc.access !== "granted") {
    return c.json({ blocked: true });
  }
  const { group } = acc;
  const proStatus = getGroupProStatus(group);
  const [stats, standings] = await Promise.all([
    getAdvancedStats(group.id),
    getStandings(group.id),
  ]);
  return c.json({ group, proStatus, stats, standings });
});

pageDataApp.get("/group/:groupSlug/historial", async (c) => {
  const acc = await resolveGroupAccess(c.req.param("groupSlug"));
  if ("authRequired" in acc || "notFound" in acc || acc.access !== "granted") {
    return c.json({ blocked: true });
  }
  const { group } = acc;
  const proStatus = getGroupProStatus(group);
  const proActive = proStatus.isPro;
  const [rows, recentMatches, topScorers, isAdmin] = await Promise.all([
    getStandings(group.id),
    getRecentMatches(group.id, proActive ? 30 : 10),
    getGroupTopScorers(group.id),
    isGroupAdmin(group.id),
  ]);
  return c.json({ group, proStatus, rows, recentMatches, topScorers, isAdmin });
});

pageDataApp.get("/group/:groupSlug/historial/:id", async (c) => {
  const acc = await resolveGroupAccess(c.req.param("groupSlug"));
  if ("authRequired" in acc || "notFound" in acc || acc.access !== "granted") {
    return c.json({ blocked: true });
  }
  const { group, player } = acc;
  const matchId = parseInt(c.req.param("id"), 10);
  if (isNaN(matchId)) return c.json({ notFound: true }, 404);

  const match = await getMatchDetails(matchId);
  if (!match) return c.json({ notFound: true }, 404);

  const [notes, votes, matchGoals, isAdmin] = await Promise.all([
    getMatchNotes(matchId),
    getMatchVotes(matchId),
    getMatchGoals(matchId),
    isGroupAdmin(group.id),
  ]);

  return c.json({
    group,
    match,
    notes,
    votes,
    matchGoals,
    player,
    isAdmin,
  });
});

pageDataApp.get("/group/:groupSlug/pro", async (c) => {
  const acc = await resolveGroupAccess(c.req.param("groupSlug"));
  if ("authRequired" in acc || "notFound" in acc || acc.access !== "granted") {
    return c.json({ blocked: true });
  }
  const mpPaymentId = c.req.query("payment_id") || c.req.query("collection_id");
  if (mpPaymentId && mpPaymentId !== "null") {
    try {
      await verifyAndActivateMercadoPagoPayment(mpPaymentId);
    } catch (err) {
      console.warn("[page-data/pro] Error verificando payment_id:", err);
    }
  }
  const group = (await getGroupBySlug(acc.group.slug)) ?? acc.group;
  return c.json({
    group,
    superAdmin: acc.isSuperAdmin,
    proActive: isGroupPro(group),
  });
});

// ─── Admin del Grupo ────────────────────────────────────────────────────────
async function resolveGroupAdminAccess(groupSlug: string) {
  const acc = await resolveGroupAccess(groupSlug);
  if ("authRequired" in acc || "notFound" in acc || acc.access !== "granted") {
    return { allowed: false as const, groupSlug };
  }
  const isAdmin = await isGroupAdmin(acc.group.id);
  if (!isAdmin && !acc.isSuperAdmin) {
    return { allowed: false as const, groupSlug };
  }
  return { allowed: true as const, group: acc.group };
}

pageDataApp.get("/group/:groupSlug/admin/layout", async (c) => {
  const res = await resolveGroupAdminAccess(c.req.param("groupSlug"));
  if (!res.allowed) return c.json({ allowed: false });
  const pendingCount = await countPendingRequests(res.group.id);
  return c.json({ allowed: true, group: res.group, pendingCount });
});

pageDataApp.get("/group/:groupSlug/admin/home", async (c) => {
  const res = await resolveGroupAdminAccess(c.req.param("groupSlug"));
  if (!res.allowed) return c.json({ allowed: false });
  const { group } = res;

  const [allGroupMatches, match, pendingRequests] = await Promise.all([
    db
      .select({
        id: matches.id,
        matchDate: matches.matchDate,
        status: matches.status,
        format: matches.format,
        capacity: matches.capacity,
      })
      .from(matches)
      .where(eq(matches.groupId, group.id))
      .orderBy(desc(matches.matchDate))
      .limit(20),
    getCurrentMatch(group.id),
    countPendingRequests(group.id),
  ]);

  const selection = match ? await getSelection(match) : [];
  return c.json({ allowed: true, group, allGroupMatches, match, selection, pendingRequests });
});

pageDataApp.get("/group/:groupSlug/admin/partido", async (c) => {
  const res = await resolveGroupAdminAccess(c.req.param("groupSlug"));
  if (!res.allowed) return c.json({ allowed: false });
  const { group } = res;
  const matchIdParam = c.req.query("matchId");

  const allGroupMatches = await db
    .select({
      id: matches.id,
      matchDate: matches.matchDate,
      status: matches.status,
      format: matches.format,
      capacity: matches.capacity,
    })
    .from(matches)
    .where(eq(matches.groupId, group.id))
    .orderBy(desc(matches.matchDate))
    .limit(20);

  let match = null;
  if (matchIdParam) {
    match =
      (await db.select().from(matches).where(eq(matches.id, Number(matchIdParam))).limit(1))[0] ??
      null;
  }
  if (!match) {
    match = await getCurrentMatch(group.id);
  }

  if (!match) {
    return c.json({ allowed: true, group, allGroupMatches, match: null });
  }

  const [selection, teamRows, playersRaw, paymentConfig, playerPaymentsList] = await Promise.all([
    getSelection(match),
    getMatchTeams(match.id),
    getGroupPlayers(group.id),
    getMatchPaymentConfig(match.id),
    getMatchPlayerPayments(match.id),
  ]);

  return c.json({
    allowed: true,
    group,
    allGroupMatches,
    match,
    selection,
    teamRows,
    players: playersRaw.filter((p) => !p.isGuest),
    paymentConfig,
    playerPaymentsList,
    appUrl: process.env.NEXTAUTH_URL || process.env.APP_URL || "https://fulbomundial.com.ar",
  });
});

pageDataApp.get("/group/:groupSlug/admin/jugadores", async (c) => {
  const res = await resolveGroupAdminAccess(c.req.param("groupSlug"));
  if (!res.allowed) return c.json({ allowed: false });
  const { group } = res;
  const [members, standings] = await Promise.all([
    getGroupMembers(group.id),
    getStandings(group.id),
  ]);
  return c.json({ allowed: true, group, members, standings });
});

pageDataApp.get("/group/:groupSlug/admin/comentarios", async (c) => {
  const res = await resolveGroupAdminAccess(c.req.param("groupSlug"));
  if (!res.allowed) return c.json({ allowed: false });
  const commentsList = await getAllGroupPlayerComments(res.group.id);
  return c.json({ allowed: true, group: res.group, commentsList });
});

pageDataApp.get("/group/:groupSlug/admin/solicitudes", async (c) => {
  const res = await resolveGroupAdminAccess(c.req.param("groupSlug"));
  if (!res.allowed) return c.json({ allowed: false });
  const { group } = res;
  const [joinRequestsList, nameRequestsList, groupMembersList] = await Promise.all([
    getPendingJoinRequests(group.id),
    getPendingNameRequestsForGroup(group.id),
    getGroupMembers(group.id),
  ]);
  return c.json({
    allowed: true,
    group,
    joinRequestsList,
    nameRequestsList,
    groupMembersList,
  });
});

pageDataApp.get("/group/:groupSlug/admin/resultado", async (c) => {
  const res = await resolveGroupAdminAccess(c.req.param("groupSlug"));
  if (!res.allowed) return c.json({ allowed: false });
  const { group } = res;
  const matchIdParam = c.req.query("matchId");

  const allGroupMatches = await db
    .select({
      id: matches.id,
      matchDate: matches.matchDate,
      status: matches.status,
      format: matches.format,
    })
    .from(matches)
    .where(eq(matches.groupId, group.id))
    .orderBy(desc(matches.matchDate))
    .limit(20);

  let match = null;
  if (matchIdParam) {
    const target = (
      await db.select().from(matches).where(eq(matches.id, Number(matchIdParam))).limit(1)
    )[0];
    if (target && target.groupId === group.id) match = target;
  }
  if (!match) match = await getCurrentMatch(group.id);

  if (!match) {
    return c.json({ allowed: true, group, allGroupMatches, match: null });
  }

  const [teamRows, existing, matchGoalsList, votes] = await Promise.all([
    getMatchTeams(match.id),
    db
      .select()
      .from(results)
      .where(eq(results.matchId, match.id))
      .limit(1)
      .then((r) => r[0] ?? null),
    getMatchGoals(match.id),
    getMatchVotes(match.id),
  ]);

  return c.json({
    allowed: true,
    group,
    allGroupMatches,
    match,
    teamRows,
    existing,
    matchGoalsList,
    votes,
  });
});

pageDataApp.get("/group/:groupSlug/admin/configuracion", async (c) => {
  const res = await resolveGroupAdminAccess(c.req.param("groupSlug"));
  if (!res.allowed) return c.json({ allowed: false });
  return c.json({
    allowed: true,
    group: res.group,
    isPro: isGroupPro(res.group),
  });
});
