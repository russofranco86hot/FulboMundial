import { getMatchDetails, getMatchNotes, getMatchVotes } from "@/lib/queries";
import { getCurrentPlayer } from "@/lib/session";
import { getGroupBySlug } from "@/lib/groups";
import { formatArt } from "@/lib/time";
import { notFound } from "next/navigation";
import { MatchDetailClient } from "./client-page";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GroupMatchDetailPage({
  params,
}: {
  params: Promise<{ groupSlug: string; id: string }>;
}) {
  const resolvedParams = await params;
  const matchId = parseInt(resolvedParams.id, 10);
  if (isNaN(matchId)) return notFound();

  const group = await getGroupBySlug(resolvedParams.groupSlug);
  if (!group) return notFound();

  const match = await getMatchDetails(matchId);
  if (!match) return notFound();

  const notes = await getMatchNotes(matchId);
  const votes = await getMatchVotes(matchId);
  const player = await getCurrentPlayer();
  const teamA = match.teams.filter((t) => t.team === "A");
  const teamB = match.teams.filter((t) => t.team === "B");

  const scoreA = match.scoreA ?? 0;
  const scoreB = match.scoreB ?? 0;
  const hasResult = match.scoreA !== null && match.scoreB !== null;
  const isWinnerA = hasResult && scoreA > scoreB;
  const isWinnerB = hasResult && scoreB > scoreA;
  const isDraw = hasResult && scoreA === scoreB;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link
          href={`/grupos/${resolvedParams.groupSlug}/historial`}
          className="btn-ghost p-2.5 rounded-full hover:bg-pitch-100/50 transition-colors group"
        >
          <ArrowLeft size={20} className="text-pitch-600 group-hover:-translate-x-1 transition-transform" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-pitch-700 dark:text-zinc-100">Detalles del Partido</h1>
          <p className="text-sm text-pitch-900/60 dark:text-zinc-400 mt-1 capitalize">
            {formatArt(match.matchDate, "EEEE dd/MM/yyyy")}
          </p>
        </div>
      </div>

      {/* Resultado y Equipos */}
      <div className="card space-y-4">
        <div className="flex justify-between items-center px-4 py-6 bg-pitch-50/80 dark:bg-zinc-800/50 rounded-2xl">
          <div className="text-center flex-1 flex flex-col items-center">
            <h3 className="font-bold text-pitch-700 dark:text-pitch-400 mb-1">Claro</h3>
            <span className={`text-5xl font-black ${isWinnerA ? 'text-pitch-600' : 'text-zinc-700 dark:text-zinc-300'}`}>
              {match.scoreA}
            </span>
            {isWinnerA && <span className="mt-2 chip bg-pitch-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">Ganó</span>}
            {isDraw && <span className="mt-2 chip bg-zinc-400 text-white text-xs px-2 py-0.5 rounded-full font-bold">Empate</span>}
          </div>
          <div className="text-center text-pitch-900/30 dark:text-zinc-600 font-black text-2xl px-4">-</div>
          <div className="text-center flex-1 flex flex-col items-center">
            <h3 className="font-bold text-pitch-700 dark:text-blue-400 mb-1">Oscuro</h3>
            <span className={`text-5xl font-black ${isWinnerB ? 'text-pitch-600' : 'text-zinc-700 dark:text-zinc-300'}`}>
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

        {match.notes && (
          <div className="text-sm italic text-pitch-900/80 dark:text-zinc-300 p-4 bg-pitch-100/50 dark:bg-zinc-800/80 rounded-xl mt-4 border-l-4 border-pitch-400">
            <span className="font-bold not-italic block mb-1">Nota oficial:</span>
            {match.notes}
          </div>
        )}
      </div>

      <MatchDetailClient 
        matchId={matchId} 
        groupSlug={resolvedParams.groupSlug}
        teams={match.teams} 
        notes={notes} 
        votes={votes} 
        currentUserId={player?.id} 
      />
    </div>
  );
}
