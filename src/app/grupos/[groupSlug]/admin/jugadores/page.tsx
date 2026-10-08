import { getGroupBySlug, getGroupMembers } from "@/lib/groups";
import { getStandings, getNonGroupPlayers } from "@/lib/queries";
import { suggestRating } from "@/lib/rating";
import { actionPromoteToAdmin, actionRemoveMember } from "@/app/grupos/actions";
import {
  adminGroupUpdatePlayer,
  adminGroupSetStars,
  adminGroupAddExistingPlayerAsMember,
  adminGroupCreateAndAddMember,
} from "../actions";
import { ArrowUp, ArrowDown, Shield, UserMinus, UserPlus, UserCheck } from "lucide-react";
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
  const nonMembers = await getNonGroupPlayers(group.id);
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
          ➕ Agregar miembros manualmente al grupo
        </summary>

        <div className="pt-2 space-y-4">
          {/* Opción 1: Seleccionar jugador ya existente */}
          {nonMembers.length > 0 && (
            <form action={adminGroupAddExistingPlayerAsMember} className="space-y-2 p-3 bg-white dark:bg-zinc-800/60 rounded-xl border border-pitch-100 dark:border-zinc-700">
              <label className="block text-xs font-bold text-pitch-800 dark:text-zinc-200">
                Sumar jugador existente al grupo:
              </label>
              <div className="flex gap-2">
                <input type="hidden" name="groupId" value={group.id} />
                <input type="hidden" name="groupSlug" value={group.slug} />
                <select name="playerId" className="input flex-1 text-sm py-2" required>
                  <option value="">Seleccionar jugador...</option>
                  {nonMembers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.stars}★{p.isGoalkeeper ? " 🧤" : ""})
                    </option>
                  ))}
                </select>
                <button className="btn-primary text-xs px-3 py-2 whitespace-nowrap">
                  Sumar al grupo
                </button>
              </div>
            </form>
          )}

          {/* Opción 2: Crear un nuevo jugador de cero */}
          <form action={adminGroupCreateAndAddMember} className="space-y-3 p-3 bg-white dark:bg-zinc-800/60 rounded-xl border border-pitch-100 dark:border-zinc-700">
            <input type="hidden" name="groupId" value={group.id} />
            <input type="hidden" name="groupSlug" value={group.slug} />
            <label className="block text-xs font-bold text-pitch-800 dark:text-zinc-200">
              Crear nuevo jugador e incorporar al grupo:
            </label>

            <div className="flex gap-2">
              <input
                name="name"
                placeholder="Nombre del jugador"
                className="input flex-1 py-1.5 text-sm"
                required
              />
              <div className="relative w-20 shrink-0">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs">⭐</span>
                <input
                  type="number"
                  name="stars"
                  step="0.5"
                  min="0"
                  max="5"
                  defaultValue="3"
                  className="input w-full pl-6 py-1.5 text-center text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer text-pitch-800 dark:text-zinc-300">
                <input type="checkbox" name="isGoalkeeper" className="rounded" />
                <span>🧤 Es arquero</span>
              </label>

              <button className="btn-primary text-xs px-3 py-1.5">
                Crear y agregar
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
                  <div className="flex items-center gap-2">
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

              {/* Formulario rápido para editar estrellas y arquero */}
              <form action={adminGroupUpdatePlayer} className="flex items-center gap-3 pt-1 border-t border-pitch-50 dark:border-zinc-800 text-xs">
                <input type="hidden" name="groupId" value={group.id} />
                <input type="hidden" name="groupSlug" value={group.slug} />
                <input type="hidden" name="id" value={m.playerId} />
                <input type="hidden" name="name" value={m.name} />
                <input type="hidden" name="email" value={m.email ?? ""} />
                {m.isHistorico && <input type="hidden" name="isHistorico" value="on" />}

                <div className="flex items-center gap-1.5">
                  <span className="text-pitch-900/60 dark:text-zinc-400">Estrellas:</span>
                  <input
                    type="number"
                    name="stars"
                    step="0.5"
                    min="0"
                    max="5"
                    defaultValue={Number(m.stars)}
                    className="input w-16 py-1 px-2 text-center text-xs"
                  />
                </div>

                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isGoalkeeper"
                    defaultChecked={m.isGoalkeeper}
                    className="rounded"
                  />
                  <span className="text-pitch-900/70 dark:text-zinc-400">🧤 Arquero</span>
                </label>

                <button type="submit" className="btn-ghost ml-auto text-xs py-1 px-2">
                  Guardar
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
