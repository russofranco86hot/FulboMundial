import Link from "next/link";
import { Sparkles, Mic, Camera, Flame, BellRing, Crown, MessageCircle, ArrowRight, CheckCircle2 } from "lucide-react";

const BENEFITS = [
  { icon: Mic, text: "Crónicas y audios de relator con IA ilimitados" },
  { icon: Camera, text: "Tácticas y tarjetas EA FC en HD con el nombre de tu grupo" },
  { icon: Flame, text: "Estadísticas folclóricas completas: Amuleto, Mufa, Dúos Tóxicos y Clásicos" },
  { icon: BellRing, text: "Historial ilimitado y recordatorios automáticos a deudores" },
];

export function ProCard({
  groupName,
  groupSlug,
  isPro = false,
}: {
  groupName: string;
  groupSlug?: string;
  isPro?: boolean;
}) {
  const wa = process.env.NEXT_PUBLIC_PRO_WHATSAPP;
  const price = process.env.NEXT_PUBLIC_PRO_PRICE || "$4.000 / mes";

  const waHref = wa
    ? `https://wa.me/${wa}?text=${encodeURIComponent(
        `Hola! Quiero consultar por FulboMundial PRO para el grupo "${groupName}".`
      )}`
    : null;

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-amber-400/50 bg-gradient-to-br from-zinc-950 via-emerald-950 to-zinc-900 text-white p-5 shadow-2xl space-y-4">
      <div className="absolute -top-20 -right-20 w-56 h-56 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-black flex items-center justify-center shadow-lg shadow-amber-400/30">
            <Crown size={20} />
          </div>
          <div>
            <h3 className="font-black text-base uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-300" /> FulboMundial PRO
            </h3>
            <p className="text-xs text-zinc-300">para {groupName}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          {isPro ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-400/40 text-emerald-300 text-xs font-black">
              <CheckCircle2 size={14} /> ACTIVO
            </span>
          ) : (
            <>
              <span className="block text-lg font-black text-amber-300 leading-tight">{price}</span>
              <span className="text-[10px] text-zinc-400">por grupo, no por jugador</span>
            </>
          )}
        </div>
      </div>

      <ul className="relative space-y-2">
        {BENEFITS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-100 font-medium">
            <span className="w-6 h-6 rounded-lg bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0">
              <Icon size={13} />
            </span>
            <span className="pt-0.5">{text}</span>
          </li>
        ))}
      </ul>

      <div className="relative flex flex-col sm:flex-row gap-2 pt-1">
        {groupSlug ? (
          <Link
            href={`/grupos/${groupSlug}/pro`}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-zinc-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/25 transition-all"
          >
            <Crown size={16} />
            {isPro ? "Gestionar Suscripción PRO" : "Activar PRO (Mercado Pago / Stripe)"}
            <ArrowRight size={15} />
          </Link>
        ) : null}

        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-1.5 transition-all"
          >
            <MessageCircle size={15} /> Consultar
          </a>
        )}
      </div>
    </div>
  );
}
