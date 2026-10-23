import { redirect } from "next/navigation";
import { getSessionUser, getCurrentPlayer, getPlayerGroups } from "@/lib/session";
import { getPendingNameRequestForPlayer } from "@/lib/name-requests";
import { formatArt } from "@/lib/time";
import {
  actionRequestNameChange,
  actionCancelNameRequest,
  actionUpdatePreferences,
  actionSignOut,
} from "./actions";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Shield,
  Edit3,
  Clock,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Sparkles,
  Layers,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PerfilPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/perfil")}`);
  }

  const player = await getCurrentPlayer();
  if (!player) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/perfil")}`);
  }

  const [pendingNameRequest, playerGroups, params] = await Promise.all([
    getPendingNameRequestForPlayer(player.id),
    getPlayerGroups(),
    searchParams ? await searchParams : {},
  ]);

  const initialChar = player.name ? player.name.trim().charAt(0).toUpperCase() : "•";

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/grupos" className="btn-ghost p-2 rounded-full" title="Volver a Mis Grupos">
            <ArrowLeft size={20} className="text-pitch-600 dark:text-pitch-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-pitch-700 dark:text-zinc-100">Mi Perfil</h1>
            <p className="text-xs text-pitch-900/60 dark:text-zinc-400">Configuración de tu cuenta y jugador</p>
          </div>
        </div>

        {/* Botón rápido de cerrar sesión en la cabecera */}
        <form action={actionSignOut}>
          <button
            type="submit"
            className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/40 rounded-xl font-bold"
            title="Cerrar sesión"
          >
            <LogOut size={14} />
            <span>Salir</span>
          </button>
        </form>
      </div>

      {/* Alertas de Éxito / Error */}
      {params.success && (
        <div className="rounded-2xl bg-green-500/15 p-4 text-sm font-semibold text-green-800 dark:text-green-300 border border-green-500/30 flex items-center gap-3 shadow-glow-green">
          <CheckCircle2 className="text-green-600 dark:text-green-400 shrink-0" size={22} />
          <span>{params.success}</span>
        </div>
      )}

      {params.error && (
        <div className="rounded-2xl bg-red-500/15 p-4 text-sm font-semibold text-red-800 dark:text-red-300 border border-red-500/30 flex items-center gap-3">
          <AlertCircle className="text-red-600 dark:text-red-400 shrink-0" size={22} />
          <span>{params.error}</span>
        </div>
      )}

      {/* Tarjeta de Identidad de Jugador */}
      <div className="card space-y-4 bg-gradient-to-br from-pitch-50/50 via-white to-emerald-50/30 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 border-pitch-200/80 dark:border-zinc-800">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pitch-600 to-pitch-400 text-white flex items-center justify-center font-black text-2xl shadow-glow-green shrink-0">
            {player.isGoalkeeper ? "🧤" : initialChar}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 truncate">
              {player.name}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{player.email || user.email}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="chip bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-bold px-2 py-0.5">
                ⭐ {player.stars}
              </span>
              <span className="chip bg-pitch-100 dark:bg-pitch-950/60 text-pitch-800 dark:text-pitch-300 text-[11px] font-bold px-2 py-0.5">
                <Layers size={11} className="inline mr-1" />
                {playerGroups.length} {playerGroups.length === 1 ? "grupo" : "grupos"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sección 1: Cambiar Nombre con Aprobación del Admin */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 border-b border-pitch-100/60 dark:border-zinc-800 pb-3">
          <Edit3 size={18} className="text-pitch-600 dark:text-pitch-400" />
          <h3 className="font-bold text-pitch-800 dark:text-zinc-100">Nombre en la Cancha</h3>
        </div>

        <p className="text-xs text-pitch-900/60 dark:text-zinc-400">
          Este es el nombre visible con el que aparecés en las listas de partidos, formaciones de cancha y estadísticas.
        </p>

        {pendingNameRequest ? (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300/80 dark:border-amber-800/80 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="text-amber-600 dark:text-amber-400 shrink-0" size={18} />
                <span className="font-extrabold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Solicitud en Revisión
                </span>
              </div>
              <span className="text-[11px] text-amber-700/70 dark:text-amber-400/70">
                {formatArt(pendingNameRequest.createdAt, "dd/MM HH:mm")}
              </span>
            </div>

            <div className="bg-white/80 dark:bg-zinc-900/80 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs">
              <span className="text-zinc-500 dark:text-zinc-400 block text-[11px]">Nuevo nombre solicitado:</span>
              <span className="font-black text-base text-amber-950 dark:text-amber-200">
                {pendingNameRequest.requestedName}
              </span>
            </div>

            <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              Un administrador de tu grupo debe aprobar el cambio de nombre. Una vez aprobado, se actualizará en todos tus partidos.
            </p>

            <form action={actionCancelNameRequest}>
              <input type="hidden" name="requestId" value={pendingNameRequest.id} />
              <button
                type="submit"
                className="btn-ghost text-xs py-1.5 px-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/40 rounded-xl font-bold w-full"
              >
                Cancelar solicitud
              </button>
            </form>
          </div>
        ) : (
          <form action={actionRequestNameChange} className="space-y-3">
            <div>
              <label className="block text-xs font-bold mb-1 text-pitch-800 dark:text-zinc-200">
                Solicitar nuevo nombre
              </label>
              <input
                type="text"
                name="requestedName"
                placeholder="Ej: Juanchi o tu apodo"
                defaultValue={player.name}
                minLength={2}
                maxLength={40}
                required
                className="input w-full py-2 px-3 text-sm"
              />
            </div>

            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700">
              ℹ️ Por seguridad y organización del grupo, el cambio de nombre queda sujeto a la <strong>aprobación del administrador</strong> antes de aplicarse.
            </p>

            <button type="submit" className="btn-primary w-full text-xs py-2.5 font-bold shadow-glow-green">
              Solicitar cambio de nombre
            </button>
          </form>
        )}
      </div>

      {/* Sección 2: Preferencias Futbolísticas */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 border-b border-pitch-100/60 dark:border-zinc-800 pb-3">
          <Sparkles size={18} className="text-pitch-600 dark:text-pitch-400" />
          <h3 className="font-bold text-pitch-800 dark:text-zinc-100">Preferencias de Juego</h3>
        </div>

        <form action={actionUpdatePreferences} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1 text-pitch-800 dark:text-zinc-200">
                Posición habitual
              </label>
              <select
                name="preferredPosition"
                defaultValue={player.preferredPosition ?? "MED"}
                className="input w-full py-2 px-2.5 text-xs font-semibold"
              >
                <option value="GK">🧤 Arquero (POR)</option>
                <option value="DEF">🛡️ Defensor (DEF)</option>
                <option value="MED">🎯 Mediocampista (MED)</option>
                <option value="DEL">⚡ Delantero (DEL)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-pitch-800 dark:text-zinc-200">
                Pie hábil
              </label>
              <select
                name="preferredFoot"
                defaultValue={player.preferredFoot ?? "R"}
                className="input w-full py-2 px-2.5 text-xs font-semibold"
              >
                <option value="R">🦵 Diestro</option>
                <option value="L">🦵 Zurdo</option>
                <option value="BOTH">🦵 Ambidiestro</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn-ghost w-full text-xs py-2 font-bold border-pitch-300 dark:border-pitch-700 text-pitch-700 dark:text-pitch-300">
            Guardar preferencias de juego
          </button>
        </form>
      </div>

      {/* Sección 3: Cuenta y Cerrar Sesión */}
      <div className="card space-y-4 border-red-200/60 dark:border-red-950/40">
        <div className="flex items-center gap-2 border-b border-pitch-100/60 dark:border-zinc-800 pb-3">
          <Shield size={18} className="text-zinc-500" />
          <h3 className="font-bold text-pitch-800 dark:text-zinc-100">Sesión y Cuenta</h3>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <div>
            <p className="font-semibold text-zinc-800 dark:text-zinc-200">Cuenta conectada</p>
            <p>{user.email}</p>
          </div>
        </div>

        <form action={actionSignOut} className="pt-2">
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-2xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 font-black text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <LogOut size={16} />
            <span>Cerrar sesión (Desloguearse)</span>
          </button>
        </form>
      </div>
    </div>
  );
}
