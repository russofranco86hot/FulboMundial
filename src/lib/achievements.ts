import "server-only";
import { pushToAll, pushToPlayer } from "./push";
import { getStandings, type StandingRow } from "./queries";
import { getAdvancedStats } from "./stats";

type FinishMatchParams = {
  matchId: number;
  scoreA: number;
  scoreB: number;
  notes?: string | null;
  oldStandings: StandingRow[];
  oldStats: Awaited<ReturnType<typeof getAdvancedStats>>;
};

/**
 * Notifica a todos los usuarios cuando se cierra/finaliza un partido (con link para ver detalle, nota y votar),
 * y envía notificaciones individuales a los jugadores que lograron hazañas (puntero de la tabla, racha de victorias, insignias).
 */
export async function notifyMatchCompletionAndAchievements({
  matchId,
  scoreA,
  scoreB,
  notes,
  oldStandings,
  oldStats,
}: FinishMatchParams) {
  try {
    // 1. Notificación general a todos los usuarios: resultado, nota y recordatorio de votación
    const notePreview = notes && notes.trim() ? " ya podés leer la crónica oficial" : " ya podés ver el resumen";
    await pushToAll({
      title: "¡Partido finalizado! ⚽",
      body: `Claro ${scoreA} - ${scoreB} Oscuro:${notePreview} y votar a la Figura (MVP), el Tronco y el Mejor Gol 🏆`,
      url: `/historial/${matchId}`,
      tag: `match-finished-${matchId}`,
    });
  } catch (err) {
    console.error("[achievements] Error enviando push general de partido finalizado:", err);
  }

  // 2. Calcular nuevas estadísticas para detectar hazañas
  try {
    const newStandings = await getStandings();
    const newStats = await getAdvancedStats();

    // A) Hazaña: Puntero de la tabla de posiciones
    const oldLeaderId = oldStandings.length > 0 && oldStandings[0].pts > 0 ? oldStandings[0].playerId : null;
    const newLeader = newStandings.length > 0 && newStandings[0].pts > 0 ? newStandings[0] : null;

    if (newLeader && newLeader.playerId !== oldLeaderId) {
      // Puede haber varios empatados en el 1er lugar
      const topPts = newLeader.pts;
      const allTopNewLeaders = newStandings.filter((s) => s.pts === topPts);

      for (const leader of allTopNewLeaders) {
        // Solo notificar si antes no estaba en la cima con esos puntos
        const wasOldLeader = oldStandings.find((s) => s.playerId === leader.playerId && s.pts === topPts);
        if (!wasOldLeader) {
          await pushToPlayer(leader.playerId, {
            title: "¡Sos el nuevo líder del torneo! 👑",
            body: `¡Llegaste a lo más alto de la tabla de posiciones con ${leader.pts} puntos! Felicitaciones.`,
            url: "/historial",
            tag: `achievement-puntero-${leader.playerId}-${matchId}`,
          });
        }
      }
    }

    // B) Hazaña: Nueva racha positiva de victorias (al menos 3 consecutivas o extendida)
    const oldWinStreaks = new Map(
      oldStats.streaks
        .filter((st) => st.type === "win")
        .map((st) => [st.playerId, st.count])
    );

    for (const s of newStats.streaks) {
      if (s.type === "win" && s.count >= 3) {
        const previousCount = oldWinStreaks.get(s.playerId) || 0;
        if (s.count > previousCount) {
          await pushToPlayer(s.playerId, {
            title: "¡Racha encendida! 🔥",
            body: `¡Metiste tu victoria consecutiva número ${s.count}! Estás intratable en la cancha.`,
            url: "/estadisticas",
            tag: `achievement-racha-${s.playerId}-${s.count}`,
          });
        }
      }
    }

    // C) Hazaña: Nuevas insignias desbloqueadas en este partido
    const oldBadgesMap = new Map(oldStandings.map((s) => [s.playerId, new Set(s.badges)]));

    for (const p of newStandings) {
      const prevBadges = oldBadgesMap.get(p.playerId) || new Set<string>();
      for (const badge of p.badges) {
        if (!prevBadges.has(badge)) {
          if (badge === "🍀") {
            await pushToPlayer(p.playerId, {
              title: "¡Desbloqueaste Talismán! 🍀",
              body: `Superaste el 70% de victorias históricas (${p.winPct}% en ${p.gp} PJ). ¡Sos el amuleto del equipo!`,
              url: "/historial",
              tag: `achievement-badge-talisman-${p.playerId}`,
            });
          } else if (badge === "⚔️") {
            await pushToPlayer(p.playerId, {
              title: "¡Ganaste el Clásico! ⚔️",
              body: "Venciste a tu mayor rival en su enfrentamiento más reciente. ¡La paternidad es tuya!",
              url: "/historial",
              tag: `achievement-badge-clasico-${p.playerId}`,
            });
          } else if (badge === "🔥") {
            await pushToPlayer(p.playerId, {
              title: "¡Asistencia Perfecta! 🔥",
              body: "Jugaste los últimos 4 partidos de forma consecutiva. ¡Compromiso total!",
              url: "/historial",
              tag: `achievement-badge-asistencia-${p.playerId}`,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("[achievements] Error procesando hazañas:", err);
  }
}
