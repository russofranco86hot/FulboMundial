import { getGroupBySlug } from "@/lib/groups";
import { adminGroupManualPush } from "../actions";
import { WhatsAppCompose } from "@/components/whatsapp-compose";
import { Bell, MessageCircle } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function GroupAdminPush({
  params,
}: {
  params: Promise<{ groupSlug: string }>;
}) {
  const { groupSlug } = await params;
  const group = await getGroupBySlug(groupSlug);
  if (!group) return notFound();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-4">
        <div className="card border-l-4 border-l-pitch-500 rounded-l-md">
          <h2 className="font-bold text-lg flex items-center gap-2 text-pitch-800 dark:text-pitch-100">
            <Bell className="text-pitch-500" size={20} />
            Notificación Push a {group.name}
          </h2>
          <p className="text-sm text-pitch-900/60 dark:text-zinc-400 mt-1">
            Mandá un mensaje push (notificación en el teléfono) a los miembros que tengan las alertas activas.
          </p>
        </div>
        
        <form action={adminGroupManualPush} className="card space-y-3 bg-white/50 dark:bg-zinc-900/50">
          <input type="hidden" name="groupId" value={group.id} />
          <input type="hidden" name="groupSlug" value={group.slug} />
          <textarea
            name="message"
            placeholder="Ej: Muchachos, hoy se juega puntual, lleguen 10 min antes."
            className="input resize-none bg-white dark:bg-zinc-800"
            rows={3}
            required
          />
          <button className="btn-primary w-full flex items-center justify-center gap-2 shadow-glow-green">
            <Bell size={18} /> Enviar notificación push
          </button>
        </form>
      </div>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-pitch-200 dark:border-zinc-700"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#f0f9f6] dark:bg-zinc-900 px-3 text-sm text-pitch-400 dark:text-zinc-500 font-medium">O TAMBIÉN</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card border-l-4 border-l-[#25D366] rounded-l-md">
          <h2 className="font-bold text-lg flex items-center gap-2 text-zinc-800 dark:text-zinc-100">
            <MessageCircle className="text-[#25D366]" size={20} fill="currentColor" strokeWidth={0} />
            Mensaje al grupo WhatsApp
          </h2>
          <p className="text-sm text-pitch-900/60 dark:text-zinc-400 mt-1">
            Escribí el texto y mandalo directo al grupo de WhatsApp con un toque.
          </p>
        </div>
        
        <div className="card bg-white/50 dark:bg-zinc-900/50">
          <WhatsAppCompose placeholder="Ej: Muchachos, falta uno para hoy, el que se suma juega gratis." />
        </div>
      </div>
    </div>
  );
}
