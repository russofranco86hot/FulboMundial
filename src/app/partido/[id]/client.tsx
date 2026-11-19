"use client";

import Link from "next/link";
import { PlusCircle, Trophy, Sparkles, ArrowRight, Users, Award } from "lucide-react";
import { formatArt } from "@/lib/time";
import { MatchSharePoster } from "@/components/match-share-poster";
import { computeVoteLeaders } from "@/lib/vote-leaders";
import { MatchDetailClient } from "@/app/grupos/[groupSlug]/historial/[id]/client-page";
import { useApiData, useRouteParams } from "@/lib/client-api";

type PublicPartidoData = {
  notFound?: boolean;
  match?: {
    id: number;
    groupId: number | null;
    matchDate: string | Date;
    format: string;
    teamAName: string | null;
    teamBName: string | null;
    scoreA: number | null;
    scoreB: number | null;
    notes: string | null;
    teams: {
      id: number;
      team: string;
      playerId: number | null;
      name: string;
      isGoalkeeper: boolean;
      isGuest: boolean;
    }[];
  };
  group?: {
    id: number;
    name: string;
    slug: string;
    teamAName: string | null;
    teamBName: string | null;
  } | null;
  votes?: { id: number; categoryId: string; candidateId: number; voterId: number }[];
  notes?: { id: number; authorName: string; authorId: number; note: string; createdAt: string | Date }[];
  matchGoals?: { id: number; playerId: number; name: string; goals: number; assists: number }[];
  player?: { id: number } | null;
};

export function PublicPartidoClient() {
  const { id } = useRouteParams();
  const matchId = parseInt(id, 10);
  const validId = id && !isNaN(matchId);

  const { data, loading, error } = useApiData<PublicPartidoData>(
    validId ? `/api/page-data/partido/${matchId}` : null
  );

  if (!validId || (loading && !data)) {
    return <div className="pt-12 text-center text-sm text-zinc-500">Cargando ficha del partido...</div>;
  }

  if (error || !data || data.notFound || !data.match) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-center">
        <div className="text-5xl">⚽</div>
        <h1 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">Partido no encontrado</h1>
        <Link href="/" className="btn-primary text-sm">Ir al inicio</Link>
      </div>
    );
  }

  const { match, group, votes = [], notes = [], matchGoals = [], player } = data;
  const teamA = match.teams.filter((t) => t.team === "A");
  const teamB = match.teams.filter((t) => t.team === "B");
  const teamAName = match.teamAName || group?.teamAName || "Claro";
  const teamBName = match.teamBName || group?.teamBName || "Oscuro";
  const scoreA = match.scoreA ?? 0;
  const scoreB = match.scoreB ?? 0;
  const groupName = group?.name || "FulboMundial";
  const groupSlug = group?.slug || "futbol-miercoles";

  const { mvpLeader, burroLeader, golLeader } = computeVoteLeaders(votes, match.teams);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-pitch-600 dark:text-pitch-400">
            <Trophy size={14} /> Ficha Oficial del Partido #{matchId}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-pitch-800 dark:text-zinc-100">
            {groupName}
          </h1>
          <p className="text-xs sm:text-sm text-pitch-900/60 dark:text-zinc-400 capitalize">
            {formatArt(match.matchDate, "EEEE dd/MM/yyyy HH:mm")}
          </p>
        </div>

        {group && (
          <Link
            href={`/grupos/${group.slug}`}
            className="btn-ghost text-xs py-2 px-3.5 rounded-xl font-bold flex items-center gap-1.5"
          >
            <Users size={14} /> Ir al grupo {group.name} →
          </Link>
        )}
      </div>

      <div className="card">
        <MatchSharePoster
          matchId={matchId}
          groupName={groupName}
          groupSlug={groupSlug}
          matchDateFormatted={formatArt(match.matchDate, "EEEE dd/MM/yyyy HH:mm")}
          format={match.format}
          teamAName={teamAName}
          teamBName={teamBName}
          scoreA={scoreA}
          scoreB={scoreB}
          playersA={teamA.map((t) => t.name)}
          playersB={teamB.map((t) => t.name)}
          scorers={matchGoals.map((g) => ({
            name: g.name,
            goals: g.goals,
            assists: g.assists,
          }))}
          mvpLeader={mvpLeader}
          burroLeader={burroLeader}
          golLeader={golLeader}
          showPublicLinkButton={false}
        />
      </div>

      {match.notes && (
        <div className="card space-y-2 bg-gradient-to-br from-pitch-950 via-zinc-900 to-zinc-950 text-white border-pitch-700/40">
          <div className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
            <span>🎙️</span> Crónica Oficial de la Fecha
          </div>
          <p className="text-sm text-zinc-200 whitespace-pre-line leading-relaxed">
            {match.notes}
          </p>
        </div>
      )}

      <MatchDetailClient
        matchId={matchId}
        groupSlug={groupSlug}
        teams={match.teams}
        notes={notes.map((n) => ({ ...n, createdAt: new Date(n.createdAt) }))}
        votes={votes}
        currentUserId={player?.id}
      />

      {!player && (
        <div className="card border-2 border-amber-400/50 bg-amber-50/60 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Award className="text-amber-600 dark:text-amber-400 shrink-0" size={24} />
            <div>
              <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                ¿Jugaste este partido? ¡Entrá a calificar a tus compañeros!
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Iniciá sesión para votar al MVP de la fecha ⭐ y al Burro de la fecha 🫏.
              </p>
            </div>
          </div>
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(`/partido/${matchId}`)}`}
            className="btn-primary py-2.5 px-4 text-xs font-black shrink-0 text-center"
          >
            Iniciar sesión y votar →
          </Link>
        </div>
      )}

      <div className="rounded-3xl border-2 border-emerald-500/50 bg-gradient-to-br from-zinc-950 via-emerald-950 to-zinc-900 text-white p-6 shadow-2xl space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[11px] font-black uppercase tracking-wider">
          <Sparkles size={13} /> ¿Tenés tu propio grupo de fútbol?
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-black">
            Armá tus partidos en FulboMundial.com.ar gratis ⚽
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
            Olvidate del caos en WhatsApp. Lista de confirmados con suplentes automáticos,
            equipos parejos por nivel, tabla histórica, votación de{" "}
            <strong className="text-amber-300">MVP y Burro de la Fecha</strong>, y placas
            virales listas para compartir.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link
            href="/grupos/nuevo"
            className="py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-zinc-950 font-black text-xs sm:text-sm inline-flex items-center gap-2 shadow-lg hover:scale-[1.01] transition-transform"
          >
            <PlusCircle size={17} /> Crear el grupo de mis amigos gratis <ArrowRight size={15} />
          </Link>
          <Link
            href="/"
            className="py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-colors"
          >
            Conocer más sobre FulboMundial
          </Link>
        </div>
      </div>
    </div>
  );
}
