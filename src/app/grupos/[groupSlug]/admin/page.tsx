import { getGroupBySlug, countPendingRequests } from "@/lib/groups";
import { getCurrentMatch, getSelection } from "@/lib/queries";
import { formatArt, nextGroupMatchDate } from "@/lib/time";
import {
  adminOpenGroupMatch,
  adminCloseGroupMatch,
  adminReopenGroupMatch,
  adminGroupUpdateMatch,
  adminGroupDeleteMatch,
  adminGroupFinishMatchWithoutResult,
} from "./actions";
import {
  Calendar,
  Users,
  PlusCircle,
  Lock,
  Unlock,
  UserCheck,
  CheckCircle2,
  Trash2,
  Edit3,
  Flag,
  ArrowRight,
} from "lucide-react";
import { db, matches } from "@/db";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function GroupAdminHome({
  params,
  searchParams,
}: {
  params: Promise<{ groupSlug: string }>;
  searchParams: Promise<{ saved?: string; deleted?: string; finished?: string; opened?: string }>;
}) {
  const { groupSlug } = await params;
  const { saved, deleted, finished, opened } = await searchParams;
  const group = await getGroupBySlug(groupSlug);
  if (!group) return notFound();

  // Todos los partidos del grupo
  const allGroupMatches = await db
    .select({
      id: matches.id,
      matchDate: matches.matchDate,
      status: matches.status,
      format: matches.format,
      capacity: matches.capacity,
    })
    .from(matches)
    .where(eq(matches.groupId, group.id))
    .orderBy(desc(matches.matchDate))
    .limit(20);

  const match = await getCurrentMatch(group.id);
  const selection = match ? await getSelection(match) : [];
  const playing = selection.filter((s) => s.status === "playing").length;
  const subs = selection.filter((s) => s.status === "substitute").length;
  const pendingRequests = await countPendingRequests(group.id);
  const nextDate = nextGroupMatchDate(group.defaultDayOfWeek, group.defaultTime ?? "21:00", new Date(), match?.matchDate);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Banners de confirmación */}
      {saved === "1" && (
        <div className="rounded-2xl bg-green-500/15 p-4 text-sm font-semibold text-green-800 dark:text-green-300 border border-green-500/30 flex items-center gap-3 shadow-glow-green">
          <CheckCircle2 className="text-green-600 dark:text-green-400 shrink-0" size={24} />
          <span>¡Fecha y horario del partido actualizados correctamente!</span>
        </div>
      )}
      {deleted === "1" && (
        <div className="rounded-2xl bg-amber-500/15 p-4 text-sm font-semibold text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-3">
          <CheckCircle2 className="text-amber-600 dark:text-amber-400 shrink-0" size={24} />
          <span>¡Partido eliminado con éxito!</span>
        </div>
      )}
      {finished === "1" && (
        <div className="rounded-2xl bg-blue-500/15 p-4 text-sm font-semibold text-blue-800 dark:text-blue-300 border border-blue-500/30 flex items-center gap-3">
          <CheckCircle2 className="text-blue-600 dark:text-blue-400 shrink-0" size={24} />
          <span>¡Partido marcado como finalizado/cerrado! Ya podés abrir el siguiente.</span>
        </div>
      )}
      {opened === "1" && (
        <div className="rounded-2xl bg-green-500/15 p-4 text-sm font-semibold text-green-800 dark:text-green-300 border border-green-500/30 flex items-center gap-3 shadow-glow-green">
          <CheckCircle2 className="text-green-600 dark:text-green-400 shrink-0" size={24} />
          <span>¡Nuevo partido abierto correctamente!</span>
        </div>
      )}

      {/* Código de Invitación */}
      <div className="card space-y-3 bg-gradient-to-br from-pitch-50/80 to-white dark:from-zinc-900 dark:to-zinc-950 border-pitch-200/60 dark:border-zinc-800">
        <h2 className="font-bold text-pitch-800 dark:text-zinc-100 flex items-center gap-2">
          <span>🎟️</span> Código de invitación
        </h2>
        <p className="text-xs text-pitch-900/60 dark:text-zinc-400">
          Compartí este código para que nuevos jugadores soliciten sumarse al grupo:
        </p>
        <div className="flex items-center gap-2 bg-white dark:bg-zinc-800/80 p-3 rounded-2xl border border-pitch-200/80 dark:border-zinc-700">
          <span className="font-mono text-xl font-black tracking-widest text-pitch-700 dark:text-pitch-400 select-all">
            {group.inviteCode}
          </span>
          <span className="text-xs text-pitch-900/40 dark:text-zinc-500 ml-auto font-mono">
            /grupos/unirse?code={group.inviteCode}
          </span>
        </div>
      </div>

      {/* Alerta de solicitudes pendientes */}
      {pendingRequests > 0 && (
        <div className="card bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 flex items-center justify-between p-4">
          <div className="flex items-center gap-2.5">
            <UserCheck className="text-amber-600" size={20} />
            <div>
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                {pendingRequests} solicitud{pendingRequests > 1 ? "es" : ""} pendiente{pendingRequests > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">Jugadores esperando aprobación</p>
            </div>
          </div>
          <Link
            href={`/grupos/${groupSlug}/admin/solicitudes`}
            className="btn-primary text-xs px-3 py-1.5 whitespace-nowrap bg-amber-600 hover:bg-amber-700 border-none"
          >
            Revisar →
          </Link>
        </div>
      )}

      {/* ─── Partido Actual ─── */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between border-b border-pitch-100 dark:border-zinc-800 pb-2">
          <h2 className="font-bold text-pitch-800 dark:text-pitch-100 flex items-center gap-2">
            <span>⚽</span> Partido actual
          </h2>
          {match && (
            <span
              className={`chip text-xs font-bold ${
                match.status === "open"
                  ? "bg-green-100 text-green-700"
                  : match.status === "closed"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-zinc-200 text-zinc-800"
              }`}
            >
              {match.status === "open" ? "Abierto" : match.status === "closed" ? "Lista Cerrada" : "Finalizado"}
            </span>
          )}
        </div>

        {match ? (
          <div className="space-y-4">
            <div>
              <p className="flex items-center gap-2 capitalize text-pitch-900/80 dark:text-zinc-200 font-extrabold text-base">
                <Calendar size={18} className="text-pitch-600" />
                {formatArt(match.matchDate, "EEEE dd/MM 'a las' HH:mm")}
              </p>
              <p className="text-xs text-pitch-900/60 dark:text-zinc-500 mt-1">
                {match.format} · {playing} titulares ({match.capacity} cupo) · {subs} suplentes
              </p>
            </div>

            {/* Formulario directo para modificar fecha y hora de este partido */}
            <form
              action={adminGroupUpdateMatch}
              className="space-y-2 bg-pitch-50/60 dark:bg-zinc-800/40 p-3 rounded-2xl border border-pitch-100 dark:border-zinc-700/60"
            >
              <input type="hidden" name="groupId" value={group.id} />
              <input type="hidden" name="groupSlug" value={group.slug} />
              <input type="hidden" name="matchId" value={match.id} />
              <input type="hidden" name="capacity" value={match.capacity} />
              <input type="hidden" name="format" value={match.format} />
              <input type="hidden" name="returnTo" value={`/grupos/${groupSlug}/admin`} />
              <label className="block text-xs font-bold text-pitch-800 dark:text-zinc-200">
                ✏️ Modificar día y horario de este partido actual:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="datetime-local"
                  name="matchDate"
                  defaultValue={formatArt(match.matchDate, "yyyy-MM-dd'T'HH:mm")}
                  className="input text-xs py-2 flex-1"
                  required
                />
                <button
                  type="submit"
                  className="btn-primary py-2 px-4 text-xs font-bold whitespace-nowrap shadow-sm"
                >
                  Guardar nueva fecha
                </button>
              </div>
            </form>

            {/* Acciones del partido actual */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-pitch-100 dark:border-zinc-800">
              <form action={match.status === "open" ? adminCloseGroupMatch : adminReopenGroupMatch}>
                <input type="hidden" name="groupId" value={group.id} />
                <input type="hidden" name="groupSlug" value={group.slug} />
                <input type="hidden" name="matchId" value={match.id} />
                <button className="btn-ghost w-full py-2 text-xs font-bold flex items-center justify-center gap-1.5">
                  {match.status === "open" ? (
                    <>
                      <Lock size={14} /> Cerrar lista
                    </>
                  ) : (
                    <>
                      <Unlock size={14} /> Reabrir lista
                    </>
                  )}
                </button>
              </form>

              <form action={adminGroupFinishMatchWithoutResult}>
                <input type="hidden" name="groupId" value={group.id} />
                <input type="hidden" name="groupSlug" value={group.slug} />
                <input type="hidden" name="matchId" value={match.id} />
                <button
                  type="submit"
                  className="btn-ghost w-full py-2 text-xs font-bold text-amber-700 hover:text-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 border-amber-300 dark:border-amber-800 flex items-center justify-center gap-1.5"
                  title="Finaliza este partido sin computar resultado para poder abrir el siguiente"
                >
                  <Flag size={14} /> Finalizar sin jugar
                </button>
              </form>

              <form action={adminGroupDeleteMatch}>
                <input type="hidden" name="groupId" value={group.id} />
                <input type="hidden" name="groupSlug" value={group.slug} />
                <input type="hidden" name="matchId" value={match.id} />
                <button
                  type="submit"
                  className="btn-ghost w-full py-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900/50 flex items-center justify-center gap-1.5"
                  title="Elimina este partido completamente de la base de datos"
                >
                  <Trash2 size={14} /> Eliminar partido
                </button>
              </form>
            </div>
          </div>
        ) : (
          <p className="text-pitch-900/60 dark:text-zinc-400 text-sm">No hay partido abierto.</p>
        )}
      </div>

      {/* ─── Abrir Próximo Partido ─── */}
      <div className="card space-y-3">
        <h3 className="font-bold text-pitch-800 dark:text-pitch-100 text-sm flex items-center gap-1.5">
          <PlusCircle size={16} className="text-pitch-600" /> Abrir nuevo partido
        </h3>
        <p className="text-xs text-pitch-900/60 dark:text-zinc-400">
          Programá una nueva fecha de juego. Sugiere automáticamente 7 días después del último partido.
        </p>

        <form action={adminOpenGroupMatch} className="space-y-2">
          <input type="hidden" name="groupId" value={group.id} />
          <input type="hidden" name="groupSlug" value={group.slug} />
          <input type="hidden" name="capacity" value={group.defaultCapacity} />
          <input type="hidden" name="format" value={group.format} />
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="datetime-local"
              name="matchDate"
              defaultValue={formatArt(nextDate, "yyyy-MM-dd'T'HH:mm")}
              className="input text-xs py-2 flex-1"
              required
            />
            <button className="btn-primary py-2 px-4 text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1.5 shadow-glow-green">
              <PlusCircle size={16} /> Abrir partido
            </button>
          </div>
        </form>
      </div>

      {/* ─── Todos los Partidos del Grupo (Permite eliminar partidos erróneos o duplicados) ─── */}
      {allGroupMatches.length > 0 && (
        <div className="card space-y-3">
          <h3 className="font-bold text-pitch-800 dark:text-pitch-100 text-sm">
            Todos los partidos registrados ({allGroupMatches.length})
          </h3>
          <p className="text-xs text-pitch-900/60 dark:text-zinc-400">
            Si tenés partidos creados por error o duplicados, podés eliminarlos directamente acá:
          </p>

          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {allGroupMatches.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs"
              >
                <div>
                  <span className="font-bold capitalize block text-pitch-900 dark:text-zinc-100">
                    {formatArt(m.matchDate, "EEEE dd/MM/yyyy HH:mm")}
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    #{m.id} · {m.status === "finished" ? "Finalizado" : m.status === "closed" ? "Lista Cerrada" : "Abierto"} · {m.format}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/grupos/${groupSlug}/admin/partido?matchId=${m.id}`}
                    className="btn-ghost py-1 px-2.5 text-xs font-bold flex items-center gap-1"
                  >
                    <Edit3 size={12} /> Administrar
                  </Link>

                  <form action={adminGroupDeleteMatch}>
                    <input type="hidden" name="groupId" value={group.id} />
                    <input type="hidden" name="groupSlug" value={group.slug} />
                    <input type="hidden" name="matchId" value={m.id} />
                    <button
                      type="submit"
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-red-200 dark:border-red-900/40"
                      title="Eliminar este partido"
                    >
                      <Trash2 size={14} />
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
