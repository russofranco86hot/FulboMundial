import { getGroupBySlug, getPendingJoinRequests } from "@/lib/groups";
import { formatArt } from "@/lib/time";
import { actionApproveRequest, actionRejectRequest } from "@/app/grupos/actions";
import { Check, X, Clock, UserCheck } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SolicitudesPage({
  params,
}: {
  params: Promise<{ groupSlug: string }>;
}) {
  const { groupSlug } = await params;
  const group = await getGroupBySlug(groupSlug);
  if (!group) return notFound();

  const requests = await getPendingJoinRequests(group.id);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold text-pitch-700 dark:text-zinc-100 flex items-center gap-2">
          <UserCheck size={18} className="text-pitch-600" />
          Solicitudes de acceso
        </h2>
        <p className="text-xs text-pitch-900/60 dark:text-zinc-400 mt-0.5">
          Aprobá o rechazá los jugadores que pidieron sumarse con el código <strong>{group.inviteCode}</strong>.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="card text-center py-8 text-pitch-900/50 dark:text-zinc-400 space-y-2">
          <div className="text-3xl">✨</div>
          <p className="font-medium text-sm">No hay solicitudes pendientes.</p>
          <p className="text-xs text-pitch-900/40 dark:text-zinc-500">
            Cuando alguien use tu código de invitación, aparecerá acá para que lo apruebes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="card space-y-3 animate-slide-up">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-pitch-800 dark:text-zinc-100">{req.playerName}</h3>
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
                  <button className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-1.5">
                    <Check size={14} /> Aprobar
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
      )}
    </div>
  );
}
