import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { db, matches, groups, signups, matchVotes } from "@/db";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { pushToGroupMembers } from "@/lib/push";
import { formatArt } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron de Notificaciones Inteligentes Pre y Post Partido:
 * 1) Pre-partido (24 horas antes): Recordatorio de confirmación de asistencia para evitar bajas a último momento.
 * 2) Día del partido (1 a 6 horas antes): Recordatorio de horario y equipos.
 * 3) Post-partido (dentro de las 18 horas posteriores): Alerta para calificar a los compañeros (MVP y Burro de la fecha).
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const now = new Date();
    const in1Hour = new Date(now.getTime() + 1 * 60 * 60 * 1000);
    const in6Hours = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const in20Hours = new Date(now.getTime() + 20 * 60 * 60 * 1000);
    const in28Hours = new Date(now.getTime() + 28 * 60 * 60 * 1000);
    const ago18Hours = new Date(now.getTime() - 18 * 60 * 60 * 1000);

    let sentPre24h = 0;
    let sentMatchDay = 0;
    let sentPostMatch = 0;
    let sentTrialWarnings = 0;

    // 0) ALERTA DE VENCIMIENTO DE TEMPORADA DE PRUEBA (Faltando 3 días o 1 día)
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const expiringGroups = await db
      .select({
        id: groups.id,
        name: groups.name,
        slug: groups.slug,
        proExpiresAt: groups.proExpiresAt,
        proPlan: groups.proPlan,
      })
      .from(groups)
      .where(
        and(
          eq(groups.isPro, true),
          eq(groups.proPlan, "pro_trial_30d"),
          gte(groups.proExpiresAt, now),
          lte(groups.proExpiresAt, in3Days)
        )
      );

    for (const g of expiringGroups) {
      if (!g.proExpiresAt) continue;
      const diffDays = Math.max(1, Math.ceil((new Date(g.proExpiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      await pushToGroupMembers(g.id, {
        title: `⚠️ ¡Quedan ${diffDays} días de tu Pase Capitán PRO en ${g.name}!`,
        body: `Tu temporada de prueba está por vencer. Cumplido el plazo pasarás al plan gratis. ¡Asegurá el pase para todo el equipo!`,
        url: `/grupos/${g.slug}/pro`,
        tag: `trial-expire-${g.id}`,
      });
      sentTrialWarnings++;
    }

    // 1) PRE-PARTIDO (24hs antes): Partidos abiertos/cerrados entre +20h y +28h
    const upcoming24h = await db
      .select({
        id: matches.id,
        groupId: matches.groupId,
        matchDate: matches.matchDate,
        capacity: matches.capacity,
        groupName: groups.name,
        groupSlug: groups.slug,
      })
      .from(matches)
      .innerJoin(groups, eq(groups.id, matches.groupId))
      .where(
        and(
          sql`${matches.status} <> 'finished'`,
          gte(matches.matchDate, in20Hours),
          lte(matches.matchDate, in28Hours)
        )
      );

    for (const m of upcoming24h) {
      if (!m.groupId) continue;
      const activeCountRows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(signups)
        .where(and(eq(signups.matchId, m.id), eq(signups.withdrawn, false)));
      const signedCount = Number(activeCountRows[0]?.count ?? 0);

      await pushToGroupMembers(m.groupId, {
        title: `⏰ ¡Faltan 24hs para jugar en ${m.groupName}!`,
        body: `Confirmá tu asistencia (${signedCount}/${m.capacity} anotados) para que no falte uno a último momento ⚽`,
        url: `/grupos/${m.groupSlug}`,
        tag: `pre-24h-${m.id}`,
      });
      sentPre24h++;
    }

    // 2) DÍA DE PARTIDO (1h a 6h antes): Partidos abiertos/cerrados hoy
    const upcomingToday = await db
      .select({
        id: matches.id,
        groupId: matches.groupId,
        matchDate: matches.matchDate,
        groupName: groups.name,
        groupSlug: groups.slug,
      })
      .from(matches)
      .innerJoin(groups, eq(groups.id, matches.groupId))
      .where(
        and(
          sql`${matches.status} <> 'finished'`,
          gte(matches.matchDate, in1Hour),
          lte(matches.matchDate, in6Hours)
        )
      );

    for (const m of upcomingToday) {
      if (!m.groupId) continue;
      await pushToGroupMembers(m.groupId, {
        title: `¡Hoy hay fútbol en ${m.groupName}! ⚽`,
        body: `Nos vemos a las ${formatArt(m.matchDate, "HH:mm")}. ¡Mirá la formación y no llegues tarde!`,
        url: `/grupos/${m.groupSlug}/equipos`,
        tag: `match-day-${m.id}`,
      });
      sentMatchDay++;
    }

    // 3) POST-PARTIDO: Partidos finalizados en las últimas 18hs para recordar calificar compañeros
    const recentlyFinished = await db
      .select({
        id: matches.id,
        groupId: matches.groupId,
        matchDate: matches.matchDate,
        groupName: groups.name,
        groupSlug: groups.slug,
      })
      .from(matches)
      .innerJoin(groups, eq(groups.id, matches.groupId))
      .where(
        and(
          eq(matches.status, "finished"),
          gte(matches.matchDate, ago18Hours),
          lte(matches.matchDate, now)
        )
      );

    for (const m of recentlyFinished) {
      if (!m.groupId) continue;
      const voteRows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(matchVotes)
        .where(eq(matchVotes.matchId, m.id));
      const votesCount = Number(voteRows[0]?.count ?? 0);

      if (votesCount < 6) {
        await pushToGroupMembers(m.groupId, {
          title: `🗳️ ¡Calificá a tus compañeros de ${m.groupName}!`,
          body: `Entrá a votar quién fue el MVP de la fecha ⭐ y el Burro de la fecha 🫏.`,
          url: `/partido/${m.id}`,
          tag: `post-vote-${m.id}`,
        });
        sentPostMatch++;
      }
    }

    return NextResponse.json({
      ok: true,
      sentTrialWarnings,
      sentPre24h,
      sentMatchDay,
      sentPostMatch,
    });
  } catch (e) {
    console.error("[cron/match-reminder]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
