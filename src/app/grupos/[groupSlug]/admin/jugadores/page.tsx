import { getGroupBySlug, getGroupMembers } from "@/lib/groups";
import { getStandings } from "@/lib/queries";
import { suggestRating } from "@/lib/rating";
import { actionPromoteToAdmin, actionRemoveMember } from "@/app/grupos/actions";
import {
  adminGroupUpdatePlayer,
  adminGroupSetStars,
  adminGroupCreateAndAddMember,
  adminGroupResetPassword,
} from "../actions";
import { ArrowUp, ArrowDown, Shield, UserMinus, UserPlus, UserCheck, Key } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function GroupAdminJugadores({
  params,
}: {
  params: Promise<{ groupSlug: string }>;
}) {
  const { groupSlug } = await params;
  const group = await getGroupBySlug(groupSlug);
  if (!group) return notFound();

  const members = await getGroupMembers(group.id);
  const standings = await getStandings(group.id);
  const statsById = new Map(standings.map((s) => [s.playerId, s]));

  // Sugerencias inteligentes de rating
  const suggestions = members
    .map((p) => {
      const st = statsById.get(p.playerId);
      if (!st) return null;
      const sug = suggestRating(
        { won: st.won, drawn: st.drawn, lost: st.lost },
        Number(p.stars)
      );
      return sug ? { player: p, sug } : null;
    })
    .filter((x): x is { player: (typeof members)[number]; sug: NonNullable<ReturnType<typeof suggestRating>> } => x !== null)
    .sort((a, b) => Math.abs(b.sug.delta) - Math.abs(a.sug.delta));

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Sugerencias de rating */}
      {suggestions.length > 0 && (
        <div className="card space-y-2 border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 animate-slide-down">
          <h3 className="font-bold text-amber-900 dark:text-amber-400">💡 Sugerencias de rating</h3>
          <p className="text-xs text-amber-900/60 dark:text-amber-400/60">
            Según el récord (G/E/P) en este grupo. Tocá “Aplicar” para ajustar las estrellas.
          </p>
          {suggestions.map(({ player, sug }) => (
            <div
              key={player.playerId}
              className="flex items-center justify-between gap-2 rounded-xl bg-white dark:bg-zinc-800 px-3 py-2 shadow-sm"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold flex items-center gap-1 dark:text-zinc-100">
                  {player.name}{" "}
                  <span className={`flex items-center ${sug.direction === "up" ? "text-green-600" : "text-red-600"}`}>
                    {Number(player.stars)}★ → {sug.suggested}★{" "}
                    {sug.direction === "up" ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />}
                  </span>
                </p>
                <p className="truncate text-[11px] text-pitch-900/50 dark:text-zinc-400">{sug.reason}</p>
              </div>
              <form action={adminGroupSetStars}>
                <input type="hidden" name="groupId" value={group.id} />
                <input type="hidden" name="groupSlug" value={group.slug} />
                <input type="hidden" name="id" value={player.playerId} />
                <input type="hidden" name="stars" value={sug.suggested} />
                <button className="btn-primary text-xs px-2.5 py-1">Aplicar</button>
              </form>
            </div>
          ))}
        </div>
      )}

      {/* Agregar Miembros Manualmente */}
      <details className="card space-y-3 bg-gradient-to-br from-pitch-50/40 to-white dark:from-zinc-900 dark:to-zinc-950">
        <summary className="cursor-pointer font-bold text-pitch-800 dark:text-zinc-100 flex items-center gap-2">
          <UserPlus size={18} className="text-pitch-600" />
          ➕ Agregar miembro manualmente al grupo
        </summary>

        <div className="pt-2">
          <form
            action={adminGroupCreateAndAddMember}
            className="space-y-3 p-4 bg-white dark:bg-zinc-800/60 rounded-xl border border-pitch-100 dark:border-zinc-700"
          >
            <input type="hidden" name="groupId" value={group.id} />
            <input type="hidden" name="groupSlug" value={group.slug} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-pitch-800 dark:text-zinc-200">
                  Nombre o apodo <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  placeholder="Ej: Franco Russo"
                  className="input w-full py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-pitch-800 dark:text-zinc-200">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="ejemplo@gmail.com"
                  className="input w-full py-2 text-sm"
                />
              </div>
            </div>

            <p className="text-[11px] text-pitch-900/60 dark:text-zinc-400">
              💡 Si ingresás su correo, cuando ese jugador inicie sesión (con Google o contraseña) quedará vinculado automáticamente a su perfil.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-pitch-100/60 dark:border-zinc-700/60">
              <div>
                <label className="block text-[11px] font-bold mb-1 text-pitch-800 dark:text-zinc-200">
                  Posición habitual:
                </label>
                <select name="preferredPosition" defaultValue="MED" className="input w-full py-1.5 px-2 text-xs">
                  <option value="GK">🧤 Arquero</option>
                  <option value="DEF">🛡️ Defensor</option>
                  <option value="MED">🎯 Mediocampista</option>
                  <option value="FWD">⚡ Delantero</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold mb-1 text-pitch-800 dark:text-zinc-200">
                  Pie hábil:
                </label>
                <select name="preferredFoot" defaultValue="R" className="input w-full py-1.5 px-2 text-xs">
                  <option value="R">🦵 Derecho</option>
                  <option value="L">🦵 Zurdo</option>
                  <option value="BOTH">🦵 Ambidiestro</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold mb-1 text-pitch-800 dark:text-zinc-200">
                  ⭐ Nivel:
                </label>
                <input
                  type="number"
                  name="stars"
                  step="0.5"
                  min="0"
                  max="5"
                  defaultValue="3"
                  className="input w-full py-1.5 px-2 text-center text-xs"
                />
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-pitch-800 dark:text-zinc-300 py-2">
                  <input type="checkbox" name="isGoalkeeper" className="rounded" />
                  <span>🧤 Arquero fijo</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-pitch-100/60 dark:border-zinc-700/60">
              <button className="btn-primary text-xs px-4 py-2">
                Agregar al grupo
              </button>
            </div>
          </form>
        </div>
      </details>

      {/* Lista de Miembros Actuales */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between border-b border-pitch-100/50 dark:border-zinc-800 pb-2">
          <h2 className="font-bold text-pitch-800 dark:text-zinc-100">
            Miembros del grupo ({members.length})
          </h2>
        </div>

        <div className="space-y-3">
          {members.map((m) => (
            <div
              key={m.memberId}
              className="rounded-2xl border border-pitch-100 dark:border-zinc-800 p-3 space-y-2.5 bg-pitch-50/20 dark:bg-zinc-800/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-pitch-800 dark:text-zinc-100">{m.name}</span>
                    {m.role === "admin" ? (
                      <span className="chip bg-pitch-600 text-white text-[10px] px-1.5 py-0.5 flex items-center gap-1">
                        <Shield size={10} /> Admin
                      </span>
                    ) : (
                      <span className="chip bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-[10px] px-1.5 py-0.5">
                        Miembro
                      </span>
                    )}
                    <span className="chip bg-pitch-100 dark:bg-pitch-950/40 text-pitch-800 dark:text-pitch-300 text-[10px] px-1.5 py-0.5">
                      {m.preferredPosition === "GK" ? "🧤 ARQ" : m.preferredPosition === "DEF" ? "🛡️ DEF" : m.preferredPosition === "DEL" || m.preferredPosition === "FWD" ? "⚡ DEL" : "🎯 MED"}
                    </span>
                    <span className="chip bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] px-1.5 py-0.5">
                      {m.preferredFoot === "L" ? "Zurdo" : m.preferredFoot === "BOTH" ? "Ambidiestro" : "Derecho"}
                    </span>
                  </div>
                  {m.email && <p className="text-xs text-pitch-900/50 dark:text-zinc-400">{m.email}</p>}
                </div>

                <div className="flex items-center gap-1">
                  {m.role !== "admin" && (
                    <form action={actionPromoteToAdmin}>
                      <input type="hidden" name="groupId" value={group.id} />
                      <input type="hidden" name="memberId" value={m.memberId} />
                      <button
                        title="Hacer Administrador"
                        className="text-xs text-pitch-600 hover:text-pitch-700 font-semibold px-2 py-1 rounded bg-pitch-50 dark:bg-zinc-800"
                      >
                        Hacer admin
                      </button>
                    </form>
                  )}

                  <form action={actionRemoveMember}>
                    <input type="hidden" name="groupId" value={group.id} />
                    <input type="hidden" name="memberId" value={m.memberId} />
                    <button
                      title="Quitar del grupo"
                      className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    >
                      <UserMinus size={15} />
                    </button>
                  </form>
                </div>
              </div>

              {/* Formulario para editar nombre, correo, estrellas, posición y pie */}
              <form action={adminGroupUpdatePlayer} className="space-y-2 pt-2 border-t border-pitch-100/60 dark:border-zinc-800 text-xs">
                <input type="hidden" name="groupId" value={group.id} />
                <input type="hidden" name="groupSlug" value={group.slug} />
                <input type="hidden" name="id" value={m.playerId} />
                {m.isHistorico && <input type="hidden" name="isHistorico" value="on" />}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-pitch-900/60 dark:text-zinc-400 mb-0.5">
                      Nombre o apodo:
                    </label>
                    <input
                      name="name"
                      defaultValue={m.name}
                      className="input w-full py-1.5 px-2 text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-pitch-900/60 dark:text-zinc-400 mb-0.5">
                      Correo electrónico:
                    </label>
                    <input
                      type="email"
                      name="email"
                      defaultValue={m.email ?? ""}
                      placeholder="Sin correo vinculado"
                      className="input w-full py-1.5 px-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-pitch-900/60 dark:text-zinc-400 mb-0.5">
                      Posición:
                    </label>
                    <select
                      name="preferredPosition"
                      defaultValue={m.preferredPosition ?? "MED"}
                      className="input w-full py-1 px-1.5 text-xs"
                    >
                      <option value="GK">🧤 Arquero</option>
                      <option value="DEF">🛡️ Defensor</option>
                      <option value="MED">🎯 Mediocampista</option>
                      <option value="FWD">⚡ Delantero</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-pitch-900/60 dark:text-zinc-400 mb-0.5">
                      Pie hábil:
                    </label>
                    <select
                      name="preferredFoot"
                      defaultValue={m.preferredFoot ?? "R"}
                      className="input w-full py-1 px-1.5 text-xs"
                    >
                      <option value="R">Derecho</option>
                      <option value="L">Zurdo</option>
                      <option value="BOTH">Ambidiestro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-pitch-900/60 dark:text-zinc-400 mb-0.5">
                      ⭐ Nivel:
                    </label>
                    <input
                      type="number"
                      name="stars"
                      step="0.5"
                      min="0"
                      max="5"
                      defaultValue={Number(m.stars)}
                      className="input w-full py-1 px-1.5 text-center text-xs"
                    />
                  </div>

                  <div className="flex flex-col justify-end pb-1">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        name="isGoalkeeper"
                        defaultChecked={m.isGoalkeeper}
                        className="rounded"
                      />
                      <span className="text-pitch-900/70 dark:text-zinc-400 text-xs">🧤 Arquero fijo</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-1">
                  <button type="submit" className="btn-primary text-xs py-1 px-3">
                    Guardar cambios
                  </button>
                </div>
              </form>

              {/* Reset o asignación de contraseña */}
              {m.email && (
                <details className="pt-1.5 border-t border-pitch-100/50 dark:border-zinc-800/60">
                  <summary className="cursor-pointer text-[11px] font-semibold text-pitch-600 dark:text-pitch-400 flex items-center gap-1 hover:underline">
                    <Key size={12} /> Restablecer o crear contraseña para este correo
                  </summary>
                  <form action={adminGroupResetPassword} className="flex items-center gap-2 pt-2">
                    <input type="hidden" name="groupId" value={group.id} />
                    <input type="hidden" name="groupSlug" value={group.slug} />
                    <input type="hidden" name="playerId" value={m.playerId} />
                    <input
                      type="password"
                      name="newPassword"
                      placeholder="Nueva clave (mínimo 6 caracteres)"
                      minLength={6}
                      className="input flex-1 py-1 px-2 text-xs"
                      required
                    />
                    <button type="submit" className="btn-secondary text-[11px] py-1 px-2.5 whitespace-nowrap">
                      Actualizar clave
                    </button>
                  </form>
                </details>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
