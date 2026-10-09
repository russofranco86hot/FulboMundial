import "server-only";
import { db, matches, signups, players, teams, results, type Match, type Player } from "@/db";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { computeSelection, type SelectionRow } from "./selection";

/** Filas crudas necesarias para resolver una query .execute() en neon-http. */
function rowsOf<T = Record<string, unknown>>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  const r = res as { rows?: T[] };
  return r.rows ?? [];
}

/** Partido vigente de un grupo: el que está abierto/cerrado más próximo; si no, el último. */
export async function getCurrentMatch(groupId?: number): Promise<Match | null> {
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
}

export type SignupWithPlayer = {
  playerId: number;
  priorityOrder: number;
  signupAt: Date;
  withdrawn: boolean;
  name: string;
  isGoalkeeper: boolean;
  stars: string;
  phone?: string | null;
};

/** Anotados vigentes (no dados de baja) de un partido, con datos del jugador. */
export async function getActiveSignups(matchId: number): Promise<SignupWithPlayer[]> {
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
export async function getStandings(groupId?: number): Promise<StandingRow[]> {
  let targetGroupId = groupId;
  if (!targetGroupId) {
    const { groups } = await import("@/db/schema");
    const g = (await db.select({ id: groups.id }).from(groups).where(eq(groups.slug, "futbol-miercoles")).limit(1))[0]
      || (await db.select({ id: groups.id }).from(groups).limit(1))[0];
    if (g) targetGroupId = g.id;
  }

  // 1. Obtener la tabla base (estadísticas raw) — solo miembros del grupo
  const res = await db.execute(sql`
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
  `);

  // 2. Últimos 5 partidos finalizados del grupo
  const whereFinished = targetGroupId
    ? and(eq(matches.groupId, targetGroupId), eq(matches.status, "finished"))
    : eq(matches.status, "finished");

  const last5 = await db
    .select({
      id: matches.id,
      matchDate: matches.matchDate,
      result: results.result,
    })
    .from(matches)
    .innerJoin(results, eq(matches.id, results.matchId))
    .where(whereFinished)
    .orderBy(desc(matches.matchDate))
    .limit(5);

  // 3. Todos los partidos finalizados del grupo (para badges y form)
  const allMatches = await db
    .select({
      id: matches.id,
      matchDate: matches.matchDate,
      result: results.result,
    })
    .from(matches)
    .innerJoin(results, eq(matches.id, results.matchId))
    .where(whereFinished)
    .orderBy(desc(matches.matchDate));

  const allTeams = await db
    .select({ matchId: teams.matchId, playerId: teams.playerId, team: teams.team })
    .from(teams)
    .where(sql`${teams.playerId} IS NOT NULL`);

  // Agrupar equipos por partido
  const teamsByMatch = allTeams.reduce((acc, t) => {
    if (!acc[t.matchId]) acc[t.matchId] = { A: [], B: [] };
    if (t.playerId) acc[t.matchId][t.team as "A"|"B"].push(t.playerId);
    return acc;
  }, {} as Record<number, { A: number[], B: number[] }>);

  // IDs de los últimos 5 partidos
  const last5Ids = new Set(last5.map((m) => m.id));

  const rows = rowsOf<Record<string, unknown>>(res).map((r) => {
    const pid = Number(r.player_id);
    const won = Number(r.won) || 0;
    const drawn = Number(r.drawn) || 0;
    const lost = Number(r.lost) || 0;
    const gp = won + drawn + lost;
    const winPct = gp > 0 ? Math.round((won / gp) * 100) : 0;

    // Filtro de inactividad: si hay partidos finalizados y el jugador no participó
    // en ninguno de los últimos 5 (o de los que haya hasta 5), se oculta de la tabla.
    // Si vuelve a jugar en un futuro partido, reaparece con todo su histórico.
    if (last5.length > 0) {
      const playedInLast5 = last5.some((m) => {
        const mTeams = teamsByMatch[m.id];
        return mTeams && (mTeams.A.includes(pid) || mTeams.B.includes(pid));
      });
      if (!playedInLast5) return null; // no participó en ninguno de los últimos 5
    }

    const badges: string[] = [];

    // 🔥 Asistencia Perfecta: jugó los últimos 4 partidos
    if (allMatches.length >= 4) {
      const playedLast4 = allMatches.slice(0, 4).every((m) => {
        const mTeams = teamsByMatch[m.id];
        return mTeams && (mTeams.A.includes(pid) || mTeams.B.includes(pid));
      });
      if (playedLast4) badges.push("🔥");
    }

    // 🍀 Talismán: WinPct > 70% con al menos 5 partidos
    if (gp >= 5 && winPct >= 70) badges.push("🍀");

    // ⚔️ Clásico
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

    if (Object.keys(opponentsCount).length > 0) {
      const biggestRivalId = Object.entries(opponentsCount)
        .sort((a, b) => b[1] - a[1])[0][0];
      if (matchups[Number(biggestRivalId)] === "W") badges.push("⚔️");
    }

    const pts = (won * 3) + (drawn * 2) + (lost * 1);

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

  // Filtrar nulls (inactivos) y ordenar
  return (rows.filter(Boolean) as StandingRow[]).sort(
    (a, b) => b.pts - a.pts || a.name.localeCompare(b.name)
  );
}

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
  return rows.map((r) => ({
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
    })
    .from(matches)
    .innerJoin(results, eq(matches.id, results.matchId))
    .where(whereFinished)
    .orderBy(desc(matches.matchDate))
    .limit(limitN);

  const withTeams = await Promise.all(
    recent.map(async (m) => {
      const t = await getMatchTeams(m.id);
      const v = await getMatchVotes(m.id);

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

      const teamsWithAwards = t.map((player) => {
        const awards: string[] = [];
        if (player.playerId) {
          if (winners.mvp.includes(player.playerId)) awards.push("🥇");
          if (winners.tronco.includes(player.playerId)) awards.push("🪵");
          if (winners.gol.includes(player.playerId)) awards.push("⚽");
        }
        return { ...player, awards };
      });

      return { ...m, teams: teamsWithAwards };
    })
  );
  return withTeams;
}

export async function getMatchDetails(matchId: number) {
  const m = await db
    .select({
      id: matches.id,
      matchDate: matches.matchDate,
      scoreA: results.scoreA,
      scoreB: results.scoreB,
      result: results.result,
      notes: results.notes,
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
  const { matchNotes } = await import("@/db/schema");
  return db
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
}

export async function getMatchVotes(matchId: number) {
  const { matchVotes } = await import("@/db/schema");
  return db
    .select({
      id: matchVotes.id,
      categoryId: matchVotes.categoryId,
      voterId: matchVotes.voterId,
      candidateId: matchVotes.candidateId,
    })
    .from(matchVotes)
    .where(eq(matchVotes.matchId, matchId));
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
    })
    .from(matches)
    .innerJoin(results, eq(matches.id, results.matchId))
    .where(whereFinished)
    .orderBy(desc(matches.matchDate))
    .limit(1);

  return last[0] ?? null;
}
