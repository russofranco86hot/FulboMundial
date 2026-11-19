"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Crown, CheckCircle2, Clock, AlertCircle, ArrowLeft } from "lucide-react";
import { PricingPaywall } from "@/components/pricing-paywall";
import { ProBadge } from "@/components/pro-gate";
import { useApiData, useRouteParams } from "@/lib/client-api";

type ProPageData = {
  blocked?: boolean;
  group: {
    id: number;
    name: string;
    slug: string;
    proPlan: string | null;
    proExpiresAt: string | Date | null;
  };
  superAdmin: boolean;
  proActive: boolean;
};

function GroupProContent() {
  const { groupSlug } = useRouteParams();
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const paymentId = searchParams.get("payment_id");
  const collectionId = searchParams.get("collection_id");

  const qs = new URLSearchParams();
  if (paymentId) qs.set("payment_id", paymentId);
  if (collectionId) qs.set("collection_id", collectionId);
  const querySuffix = qs.toString() ? `?${qs.toString()}` : "";

  const { data, loading } = useApiData<ProPageData>(
    groupSlug ? `/api/page-data/group/${encodeURIComponent(groupSlug)}/pro${querySuffix}` : null
  );

  if (!groupSlug || (loading && !data)) {
    return <div className="pt-8 text-center text-sm text-zinc-500">Cargando información PRO...</div>;
  }
  if (!data || data.blocked || !data.group) return null;

  const { group, superAdmin, proActive } = data;

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
            <p className="font-black">¡Pago con Mercado Pago recibido correctamente!</p>
            <p className="text-xs opacity-90 mt-0.5">
              {proActive
                ? "Tu grupo ya tiene todas las funciones PRO activas. ¡A disfrutar!"
                : "Estamos procesando la confirmación de Mercado Pago. En unos segundos verás el estado PRO activo."}
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
              Apenas Mercado Pago confirme el pago, nuestro sistema activará automáticamente el plan PRO en este grupo.
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
              No se realizó ningún cargo. Podés volver a intentarlo con Mercado Pago cuando quieras.
            </p>
          </div>
        </div>
      )}

      <PricingPaywall
        groupSlug={group.slug}
        groupName={group.name}
        isPro={proActive}
        proPlan={group.proPlan}
        proExpiresAt={group.proExpiresAt ? new Date(group.proExpiresAt).toISOString() : null}
        isSuperAdmin={superAdmin}
      />
    </div>
  );
}

export function GroupProClient() {
  return (
    <Suspense fallback={<div className="pt-8 text-center text-sm text-zinc-500">Cargando...</div>}>
      <GroupProContent />
    </Suspense>
  );
}
