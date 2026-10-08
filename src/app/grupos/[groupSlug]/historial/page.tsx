import { getGroupBySlug } from "@/lib/groups";
import { getStandings, getRecentMatches } from "@/lib/queries";
import { formatArt } from "@/lib/time";
import { Trophy } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function GroupHistorialPage({
  params,
}: {
  params: Promise<{ groupSlug: string }>;
}) {
  const { groupSlug } = await params;
  const group = await getGroupBySlug(groupSlug);
  if (!group) return notFound();

  const rows = await getStandings(group.id);
  const recentMatches = await getRecentMatches(group.id, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-pitch-700 dark:text-zinc-100 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-gold-500" />
          Historial — {group.name}
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
                              f === 'W' ? 'bg-green-500' : f === 'D' ? 'bg-zinc-400' : 'bg-red-500'
                            }`}
                            title={f === 'W' ? 'Victoria' : f === 'D' ? 'Empate' : 'Derrota'}
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

      {recentMatches.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-bold text-pitch-700 dark:text-zinc-200">Últimos partidos</h2>
          <div className="flex flex-col gap-4">
            {recentMatches.map((m) => {
              const teamA = m.teams.filter((t) => t.team === "A");
              const teamB = m.teams.filter((t) => t.team === "B");
              const isWinnerA = m.result === "A";
              const isWinnerB = m.result === "B";

              return (
                <div key={m.id} className="card w-full space-y-3 hover:-translate-y-0.5 transition-all duration-300">
                  <div className="flex justify-between items-center text-sm border-b border-pitch-100/50 dark:border-zinc-800 pb-2">
                    <span className="font-semibold text-pitch-900/70 dark:text-zinc-400">{formatArt(m.matchDate, "dd/MM/yyyy")}</span>
                  </div>
                  
                  <div className="flex items-start relative">
                    <div className="flex-1 text-center px-2">
                      <div className={`font-semibold text-sm mb-2 ${isWinnerA ? 'font-bold text-pitch-700 dark:text-pitch-500' : 'dark:text-zinc-300'}`}>
                        Equipo Claro
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
                      <div className={`font-semibold text-sm mb-2 ${isWinnerB ? 'font-bold text-pitch-700 dark:text-pitch-500' : 'dark:text-zinc-300'}`}>
                        Equipo Oscuro
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
                  <div className="pt-2 border-t border-pitch-100/50 dark:border-zinc-800 mt-3">
                    <Link
                      href={`/grupos/${groupSlug}/historial/${m.id}`}
                      className="block text-center text-sm font-bold text-pitch-600 dark:text-pitch-400 hover:text-pitch-700 w-full py-1"
                    >
                      Ver Detalles y Votar →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
