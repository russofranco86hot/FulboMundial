import { getGroupBySlug, getPendingJoinRequests } from "@/lib/groups";
import { getPendingNameRequestsForGroup } from "@/lib/name-requests";
import { formatArt } from "@/lib/time";
import {
  actionApproveRequest,
  actionRejectRequest,
  actionApproveNameChange,
  actionRejectNameChange,
} from "@/app/grupos/actions";
import { Check, X, Clock, UserCheck, Edit3, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { CopyInviteCode } from "@/components/copy-invite-code";

export const dynamic = "force-dynamic";

export default async function SolicitudesPage({
  params,
}: {
  params: Promise<{ groupSlug: string }>;
}) {
  const { groupSlug } = await params;
  const group = await getGroupBySlug(groupSlug);
  if (!group) return notFound();

  const [joinRequestsList, nameRequestsList] = await Promise.all([
    getPendingJoinRequests(group.id),
    getPendingNameRequestsForGroup(group.id),
  ]);

  const totalPending = joinRequestsList.length + nameRequestsList.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold text-pitch-700 dark:text-zinc-100 flex items-center gap-2">
          <UserCheck size={18} className="text-pitch-600" />
          Solicitudes y Aprobaciones
        </h2>
        <p className="text-xs text-pitch-900/60 dark:text-zinc-400 mt-0.5">
          Gestioná los pedidos de nuevos miembros y cambios de nombre del grupo.
        </p>
      </div>

      {totalPending === 0 ? (
        <div className="card text-center py-10 text-pitch-900/50 dark:text-zinc-400 space-y-2.5">
          <div className="text-4xl">✨</div>
          <p className="font-bold text-sm text-zinc-700 dark:text-zinc-200">No hay solicitudes pendientes.</p>
          <p className="text-xs text-pitch-900/40 dark:text-zinc-500 max-w-xs mx-auto">
            Cuando alguien use tu código <CopyInviteCode code={group.inviteCode} inline /> o solicite cambiar su nombre, aparecerá acá para que lo apruebes.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ─── 1. Solicitudes de Cambio de Nombre ─── */}
          {nameRequestsList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-pitch-800 dark:text-zinc-200 flex items-center gap-2">
                  <Edit3 size={15} className="text-amber-500" />
                  <span>Cambios de nombre ({nameRequestsList.length})</span>
                </h3>
                <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-2 py-0.5 rounded-full">
                  Requiere tu aprobación
                </span>
              </div>

              <div className="space-y-3">
                {nameRequestsList.map((req) => (
                  <div key={req.id} className="card space-y-3 border-amber-200 dark:border-amber-900/40 animate-slide-up">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{req.playerName}</h4>
                          <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded">
                            ⭐ {req.playerStars}
                          </span>
                        </div>
                        <p className="text-xs text-pitch-900/50 dark:text-zinc-400">{req.playerEmail}</p>
                      </div>
                      <span className="text-[11px] text-pitch-900/40 dark:text-zinc-500 flex items-center gap-1 shrink-0">
                        <Clock size={12} />
                        {formatArt(req.createdAt, "dd/MM HH:mm")}
                      </span>
                    </div>

                    {/* Comparación de nombre actual vs nuevo */}
                    <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-2xl flex items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block">Nombre actual</span>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300 line-through opacity-80">
                          {req.currentName}
                        </span>
                      </div>
                      <ArrowRight size={16} className="text-amber-500 shrink-0" />
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">
                          Nuevo solicitado
                        </span>
                        <span className="font-black text-sm text-amber-900 dark:text-amber-200">
                          {req.requestedName}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1 border-t border-pitch-100/50 dark:border-zinc-800">
                      <form action={actionApproveNameChange} className="flex-1">
                        <input type="hidden" name="groupId" value={group.id} />
                        <input type="hidden" name="groupSlug" value={group.slug} />
                        <input type="hidden" name="requestId" value={req.id} />
                        <button className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-1.5 shadow-sm">
                          <Check size={14} /> Aprobar nuevo nombre
                        </button>
                      </form>

                      <form action={actionRejectNameChange} className="flex-1">
                        <input type="hidden" name="groupId" value={group.id} />
                        <input type="hidden" name="groupSlug" value={group.slug} />
                        <input type="hidden" name="requestId" value={req.id} />
                        <button className="btn-ghost w-full text-xs py-2 flex items-center justify-center gap-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
                          <X size={14} /> Rechazar
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── 2. Solicitudes de Acceso al Grupo ─── */}
          {joinRequestsList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-pitch-800 dark:text-zinc-200 flex items-center gap-2">
                  <UserCheck size={15} className="text-emerald-500" />
                  <span>Nuevos miembros ({joinRequestsList.length})</span>
                </h3>
              </div>

              <div className="space-y-3">
                {joinRequestsList.map((req) => (
                  <div key={req.id} className="card space-y-3 animate-slide-up">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-extrabold text-sm text-pitch-800 dark:text-zinc-100">{req.playerName}</h4>
                        <p className="text-xs text-pitch-900/50 dark:text-zinc-400">{req.playerEmail}</p>
                      </div>
                      <span className="text-[11px] text-pitch-900/40 dark:text-zinc-500 flex items-center gap-1">
                        <Clock size={12} />
                        {formatArt(req.requestedAt, "dd/MM HH:mm")}
                      </span>
                    </div>

                    {req.message && (
                      <div className="p-2.5 bg-pitch-50 dark:bg-zinc-800 rounded-xl text-xs italic text-pitch-900/70 dark:text-zinc-300">
                        "{req.message}"
                      </div>
                    )}

                    <div className="flex gap-2 pt-1 border-t border-pitch-100/50 dark:border-zinc-800">
                      <form action={actionApproveRequest} className="flex-1">
                        <input type="hidden" name="groupId" value={group.id} />
                        <input type="hidden" name="requestId" value={req.id} />
                        <input type="hidden" name="playerId" value={req.playerId} />
                        <button className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-1.5 shadow-sm">
                          <Check size={14} /> Aprobar ingreso
                        </button>
                      </form>

                      <form action={actionRejectRequest} className="flex-1">
                        <input type="hidden" name="groupId" value={group.id} />
                        <input type="hidden" name="requestId" value={req.id} />
                        <button className="btn-ghost w-full text-xs py-2 flex items-center justify-center gap-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
                          <X size={14} /> Rechazar
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
