import { redirect } from "next/navigation";
import { getSessionUser, getCurrentPlayer } from "@/lib/session";
import { actionCreateGroup } from "../actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NuevoGrupoPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const player = await getCurrentPlayer();
  if (!player) redirect("/grupos");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/grupos" className="btn-ghost p-2 rounded-full">
          <ArrowLeft size={20} className="text-pitch-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-pitch-700 dark:text-zinc-100">Crear grupo</h1>
          <p className="text-sm text-pitch-900/60 dark:text-zinc-400">Vas a ser el administrador</p>
        </div>
      </div>

      <form action={actionCreateGroup} className="space-y-4">
        <div className="card space-y-4">
          <h2 className="font-bold text-pitch-700 dark:text-zinc-200">Datos del grupo</h2>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-pitch-900/70 dark:text-zinc-300">
              Nombre del grupo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              placeholder="Ej: Fútbol Martes 21hs"
              required
              maxLength={80}
              className="input"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-pitch-900/70 dark:text-zinc-300">
              Descripción (opcional)
            </label>
            <textarea
              name="description"
              placeholder="Ej: Fútbol 8 en cancha de césped artificial, Martes a las 21hs"
              rows={2}
              className="input resize-none"
            />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-bold text-pitch-700 dark:text-zinc-200">Configuración del partido</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-pitch-900/70 dark:text-zinc-300">
                Formato
              </label>
              <select name="format" className="input" defaultValue="F5">
                <option value="F5">Fútbol 5</option>
                <option value="F6">Fútbol 6</option>
                <option value="F7">Fútbol 7</option>
                <option value="F8">Fútbol 8</option>
                <option value="F11">Fútbol 11</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-pitch-900/70 dark:text-zinc-300">
                Capacidad (jugadores)
              </label>
              <input
                type="number"
                name="defaultCapacity"
                defaultValue={10}
                min={4}
                max={30}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-pitch-900/70 dark:text-zinc-300">
                Día habitual
              </label>
              <select name="defaultDayOfWeek" className="input" defaultValue="">
                <option value="">Sin fijo</option>
                <option value="1">Lunes</option>
                <option value="2">Martes</option>
                <option value="3">Miércoles</option>
                <option value="4">Jueves</option>
                <option value="5">Viernes</option>
                <option value="6">Sábado</option>
                <option value="0">Domingo</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-pitch-900/70 dark:text-zinc-300">
                Hora habitual
              </label>
              <input
                type="time"
                name="defaultTime"
                defaultValue="22:00"
                className="input"
              />
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full text-base py-3">
          Crear grupo ⚽
        </button>
      </form>
    </div>
  );
}
