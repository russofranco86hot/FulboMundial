import { getGroupBySlug } from "@/lib/groups";
import { adminGroupSaveSettings } from "../actions";
import { CheckCircle2, Settings, Trophy, Calendar, Users } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function GroupAdminConfigPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupSlug: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { groupSlug } = await params;
  const { saved } = await searchParams;
  const group = await getGroupBySlug(groupSlug);
  if (!group) return notFound();

  return (
    <div className="space-y-5 animate-fade-in">
      {saved === "1" && (
        <div className="rounded-2xl bg-green-500/15 p-4 text-sm font-semibold text-green-800 dark:text-green-300 border border-green-500/30 flex items-center gap-3 shadow-glow-green">
          <CheckCircle2 className="text-green-600 dark:text-green-400 shrink-0" size={24} />
          <span>¡Configuración guardada correctamente! La tabla histórica y el cronograma ya usan estos valores.</span>
        </div>
      )}

      <form action={adminGroupSaveSettings} className="space-y-5">
        <input type="hidden" name="groupId" value={group.id} />
        <input type="hidden" name="groupSlug" value={group.slug} />

        {/* ─── Puntos de la Tabla Histórica ─── */}
        <div className="card space-y-4 border-pitch-200/80 dark:border-zinc-800">
          <div className="flex items-center gap-2 border-b border-pitch-100/60 dark:border-zinc-800 pb-2">
            <Trophy size={20} className="text-amber-500" />
            <h2 className="font-bold text-pitch-800 dark:text-zinc-100">
              Sistema de Puntos (Tabla Histórica)
            </h2>
          </div>

          <p className="text-xs text-pitch-900/60 dark:text-zinc-400">
            Elegí cuántos puntos suma cada jugador según el resultado del partido.
            Los cambios se aplican automáticamente a la tabla histórica del grupo.
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-pitch-50/50 dark:bg-zinc-800/50 border border-pitch-100 dark:border-zinc-700 text-center">
              <label className="block text-xs font-bold text-pitch-700 dark:text-pitch-400 mb-1">
                Victoria (G)
              </label>
              <input
                type="number"
                name="ptsWin"
                defaultValue={group.ptsWin ?? 3}
                min={0}
                max={10}
                className="input text-center font-extrabold text-xl py-1.5 w-full"
                required
              />
              <span className="text-[10px] text-pitch-900/40 dark:text-zinc-500 mt-1 block">pts</span>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-zinc-700 text-center">
              <label className="block text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">
                Empate (E)
              </label>
              <input
                type="number"
                name="ptsDraw"
                defaultValue={group.ptsDraw ?? 2}
                min={0}
                max={10}
                className="input text-center font-extrabold text-xl py-1.5 w-full"
                required
              />
              <span className="text-[10px] text-amber-900/40 dark:text-zinc-500 mt-1 block">pts</span>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-center">
              <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                Derrota (P)
              </label>
              <input
                type="number"
                name="ptsLoss"
                defaultValue={group.ptsLoss ?? 1}
                min={0}
                max={10}
                className="input text-center font-extrabold text-xl py-1.5 w-full"
                required
              />
              <span className="text-[10px] text-zinc-400 mt-1 block">pts</span>
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-3 text-xs space-y-1.5 text-pitch-900/70 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
            <p className="font-semibold text-pitch-800 dark:text-zinc-200">Ejemplos comunes:</p>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li><strong>3 - 2 - 1 (Amateur / Asistencia):</strong> Premia venir a jugar aunque se pierda (3 por ganar, 2 por empatar, 1 por asistir y perder).</li>
              <li><strong>3 - 1 - 0 (Fútbol Tradicional):</strong> Sistema estándar de ligas (3 victoria, 1 empate, 0 derrota).</li>
              <li><strong>2 - 1 - 0 (Clásico Antiguo):</strong> El formato histórico tradicional (2 victoria, 1 empate, 0 derrota).</li>
            </ul>
          </div>
        </div>

        {/* ─── Día y Horario Habitual ─── */}
        <div className="card space-y-4 border-pitch-200/80 dark:border-zinc-800">
          <div className="flex items-center gap-2 border-b border-pitch-100/60 dark:border-zinc-800 pb-2">
            <Calendar size={20} className="text-pitch-600" />
            <h2 className="font-bold text-pitch-800 dark:text-zinc-100">
              Día y Horario Habitual del Partido
            </h2>
          </div>

          <p className="text-xs text-pitch-900/60 dark:text-zinc-400">
            Se utiliza para sugerir la fecha y hora al abrir un nuevo partido.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-pitch-900/70 dark:text-zinc-300">
                Día habitual de juego
              </label>
              <select
                name="defaultDayOfWeek"
                defaultValue={group.defaultDayOfWeek !== null && group.defaultDayOfWeek !== undefined ? String(group.defaultDayOfWeek) : ""}
                className="input w-full"
              >
                <option value="">Sin día fijo (se define por partido)</option>
                <option value="1">Lunes</option>
                <option value="2">Martes</option>
                <option value="3">Miércoles</option>
                <option value="4">Jueves</option>
                <option value="5">Viernes</option>
                <option value="6">Sábado</option>
                <option value="0">Domingo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-pitch-900/70 dark:text-zinc-300">
                Hora habitual
              </label>
              <input
                type="time"
                name="defaultTime"
                defaultValue={group.defaultTime ?? "21:00"}
                className="input w-full"
                required
              />
            </div>
          </div>
        </div>

        {/* ─── Formato y Capacidad ─── */}
        <div className="card space-y-4 border-pitch-200/80 dark:border-zinc-800">
          <div className="flex items-center gap-2 border-b border-pitch-100/60 dark:border-zinc-800 pb-2">
            <Users size={20} className="text-blue-600" />
            <h2 className="font-bold text-pitch-800 dark:text-zinc-100">
              Formato y Cupos por Defecto
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-pitch-900/70 dark:text-zinc-300">
                Formato de juego
              </label>
              <select name="format" defaultValue={group.format} className="input w-full">
                <option value="F5">Fútbol 5</option>
                <option value="F6">Fútbol 6</option>
                <option value="F7">Fútbol 7</option>
                <option value="F8">Fútbol 8</option>
                <option value="F11">Fútbol 11</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-pitch-900/70 dark:text-zinc-300">
                Capacidad total de titulares
              </label>
              <input
                type="number"
                name="defaultCapacity"
                defaultValue={group.defaultCapacity}
                min={4}
                max={30}
                className="input w-full"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-pitch-900/70 dark:text-zinc-300">
              Nombre del grupo
            </label>
            <input
              name="name"
              defaultValue={group.name}
              className="input w-full"
              required
            />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full py-3 font-bold text-base shadow-glow-green">
          💾 Guardar configuración
        </button>
      </form>
    </div>
  );
}
