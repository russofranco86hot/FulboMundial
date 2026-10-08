import { getGroupBySlug, countPendingRequests } from "@/lib/groups";
import { getCurrentMatch, getSelection } from "@/lib/queries";
import { formatArt, nextGroupMatchDate } from "@/lib/time";
import { adminOpenGroupMatch, adminCloseGroupMatch, adminReopenGroupMatch } from "./actions";
import { Calendar, Users, PlusCircle, Lock, Unlock, Copy, UserCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function GroupAdminHome({
  params,
}: {
  params: Promise<{ groupSlug: string }>;
}) {
  const { groupSlug } = await params;
  const group = await getGroupBySlug(groupSlug);
  if (!group) return notFound();

  const match = await getCurrentMatch(group.id);
  const selection = match ? await getSelection(match) : [];
  const playing = selection.filter((s) => s.status === "playing").length;
  const subs = selection.filter((s) => s.status === "substitute").length;
  const pendingRequests = await countPendingRequests(group.id);
  const nextDate = nextGroupMatchDate(group.defaultDayOfWeek ?? 3, group.defaultTime ?? "21:00");

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Tarjeta de Código de Invitación */}
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

      {/* Alerta de solicitudes pendientes si hay */}
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

      {/* Estado del Partido Actual */}
      <div className="card space-y-3">
        <h2 className="font-bold text-pitch-800 dark:text-pitch-100">Partido actual</h2>
        {match ? (
          <>
            <p className="flex items-center gap-2 capitalize text-pitch-900/70 dark:text-zinc-400 text-sm">
              <Calendar size={16} className="text-pitch-600" />
              {formatArt(match.matchDate, "EEEE dd/MM 'a las' HH:mm")}
            </p>
            <div className="flex gap-2 text-sm">
              <span className={`chip text-xs ${match.status === 'open' ? 'bg-green-100 text-green-700' : match.status === 'closed' ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-700'}`}>
                Estado: {match.status}
              </span>
              <span className="chip flex items-center gap-1 bg-pitch-100 text-pitch-700 text-xs">
                <Users size={14} /> Anotados: {selection.length}
              </span>
            </div>
            <p className="text-xs text-pitch-900/60 dark:text-zinc-500">
              {playing} titulares ({match.capacity} cupo) · {subs} suplentes
            </p>
          </>
        ) : (
          <p className="text-pitch-900/60 dark:text-zinc-400 text-sm">No hay partido abierto.</p>
        )}
      </div>

      {/* Acciones Rápidas */}
      <div className="card space-y-3">
        <h3 className="font-bold text-pitch-800 dark:text-pitch-100 text-sm">Acciones rápidas</h3>
        
        <form action={adminOpenGroupMatch}>
          <input type="hidden" name="groupId" value={group.id} />
          <input type="hidden" name="groupSlug" value={group.slug} />
          <input type="hidden" name="matchDate" value={nextDate.toISOString()} />
          <input type="hidden" name="capacity" value={group.defaultCapacity} />
          <input type="hidden" name="format" value={group.format} />
          <button className="btn-primary w-full flex items-center justify-center gap-2">
            <PlusCircle size={18} /> Abrir próximo partido ({formatArt(nextDate, "EEE dd/MM HH:mm")})
          </button>
        </form>

        <form action={adminCloseGroupMatch}>
          <input type="hidden" name="groupId" value={group.id} />
          <input type="hidden" name="groupSlug" value={group.slug} />
          <button className="btn-ghost w-full flex items-center justify-center gap-2">
            <Lock size={18} /> Cerrar lista ahora
          </button>
        </form>

        <form action={adminReopenGroupMatch}>
          <input type="hidden" name="groupId" value={group.id} />
          <input type="hidden" name="groupSlug" value={group.slug} />
          <button className="btn-ghost w-full flex items-center justify-center gap-2">
            <Unlock size={18} /> Reabrir lista
          </button>
        </form>
      </div>
    </div>
  );
}
