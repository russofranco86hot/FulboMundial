"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Trophy, Flag, Sparkles, Archive, CheckCircle2 } from "lucide-react";
import { formatArt } from "@/lib/time";
import { FREE_LIMITS } from "@/lib/plans";
import { ProBadge, ProBanner, TrialExpiringBanner } from "@/components/pro-gate";
import { WhatsAppShare } from "@/components/whatsapp-share";
import {
  adminGroupGenerateChampionshipSummary,
  adminGroupStartNewChampionship,
} from "../admin/actions";
import { useApiData, useRouteParams } from "@/lib/client-api";

type ArchivedChampionship = {
  id: string;
  name: string;
  firstMatchFormatted: string | null;
  endDateFormatted: string | null;
  playedMatchesCount: number;
  closedAt: string;
  summary: string;
  standings: {
    playerId: number;
    name: string;
    pts: number;
    gp: number;
    won: number;
    drawn: number;
    lost: number;
  }[];
  topScorers: {
    playerId: number;
    name: string;
    totalGoals: number;
    totalAssists: number;
  }[];
};

type ChampionshipInfo = {
  name: string | null;
  endDate: string | null;
  endDateFormatted: string | null;
  firstMatchDate: string | Date | null;
  firstMatchFormatted: string | null;
  playedMatchesCount: number;
  remainingMatchesCount: number;
  isFinishedChampionship: boolean;
  isLastMatchActive: boolean;
  summary: string | null;
  history: ArchivedChampionship[];
};

type HistorialData = {
  blocked?: boolean;
  group: { id: number; name: string; slug: string; teamAName: string | null; teamBName: string | null };
  proStatus: { isPro: boolean; isTrial: boolean; isExpiringSoon: boolean; daysRemaining: number | null };
  rows: {
    playerId: number;
    name: string;
    pts: number;
    gp: number;
    won: number;
    drawn: number;
    lost: number;
    form: ("W" | "D" | "L")[];
    dropouts: number;
    badges: string[];
  }[];
  recentMatches: {
    id: number;
    matchDate: string | Date;
    result: string;
    scoreA: number;
    scoreB: number;
    notes: string | null;
    teamAName?: string | null;
    teamBName?: string | null;
    teams: { id: number; name: string; team: string; awards?: string[] }[];
  }[];
  topScorers: {
    playerId: number;
    name: string;
    isGoalkeeper: boolean;
    totalGoals: number;
    totalAssists: number;
    matchesWithGoals: number;
  }[];
  isAdmin: boolean;
  championship?: ChampionshipInfo | null;
};

export function GroupHistorialClient() {
  const { groupSlug } = useRouteParams();
  const [isGeneratingSummary, startGenerating] = useTransition();
  const [showNewForm, setShowNewForm] = useState(false);
  const [newChampionshipBanner, setNewChampionshipBanner] = useState(false);
  const { data, loading } = useApiData<HistorialData>(
    groupSlug ? `/api/page-data/group/${encodeURIComponent(groupSlug)}/historial` : null
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const qs = new URLSearchParams(window.location.search);
      setNewChampionshipBanner(qs.get("newChampionship") === "1");
    }
  }, []);

  if (!groupSlug || (loading && !data)) {
    return <div className="pt-8 text-center text-sm text-zinc-500">Cargando historial...</div>;
  }
  if (!data || data.blocked || !data.group) return null;

  const { group, proStatus, rows, recentMatches, topScorers, isAdmin, championship } = data;
  const proActive = proStatus.isPro;
  const visibleMatches = proActive
    ? recentMatches
    : recentMatches.slice(0, FREE_LIMITS.maxRecentMatchesInHistory);
  const hiddenMatchesCount = Math.max(0, recentMatches.length - visibleMatches.length);

  const handleGenerateSummary = () => {
    startGenerating(async () => {
      const fd = new FormData();
      fd.set("groupId", String(group.id));
      fd.set("groupSlug", group.slug);
      await adminGroupGenerateChampionshipSummary(fd);
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {proStatus.isExpiringSoon && proStatus.daysRemaining !== null && (
        <TrialExpiringBanner groupSlug={group.slug} daysRemaining={proStatus.daysRemaining} />
      )}

      <div>
        <h1 className="text-2xl font-extrabold text-pitch-700 dark:text-zinc-100 flex items-center gap-2 flex-wrap">
          <Trophy className="w-6 h-6 text-gold-500" />
          Historial — {group.name}
          <ProBadge
            active={proActive}
            isTrial={proStatus.isTrial}
            daysRemaining={proStatus.daysRemaining}
          />
        </h1>
        <p className="text-sm text-pitch-900/60 dark:text-zinc-400 mt-1">
          Tabla histórica de los partidos jugados. Pts = (G×3 + E×2 + P×1).
        </p>
        <p className="text-xs text-pitch-900/50 dark:text-zinc-500 mt-0.5">
          * Los jugadores con más de 5 partidos consecutivos sin jugar no se listan activamente.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <div className="chip bg-pitch-50 dark:bg-zinc-800 text-pitch-800 dark:text-zinc-200 text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <span>🔥</span> <strong className="font-semibold">Asistencia Perfecta:</strong> Jugó últimos 4
          </div>
          <div className="chip bg-pitch-50 dark:bg-zinc-800 text-pitch-800 dark:text-zinc-200 text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <span>🍀</span> <strong className="font-semibold">Talismán:</strong> +70% victorias
          </div>
          <div className="chip bg-pitch-50 dark:bg-zinc-800 text-pitch-800 dark:text-zinc-200 text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <span>⚔️</span> <strong className="font-semibold">Clásico Ganado:</strong> Último cruce
          </div>
        </div>
      </div>

      {newChampionshipBanner && (
        <div className="rounded-2xl bg-emerald-500/15 p-3.5 text-xs sm:text-sm font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-2.5">
          <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0" size={20} />
          <span>
            ¡Campeonato cerrado y archivado! El nuevo torneo arrancó en blanco y ya podés ver el archivo estático más abajo.
          </span>
        </div>
      )}

      {(championship || (isAdmin && recentMatches.length > 0)) && (
        <div className="space-y-2">
          <div className="rounded-xl border border-amber-300/60 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-pitch-800 dark:text-zinc-200">
              <span className="inline-flex items-center gap-1.5 font-extrabold text-amber-800 dark:text-amber-300">
                <Flag className="text-amber-500 shrink-0" size={14} />
                {championship?.name || "Campeonato"}:
              </span>
              <span>
                <strong>Inicio:</strong> {championship?.firstMatchFormatted ?? "Sin resultados"}
              </span>
              {championship?.endDateFormatted && (
                <>
                  <span className="text-zinc-400">·</span>
                  <span>
                    <strong>Cierre:</strong> {championship.endDateFormatted}
                  </span>
                </>
              )}
              {championship && (
                <>
                  <span className="text-zinc-400">·</span>
                  <span className="font-semibold">{championship.playedMatchesCount} PJ</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {championship?.endDate && (
                championship.isFinishedChampionship ? (
                  <span className="chip bg-emerald-600 text-white text-[11px] font-black px-2.5 py-0.5 shrink-0">
                    🏁 Finalizado
                  </span>
                ) : championship.isLastMatchActive || championship.remainingMatchesCount === 1 ? (
                  <span className="chip bg-amber-500 text-zinc-950 text-[11px] font-black px-2.5 py-0.5 shrink-0 animate-pulse">
                    🔥 ¡Última fecha!
                  </span>
                ) : (
                  <span className="chip bg-pitch-600 text-white text-[11px] font-black px-2.5 py-0.5 shrink-0">
                    ⏳ {championship.remainingMatchesCount === 0
                      ? "Sin fechas pendientes"
                      : `Quedan ${championship.remainingMatchesCount} ${championship.remainingMatchesCount === 1 ? "partido" : "partidos"}`}
                  </span>
                )
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowNewForm((v) => !v)}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-500/40 transition-colors shrink-0"
                >
                  {showNewForm ? "Cancelar" : "🏁 Cerrar torneo y abrir nuevo"}
                </button>
              )}
            </div>
          </div>

          {isAdmin && showNewForm && (
            <form
              action={adminGroupStartNewChampionship}
              onSubmit={(e) => {
                if (
                  !window.confirm(
                    "¿Confirmás cerrar el campeonato actual e iniciar uno nuevo? El torneo terminado se guardará de forma estática con su reseña y las tablas actuales arrancarán en blanco."
                  )
                ) {
                  e.preventDefault();
                }
              }}
              className="rounded-2xl border border-amber-400/60 bg-white dark:bg-zinc-900 p-4 space-y-3 shadow-sm"
            >
              <input type="hidden" name="groupId" value={group.id} />
              <input type="hidden" name="groupSlug" value={group.slug} />
              <p className="text-xs text-pitch-900/70 dark:text-zinc-300 font-medium">
                Se guardará <strong>{championship?.name || "el campeonato actual"}</strong> en el archivo estático con su tabla final y reseña, y se limpiarán estadísticas e historial para el nuevo torneo.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  name="newChampionshipName"
                  placeholder="Nombre del nuevo campeonato (ej: Clausura 2027)"
                  className="input text-xs py-2"
                  required
                />
                <input
                  type="date"
                  name="newChampionshipEndDate"
                  className="input text-xs py-2"
                  title="Fecha fin del nuevo campeonato (opcional)"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs transition-colors"
              >
                Confirmar cierre e iniciar nuevo campeonato →
              </button>
            </form>
          )}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-bold text-pitch-700 dark:text-zinc-200">Posiciones Históricas</h2>
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm z-10">
              <tr className="border-b border-pitch-100/50 dark:border-zinc-800 text-left text-xs uppercase text-pitch-900/50 dark:text-zinc-400">
                <th className="px-3 py-2">Jugador</th>
                <th className="px-2 py-2 text-center">Pts</th>
                <th className="px-2 py-2 text-center">PJ</th>
                <th className="px-2 py-2 text-center">G</th>
                <th className="px-2 py-2 text-center">E</th>
                <th className="px-2 py-2 text-center">P</th>
                <th className="px-2 py-2 text-center">Forma</th>
                <th className="px-2 py-2 text-center" title="Bajas">↩︎</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-pitch-900/40 dark:text-zinc-500">
                    Todavía no hay resultados cargados en este grupo.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => {
                let rowStyle = "hover:bg-pitch-50/60 dark:hover:bg-zinc-800/40 transition-colors border-b border-pitch-50/50 dark:border-zinc-800/40";
                if (i === 0) rowStyle += " bg-gradient-to-r from-gold-50 to-gold-100/50 dark:from-gold-600/10 dark:to-gold-500/5";
                else if (i === 1) rowStyle += " bg-gray-50/80 dark:bg-zinc-800/30";
                else if (i === 2) rowStyle += " bg-amber-50/40 dark:bg-amber-900/10";
                else if (i % 2) rowStyle += " bg-pitch-50/20 dark:bg-zinc-800/10";

                return (
                  <tr key={r.playerId} className={rowStyle}>
                    <td className="px-3 py-2 font-medium dark:text-zinc-200">
                      {i === 0 && <span title="Líder Histórico" className="mr-1.5 inline-block -translate-y-[1px]">👑</span>}
                      {r.name}
                      {r.badges.length > 0 && (
                        <span className="ml-2 inline-flex gap-0.5" title="Insignias">
                          {r.badges.map((b, idx) => <span key={idx}>{b}</span>)}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center text-lg font-black text-pitch-700 dark:text-pitch-500 tabular-nums">{r.pts}</td>
                    <td className="px-2 py-2 text-center tabular-nums dark:text-zinc-300">{r.gp}</td>
                    <td className="px-2 py-2 text-center font-semibold tabular-nums text-pitch-700 dark:text-pitch-500">
                      {r.won}
                    </td>
                    <td className="px-2 py-2 text-center tabular-nums dark:text-zinc-400">{r.drawn}</td>
                    <td className="px-2 py-2 text-center tabular-nums text-red-600 dark:text-red-400">{r.lost}</td>
                    <td className="px-2 py-2 text-center">
                      <div className="flex justify-center gap-[2px]">
                        {r.form.map((f, idx) => (
                          <span
                            key={idx}
                            className={`w-3 h-3 rounded-full ${
                              f === "W" ? "bg-green-500" : f === "D" ? "bg-zinc-400" : "bg-red-500"
                            }`}
                            title={f === "W" ? "Victoria" : f === "D" ? "Empate" : "Derrota"}
                          />
                        ))}
                        {Array.from({ length: Math.max(0, 5 - r.form.length) }).map((_, idx) => (
                          <span key={`empty-${idx}`} className="w-3 h-3 rounded-full bg-pitch-100 dark:bg-zinc-700/50" />
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center tabular-nums text-pitch-900/50 dark:text-zinc-500">
                      {r.dropouts}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {topScorers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-pitch-700 dark:text-zinc-200 flex items-center gap-2">
              <span>⚽</span> Tabla de Goleadores (Pichichi)
            </h2>
            <span className="chip bg-pitch-100 text-pitch-800 dark:bg-zinc-800 dark:text-pitch-300 text-xs font-bold px-2 py-0.5">
              Goles y Asistencias
            </span>
          </div>

          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-pitch-50/80 dark:bg-zinc-900 border-b border-pitch-100/50 dark:border-zinc-800 text-left text-xs uppercase text-pitch-900/60 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Jugador</th>
                  <th className="px-3 py-2.5 text-center font-bold text-pitch-800 dark:text-zinc-200">⚽ Goles</th>
                  <th className="px-3 py-2.5 text-center">👟 Asist.</th>
                  <th className="px-3 py-2.5 text-center">Partidos c/gol</th>
                </tr>
              </thead>
              <tbody>
                {topScorers.map((s, idx) => (
                  <tr
                    key={s.playerId}
                    className={`border-b border-pitch-50/50 dark:border-zinc-800/40 hover:bg-pitch-50/40 dark:hover:bg-zinc-800/30 transition-colors ${
                      idx === 0
                        ? "bg-amber-50/60 dark:bg-amber-950/20 font-bold"
                        : idx === 1
                        ? "bg-zinc-50/60 dark:bg-zinc-800/20"
                        : ""
                    }`}
                  >
                    <td className="px-3 py-2.5 font-bold text-xs text-pitch-900/50 dark:text-zinc-400">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                    </td>
                    <td className="px-3 py-2.5 font-medium dark:text-zinc-200">
                      <div className="flex items-center gap-1.5">
                        <span>{s.name}</span>
                        {s.isGoalkeeper && <span title="Arquero">🧤</span>}
                        {idx === 0 && (
                          <span className="chip bg-amber-400 text-amber-950 text-[10px] font-black px-1.5 py-0.5 rounded-full ml-1">
                            Pichichi
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center text-base font-extrabold text-pitch-700 dark:text-pitch-400 tabular-nums">
                      {s.totalGoals}
                    </td>
                    <td className="px-3 py-2.5 text-center text-sm font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                      {s.totalAssists}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs tabular-nums text-pitch-900/60 dark:text-zinc-400">
                      {s.matchesWithGoals}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {championship && (championship.summary || isAdmin) && (
        <div className="rounded-2xl bg-zinc-950 text-zinc-100 p-4 space-y-3 border border-amber-500/30">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Sparkles size={14} /> Resumen Oficial del Torneo (Notas y Votaciones)
            </span>
            {isAdmin && (
              <button
                type="button"
                onClick={handleGenerateSummary}
                disabled={isGeneratingSummary}
                className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 transition-colors"
              >
                {isGeneratingSummary
                  ? "Generando resumen..."
                  : championship.summary
                  ? "Actualizar resumen"
                  : "Generar resumen hasta el momento"}
              </button>
            )}
          </div>

          {championship.summary ? (
            <>
              <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line text-zinc-200">
                {championship.summary}
              </p>
              <div className="pt-1">
                <WhatsAppShare
                  text={`🏆 *RESUMEN DEL CAMPEONATO${championship.name ? `: ${championship.name.toUpperCase()}` : ""} — ${group.name.toUpperCase()}*\n📅 ${championship.firstMatchFormatted ? `Desde ${championship.firstMatchFormatted}` : "Temporada"}${championship.endDateFormatted ? ` hasta ${championship.endDateFormatted}` : ""}\n\n${championship.summary}\n\n📲 Tabla completa en https://fulbomundial.com.ar/grupos/${group.slug}/historial`}
                  label="Compartir resumen en WhatsApp"
                />
              </div>
            </>
          ) : (
            <p className="text-xs text-zinc-400">
              El resumen oficial se generará automáticamente al cerrar el último partido ({championship.endDateFormatted || "al finalizar el torneo"}), o podés generarlo hasta el momento.
            </p>
          )}
        </div>
      )}

      {recentMatches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-bold text-pitch-700 dark:text-zinc-200">Últimos partidos</h2>
            {!proActive && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Mostrando los últimos {visibleMatches.length} partidos (Plan Gratis)
              </span>
            )}
          </div>
          <div className="flex flex-col gap-4">
            {visibleMatches.map((m) => {
              const teamA = m.teams.filter((t) => t.team === "A");
              const teamB = m.teams.filter((t) => t.team === "B");
              const isWinnerA = m.result === "A";
              const isWinnerB = m.result === "B";
              const matchTeamAName = m.teamAName || group.teamAName || "Equipo Claro";
              const matchTeamBName = m.teamBName || group.teamBName || "Equipo Oscuro";

              return (
                <div key={m.id} className="card w-full space-y-3 hover:-translate-y-0.5 transition-all duration-300">
                  <div className="flex justify-between items-center text-sm border-b border-pitch-100/50 dark:border-zinc-800 pb-2">
                    <span className="font-semibold text-pitch-900/70 dark:text-zinc-400">{formatArt(m.matchDate, "dd/MM/yyyy")}</span>
                  </div>

                  <div className="flex items-start relative">
                    <div className="flex-1 text-center px-2">
                      <div className={`font-semibold text-sm mb-2 ${isWinnerA ? "font-bold text-pitch-700 dark:text-pitch-500" : "dark:text-zinc-300"}`}>
                        {matchTeamAName}
                      </div>
                      <ul className="text-pitch-900/60 dark:text-zinc-400 leading-tight space-y-0.5 text-xs text-left inline-block">
                        {teamA.map((t) => (
                          <li key={t.id} className="truncate">
                            {t.name}
                            {t.awards && t.awards.length > 0 && (
                              <span className="ml-1 text-[10px]" title="Premios del partido">{t.awards.join("")}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="absolute left-1/2 top-0 -translate-x-1/2 bg-pitch-700 text-white font-black rounded-xl px-3 py-1 shadow-sm whitespace-nowrap">
                      {m.scoreA} - {m.scoreB}
                    </div>

                    <div className="flex-1 text-center px-2 border-l border-pitch-100/50 dark:border-zinc-800">
                      <div className={`font-semibold text-sm mb-2 ${isWinnerB ? "font-bold text-pitch-700 dark:text-pitch-500" : "dark:text-zinc-300"}`}>
                        {matchTeamBName}
                      </div>
                      <ul className="text-pitch-900/60 dark:text-zinc-400 leading-tight space-y-0.5 text-xs text-left inline-block">
                        {teamB.map((t) => (
                          <li key={t.id} className="truncate">
                            {t.name}
                            {t.awards && t.awards.length > 0 && (
                              <span className="ml-1 text-[10px]" title="Premios del partido">{t.awards.join("")}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {m.notes && (
                    <div className="mt-3 text-xs italic text-pitch-900/80 dark:text-zinc-300 bg-pitch-50/50 dark:bg-zinc-800/50 rounded-xl p-3 border-l-2 border-pitch-400">
                      <span className="font-semibold not-italic block mb-1">Nota oficial:</span>
                      {m.notes}
                    </div>
                  )}
                  <div className="pt-2 border-t border-pitch-100/50 dark:border-zinc-800 mt-3 flex items-center justify-between gap-2">
                    <Link
                      href={`/grupos/${groupSlug}/historial/${m.id}`}
                      className="text-sm font-bold text-pitch-600 dark:text-pitch-400 hover:text-pitch-700 py-1"
                    >
                      Ver Detalles y Votar →
                    </Link>
                    {isAdmin && (
                      <Link
                        href={`/grupos/${groupSlug}/admin/resultado?matchId=${m.id}`}
                        className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 py-1 px-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50 flex items-center gap-1"
                      >
                        ✏️ Editar resultado
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {!proActive && hiddenMatchesCount > 0 && (
            <ProBanner
              groupSlug={group.slug}
              title={`Hay ${hiddenMatchesCount} partido(s) histórico(s) más en el archivo`}
              description="Activá FulboMundial PRO para destrabar el archivo completo de partidos, votaciones históricas y métricas avanzadas."
              ctaLabel="Desbloquear archivo completo"
            />
          )}
        </div>
      )}

      {championship?.history && championship.history.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-pitch-700 dark:text-zinc-200 flex items-center gap-2">
              <Archive size={18} className="text-amber-500" />
              Campeonatos Finalizados (Archivo Estático)
            </h2>
            <span className="text-xs text-zinc-500">
              {championship.history.length} {championship.history.length === 1 ? "torneo" : "torneos"}
            </span>
          </div>

          <div className="space-y-3">
            {championship.history.map((arch, idx) => {
              const champion = arch.standings[0] ?? null;
              return (
                <details
                  key={arch.id}
                  open={idx === 0}
                  className="card space-y-3 border border-amber-300/60 dark:border-amber-800/40"
                >
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-pitch-800 dark:text-amber-300">
                        🏆 {arch.name}
                      </span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {arch.firstMatchFormatted ? `${arch.firstMatchFormatted} → ` : ""}
                        {arch.endDateFormatted || formatArt(arch.closedAt, "dd/MM/yyyy")}
                      </span>
                      <span className="chip bg-zinc-100 dark:bg-zinc-800 text-[11px] font-bold">
                        {arch.playedMatchesCount} PJ
                      </span>
                    </div>
                    {champion && (
                      <span className="chip bg-amber-400/25 text-amber-900 dark:text-amber-200 text-[11px] font-black">
                        👑 Campeón: {champion.name} ({champion.pts} pts)
                      </span>
                    )}
                  </summary>

                  <div className="space-y-3 pt-2 border-t border-zinc-200/70 dark:border-zinc-800">
                    {arch.summary && (
                      <div className="rounded-xl bg-zinc-950 text-zinc-100 p-3.5 space-y-2 border border-amber-500/30">
                        <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                          <Sparkles size={13} /> Reseña Oficial — {arch.name}
                        </span>
                        <p className="text-xs leading-relaxed whitespace-pre-line text-zinc-200">
                          {arch.summary}
                        </p>
                        <WhatsAppShare
                          text={`🏆 *ARCHIVO HISTÓRICO: ${arch.name.toUpperCase()} — ${group.name.toUpperCase()}*\n\n${arch.summary}\n\n📲 Ver archivo en https://fulbomundial.com.ar/grupos/${group.slug}/historial`}
                          label="Compartir reseña en WhatsApp"
                        />
                      </div>
                    )}

                    {arch.standings.length > 0 && (
                      <div className="overflow-x-auto rounded-xl border border-zinc-200/70 dark:border-zinc-800">
                        <table className="w-full text-xs">
                          <thead className="bg-pitch-50/70 dark:bg-zinc-900 text-left uppercase text-[10px] text-zinc-500">
                            <tr>
                              <th className="px-2.5 py-1.5">Jugador</th>
                              <th className="px-2 py-1.5 text-center">Pts</th>
                              <th className="px-2 py-1.5 text-center">PJ</th>
                              <th className="px-2 py-1.5 text-center">G</th>
                              <th className="px-2 py-1.5 text-center">E</th>
                              <th className="px-2 py-1.5 text-center">P</th>
                            </tr>
                          </thead>
                          <tbody>
                            {arch.standings.map((r, rIdx) => (
                              <tr
                                key={r.playerId}
                                className="border-t border-zinc-100 dark:border-zinc-800/60"
                              >
                                <td className="px-2.5 py-1.5 font-medium">
                                  {rIdx === 0 && <span className="mr-1">👑</span>}
                                  {r.name}
                                </td>
                                <td className="px-2 py-1.5 text-center font-black text-pitch-700 dark:text-pitch-400">
                                  {r.pts}
                                </td>
                                <td className="px-2 py-1.5 text-center">{r.gp}</td>
                                <td className="px-2 py-1.5 text-center text-pitch-700 dark:text-pitch-400">
                                  {r.won}
                                </td>
                                <td className="px-2 py-1.5 text-center">{r.drawn}</td>
                                <td className="px-2 py-1.5 text-center text-red-600 dark:text-red-400">
                                  {r.lost}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {arch.topScorers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        <span className="font-bold text-zinc-500 mr-1">⚽ Goleadores:</span>
                        {arch.topScorers.slice(0, 5).map((sc, sIdx) => (
                          <span
                            key={sc.playerId}
                            className="chip bg-amber-50 dark:bg-zinc-800 border border-amber-200/60 dark:border-zinc-700 px-2 py-0.5 font-semibold"
                          >
                            {sIdx === 0 ? "🥇 " : ""}{sc.name}: {sc.totalGoals}G
                            {sc.totalAssists > 0 ? ` / ${sc.totalAssists}A` : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
