import { getGroupBySlug } from "@/lib/groups";
import { getAdvancedStats } from "@/lib/stats";
import { Handshake, Swords, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function GroupEstadisticasPage({
  params,
}: {
  params: Promise<{ groupSlug: string }>;
}) {
  const { groupSlug } = await params;
  const group = await getGroupBySlug(groupSlug);
  if (!group) return notFound();

  const stats = await getAdvancedStats(group.id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-pitch-700 dark:text-zinc-100 flex items-center gap-2">
          <BarChart3 className="text-pitch-600" />
          Sociedades y Rivalidades — {group.name}
        </h1>
        <p className="text-sm text-pitch-900/60 dark:text-zinc-400 mt-1">
          Estadísticas avanzadas basadas en el historial del grupo.
        </p>
        <p className="text-xs text-pitch-900/50 dark:text-zinc-500 mt-0.5">
          * Excluye automáticamente a jugadores sin presencia en los últimos 5 partidos.
        </p>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center gap-2 border-b border-pitch-100/50 dark:border-zinc-800 pb-2 border-l-4 border-blue-500 pl-3">
          <Handshake className="text-blue-500" size={20} />
          <h2 className="font-bold text-lg text-pitch-700 dark:text-zinc-200">Mejores Sociedades (Química)</h2>
        </div>
        <p className="text-xs text-pitch-900/50 dark:text-zinc-400">Mínimo 3 partidos jugando juntos.</p>
        
        {stats.topChemistry.length === 0 ? (
          <p className="text-sm text-pitch-900/40 dark:text-zinc-500">No hay datos suficientes en este grupo.</p>
        ) : (
          <ul className="space-y-3">
            {stats.topChemistry.map((c, i) => (
              <li key={i} className="flex flex-col bg-pitch-50 dark:bg-zinc-800/50 p-3 rounded-xl text-sm gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium dark:text-zinc-200">{c.player1} + {c.player2}</span>
                  <div className="text-right">
                    <span className="font-bold text-pitch-600 dark:text-pitch-400 block">{c.winPct}% Victoria</span>
                    <span className="text-[10px] text-pitch-900/50 dark:text-zinc-400">{c.wins}G - {c.matches}PJ</span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-pitch-100 dark:bg-zinc-700 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full" 
                    style={{ width: `${c.winPct}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card space-y-4">
        <div className="flex items-center gap-2 border-b border-pitch-100/50 dark:border-zinc-800 pb-2 border-l-4 border-red-500 pl-3">
          <Swords className="text-red-500" size={20} />
          <h2 className="font-bold text-lg text-pitch-700 dark:text-zinc-200">Paternidad (Rivalidad)</h2>
        </div>
        <p className="text-xs text-pitch-900/50 dark:text-zinc-400">Jugadores que tienen de "hijo" a otros (al menos 75% de victorias en contra directo).</p>

        {stats.topPaternity.length === 0 ? (
          <p className="text-sm text-pitch-900/40 dark:text-zinc-500">No hay datos suficientes en este grupo.</p>
        ) : (
          <ul className="space-y-3">
            {stats.topPaternity.map((p, i) => (
              <li key={i} className="flex flex-col bg-pitch-50 dark:bg-zinc-800/50 p-3 rounded-xl text-sm gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-pitch-700 dark:text-pitch-400">{p.winner}</span>
                    <span className="text-pitch-900/50 dark:text-zinc-400 text-xs mx-1">sobre</span>
                    <span className="font-medium dark:text-zinc-200">{p.loser}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-red-600 dark:text-red-400 block">{p.winPct}%</span>
                    <span className="text-[10px] text-pitch-900/50 dark:text-zinc-400">{p.wins}G - {p.matches}PJ</span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-pitch-100 dark:bg-zinc-700 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full" 
                    style={{ width: `${p.winPct}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {stats.streaks.length > 0 && (
        <div className="card space-y-4">
          <h2 className="font-bold text-lg text-pitch-700 dark:text-zinc-200 border-b border-pitch-100/50 dark:border-zinc-800 pb-2">Rachas Activas</h2>
          <ul className="space-y-3">
            {stats.streaks.map((s, i) => (
              <li key={i} className="flex items-center gap-3 text-sm p-3 border-b border-pitch-50 dark:border-zinc-800/50 last:border-0">
                {s.type === "win" ? (
                  <TrendingUp className="text-green-500" size={18} />
                ) : (
                  <TrendingDown className="text-red-500" size={18} />
                )}
                <span className="font-medium text-base dark:text-zinc-200">{s.name}</span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-lg font-black px-3 py-1 bg-pitch-100 dark:bg-zinc-800 dark:text-zinc-100 rounded-lg shadow-sm">
                    {s.count}
                  </span>
                  <span className="text-xs font-semibold text-pitch-700/70 dark:text-zinc-400">
                    {s.type === "win" ? "Victorias al hilo" : "Sin ganar"}
                  </span>
                  {s.count >= 3 && <span className="text-xl animate-pulse-soft">🔥</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
