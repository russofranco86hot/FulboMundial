import { getGroupBySlug } from "@/lib/groups";
import { getCurrentMatch, getMatchTeams } from "@/lib/queries";
import { getMatchGoals } from "@/lib/goals";
import { db, matches, results } from "@/db";
import { desc, eq } from "drizzle-orm";
import { formatArt } from "@/lib/time";
import { adminGroupSaveResult } from "../actions";
import { TeamEditor, type TeamRow } from "@/components/team-editor";
import { CheckCircle, Info, Calendar, ArrowRightLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function GroupAdminResultado({
  params,
  searchParams,
}: {
  params: Promise<{ groupSlug: string }>;
  searchParams: Promise<{ saved?: string; matchId?: string }>;
}) {
  const { groupSlug } = await params;
  const group = await getGroupBySlug(groupSlug);
  if (!group) return notFound();

  const { saved, matchId: matchIdParam } = await searchParams;

  // Obtener partidos recientes del grupo para permitir seleccionar cuál editar
  const allGroupMatches = await db
    .select({
      id: matches.id,
      matchDate: matches.matchDate,
      status: matches.status,
      format: matches.format,
    })
    .from(matches)
    .where(eq(matches.groupId, group.id))
    .orderBy(desc(matches.matchDate))
    .limit(20);

  let match = null;
  if (matchIdParam) {
    const target = (
      await db.select().from(matches).where(eq(matches.id, Number(matchIdParam))).limit(1)
    )[0];
    if (target && target.groupId === group.id) {
      match = target;
    }
  }

  if (!match) {
    match = await getCurrentMatch(group.id);
  }

  if (!match) {
    return (
      <div className="card text-pitch-900/60 text-center py-8">
        No hay partidos registrados en {group.name}.
      </div>
    );
  }

  const isFinished = match.status === "finished";
  const teamRows = await getMatchTeams(match.id);
  const teamA = teamRows.filter((t) => t.team === "A");
  const teamB = teamRows.filter((t) => t.team === "B");
  const existing = (
    await db.select().from(results).where(eq(results.matchId, match.id)).limit(1)
  )[0];
  const matchGoalsList = await getMatchGoals(match.id);
  const goalsMap = new Map(matchGoalsList.map((g) => [g.playerId, g]));

  const editorRows: TeamRow[] = teamRows.map((r) => ({
    id: r.id,
    name: r.name,
    stars: r.stars,
    isGoalkeeper: r.isGoalkeeper,
    isGuest: r.isGuest,
    team: r.team as "A" | "B",
  }));
  const teamsSig = editorRows.map((r) => `${r.id}:${r.team}`).join(",");

  return (
    <div className="space-y-4 animate-fade-in">
      {saved === "1" && (
        <div className="rounded-2xl bg-green-500/15 p-4 text-sm font-semibold text-green-800 dark:text-green-300 border border-green-500/30 flex items-center gap-3 shadow-glow-green animate-scale-in">
          <CheckCircle className="text-green-600 dark:text-green-400 shrink-0" size={24} />
          <span>¡Resultado y equipos guardados con éxito! La tabla histórica y las estadísticas han sido actualizadas.</span>
        </div>
      )}

      {/* Selector de Partido a Editar */}
      {allGroupMatches.length > 1 && (
        <div className="card bg-zinc-50/80 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 py-3">
          <form method="GET" className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <label className="text-xs font-bold text-pitch-900/70 dark:text-zinc-300 whitespace-nowrap flex items-center gap-1.5">
              <Calendar size={14} className="text-pitch-600" />
              Editar partido:
            </label>
            <select
              name="matchId"
              defaultValue={match.id}
              className="input flex-1 py-1.5 px-3 text-xs font-semibold"
            >
              {allGroupMatches.map((m) => (
                <option key={m.id} value={m.id}>
                  {formatArt(m.matchDate, "EEEE dd/MM/yyyy HH:mm")} — {m.status === "finished" ? "Finalizado" : m.status === "closed" ? "Lista Cerrada" : "Abierto"}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-ghost py-1.5 px-4 text-xs font-bold whitespace-nowrap bg-white dark:bg-zinc-700 border-zinc-300">
              Cargar partido
            </button>
          </form>
        </div>
      )}

      {/* Header del Partido */}
      <div className="card">
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="capitalize font-bold text-lg text-pitch-800 dark:text-pitch-100">
            {formatArt(match.matchDate, "EEEE dd/MM/yyyy HH:mm")}
          </p>
          <span
            className={`chip font-semibold shrink-0 text-xs ${
              isFinished
                ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
                : match.status === "closed"
                ? "bg-amber-100 text-amber-800"
                : "bg-pitch-100 text-pitch-700"
            }`}
          >
            {isFinished ? "Finalizado" : match.status === "closed" ? "Lista Cerrada" : "Abierto"}
          </span>
        </div>
        <p className="text-sm text-pitch-900/60 dark:text-zinc-400 flex items-start gap-2 bg-pitch-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-pitch-100 dark:border-zinc-700">
          <Info size={16} className="text-pitch-500 shrink-0 mt-0.5" />
          {isFinished
            ? "Partido finalizado. Podés modificar los equipos, resultado, goles o notas si ocurrió algún error y la tabla histórica se actualizará en tiempo real."
            : "Cargá el resultado. El sistema actualiza G/E/P de cada jugador en la tabla histórica del grupo."}
        </p>
      </div>

      {teamRows.length === 0 && (
        <div className="card text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 flex items-center gap-2">
          <span className="text-xl">⚠️</span> No hay equipos cargados. Armalos abajo o en “Partido” para que el resultado compute en el historial.
        </div>
      )}

      {/* ─── Editor de Equipos en Resultado ─── */}
      {teamRows.length > 0 && (
        <details className="card space-y-3" open={false}>
          <summary className="cursor-pointer font-bold text-pitch-800 dark:text-pitch-100 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ArrowRightLeft size={16} className="text-pitch-600" />
              Intercambiar jugadores entre equipos ({teamRows.length} jugadores)
            </span>
            <span className="text-xs font-normal text-pitch-900/50 dark:text-zinc-400">
              (Arrastrá para corregir alineación)
            </span>
          </summary>
          <div className="pt-2">
            <TeamEditor key={teamsSig} rows={editorRows} groupSlug={group.slug} />
          </div>
        </details>
      )}

      {/* ─── Formulario de Resultado ─── */}
      <form action={adminGroupSaveResult} className="card space-y-6">
        <input type="hidden" name="groupId" value={group.id} />
        <input type="hidden" name="groupSlug" value={group.slug} />
        <input type="hidden" name="matchId" value={match.id} />

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-pitch-50 dark:bg-pitch-900/10 rounded-2xl p-4 border border-pitch-100 dark:border-pitch-900/30 flex flex-col items-center shadow-sm">
            <div className="mb-3 text-sm font-extrabold text-pitch-700 uppercase tracking-wider">Equipo Claro</div>
            <input
              type="number"
              name="scoreA"
              min="0"
              defaultValue={existing?.scoreA ?? 0}
              className="input text-center text-5xl font-extrabold h-24 w-24 bg-white dark:bg-zinc-800 shadow-inner rounded-2xl"
            />
            <div className="mt-4 w-full pt-3 border-t border-pitch-200/50 dark:border-zinc-700/50">
              <ul className="text-xs text-pitch-900/70 dark:text-zinc-400 space-y-1 text-center font-medium">
                {teamA.map((p) => (
                  <li key={p.id} className="truncate">{p.name}</li>
                ))}
                {teamA.length === 0 && <li className="italic opacity-50">Sin jugadores</li>}
              </ul>
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/30 flex flex-col items-center shadow-sm">
            <div className="mb-3 text-sm font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Equipo Oscuro</div>
            <input
              type="number"
              name="scoreB"
              min="0"
              defaultValue={existing?.scoreB ?? 0}
              className="input text-center text-5xl font-extrabold h-24 w-24 bg-white dark:bg-zinc-800 shadow-inner rounded-2xl border-blue-200 dark:border-blue-800/50 focus:ring-blue-500"
            />
            <div className="mt-4 w-full pt-3 border-t border-blue-200/50 dark:border-zinc-700/50">
              <ul className="text-xs text-blue-900/70 dark:text-zinc-400 space-y-1 text-center font-medium">
                {teamB.map((p) => (
                  <li key={p.id} className="truncate">{p.name}</li>
                ))}
                {teamB.length === 0 && <li className="italic opacity-50">Sin jugadores</li>}
              </ul>
            </div>
          </div>
        </div>

        {/* Registro de Goleadores y Asistencias */}
        {teamRows.some((t) => t.playerId) && (
          <div className="space-y-3 pt-4 border-t border-pitch-100 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-pitch-800 dark:text-zinc-200 flex items-center gap-1.5">
                ⚽ Goles y Asistencias del Partido
              </label>
              <span className="text-[11px] text-pitch-900/50 dark:text-zinc-400">
                (Opcional, suma a la tabla de goleadores)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Equipo Claro */}
              <div className="p-3 rounded-2xl bg-pitch-50/50 dark:bg-zinc-800/40 border border-pitch-100 dark:border-zinc-700/60 space-y-2">
                <span className="text-xs font-bold text-pitch-700 dark:text-pitch-400 uppercase tracking-wider block">
                  Equipo Claro
                </span>
                {teamA.filter((t) => t.playerId).map((p) => {
                  const gInfo = goalsMap.get(p.playerId!);
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-2 text-xs py-0.5">
                      <span className="truncate font-medium flex-1">{p.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-pitch-900/60 dark:text-zinc-400">⚽</span>
                          <input
                            type="number"
                            name={`goals_${p.playerId}`}
                            min={0}
                            max={20}
                            defaultValue={gInfo?.goals ?? 0}
                            className="input w-12 py-1 px-1 text-center text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-pitch-900/60 dark:text-zinc-400">👟</span>
                          <input
                            type="number"
                            name={`assists_${p.playerId}`}
                            min={0}
                            max={20}
                            defaultValue={gInfo?.assists ?? 0}
                            className="input w-12 py-1 px-1 text-center text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Equipo Oscuro */}
              <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-zinc-800/40 border border-blue-100 dark:border-zinc-700/60 space-y-2">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">
                  Equipo Oscuro
                </span>
                {teamB.filter((t) => t.playerId).map((p) => {
                  const gInfo = goalsMap.get(p.playerId!);
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-2 text-xs py-0.5">
                      <span className="truncate font-medium flex-1">{p.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-blue-900/60 dark:text-zinc-400">⚽</span>
                          <input
                            type="number"
                            name={`goals_${p.playerId}`}
                            min={0}
                            max={20}
                            defaultValue={gInfo?.goals ?? 0}
                            className="input w-12 py-1 px-1 text-center text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-blue-900/60 dark:text-zinc-400">👟</span>
                          <input
                            type="number"
                            name={`assists_${p.playerId}`}
                            min={0}
                            max={20}
                            defaultValue={gInfo?.assists ?? 0}
                            className="input w-12 py-1 px-1 text-center text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-1">
          <label className="text-sm font-bold text-pitch-800 dark:text-zinc-300 ml-1">Notas del partido</label>
          <textarea
            name="notes"
            placeholder="Ej: Gran partido, golazo de afuera..."
            defaultValue={existing?.notes ?? ""}
            className="input bg-zinc-50 dark:bg-zinc-800/50"
            rows={3}
          />
        </div>
        
        <button className="btn-primary w-full py-3 text-lg font-bold shadow-glow-green">
          {isFinished ? "Guardar cambios de resultado y actualizar histórico" : "Guardar resultado y cerrar partido"}
        </button>
      </form>

      {isFinished && (
        <div className="text-center pt-2">
          <Link
            href={`/grupos/${groupSlug}/admin/partido`}
            className="inline-flex items-center gap-1 text-sm font-bold text-pitch-600 dark:text-pitch-400 hover:text-pitch-700 hover:underline bg-white dark:bg-zinc-800 px-4 py-2 rounded-full shadow-sm border border-pitch-100 dark:border-zinc-700 transition-all"
          >
            ← Volver a "Partido" para el próximo
          </Link>
        </div>
      )}
    </div>
  );
}
