import "server-only";
import { db, players, groups, matches, teams } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { getStandings } from "@/lib/queries";
import { getAdvancedStats } from "@/lib/stats";
import { getGroupMembers } from "@/lib/groups";

let tableChecked = false;

export async function ensurePlayerCommentsTable() {
  if (tableChecked) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS group_player_comments (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        comment TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        match_id INTEGER REFERENCES matches(id) ON DELETE SET NULL,
        CONSTRAINT group_player_comments_uniq UNIQUE (group_id, player_id)
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS group_player_comments_group_idx ON group_player_comments(group_id)
    `);
    tableChecked = true;
  } catch (err) {
    console.error("Error creating group_player_comments table:", err);
  }
}

export function computeDefaultPlayerComment(params: {
  playerName: string;
  isGoalkeeper: boolean;
  standing?: {
    pts: number;
    won: number;
    drawn: number;
    lost: number;
    gp: number;
    winPct: number;
    badges: string[];
    form: ("W" | "D" | "L")[];
  };
  rank?: number;
  totalRanked?: number;
  winStreak?: number;
  winlessStreak?: number;
}): string {
  const { isGoalkeeper, standing, rank, totalRanked = 10, winStreak = 0, winlessStreak = 0 } = params;

  if (!standing || standing.gp === 0) {
    return "⏳ A la espera de su debut oficial. ¡Pronto llegará el momento de sumar los primeros puntos en la tabla!";
  }

  const { pts, won, drawn, lost, gp, winPct, badges } = standing;

  // 1. Racha de victorias destacada
  if (winStreak >= 3) {
    return `🔥 ¡Viene con una racha de ${winStreak} victorias consecutivas! Confianza por las nubes (${pts} pts).`;
  }

  // 2. Líder del torneo
  if (rank === 1 && pts > 0) {
    return `👑 Puntero absoluto de la tabla con ${pts} pts (${won}G-${drawn}E-${lost}P). El rival a vencer esta fecha.`;
  }

  // 3. Podio
  if (rank && rank <= 3 && pts > 0) {
    return `🥈 En el podio con ${pts} pts (${won} victorias). A tiro de la punta si vuelve a sumar de a tres.`;
  }

  // 4. Talismán (+70% de victorias)
  if (winPct >= 70 && gp >= 4) {
    return `🍀 Talismán del grupo: letal ${winPct}% de efectividad en ${gp} partidos (${pts} pts). Jugar con él es garantía.`;
  }

  // 5. Racha sin victorias
  if (winlessStreak >= 3) {
    return `⚔️ En busca de la revancha: acumula ${winlessStreak} fechas sin ganar. La próxima fecha es la oportunidad de cortar la sequía.`;
  }

  // 6. Asistencia perfecta
  if (badges.includes("🔥")) {
    return `🏟️ Asistencia perfecta en los últimos partidos. Firme en la cancha y corazón del equipo con ${pts} pts.`;
  }

  // 7. Arquero
  if (isGoalkeeper) {
    return `🧤 Muralla bajo los tres palos: acumula ${pts} pts aportando seguridad clave en el fondo.`;
  }

  // 8. Mitad de tabla hacia arriba
  if (rank && rank <= Math.ceil(totalRanked * 0.5)) {
    return `⚡ Mitad alta de la tabla: suma ${pts} pts con ${won} triunfos en ${gp} PJ. Rendimiento sólido y parejo.`;
  }

  // 9. Mitad de tabla hacia abajo
  return `💪 En plena pelea con ${pts} pts (${won}G-${drawn}E-${lost}P). Una victoria en la próxima fecha lo hace dar un gran salto.`;
}

export type PlayerCommentItem = {
  playerId: number;
  name: string;
  stars: string;
  isGoalkeeper: boolean;
  comment: string;
  updatedAt: Date;
  rank?: number;
  pts?: number;
  gp?: number;
  won?: number;
  drawn?: number;
  lost?: number;
};

/**
 * Obtiene el comentario actual para un jugador específico en un grupo.
 * Si no tiene uno guardado, genera uno automáticamente y lo persiste.
 */
export async function getPlayerComment(groupId: number, playerId: number): Promise<string> {
  await ensurePlayerCommentsTable();

  let savedComment: string | undefined;
  try {
    const res = await db.execute(sql`
      SELECT comment FROM group_player_comments
      WHERE group_id = ${groupId} AND player_id = ${playerId}
      LIMIT 1
    `);
    savedComment = (res.rows[0] as { comment?: string } | undefined)?.comment;
  } catch (err) {
    console.warn("Could not read from group_player_comments, using dynamic default:", err);
  }

  if (savedComment) {
    return savedComment;
  }

  // Generar comentario por defecto
  const standings = await getStandings(groupId);
  const advStats = await getAdvancedStats(groupId);

  const idx = standings.findIndex((s) => s.playerId === playerId);
  const st = idx !== -1 ? standings[idx] : undefined;
  const rank = idx !== -1 ? idx + 1 : undefined;

  const playerRow = (
    await db
      .select({ name: players.name, isGoalkeeper: players.isGoalkeeper })
      .from(players)
      .where(eq(players.id, playerId))
      .limit(1)
  )[0];

  const streak = advStats.streaks.find((s) => s.playerId === playerId);
  const winStreak = streak?.type === "win" ? streak.count : 0;
  const winlessStreak = streak?.type === "winless" ? streak.count : 0;

  const comment = computeDefaultPlayerComment({
    playerName: playerRow?.name ?? "Jugador",
    isGoalkeeper: !!playerRow?.isGoalkeeper,
    standing: st,
    rank,
    totalRanked: standings.length,
    winStreak,
    winlessStreak,
  });

  // Guardar en la base de datos
  try {
    await db.execute(sql`
      INSERT INTO group_player_comments (group_id, player_id, comment, updated_at)
      VALUES (${groupId}, ${playerId}, ${comment}, NOW())
      ON CONFLICT (group_id, player_id) DO UPDATE
      SET comment = ${comment}, updated_at = NOW()
    `);
  } catch (e) {
    console.warn("Could not save initial player comment:", e);
  }

  return comment;
}

/**
 * Obtiene todos los comentarios de los miembros activos del grupo (para el panel del admin).
 */
export async function getAllGroupPlayerComments(groupId: number): Promise<PlayerCommentItem[]> {
  await ensurePlayerCommentsTable();

  const members = await getGroupMembers(groupId);
  const standings = await getStandings(groupId);
  const advStats = await getAdvancedStats(groupId);

  const statsMap = new Map(standings.map((s, i) => [s.playerId, { standing: s, rank: i + 1 }]));
  const streakMap = new Map(advStats.streaks.map((s) => [s.playerId, s]));

  let savedRows: { player_id: number; comment: string; updated_at: string }[] = [];
  try {
    const res = await db.execute(sql`
      SELECT player_id, comment, updated_at
      FROM group_player_comments
      WHERE group_id = ${groupId}
    `);
    savedRows = res.rows as { player_id: number; comment: string; updated_at: string }[];
  } catch (err) {
    console.warn("Could not read all group_player_comments:", err);
  }

  const savedMap = new Map(savedRows.map((r) => [Number(r.player_id), r]));

  const result: PlayerCommentItem[] = [];

  for (const m of members) {
    const sInfo = statsMap.get(m.playerId);
    const saved = savedMap.get(m.playerId);

    let comment = saved?.comment;
    let updatedAt = saved?.updated_at ? new Date(saved.updated_at) : new Date();

    if (!comment) {
      const streak = streakMap.get(m.playerId);
      comment = computeDefaultPlayerComment({
        playerName: m.name,
        isGoalkeeper: m.isGoalkeeper,
        standing: sInfo?.standing,
        rank: sInfo?.rank,
        totalRanked: standings.length,
        winStreak: streak?.type === "win" ? streak.count : 0,
        winlessStreak: streak?.type === "winless" ? streak.count : 0,
      });

      // Guardar
      await db.execute(sql`
        INSERT INTO group_player_comments (group_id, player_id, comment, updated_at)
        VALUES (${groupId}, ${m.playerId}, ${comment}, NOW())
        ON CONFLICT (group_id, player_id) DO UPDATE
        SET comment = ${comment}, updated_at = NOW()
      `);
    }

    result.push({
      playerId: m.playerId,
      name: m.name,
      stars: m.stars,
      isGoalkeeper: m.isGoalkeeper,
      comment,
      updatedAt,
      rank: sInfo?.rank,
      pts: sInfo?.standing.pts ?? 0,
      gp: sInfo?.standing.gp ?? 0,
      won: sInfo?.standing.won ?? 0,
      drawn: sInfo?.standing.drawn ?? 0,
      lost: sInfo?.standing.lost ?? 0,
    });
  }

  // Ordenar por ranking de puntos
  return result.sort((a, b) => (b.pts ?? 0) - (a.pts ?? 0) || a.name.localeCompare(b.name));
}

/**
 * Guarda o edita manualmente el comentario de un jugador (acción del administrador).
 */
export async function savePlayerComment(
  groupId: number,
  playerId: number,
  comment: string
) {
  await ensurePlayerCommentsTable();
  try {
    await db.execute(sql`
      INSERT INTO group_player_comments (group_id, player_id, comment, updated_at)
      VALUES (${groupId}, ${playerId}, ${comment}, NOW())
      ON CONFLICT (group_id, player_id) DO UPDATE
      SET comment = ${comment}, updated_at = NOW()
    `);
  } catch (err) {
    console.error("Error saving player comment:", err);
  }
}

/**
 * Regenera automáticamente los comentarios de todos los miembros del grupo
 * tras finalizar un partido (o cuando el admin toca "Regenerar automáticos").
 */
export async function regenerateAllGroupComments(groupId: number, matchId?: number) {
  await ensurePlayerCommentsTable();

  try {
    const members = await getGroupMembers(groupId);
    const standings = await getStandings(groupId);
    const advStats = await getAdvancedStats(groupId);

    const statsMap = new Map(standings.map((s, i) => [s.playerId, { standing: s, rank: i + 1 }]));
    const streakMap = new Map(advStats.streaks.map((s) => [s.playerId, s]));

    for (const m of members) {
      const sInfo = statsMap.get(m.playerId);
      const streak = streakMap.get(m.playerId);

      const comment = computeDefaultPlayerComment({
        playerName: m.name,
        isGoalkeeper: m.isGoalkeeper,
        standing: sInfo?.standing,
        rank: sInfo?.rank,
        totalRanked: standings.length,
        winStreak: streak?.type === "win" ? streak.count : 0,
        winlessStreak: streak?.type === "winless" ? streak.count : 0,
      });

      await db.execute(sql`
        INSERT INTO group_player_comments (group_id, player_id, comment, updated_at, match_id)
        VALUES (${groupId}, ${m.playerId}, ${comment}, NOW(), ${matchId ?? null})
        ON CONFLICT (group_id, player_id) DO UPDATE
        SET comment = ${comment}, updated_at = NOW(), match_id = ${matchId ?? null}
      `);
    }
  } catch (err) {
    console.error("Error regenerating all group comments:", err);
  }
}

