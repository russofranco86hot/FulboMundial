import Link from "next/link";
import { getGroupBySlug } from "@/lib/groups";
import { getCurrentPlayer } from "@/lib/session";
import { getCurrentMatch, getSelection, getStandings, getLastFinishedMatch } from "@/lib/queries";
import { formatArt } from "@/lib/time";
import { Countdown } from "@/components/countdown";
import { SignupButton } from "@/components/signup-button";
import { TercerTiempoWidget } from "@/components/tercer-tiempo";
import { db, matchThirdHalf, players, results } from "@/db";
import { eq } from "drizzle-orm";
import { CheckCircle2, Clock, CircleDashed, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function GroupHomePage({
  params,
}: {
  params: Promise<{ groupSlug: string }>;
}) {
  const { groupSlug } = await params;
  const group = await getGroupBySlug(groupSlug);
  if (!group) return notFound();

  const player = await getCurrentPlayer();
  const standings = await getStandings(group.id);
  const topPts = standings[0]?.pts ?? 0;
  const topPlayers = standings.filter((s) => s.pts === topPts && s.pts > 0);
  const lastFinished = await getLastFinishedMatch(group.id);

  if (!player) return null; // Layout ya maneja el acceso

  const match = await getCurrentMatch(group.id);

  if (!match) {
    return (
      <div className="space-y-5 animate-fade-in">
        {lastFinished && (
          <div className="card space-y-4 border-pitch-500/40 bg-gradient-to-br from-pitch-50/80 via-white to-amber-50/50 dark:from-zinc-900 dark:to-zinc-950 p-5 shadow-glow-green animate-slide-up">
            <div className="flex items-center justify-between">
              <span className="chip bg-pitch-600 text-white text-xs font-bold px-2.5 py-0.5">Último Partido</span>
              <span className="text-xs font-semibold text-pitch-900/60 dark:text-zinc-400 capitalize">
                {formatArt(lastFinished.matchDate, "EEEE dd/MM")}
              </span>
            </div>
            <div className="flex items-center justify-between px-6 py-3 bg-white/80 dark:bg-zinc-800/80 rounded-2xl border border-pitch-100 dark:border-zinc-700 shadow-sm">
              <div className="text-center flex-1">
                <span className="text-xs font-bold text-pitch-700 dark:text-pitch-400 uppercase">Claro</span>
                <p className="text-3xl font-black">{lastFinished.scoreA}</p>
              </div>
              <span className="text-xl font-bold text-zinc-300 dark:text-zinc-600 px-3">-</span>
              <div className="text-center flex-1">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase">Oscuro</span>
                <p className="text-3xl font-black">{lastFinished.scoreB}</p>
              </div>
            </div>
            <Link
              href={`/grupos/${groupSlug}/historial/${lastFinished.id}`}
              className="btn-primary w-full text-sm font-bold flex items-center justify-center gap-2 py-3"
            >
              <span>Ver Crónica y Votar Premios</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        )}
        <div className="card text-center text-pitch-900/70 dark:text-zinc-400 animate-slide-up">
          Todavía no hay un nuevo partido abierto. El admin lo abrirá pronto.
        </div>
        <TopPlayerCard topPlayers={topPlayers} groupSlug={groupSlug} />
      </div>
    );
  }

  const selection = await getSelection(match);
  const mine = selection.find((s) => s.playerId === player.id);
  const playing = selection.filter((s) => s.status === "playing");
  const subs = selection.filter((s) => s.status === "substitute");
  const isOpen = match.status === "open";
  const isFinished = match.status === "finished";
  const signedUp = !!mine;

  const currentResult = isFinished
    ? (await db.select().from(results).where(eq(results.matchId, match.id)).limit(1))[0]
    : null;

  const thirdHalfRows = await db
    .select({ name: players.name, staying: matchThirdHalf.staying, playerId: players.id })
    .from(matchThirdHalf)
    .innerJoin(players, eq(players.id, matchThirdHalf.playerId))
    .where(eq(matchThirdHalf.matchId, match.id));

  const myResponse = thirdHalfRows.find((r) => r.playerId === player.id)?.staying ?? null;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Banner partido anterior */}
      {!isFinished && lastFinished && (
        <div className="card bg-gradient-to-r from-amber-500/15 via-pitch-500/10 to-blue-500/15 border-pitch-500/40 p-4 animate-slide-down shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-bounce">🏆</span>
              <div>
                <p className="text-sm font-bold text-pitch-800 dark:text-pitch-200">
                  ¡Partido del {formatArt(lastFinished.matchDate, "dd/MM")} cerrado!
                </p>
                <p className="text-xs text-pitch-900/70 dark:text-zinc-300">
                  Claro {lastFinished.scoreA} - {lastFinished.scoreB} Oscuro. ¡Votá a la figura!
                </p>
              </div>
            </div>
            <Link
              href={`/grupos/${groupSlug}/historial/${lastFinished.id}`}
              className="btn-primary text-xs px-3.5 py-2 shrink-0 whitespace-nowrap"
            >
              Ver y Votar →
            </Link>
          </div>
        </div>
      )}

      {/* Estado del partido */}
      {isFinished ? (
        <div className="card space-y-4 border-pitch-500/40 bg-gradient-to-br from-pitch-50/80 via-white to-amber-50/50 dark:from-zinc-900 dark:to-zinc-950 p-5 shadow-glow-green animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚽</span>
              <span className="chip bg-pitch-600 text-white text-xs font-bold px-2.5 py-0.5">Partido Finalizado</span>
            </div>
            <span className="text-xs font-semibold text-pitch-900/60 dark:text-zinc-400 capitalize">
              {formatArt(match.matchDate, "EEEE dd/MM")}
            </span>
          </div>
          {currentResult && (
            <div className="flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-zinc-800/80 rounded-2xl border border-pitch-100 dark:border-zinc-700 shadow-sm">
              <div className="text-center flex-1">
                <span className="text-xs font-bold text-pitch-700 dark:text-pitch-400 uppercase tracking-wide">Claro</span>
                <p className="text-4xl font-black">{currentResult.scoreA}</p>
              </div>
              <span className="text-2xl font-bold text-zinc-300 dark:text-zinc-600 px-3">-</span>
              <div className="text-center flex-1">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Oscuro</span>
                <p className="text-4xl font-black">{currentResult.scoreB}</p>
              </div>
            </div>
          )}
          {currentResult?.notes && (
            <div className="p-3.5 bg-pitch-100/60 dark:bg-zinc-800/80 rounded-xl border-l-4 border-pitch-500 text-xs italic text-pitch-900/90 dark:text-zinc-300">
              <span className="font-bold not-italic block text-pitch-700 dark:text-pitch-400 mb-1">Crónica oficial:</span>
              "{currentResult.notes}"
            </div>
          )}
          <Link
            href={`/grupos/${groupSlug}/historial/${match.id}`}
            className="btn-primary w-full text-sm font-bold flex items-center justify-center gap-2 py-3 shadow-glow-green hover:shadow-lg"
          >
            <span>Ver Detalle, Crónica y Votar Premios</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      ) : (
        <div className="card space-y-4 animate-slide-up">
          <div className="text-center">
            <div className="chip bg-pitch-100 text-pitch-700 dark:bg-zinc-800 dark:text-pitch-400">
              {isOpen ? "Lista abierta" : "Lista cerrada"}
            </div>
            <h2 className="mt-2 text-xl font-bold capitalize dark:text-zinc-100">
              {formatArt(match.matchDate, "EEEE dd/MM 'a las' HH:mm")}
            </h2>
            <p className="text-sm text-pitch-900/50 dark:text-zinc-400">{match.format} — {match.capacity} juegan</p>
          </div>
          <div className="rounded-2xl bg-pitch-50 dark:bg-zinc-900 p-4">
            <Countdown to={new Date(match.matchDate).toISOString()} label="Falta para el partido" />
          </div>
        </div>
      )}

      {/* Mi estado + botón */}
      {!isFinished && (
        <div className="card space-y-4 animate-slide-up">
          <StatusBadge mine={mine} isOpen={isOpen} />
          <div className="w-full">
            <div className="flex justify-between text-xs text-pitch-900/60 dark:text-zinc-400 mb-1.5 px-1 font-medium">
              <span>Ocupación</span>
              <span>{playing.length}/{match.capacity} jugadores</span>
            </div>
            <div className="h-2 w-full rounded-full bg-pitch-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pitch-400 to-pitch-600 transition-all duration-500"
                style={{ width: `${Math.min(100, (playing.length / match.capacity) * 100)}%` }}
              />
            </div>
          </div>
          <SignupButton signedUp={signedUp} disabled={!isOpen && !signedUp} groupId={group.id} groupSlug={groupSlug} />
          {!isOpen && !signedUp && (
            <p className="text-center text-xs text-pitch-900/50 dark:text-zinc-500">
              La lista está cerrada; no podés anotarte. Hablá con el admin.
            </p>
          )}
        </div>
      )}

      {/* Titulares */}
      <PlayerList
        title={isOpen ? "Si cerrara ahora, juegan:" : "Titulares confirmados"}
        rows={playing.map((p, i) => ({ key: p.playerId, n: i + 1, name: p.name, mine: p.playerId === player.id }))}
        empty="Nadie anotado todavía."
        accent
      />

      {/* Suplentes */}
      <PlayerList
        title="Suplentes (por prioridad)"
        rows={subs.map((p) => ({
          key: p.playerId,
          n: p.substituteIndex!,
          name: p.name,
          mine: p.playerId === player.id,
        }))}
        empty="Sin suplentes."
      />

      {/* Tercer Tiempo */}
      <TercerTiempoWidget responses={thirdHalfRows} myResponse={myResponse} groupId={group.id} groupSlug={groupSlug} />

      {/* Jugador líder */}
      <TopPlayerCard topPlayers={topPlayers} groupSlug={groupSlug} />
    </div>
  );
}

function StatusBadge({
  mine,
  isOpen,
}: {
  mine: { status: string; substituteIndex: number | null } | undefined;
  isOpen: boolean;
}) {
  let text = "No anotado";
  let cls = "bg-pitch-100 text-pitch-900/60 dark:bg-zinc-800 dark:text-zinc-400";
  let Icon = CircleDashed;

  if (mine) {
    if (mine.status === "playing") {
      text = isOpen ? "Anotado — jugás" : "Confirmado ✓";
      cls = "bg-pitch-600 text-white animate-pulse-soft shadow-glow-green";
      Icon = CheckCircle2;
    } else {
      text = isOpen ? `Anotado — suplente ${mine.substituteIndex}` : `Suplente ${mine.substituteIndex}`;
      cls = "bg-amber-500 text-white";
      Icon = Clock;
    }
  }
  return (
    <div className="text-center">
      <div className="text-xs uppercase tracking-wide text-pitch-900/40 dark:text-zinc-500 mb-1">Mi estado</div>
      <div className={`chip inline-flex items-center gap-1.5 text-sm ${cls}`}>
        <Icon size={16} />
        <span>{text}</span>
      </div>
    </div>
  );
}

function PlayerList({
  title,
  rows,
  empty,
  accent,
}: {
  title: string;
  rows: { key: number; n: number; name: string; mine: boolean }[];
  empty: string;
  accent?: boolean;
}) {
  return (
    <div className="card animate-slide-up">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-pitch-900/50 dark:text-zinc-400">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-pitch-900/40 dark:text-zinc-500">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li
              key={r.key}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-all duration-200 hover:bg-pitch-50/50 dark:hover:bg-zinc-800/30 ${
                r.mine ? "bg-gradient-to-r from-pitch-50 to-pitch-100 dark:from-pitch-900/20 dark:to-pitch-800/10 dark:text-zinc-100" : "dark:text-zinc-300"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  accent ? "bg-pitch-600 text-white" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                }`}
              >
                {r.n}
              </span>
              <span className="font-medium">{r.name}</span>
              {r.mine && <span className="ml-auto text-xs font-semibold text-pitch-700 dark:text-pitch-400">vos</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TopPlayerCard({
  topPlayers,
  groupSlug,
}: {
  topPlayers: { playerId: number; name: string; pts: number; gp: number; won: number; drawn: number; lost: number; winPct: number; badges: string[] }[];
  groupSlug: string;
}) {
  if (topPlayers.length === 0) return null;
  return (
    <div className="card space-y-3 animate-slide-up">
      <div className="flex items-center justify-between border-b border-pitch-100/50 pb-2 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-xl animate-float inline-block">👑</span>
          <h3 className="text-sm font-bold uppercase tracking-wide text-pitch-900/70 dark:text-zinc-300">
            {topPlayers.length > 1 ? "Líderes de la tabla" : "Jugador con más puntos"}
          </h3>
        </div>
        <a href={`/grupos/${groupSlug}/historial`} className="text-xs font-bold text-pitch-600 hover:underline dark:text-pitch-400">
          Ver tabla →
        </a>
      </div>
      <div className="space-y-4">
        {topPlayers.map((tp) => (
          <div key={tp.playerId} className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <p className="text-base font-extrabold text-pitch-700 dark:text-pitch-400">
                {tp.name}
                {tp.badges.length > 0 && <span className="ml-1.5 text-sm">{tp.badges.join(" ")}</span>}
              </p>
              <p className="text-xs text-pitch-900/60 dark:text-zinc-400">
                {tp.gp} PJ ({tp.won}G - {tp.drawn}E - {tp.lost}P)
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-pitch-100 dark:bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-pitch-400 to-pitch-500" style={{ width: `${tp.winPct}%` }} />
                </div>
                <span className="text-[10px] font-bold text-pitch-900/50 dark:text-zinc-500">{tp.winPct}%</span>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="flex items-baseline gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-gold-400 to-gold-500 text-white shadow-glow-gold">
                <span className="text-2xl font-black">{tp.pts}</span>
                <span className="text-[10px] uppercase font-bold text-white/80">pts</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
