import { getGroupBySlug } from "@/lib/groups";
import { isGroupPro } from "@/lib/billing";
import { PricingPaywall } from "@/components/pricing-paywall";
import { ProBadge } from "@/components/pro-gate";
import { Crown, CheckCircle2, Clock, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function GroupProPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupSlug: string }>;
  searchParams: Promise<{ status?: string; provider?: string }>;
}) {
  const { groupSlug } = await params;
  const { status, provider } = await searchParams;
  const group = await getGroupBySlug(groupSlug);
  if (!group) return notFound();

  const proActive = isGroupPro(group);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link
            href={`/grupos/${group.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-pitch-600 dark:text-pitch-400 hover:underline mb-2"
          >
            <ArrowLeft size={14} /> Volver al grupo {group.name}
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-pitch-800 dark:text-zinc-100 flex items-center gap-2.5 flex-wrap">
            <Crown className="text-amber-500" size={28} />
            FulboMundial PRO — {group.name}
            <ProBadge active={proActive} />
          </h1>
          <p className="text-sm text-pitch-900/60 dark:text-zinc-400 mt-1">
            Desbloqueá crónicas con IA, estadísticas de folclore completas, historial ilimitado y placas HD para todo el grupo.
          </p>
        </div>
      </div>

      {status === "success" && (
        <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/40 p-4 text-sm font-semibold text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
          <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" size={22} />
          <div>
            <p className="font-black">¡Pago recibido correctamente!</p>
            <p className="text-xs opacity-90 mt-0.5">
              {proActive
                ? "Tu grupo ya tiene todas las funciones PRO activas. ¡A disfrutar!"
                : `Estamos procesando la confirmación de ${provider === "stripe" ? "Stripe" : "Mercado Pago"} vía Webhook. En unos segundos verás el estado actualizado.`}
            </p>
          </div>
        </div>
      )}

      {status === "pending" && (
        <div className="rounded-2xl bg-amber-500/15 border border-amber-500/40 p-4 text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <Clock className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={22} />
          <div>
            <p className="font-black">Pago pendiente de acreditación</p>
            <p className="text-xs opacity-90 mt-0.5">
              Apenas la pasarela confirme el pago, nuestro Webhook activará automáticamente el plan PRO en este grupo.
            </p>
          </div>
        </div>
      )}

      {(status === "failure" || status === "cancelled") && (
        <div className="rounded-2xl bg-red-500/15 border border-red-500/40 p-4 text-sm font-semibold text-red-900 dark:text-red-200 flex items-start gap-3">
          <AlertCircle className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={22} />
          <div>
            <p className="font-black">El pago no se completó</p>
            <p className="text-xs opacity-90 mt-0.5">
              No se realizó ningún cargo. Podés volver a intentarlo con Mercado Pago o Stripe cuando quieras.
            </p>
          </div>
        </div>
      )}

      <PricingPaywall
        groupSlug={group.slug}
        groupName={group.name}
        isPro={proActive}
        proPlan={group.proPlan}
        proExpiresAt={group.proExpiresAt ? group.proExpiresAt.toISOString() : null}
      />
    </div>
  );
}
