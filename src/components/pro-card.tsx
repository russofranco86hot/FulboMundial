import { Sparkles, Mic, Camera, Flame, BellRing, Crown, MessageCircle } from "lucide-react";

/**
 * Tarjeta de venta "FulboMundial PRO para este Grupo".
 * Configurable por variables de entorno (Vercel):
 *  - NEXT_PUBLIC_MP_PRO_LINK: link de pago / suscripción de Mercado Pago.
 *  - NEXT_PUBLIC_PRO_WHATSAPP: número con código de país (ej. 5491122334455) para consultas.
 *  - NEXT_PUBLIC_PRO_PRICE: texto de precio (default "$4.000 / mes").
 */
const BENEFITS = [
  { icon: Mic, text: "Crónicas y audios de relator con IA ilimitados" },
  { icon: Camera, text: "Tácticas y tarjetas EA FC en HD con el nombre de tu grupo" },
  { icon: Flame, text: "Stats folclóricas completas: Amuleto, Mufa, Dúos Tóxicos y Clásicos" },
  { icon: BellRing, text: "Recordatorios automáticos a los que no pagaron" },
];

export function ProCard({ groupName }: { groupName: string }) {
  const mpLink = process.env.NEXT_PUBLIC_MP_PRO_LINK;
  const wa = process.env.NEXT_PUBLIC_PRO_WHATSAPP;
  const price = process.env.NEXT_PUBLIC_PRO_PRICE || "$4.000 / mes";

  const waHref = wa
    ? `https://wa.me/${wa}?text=${encodeURIComponent(
        `Hola! Quiero activar FulboMundial PRO para el grupo "${groupName}".`
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
          <span className="block text-lg font-black text-amber-300 leading-tight">{price}</span>
          <span className="text-[10px] text-zinc-400">por grupo, no por jugador</span>
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

      <p className="relative text-[11px] text-zinc-400">
        Son menos de medio alfajor por jugador al mes. Pagá con Mercado Pago y escribinos el nombre del grupo para activarlo.
      </p>

      <div className="relative flex flex-col sm:flex-row gap-2">
        {mpLink ? (
          <a
            href={mpLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 px-4 rounded-2xl bg-[#009EE3] hover:bg-[#0088c7] text-white font-extrabold text-sm text-center shadow-lg shadow-[#009EE3]/30 transition-all"
          >
            💳 Activar PRO con Mercado Pago
          </a>
        ) : (
          <span className="flex-1 py-3 px-4 rounded-2xl bg-white/10 text-zinc-300 font-bold text-sm text-center">
            Próximamente: pago con Mercado Pago
          </span>
        )}
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
