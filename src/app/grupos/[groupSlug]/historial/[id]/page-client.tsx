"use client";

import Link from "next/link";
import { ArrowLeft, Edit3 } from "lucide-react";
import { formatArt } from "@/lib/time";
import { MatchDetailClient } from "./client-page";
import { AIChronicleCard } from "@/components/ai-chronicle-card";
import { MatchSharePoster } from "@/components/match-share-poster";
import { computeVoteLeaders } from "@/lib/vote-leaders";
import { useApiData, useRouteParams } from "@/lib/client-api";

type HistorialDetailData = {
  blocked?: boolean;
  notFound?: boolean;
  group: { id: number; name: string; slug: string; teamAName: string | null; teamBName: string | null };
  match: {
    id: number;
    matchDate: string | Date;
    format: string;
    teamAName: string | null;
    teamBName: string | null;
    scoreA: number | null;
    scoreB: number | null;
    notes: string | null;
    teams: { id: number; team: string; playerId: number | null; name: string; isGoalkeeper: boolean; isGuest: boolean }[];
  };
  notes: { id: number; authorName: string; authorId: number; note: string; createdAt: string | Date }[];
  votes: { id: number; categoryId: string; candidateId: number; voterId: number }[];
  matchGoals: { id: number; playerId: number; name: string; goals: number; assists: number }[];
  player: { id: number } | null;
  isAdmin: boolean;
};

export function GroupMatchDetailPageClient() {
  const { groupSlug, id } = useRouteParams();
  const matchId = parseInt(id, 10);
  const valid = Boolean(groupSlug && id && !isNaN(matchId));

  const { data, loading, error } = useApiData<HistorialDetailData>(
    valid ? `/api/page-data/group/${encodeURIComponent(groupSlug)}/historial/${matchId}` : null
  );

  if (!valid || (loading && !data)) {
    return <div className="pt-8 text-center text-sm text-zinc-500">Cargando detalle del partido...</div>;
  }
  if (!data || data.blocked) return null;
  if (error || data.notFound || !data.match) {
    return (
      <div className="card text-center py-8 space-y-3">
        <p className="font-bold">Partido no encontrado.</p>
        <Link href={`/grupos/${groupSlug}/historial`} className="btn-primary text-xs">
          Volver al historial
        </Link>
      </div>
    );
  }

  const { group, match, notes, votes, matchGoals, player, isAdmin } = data;
  const teamA = match.teams.filter((t) => t.team === "A");
  const teamB = match.teams.filter((t) => t.team === "B");

  const scoreA = match.scoreA ?? 0;
  const scoreB = match.scoreB ?? 0;
  const hasResult = match.scoreA !== null && match.scoreB !== null;
  const isWinnerA = hasResult && scoreA > scoreB;
  const isWinnerB = hasResult && scoreB > scoreA;
  const isDraw = hasResult && scoreA === scoreB;

  const teamAName = match.teamAName || group.teamAName || "Claro";
  const teamBName = match.teamBName || group.teamBName || "Oscuro";
  const { mvpLeader, burroLeader, golLeader } = computeVoteLeaders(votes, match.teams);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 flex-wrap">
        <Link
          href={`/grupos/${groupSlug}/historial`}
          className="btn-ghost p-2.5 rounded-full hover:bg-pitch-100/50 transition-colors group"
        >
          <ArrowLeft size={20} className="text-pitch-600 group-hover:-translate-x-1 transition-transform" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-pitch-700 dark:text-zinc-100">Detalles del Partido</h1>
          <p className="text-sm text-pitch-900/60 dark:text-zinc-400 mt-1 capitalize">
            {formatArt(match.matchDate, "EEEE dd/MM/yyyy HH:mm")}
          </p>
        </div>
        {isAdmin && (
          <Link
            href={`/grupos/${groupSlug}/admin/resultado?matchId=${matchId}`}
            className="btn-primary ml-auto text-xs py-2 px-3.5 font-bold shadow-glow-green flex items-center gap-1.5"
          >
            <Edit3 size={14} /> Editar resultado / equipos
          </Link>
        )}
      </div>

      <div className="card space-y-4">
        <div className="flex justify-between items-center px-4 py-6 bg-pitch-50/80 dark:bg-zinc-800/50 rounded-2xl">
          <div className="text-center flex-1 flex flex-col items-center">
            <h3 className="font-bold text-pitch-700 dark:text-pitch-400 mb-1">{teamAName}</h3>
            <span className={`text-5xl font-black ${isWinnerA ? "text-pitch-600" : "text-zinc-700 dark:text-zinc-300"}`}>
              {match.scoreA}
            </span>
            {isWinnerA && <span className="mt-2 chip bg-pitch-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">Ganó</span>}
            {isDraw && <span className="mt-2 chip bg-zinc-400 text-white text-xs px-2 py-0.5 rounded-full font-bold">Empate</span>}
          </div>
          <div className="text-center text-pitch-900/30 dark:text-zinc-600 font-black text-2xl px-4">-</div>
          <div className="text-center flex-1 flex flex-col items-center">
            <h3 className="font-bold text-pitch-700 dark:text-blue-400 mb-1">{teamBName}</h3>
            <span className={`text-5xl font-black ${isWinnerB ? "text-pitch-600" : "text-zinc-700 dark:text-zinc-300"}`}>
              {match.scoreB}
            </span>
            {isWinnerB && <span className="mt-2 chip bg-pitch-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">Ganó</span>}
            {isDraw && <span className="mt-2 chip bg-zinc-400 text-white text-xs px-2 py-0.5 rounded-full font-bold">Empate</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm px-2">
          <div>
            <ul className="text-pitch-900/70 dark:text-zinc-400 space-y-1.5 font-medium">
              {teamA.map((t) => (
                <li key={t.id} className="truncate">
                  {t.name}
                </li>
              ))}
            </ul>
          </div>
          <div className="text-right">
            <ul className="text-pitch-900/70 dark:text-zinc-400 space-y-1.5 font-medium">
              {teamB.map((t) => (
                <li key={t.id} className="truncate">
                  {t.name}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-2">
          <AIChronicleCard
            initialChronicle={match.notes ?? undefined}
            inputData={{
              matchDate: match.matchDate,
              teamAName,
              scoreA: match.scoreA ?? 0,
              teamBName,
              scoreB: match.scoreB ?? 0,
              playersA: teamA.map((t) => t.name),
              playersB: teamB.map((t) => t.name),
              scorers: matchGoals.map((g) => ({
                name: g.name,
                goals: g.goals,
                assists: g.assists,
                team: teamA.some((t) => t.playerId === g.playerId) ? "A" : "B",
              })),
              customNotes: match.notes ?? "",
              groupName: group.name,
            }}
          />
        </div>
      </div>

      <div className="card">
        <MatchSharePoster
          matchId={matchId}
          groupName={group.name}
          groupSlug={group.slug}
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
        />
      </div>

      {matchGoals.length > 0 && (
        <div className="card space-y-3 bg-gradient-to-br from-pitch-50/40 to-white dark:from-zinc-900 dark:to-zinc-950 border-pitch-200/60 dark:border-zinc-800">
          <h3 className="font-bold text-sm text-pitch-800 dark:text-zinc-100 flex items-center gap-1.5">
            <span>⚽</span> Goleadores del Partido
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {matchGoals.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-800/80 border border-pitch-100 dark:border-zinc-700/60 text-xs"
              >
                <span className="font-semibold truncate">{g.name}</span>
                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                  {g.goals > 0 && (
                    <span className="chip bg-pitch-100 text-pitch-800 dark:bg-pitch-900/40 dark:text-pitch-300 font-extrabold px-1.5 py-0.5 text-[11px]">
                      ⚽ {g.goals}
                    </span>
                  )}
                  {g.assists > 0 && (
                    <span className="chip bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-bold px-1.5 py-0.5 text-[11px]">
                      👟 {g.assists}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
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
    </div>
  );
}
