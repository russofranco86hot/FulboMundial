import { getGroupBySlug } from "@/lib/groups";
import { getAllGroupPlayerComments } from "@/lib/player-comments";
import { adminGroupSavePlayerComment, adminGroupRegenerateComments } from "../actions";
import { formatArt } from "@/lib/time";
import { MessageSquareQuote, RotateCw, Save, Sparkles, Award } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function GroupAdminComentariosPage({
  params,
}: {
  params: Promise<{ groupSlug: string }>;
}) {
  const { groupSlug } = await params;
  const group = await getGroupBySlug(groupSlug);
  if (!group) return notFound();

  const commentsList = await getAllGroupPlayerComments(group.id);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pitch-100/60 dark:border-zinc-800 pb-3">
        <div>
          <h2 className="text-xl font-black text-pitch-800 dark:text-zinc-100 flex items-center gap-2">
            <MessageSquareQuote className="text-pitch-600" />
            Comentarios y Resúmenes Semanales
          </h2>
          <p className="text-xs text-pitch-900/60 dark:text-zinc-400 mt-0.5">
            Cada jugador ve su resumen personalizado en la pantalla principal. Se mantienen vigentes hasta el siguiente partido.
          </p>
        </div>

        <form action={adminGroupRegenerateComments}>
          <input type="hidden" name="groupId" value={group.id} />
          <input type="hidden" name="groupSlug" value={group.slug} />
          <button className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 whitespace-nowrap bg-pitch-50 dark:bg-zinc-800/80 border border-pitch-200 dark:border-zinc-700 hover:bg-pitch-100">
            <RotateCw size={14} className="text-pitch-600" />
            <span>Regenerar automáticos</span>
          </button>
        </form>
      </div>

      <div className="card bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/30 text-xs text-amber-900 dark:text-amber-300 p-3 flex items-start gap-2">
        <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <p>
          Podés editar el comentario de cualquier jugador cuando quieras. Al guardar, el jugador verá inmediatamente tu texto en su pantalla de inicio. Al finalizar un nuevo partido, se actualizan automáticamente según las nuevas estadísticas.
        </p>
      </div>

      <div className="space-y-3">
        {commentsList.map((item) => (
          <div
            key={item.playerId}
            className="card space-y-3 bg-white dark:bg-zinc-900/80 border-pitch-100 dark:border-zinc-800 shadow-sm p-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-pitch-800 dark:text-zinc-100 text-base">
                  {item.name}
                </span>
                <span className="text-xs font-semibold text-pitch-600 dark:text-pitch-400">
                  {item.stars}⭐
                </span>
                {item.isGoalkeeper && (
                  <span className="chip text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5">
                    🧤 Arquero
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs">
                {item.rank && (
                  <span className="chip bg-pitch-100 text-pitch-800 dark:bg-zinc-800 dark:text-zinc-300 font-bold px-2 py-0.5">
                    #{item.rank}
                  </span>
                )}
                <span className="font-black text-pitch-700 dark:text-pitch-400">
                  {item.pts ?? 0} pts
                </span>
                <span className="text-pitch-900/50 dark:text-zinc-500">
                  ({item.won ?? 0}G - {item.drawn ?? 0}E - {item.lost ?? 0}P)
                </span>
              </div>
            </div>

            <form action={adminGroupSavePlayerComment} className="space-y-2">
              <input type="hidden" name="groupId" value={group.id} />
              <input type="hidden" name="groupSlug" value={group.slug} />
              <input type="hidden" name="playerId" value={item.playerId} />

              <div className="relative">
                <textarea
                  name="comment"
                  defaultValue={item.comment}
                  rows={2}
                  className="input w-full text-sm py-2 px-3 resize-y font-normal"
                  required
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-pitch-900/50 dark:text-zinc-500">
                <span>
                  Actualizado: {formatArt(item.updatedAt, "dd/MM/yy HH:mm")}
                </span>
                <button
                  type="submit"
                  className="btn-primary text-xs px-3 py-1 flex items-center gap-1.5"
                >
                  <Save size={13} />
                  <span>Guardar</span>
                </button>
              </div>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
