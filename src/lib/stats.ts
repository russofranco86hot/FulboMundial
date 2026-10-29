import "server-only";
import { db, matches, results, teams, players } from "@/db";
import { and, desc, eq, sql } from "drizzle-orm";

export type PairStat = {
  player1: string;
  player2: string;
  matches: number;
  wins: number;
  winPct: number;
};

export type ToxicPairStat = {
  player1: string;
  player2: string;
  matches: number;
  losses: number;
  lossPct: number;
};

export type PlayerLuckStat = {
  playerId: number;
  name: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winPct: number;
  lossPct: number;
};

export type RivalryStat = {
  player1: string;
  player2: string;
  matches: number;
  wins1: number;
  wins2: number;
  draws: number;
};

export type MatchupStat = {
  winner: string;
  loser: string;
  matches: number;
  wins: number;
  winPct: number;
};

export type StreakStat = {
  playerId: number;
  name: string;
  type: "win" | "loss" | "unbeaten" | "winless";
  count: number;
};

export async function getAdvancedStats(groupId?: number) {
  let targetGroupId = groupId;
  if (!targetGroupId) {
    const { groups } = await import("@/db/schema");
    const g = (await db.select({ id: groups.id }).from(groups).where(eq(groups.slug, "futbol-miercoles")).limit(1))[0]
      || (await db.select({ id: groups.id }).from(groups).limit(1))[0];
    if (g) targetGroupId = g.id;
  }

  const whereMatch = targetGroupId
    ? and(eq(matches.groupId, targetGroupId), eq(matches.status, "finished"))
    : eq(matches.status, "finished");

  const allMatches = await db
    .select({
      id: matches.id,
      matchDate: matches.matchDate,
      result: results.result,
    })
    .from(matches)
    .innerJoin(results, eq(matches.id, results.matchId))
    .where(whereMatch)
    .orderBy(desc(matches.matchDate));

  const allTeams = await db
    .select({ matchId: teams.matchId, playerId: teams.playerId, team: teams.team, name: players.name })
    .from(teams)
    .innerJoin(players, eq(players.id, teams.playerId))
    .where(sql`${teams.playerId} IS NOT NULL`);

  // IDs de partidos del grupo (para filtrar teams)
  const groupMatchIds = new Set(allMatches.map((m) => m.id));

  // Build match rosters (solo del grupo)
  const matchRosters: Record<number, { A: {id: number, name: string}[], B: {id: number, name: string}[] }> = {};
  for (const t of allTeams) {
    if (!groupMatchIds.has(t.matchId)) continue;
    if (!matchRosters[t.matchId]) matchRosters[t.matchId] = { A: [], B: [] };
    matchRosters[t.matchId][t.team as "A"|"B"].push({ id: t.playerId!, name: t.name });
  }

  // Últimos 5 partidos del grupo para filtro de inactividad
  const last5Ids = new Set(allMatches.slice(0, 5).map((m) => m.id));

  const chemistry: Record<string, { matches: number, wins: number, p1: string, p2: string }> = {};
  const paternity: Record<string, { matches: number, wins: number, p1: string, p2: string }> = {};
  const rivalPairs: Record<string, { p1: string; p2: string; matches: number; wins1: number; wins2: number; draws: number }> = {};
  const playerHistory: Record<number, { name: string, results: ("W"|"L"|"D")[], last5Count: number }> = {};

  for (const m of allMatches) {
    const roster = matchRosters[m.id];
    if (!roster) continue;

    const processTeam = (team: {id: number, name: string}[], isWinner: boolean, isDraw: boolean) => {
      for (const p of team) {
        if (!playerHistory[p.id]) playerHistory[p.id] = { name: p.name, results: [], last5Count: 0 };
        playerHistory[p.id].results.push(isDraw ? "D" : isWinner ? "W" : "L");
        if (last5Ids.has(m.id)) playerHistory[p.id].last5Count++;
      }

      for (let i = 0; i < team.length; i++) {
        for (let j = i + 1; j < team.length; j++) {
          const p1 = team[i];
          const p2 = team[j];
          const key = p1.id < p2.id ? `${p1.id}-${p2.id}` : `${p2.id}-${p1.id}`;
          if (!chemistry[key]) chemistry[key] = { matches: 0, wins: 0, p1: p1.name, p2: p2.name };
          chemistry[key].matches++;
          if (isWinner && !isDraw) chemistry[key].wins++;
        }
      }
    };

    const teamAWon = m.result === "A";
    const teamBWon = m.result === "B";
    const isDraw = m.result === "draw";

    processTeam(roster.A, teamAWon, isDraw);
    processTeam(roster.B, teamBWon, isDraw);

    for (const pA of roster.A) {
      for (const pB of roster.B) {
        const keyA = `${pA.id}-${pB.id}`;
        if (!paternity[keyA]) paternity[keyA] = { matches: 0, wins: 0, p1: pA.name, p2: pB.name };
        paternity[keyA].matches++;
        if (teamAWon) paternity[keyA].wins++;

        const keyB = `${pB.id}-${pA.id}`;
        if (!paternity[keyB]) paternity[keyB] = { matches: 0, wins: 0, p1: pB.name, p2: pA.name };
        paternity[keyB].matches++;
        if (teamBWon) paternity[keyB].wins++;

        // Duelos cara a cara (El Clásico)
        const isAFirst = pA.id < pB.id;
        const rKey = isAFirst ? `${pA.id}-${pB.id}` : `${pB.id}-${pA.id}`;
        if (!rivalPairs[rKey]) {
          rivalPairs[rKey] = {
            p1: isAFirst ? pA.name : pB.name,
            p2: isAFirst ? pB.name : pA.name,
            matches: 0,
            wins1: 0,
            wins2: 0,
            draws: 0,
          };
        }
        rivalPairs[rKey].matches++;
        if (isDraw) {
          rivalPairs[rKey].draws++;
        } else if (teamAWon) {
          if (isAFirst) rivalPairs[rKey].wins1++;
          else rivalPairs[rKey].wins2++;
        } else if (teamBWon) {
          if (isAFirst) rivalPairs[rKey].wins2++;
          else rivalPairs[rKey].wins1++;
        }
      }
    }
  }

  // Filtrar jugadores inactivos (sin jugar en ninguno de los últimos 5)
  const activePlayerIds = allMatches.length > 0
    ? new Set(
        Object.entries(playerHistory)
          .filter(([, data]) => data.last5Count > 0)
          .map(([id]) => Number(id))
      )
    : null;

  const topChemistry: PairStat[] = Object.entries(chemistry)
    .filter(([key, c]) => {
      if (c.matches < 3) return false;
      if (activePlayerIds) {
        const [id1, id2] = key.split("-").map(Number);
        if (!activePlayerIds.has(id1) || !activePlayerIds.has(id2)) return false;
      }
      return true;
    })
    .map(([, c]) => ({
      player1: c.p1,
      player2: c.p2,
      matches: c.matches,
      wins: c.wins,
      winPct: Math.round((c.wins / c.matches) * 100)
    }))
    .sort((a, b) => b.winPct - a.winPct || b.matches - a.matches)
    .slice(0, 10);

  const topPaternity: MatchupStat[] = Object.values(paternity)
    .filter((p) => p.matches >= 3 && (p.wins / p.matches) >= 0.75)
    .map((p) => ({
      winner: p.p1,
      loser: p.p2,
      matches: p.matches,
      wins: p.wins,
      winPct: Math.round((p.wins / p.matches) * 100)
    }))
    .sort((a, b) => b.winPct - a.winPct || b.matches - a.matches)
    .slice(0, 10);

  const streaks: StreakStat[] = [];
  const playerStatsList: PlayerLuckStat[] = [];

  for (const [id, data] of Object.entries(playerHistory)) {
    // Filtrar inactivos
    if (activePlayerIds && !activePlayerIds.has(Number(id))) continue;

    const res = data.results;
    if (res.length === 0) continue;

    const totalP = res.length;
    const wins = res.filter((r) => r === "W").length;
    const losses = res.filter((r) => r === "L").length;
    const draws = res.filter((r) => r === "D").length;

    if (totalP >= 3) {
      playerStatsList.push({
        playerId: Number(id),
        name: data.name,
        matches: totalP,
        wins,
        losses,
        draws,
        winPct: Math.round((wins / totalP) * 100),
        lossPct: Math.round((losses / totalP) * 100),
      });
    }

    let winStreak = 0;
    for (const r of res) { if (r === "W") winStreak++; else break; }
    if (winStreak >= 3) streaks.push({ playerId: Number(id), name: data.name, type: "win", count: winStreak });

    let winlessStreak = 0;
    for (const r of res) { if (r !== "W") winlessStreak++; else break; }
    if (winlessStreak >= 4) streaks.push({ playerId: Number(id), name: data.name, type: "winless", count: winlessStreak });
  }

  // 1. Amuleto / Talismán: Los que más ganan cuando están en cancha
  const talismans = [...playerStatsList]
    .sort((a, b) => b.winPct - a.winPct || b.wins - a.wins || b.matches - a.matches)
    .slice(0, 6);

  // 2. La Mufa / El Salado: Los que más pierden cuando están en cancha (con humor)
  const mufas = [...playerStatsList]
    .sort((a, b) => b.lossPct - a.lossPct || b.losses - a.losses || b.matches - a.matches)
    .slice(0, 6);

  // 3. Dúo Tóxico (Anti-Química): Parejas que cuando juegan juntas pierden casi siempre
  const toxicDuos: ToxicPairStat[] = Object.entries(chemistry)
    .filter(([key, c]) => {
      if (c.matches < 3) return false;
      if (activePlayerIds) {
        const [id1, id2] = key.split("-").map(Number);
        if (!activePlayerIds.has(id1) || !activePlayerIds.has(id2)) return false;
      }
      const losses = c.matches - c.wins;
      return (losses / c.matches) >= 0.55;
    })
    .map(([, c]) => {
      const losses = c.matches - c.wins;
      return {
        player1: c.p1,
        player2: c.p2,
        matches: c.matches,
        losses,
        lossPct: Math.round((losses / c.matches) * 100),
      };
    })
    .sort((a, b) => b.lossPct - a.lossPct || b.matches - a.matches)
    .slice(0, 6);

  // 4. El Clásico Picante: Parejas con más partidos como rivales directos
  const classicRivals: RivalryStat[] = Object.entries(rivalPairs)
    .filter(([key, r]) => {
      if (r.matches < 3) return false;
      if (activePlayerIds) {
        const [id1, id2] = key.split("-").map(Number);
        if (!activePlayerIds.has(id1) || !activePlayerIds.has(id2)) return false;
      }
      return true;
    })
    .map(([, r]) => ({
      player1: r.p1,
      player2: r.p2,
      matches: r.matches,
      wins1: r.wins1,
      wins2: r.wins2,
      draws: r.draws,
    }))
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 6);

  return {
    topChemistry,
    topPaternity,
    streaks: streaks.sort((a, b) => b.count - a.count),
    talismans,
    mufas,
    toxicDuos,
    classicRivals,
  };
}
