import "server-only";
import { cache } from "react";
import { db, matches, signups, players, teams, results, matchVotes, type Match, type Player } from "@/db";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { computeSelection, type SelectionRow } from "./selection";

/** Filas crudas necesarias para resolver una query .execute() en neon-http. */
function rowsOf<T = Record<string, unknown>>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  const r = res as { rows?: T[] };
  return r.rows ?? [];
}

/** Partido vigente de un grupo: el que está abierto/cerrado más próximo; si no, el último. */
export const getCurrentMatch = cache(async (groupId?: number): Promise<Match | null> => {
  let targetGroupId = groupId;
  if (!targetGroupId) {
    const { groups } = await import("@/db/schema");
    const g = (await db.select({ id: groups.id }).from(groups).where(eq(groups.slug, "futbol-miercoles")).limit(1))[0]
      || (await db.select({ id: groups.id }).from(groups).limit(1))[0];
    if (g) targetGroupId = g.id;
  }

  const whereOpen = targetGroupId
    ? and(eq(matches.groupId, targetGroupId), sql`${matches.status} <> 'finished'`)
    : sql`${matches.status} <> 'finished'`;

  const open = await db
    .select()
    .from(matches)
    .where(whereOpen)
    .orderBy(matches.matchDate)
    .limit(1);
  if (open[0]) return open[0];

  const whereLast = targetGroupId
    ? eq(matches.groupId, targetGroupId)
    : undefined;

  const last = await db
    .select()
    .from(matches)
    .where(whereLast)
    .orderBy(desc(matches.matchDate))
    .limit(1);
  return last[0] ?? null;
});

export type SignupWithPlayer = {
  playerId: number;
  priorityOrder: number;
  signupAt: Date;
  manualOrder?: number | null;
  withdrawn: boolean;
  name: string;
  isGoalkeeper: boolean;
  stars: string;
  phone?: string | null;
};

/** Anotados vigentes (no dados de baja) de un partido, con datos del jugador. */
export async function getActiveSignups(matchId: number): Promise<SignupWithPlayer[]> {
  const { ensureAdminNotifyPreferenceColumn } = await import("./db-migrations");
  await ensureAdminNotifyPreferenceColumn();

  try {
    const rows = await db
      .select({
        playerId: signups.playerId,
        priorityOrder: players.priorityOrder,
        signupAt: signups.signupAt,
        manualOrder: signups.manualOrder,
        withdrawn: signups.withdrawn,
        name: players.name,
        isGoalkeeper: players.isGoalkeeper,
        stars: players.stars,
        phone: players.phone,
      })
      .from(signups)
      .innerJoin(players, eq(players.id, signups.playerId))
      .where(and(eq(signups.matchId, matchId), eq(signups.withdrawn, false)));
    return rows as SignupWithPlayer[];
  } catch (err) {
    console.warn("[getActiveSignups] Error querying with manualOrder, fallback without it:", err);
    const rows = await db
      .select({
        playerId: signups.playerId,
        priorityOrder: players.priorityOrder,
        signupAt: signups.signupAt,
        withdrawn: signups.withdrawn,
        name: players.name,
        isGoalkeeper: players.isGoalkeeper,
        stars: players.stars,
        phone: players.phone,
      })
      .from(signups)
      .innerJoin(players, eq(players.id, signups.playerId))
      .where(and(eq(signups.matchId, matchId), eq(signups.withdrawn, false)));
    return rows as SignupWithPlayer[];
  }
}

/** Lista provisional / final: titulares y suplentes por prioridad. */
export async function getSelection(
  match: Match
): Promise<SelectionRow<SignupWithPlayer>[]> {
  const active = await getActiveSignups(match.id);
  return computeSelection(active, match.capacity);
}

/** ¿Está anotado (vigente) este jugador en el partido? */
export async function isSignedUp(matchId: number, playerId: number): Promise<boolean> {
  const rows = await db
    .select({ id: signups.id })
    .from(signups)
    .where(
      and(
        eq(signups.matchId, matchId),
        eq(signups.playerId, playerId),
        eq(signups.withdrawn, false)
      )
    )
    .limit(1);
  return rows.length > 0;
}

export type StandingRow = {
  playerId: number;
  name: string;
  pts: number;
  gp: number;
  won: number;
  drawn: number;
  lost: number;
  winPct: number;
  dropouts: number;
  badges: string[];
  form: ("W"|"D"|"L")[];
};

/**
 * Tabla histórica del grupo: PJ/G/E/P + bajas.
 * Filtra jugadores que no hayan participado en ninguno de los últimos 5 partidos finalizados.
 */
export const getStandings = cache(async (groupId?: number): Promise<StandingRow[]> => {
  let targetGroupId = groupId;
  if (!targetGroupId) {
    const { groups } = await import("@/db/schema");
    const g =
      (await db.select({ id: groups.id }).from(groups).where(eq(groups.slug, "futbol-miercoles")).limit(1))[0] ||
      (await db.select({ id: groups.id }).from(groups).limit(1))[0];
    if (g) targetGroupId = g.id;
  }

  const whereFinished = targetGroupId
    ? and(eq(matches.groupId, targetGroupId), eq(matches.status, "finished"))
    : eq(matches.status, "finished");

  const { groups } = await import("@/db/schema");

  // Ejecutar consultas en paralelo y filtrando equipos únicamente por partidos del grupo
  const [grpRow, res, allMatches, allTeams] = await Promise.all([
    targetGroupId
      ? db
          .select({
            ptsWin: groups.ptsWin,
            ptsDraw: groups.ptsDraw,
            ptsLoss: groups.ptsLoss,
          })
          .from(groups)
          .where(eq(groups.id, targetGroupId))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
    db.execute(sql`
      WITH wld AS (
        SELECT
          t.player_id AS player_id,
          COUNT(*) FILTER (WHERE r.result::text = t.team::text) AS won,
          COUNT(*) FILTER (WHERE r.result::text = 'draw') AS drawn,
          COUNT(*) FILTER (WHERE r.result::text <> 'draw' AND r.result::text <> t.team::text) AS lost,
          COUNT(*) AS gp
        FROM ${teams} t
        JOIN ${results} r ON r.match_id = t.match_id
        JOIN ${matches} m ON m.id = t.match_id
        WHERE t.player_id IS NOT NULL
          AND (${targetGroupId}::int IS NULL OR m.group_id = ${targetGroupId})
        GROUP BY t.player_id
      ),
      drops AS (
        SELECT s.player_id, COUNT(*) AS dropouts
        FROM ${signups} s
        JOIN ${matches} m ON m.id = s.match_id
        WHERE s.withdrawn = true AND (${targetGroupId}::int IS NULL OR m.group_id = ${targetGroupId})
        GROUP BY s.player_id
      )
      SELECT
        p.id AS player_id,
        p.name AS name,
        GREATEST(COALESCE(w.won, 0) + p.adj_won, 0) AS won,
        GREATEST(COALESCE(w.drawn, 0) + p.adj_drawn, 0) AS drawn,
        GREATEST(COALESCE(w.lost, 0) + p.adj_lost, 0) AS lost,
        COALESCE(d.dropouts, 0) AS dropouts,
        p.adj_won,
        p.adj_drawn,
        p.adj_lost
      FROM ${players} p
      LEFT JOIN "group_members" gm ON gm.player_id = p.id AND (${targetGroupId}::int IS NULL OR gm.group_id = ${targetGroupId}) AND gm.status = 'active'
      LEFT JOIN wld w ON w.player_id = p.id
      LEFT JOIN drops d ON d.player_id = p.id
      WHERE p.is_guest = false
        AND (${targetGroupId}::int IS NULL OR gm.player_id IS NOT NULL)
      ORDER BY (COALESCE(w.won, 0) + p.adj_won) DESC, p.name ASC
    `),
    db
      .select({
        id: matches.id,
        matchDate: matches.matchDate,
        result: results.result,
      })
      .from(matches)
      .innerJoin(results, eq(matches.id, results.matchId))
      .where(whereFinished)
      .orderBy(desc(matches.matchDate)),
    db
      .select({ matchId: teams.matchId, playerId: teams.playerId, team: teams.team })
      .from(teams)
      .innerJoin(matches, eq(matches.id, teams.matchId))
      .where(and(sql`${teams.playerId} IS NOT NULL`, whereFinished)),
  ]);

  const ptsWin = grpRow?.ptsWin ?? 3;
  const ptsDraw = grpRow?.ptsDraw ?? 2;
  const ptsLoss = grpRow?.ptsLoss ?? 1;

  const last5 = allMatches.slice(0, 5);

  // Agrupar equipos por partido (solo del grupo)
  const teamsByMatch = allTeams.reduce((acc, t) => {
    if (!acc[t.matchId]) acc[t.matchId] = { A: [], B: [] };
    if (t.playerId) acc[t.matchId][t.team as "A"|"B"].push(t.playerId);
    return acc;
  }, {} as Record<number, { A: number[], B: number[] }>);

  const rows = rowsOf<Record<string, unknown>>(res).map((r) => {
    const pid = Number(r.player_id);
    const won = Number(r.won) || 0;
    const drawn = Number(r.drawn) || 0;
    const lost = Number(r.lost) || 0;
    const gp = won + drawn + lost;
    const winPct = gp > 0 ? Math.round((won / gp) * 100) : 0;

    if (last5.length > 0) {
      const playedInLast5 = last5.some((m) => {
        const mTeams = teamsByMatch[m.id];
        return mTeams && (mTeams.A.includes(pid) || mTeams.B.includes(pid));
      });
      if (!playedInLast5) return null;
    }

    const badges: string[] = [];

    if (allMatches.length >= 4) {
      const playedLast4 = allMatches.slice(0, 4).every((m) => {
        const mTeams = teamsByMatch[m.id];
        return mTeams && (mTeams.A.includes(pid) || mTeams.B.includes(pid));
      });
      if (playedLast4) badges.push("🔥");
    }

    if (gp >= 5 && winPct >= 70) badges.push("🍀");

    const opponentsCount: Record<number, number> = {};
    const matchups: Record<number, "W"|"L"|"D"> = {};
    const form: ("W"|"D"|"L")[] = [];

    for (const m of allMatches) {
      const matchTeams = teamsByMatch[m.id];
      if (!matchTeams) continue;

      const myTeam = matchTeams.A.includes(pid) ? "A" : matchTeams.B.includes(pid) ? "B" : null;
      if (!myTeam) continue;

      const opponentTeam = myTeam === "A" ? "B" : "A";
      const opponents = matchTeams[opponentTeam];
      const matchResult = m.result === myTeam ? "W" : m.result === opponentTeam ? "L" : "D";

      if (form.length < 5) form.push(matchResult);

      for (const opId of opponents) {
        opponentsCount[opId] = (opponentsCount[opId] || 0) + 1;
        if (!matchups[opId]) matchups[opId] = matchResult;
      }
    }

    let biggestRivalId = 0;
    let maxRivalCount = 0;
    for (const [opIdStr, cnt] of Object.entries(opponentsCount)) {
      if (cnt > maxRivalCount) {
        maxRivalCount = cnt;
        biggestRivalId = Number(opIdStr);
      }
    }
    if (biggestRivalId > 0 && matchups[biggestRivalId] === "W") {
      badges.push("⚔️");
    }

    const pts = (won * ptsWin) + (drawn * ptsDraw) + (lost * ptsLoss);

    return {
      playerId: pid,
      name: String(r.name),
      pts,
      gp,
      won,
      drawn,
      lost,
      winPct,
      dropouts: Number(r.dropouts) || 0,
      badges,
      form: form.reverse(),
    };
  });

  return (rows.filter(Boolean) as StandingRow[]).sort(
    (a, b) => b.pts - a.pts || a.name.localeCompare(b.name)
  );
});

/** Equipos cargados para un partido (con nombre del jugador o invitado). */
export async function getMatchTeams(matchId: number) {
  const rows = await db
    .select({
      id: teams.id,
      team: teams.team,
      playerId: teams.playerId,
      guestName: teams.guestName,
      isGuest: teams.isGuest,
      name: players.name,
      stars: players.stars,
      isGoalkeeper: players.isGoalkeeper,
      preferredPosition: players.preferredPosition,
      preferredFoot: players.preferredFoot,
    })
    .from(teams)
    .leftJoin(players, eq(players.id, teams.playerId))
    .where(eq(teams.matchId, matchId));
  return rows
    .filter((r) => (r.name && r.name.trim() !== "") || (r.guestName && r.guestName.trim() !== ""))
    .map((r) => ({
      id: r.id,
      team: r.team,
      playerId: r.playerId,
      name: r.name ?? r.guestName ?? "Invitado",
      stars: Number(r.stars) || 0,
      isGoalkeeper: !!r.isGoalkeeper,
      isGuest: r.isGuest,
      preferredPosition: r.preferredPosition ?? "MED",
      preferredFoot: r.preferredFoot ?? "R",
    }));
}

/** Todos los jugadores miembros activos del grupo, ordenados por prioridad. */
export async function getGroupPlayers(groupId: number): Promise<Player[]> {
  const { groupMembers } = await import("@/db/schema");
  return db
    .select({
      id: players.id,
      name: players.name,
      priorityOrder: players.priorityOrder,
      isHistorico: players.isHistorico,
      isGuest: players.isGuest,
      isGoalkeeper: players.isGoalkeeper,
      stars: players.stars,
      preferredPosition: players.preferredPosition,
      preferredFoot: players.preferredFoot,
      adjWon: players.adjWon,
      adjDrawn: players.adjDrawn,
      adjLost: players.adjLost,
      googleId: players.googleId,
      email: players.email,
      phone: players.phone,
      createdAt: players.createdAt,
    })
    .from(players)
    .innerJoin(groupMembers, and(
      eq(groupMembers.playerId, players.id),
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.status, "active")
    ))
    .where(eq(players.isGuest, false))
    .orderBy(players.priorityOrder, players.name);
}

/** Jugadores miembros del grupo todavía sin vincular a una cuenta de Google. */
export async function getUnclaimedGroupPlayers(groupId: number) {
  const { groupMembers } = await import("@/db/schema");
  return db
    .select({
      id: players.id,
      name: players.name,
      priorityOrder: players.priorityOrder,
      isGoalkeeper: players.isGoalkeeper,
    })
    .from(players)
    .innerJoin(groupMembers, and(
      eq(groupMembers.playerId, players.id),
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.status, "active")
    ))
    .where(and(eq(players.isGuest, false), isNull(players.googleId)))
    .orderBy(players.priorityOrder, players.name);
}

export async function getRecentMatches(groupId?: number, limitN = 5) {
  let targetGroupId = groupId;
  if (!targetGroupId) {
    const { groups } = await import("@/db/schema");
    const g = (await db.select({ id: groups.id }).from(groups).where(eq(groups.slug, "futbol-miercoles")).limit(1))[0]
      || (await db.select({ id: groups.id }).from(groups).limit(1))[0];
    if (g) targetGroupId = g.id;
  }

  const whereFinished = targetGroupId
    ? and(eq(matches.groupId, targetGroupId), eq(matches.status, "finished"))
    : eq(matches.status, "finished");

  const recent = await db
    .select({
      id: matches.id,
      matchDate: matches.matchDate,
      scoreA: results.scoreA,
      scoreB: results.scoreB,
      result: results.result,
      notes: results.notes,
      teamAName: matches.teamAName,
      teamBName: matches.teamBName,
    })
    .from(matches)
    .innerJoin(results, eq(matches.id, results.matchId))
    .where(whereFinished)
    .orderBy(desc(matches.matchDate))
    .limit(limitN);

  if (recent.length === 0) return [];

  const matchIds = recent.map((m) => m.id);

  // Batch fetch de equipos y votos en 2 consultas en lugar de 2*N consultas
  const [allTeamsRows, allVotesRows] = await Promise.all([
    db
      .select({
        id: teams.id,
        matchId: teams.matchId,
        team: teams.team,
        playerId: teams.playerId,
        guestName: teams.guestName,
        isGuest: teams.isGuest,
        name: players.name,
        stars: players.stars,
        isGoalkeeper: players.isGoalkeeper,
        preferredPosition: players.preferredPosition,
        preferredFoot: players.preferredFoot,
      })
      .from(teams)
      .leftJoin(players, eq(players.id, teams.playerId))
      .where(inArray(teams.matchId, matchIds)),
    db
      .select({
        id: matchVotes.id,
        matchId: matchVotes.matchId,
        categoryId: matchVotes.categoryId,
        voterId: matchVotes.voterId,
        candidateId: matchVotes.candidateId,
      })
      .from(matchVotes)
      .where(inArray(matchVotes.matchId, matchIds))
      .catch(() => []),
  ]);

  const teamsByMatch = new Map<number, typeof allTeamsRows>();
  for (const r of allTeamsRows) {
    if (!((r.name && r.name.trim() !== "") || (r.guestName && r.guestName.trim() !== ""))) continue;
    const arr = teamsByMatch.get(r.matchId) ?? [];
    arr.push(r);
    teamsByMatch.set(r.matchId, arr);
  }

  const votesByMatch = new Map<number, typeof allVotesRows>();
  for (const v of allVotesRows) {
    const arr = votesByMatch.get(v.matchId) ?? [];
    arr.push(v);
    votesByMatch.set(v.matchId, arr);
  }

  return recent.map((m) => {
    const rawTeams = teamsByMatch.get(m.id) ?? [];
    const v = votesByMatch.get(m.id) ?? [];

    const voteCounts: Record<string, Record<number, number>> = { mvp: {}, tronco: {}, gol: {} };
    for (const vote of v) {
      if (!voteCounts[vote.categoryId]) voteCounts[vote.categoryId] = {};
      if (vote.candidateId) {
        voteCounts[vote.categoryId][vote.candidateId] = (voteCounts[vote.categoryId][vote.candidateId] || 0) + 1;
      }
    }

    const winners: Record<string, number[]> = { mvp: [], tronco: [], gol: [] };
    for (const category of ["mvp", "tronco", "gol"]) {
      const counts = voteCounts[category];
      if (!counts || Object.keys(counts).length === 0) continue;
      const maxVotes = Math.max(...Object.values(counts));
      if (maxVotes > 0) {
        winners[category] = Object.keys(counts)
          .map(Number)
          .filter((id) => counts[id] === maxVotes);
      }
    }

    const teamsWithAwards = rawTeams.map((r) => {
      const awards: string[] = [];
      if (r.playerId) {
        if (winners.mvp.includes(r.playerId)) awards.push("🥇");
        if (winners.tronco.includes(r.playerId)) awards.push("🪵");
        if (winners.gol.includes(r.playerId)) awards.push("⚽");
      }
      return {
        id: r.id,
        team: r.team,
        playerId: r.playerId,
        name: r.name ?? r.guestName ?? "Invitado",
        stars: Number(r.stars) || 0,
        isGoalkeeper: !!r.isGoalkeeper,
        isGuest: r.isGuest,
        preferredPosition: r.preferredPosition ?? "MED",
        preferredFoot: r.preferredFoot ?? "R",
        awards,
      };
    });

    return { ...m, teams: teamsWithAwards };
  });
}

export async function getMatchDetails(matchId: number) {
  const m = await db
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
    })
    .from(matches)
    .leftJoin(results, eq(matches.id, results.matchId))
    .where(eq(matches.id, matchId))
    .limit(1);

  if (!m[0]) return null;
  const t = await getMatchTeams(matchId);
  return { ...m[0], teams: t };
}

export async function getMatchNotes(matchId: number) {
  try {
    const { matchNotes } = await import("@/db/schema");
    return await db
      .select({
        id: matchNotes.id,
        note: matchNotes.note,
        createdAt: matchNotes.createdAt,
        authorName: players.name,
        authorId: players.id,
      })
      .from(matchNotes)
      .innerJoin(players, eq(players.id, matchNotes.playerId))
      .where(eq(matchNotes.matchId, matchId))
      .orderBy(desc(matchNotes.createdAt));
  } catch (err) {
    console.warn("[getMatchNotes] Error:", err);
    return [];
  }
}

export async function getMatchVotes(matchId: number) {
  try {
    const { matchVotes } = await import("@/db/schema");
    return await db
      .select({
        id: matchVotes.id,
        categoryId: matchVotes.categoryId,
        voterId: matchVotes.voterId,
        candidateId: matchVotes.candidateId,
      })
      .from(matchVotes)
      .where(eq(matchVotes.matchId, matchId));
  } catch (err) {
    console.warn("[getMatchVotes] Error:", err);
    return [];
  }
}

export async function getLastFinishedMatch(groupId?: number) {
  let targetGroupId = groupId;
  if (!targetGroupId) {
    const { groups } = await import("@/db/schema");
    const g = (await db.select({ id: groups.id }).from(groups).where(eq(groups.slug, "futbol-miercoles")).limit(1))[0]
      || (await db.select({ id: groups.id }).from(groups).limit(1))[0];
    if (g) targetGroupId = g.id;
  }

  const whereFinished = targetGroupId
    ? and(eq(matches.groupId, targetGroupId), eq(matches.status, "finished"))
    : eq(matches.status, "finished");

  const last = await db
    .select({
      id: matches.id,
      matchDate: matches.matchDate,
      scoreA: results.scoreA,
      scoreB: results.scoreB,
      result: results.result,
      notes: results.notes,
      teamAName: matches.teamAName,
      teamBName: matches.teamBName,
    })
    .from(matches)
    .innerJoin(results, eq(matches.id, results.matchId))
    .where(whereFinished)
    .orderBy(desc(matches.matchDate))
    .limit(1);

  return last[0] ?? null;
}
