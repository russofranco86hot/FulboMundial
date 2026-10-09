import "server-only";
import { db, matchGoals, matches, players } from "@/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { ensureDbUpgrades } from "./db-migrations";

export type TopScorer = {
  playerId: number;
  name: string;
  stars: string;
  isGoalkeeper: boolean;
  totalGoals: number;
  totalAssists: number;
  matchesWithGoals: number;
};

export async function getMatchGoals(matchId: number) {
  await ensureDbUpgrades();
  try {
    return await db
      .select({
        id: matchGoals.id,
        playerId: matchGoals.playerId,
        name: players.name,
        goals: matchGoals.goals,
        assists: matchGoals.assists,
      })
      .from(matchGoals)
      .innerJoin(players, eq(players.id, matchGoals.playerId))
      .where(eq(matchGoals.matchId, matchId))
      .orderBy(desc(matchGoals.goals));
  } catch (err) {
    console.warn("Could not get match goals:", err);
    return [];
  }
}

export async function saveMatchGoals(
  matchId: number,
  goalsData: { playerId: number; goals: number; assists: number }[]
) {
  await ensureDbUpgrades();
  // Limpiar goles anteriores del partido para reinsertar actualizados
  await db.delete(matchGoals).where(eq(matchGoals.matchId, matchId));

  for (const item of goalsData) {
    if (item.goals > 0 || item.assists > 0) {
      await db.insert(matchGoals).values({
        matchId,
        playerId: item.playerId,
        goals: item.goals,
        assists: item.assists,
      });
    }
  }
}

export async function getGroupTopScorers(groupId: number, limitN = 15): Promise<TopScorer[]> {
  await ensureDbUpgrades();
  try {
    const res = await db.execute(sql`
      SELECT 
        p.id AS player_id,
        p.name AS name,
        p.stars AS stars,
        p.is_goalkeeper AS is_goalkeeper,
        COALESCE(SUM(mg.goals), 0)::int AS total_goals,
        COALESCE(SUM(mg.assists), 0)::int AS total_assists,
        COUNT(mg.id)::int AS matches_with_goals
      FROM ${matchGoals} mg
      JOIN ${matches} m ON m.id = mg.match_id
      JOIN ${players} p ON p.id = mg.player_id
      WHERE m.group_id = ${groupId}
      GROUP BY p.id, p.name, p.stars, p.is_goalkeeper
      HAVING COALESCE(SUM(mg.goals), 0) > 0 OR COALESCE(SUM(mg.assists), 0) > 0
      ORDER BY total_goals DESC, total_assists DESC, p.name ASC
      LIMIT ${limitN}
    `);

    return (res.rows as any[]).map((r) => ({
      playerId: Number(r.player_id),
      name: String(r.name),
      stars: String(r.stars ?? "3"),
      isGoalkeeper: !!r.is_goalkeeper,
      totalGoals: Number(r.total_goals || 0),
      totalAssists: Number(r.total_assists || 0),
      matchesWithGoals: Number(r.matches_with_goals || 0),
    }));
  } catch (err) {
    console.warn("Could not get group top scorers:", err);
    return [];
  }
}
