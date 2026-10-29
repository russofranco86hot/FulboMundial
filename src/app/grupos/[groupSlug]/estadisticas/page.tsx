import { getGroupBySlug } from "@/lib/groups";
import { getAdvancedStats } from "@/lib/stats";
import {
  Handshake,
  Swords,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clover,
  Skull,
  ZapOff,
  Flame,
  ShieldAlert,
} from "lucide-react";
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
        <h1 className="text-2xl font-black text-pitch-800 dark:text-zinc-100 flex items-center gap-2">
          <BarChart3 className="text-pitch-600" />
          Métricas y Folclore — {group.name}
        </h1>
        <p className="text-sm text-pitch-900/60 dark:text-zinc-400 mt-1">
          Sociedades, rivalidades, amuletos y las gastadas históricas del grupo.
        </p>
        <p className="text-xs text-pitch-900/50 dark:text-zinc-500 mt-0.5">
          * Mínimo 3 partidos disputados y presencia activa en los últimos 5 encuentros.
        </p>
      </div>

      {/* ─── El Amuleto y La Mufa (Grid de 2 columnas) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* El Amuleto / Talismán */}
        <div className="card space-y-3 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-white to-white dark:via-zinc-900 dark:to-zinc-900">
          <div className="flex items-center gap-2 border-b border-emerald-500/20 pb-2 border-l-4 border-emerald-500 pl-3">
            <Clover className="text-emerald-500" size={20} />
            <div>
              <h2 className="font-extrabold text-base text-emerald-950 dark:text-emerald-300">
                El Amuleto (Talismán) 🍀
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Entra a la cancha y el equipo suma. Mayor % de victoria.
              </p>
            </div>
          </div>

          {stats.talismans.length === 0 ? (
            <p className="text-xs text-zinc-400 py-2">Sin datos suficientes aún.</p>
          ) : (
            <ul className="space-y-2">
              {stats.talismans.map((t, idx) => (
                <li
                  key={t.playerId}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{t.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-emerald-600 dark:text-emerald-400 block text-sm leading-tight">
                      {t.winPct}%
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {t.wins}G / {t.matches}PJ
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* La Mufa / El Salado */}
        <div className="card space-y-3 border-purple-500/30 bg-gradient-to-br from-purple-500/5 via-white to-white dark:via-zinc-900 dark:to-zinc-900">
          <div className="flex items-center gap-2 border-b border-purple-500/20 pb-2 border-l-4 border-purple-500 pl-3">
            <Skull className="text-purple-500" size={20} />
            <div>
              <h2 className="font-extrabold text-base text-purple-950 dark:text-purple-300">
                El Salado (Mufa Oficial) 🧂
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Pisa el césped y se nubla el día. Mayor % de derrotas.
              </p>
            </div>
          </div>

          {stats.mufas.length === 0 ? (
            <p className="text-xs text-zinc-400 py-2">Sin datos suficientes aún.</p>
          ) : (
            <ul className="space-y-2">
              {stats.mufas.map((m, idx) => (
                <li
                  key={m.playerId}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-800/40 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{m.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-purple-600 dark:text-purple-400 block text-sm leading-tight">
                      {m.lossPct}% Caídas
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {m.losses}P / {m.matches}PJ
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ─── Dúo Tóxico & El Clásico Picante ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dúo Tóxico (Anti-Química) */}
        <div className="card space-y-3 border-amber-500/30">
          <div className="flex items-center gap-2 border-b border-amber-500/20 pb-2 border-l-4 border-amber-500 pl-3">
            <ZapOff className="text-amber-500" size={20} />
            <div>
              <h2 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">
                Dúos Tóxicos (Anti-Química) ⚡
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Juntos en el mismo equipo... ¡no ganan ni a las bolitas!
              </p>
            </div>
          </div>

          {stats.toxicDuos.length === 0 ? (
            <p className="text-xs text-zinc-400 py-2">No hay parejas con racha negativa marcada.</p>
          ) : (
            <ul className="space-y-2">
              {stats.toxicDuos.map((t, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/40 text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 block truncate">
                      {t.player1} + {t.player2}
                    </span>
                    <span className="text-[10px] text-amber-800/70 dark:text-amber-300/70">
                      {t.losses} derrotas en {t.matches} partidos juntos
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-amber-600 dark:text-amber-400 text-sm">
                      {t.lossPct}% Derrota
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* El Clásico Picante (Rivalidad más jugada) */}
        <div className="card space-y-3 border-rose-500/30">
          <div className="flex items-center gap-2 border-b border-rose-500/20 pb-2 border-l-4 border-rose-500 pl-3">
            <Flame className="text-rose-500" size={20} />
            <div>
              <h2 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">
                El Clásico del Grupo ⚔️
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Los choques más repetidos cara a cara en equipos opuestos.
              </p>
            </div>
          </div>

          {stats.classicRivals.length === 0 ? (
            <p className="text-xs text-zinc-400 py-2">Sin choques suficientes aún.</p>
          ) : (
            <ul className="space-y-2">
              {stats.classicRivals.map((r, idx) => (
                <li
                  key={idx}
                  className="p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/40 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between font-bold text-zinc-900 dark:text-zinc-100">
                    <span className="truncate">{r.player1}</span>
                    <span className="text-rose-500 px-1 font-black">VS</span>
                    <span className="truncate">{r.player2}</span>
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-[10px] font-black border border-zinc-200 dark:border-zinc-700 shrink-0">
                      {r.matches} clásicos
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-1 border-t border-rose-100 dark:border-rose-900/40">
                    <span>{r.player1}: {r.wins1}G</span>
                    <span className="text-zinc-400">| {r.draws}E |</span>
                    <span>{r.player2}: {r.wins2}G</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ─── Mejores Sociedades (Química) ─── */}
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

      {/* ─── Paternidad (Rivalidad) ─── */}
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

      {/* ─── Rachas Activas ─── */}
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
