"use client";

import { useState } from "react";
import {
  Crown,
  Check,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Loader2,
  Zap,
} from "lucide-react";
import {
  PRO_PLANS,
  PRO_FEATURES_COMPARISON,
  type ProPlanId,
  type PaymentProvider,
} from "@/lib/plans";

interface PricingPaywallProps {
  groupSlug: string;
  groupName: string;
  isPro: boolean;
  proPlan?: string | null;
  proExpiresAt?: string | null;
}

export function PricingPaywall({
  groupSlug,
  groupName,
  isPro,
  proPlan,
  proExpiresAt,
}: PricingPaywallProps) {
  const [selectedPlan, setSelectedPlan] = useState<ProPlanId>("pro_annual");
  const [loadingProvider, setLoadingProvider] = useState<PaymentProvider | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activePlan = PRO_PLANS[selectedPlan];

  async function handleCheckout(provider: PaymentProvider) {
    setErrorMsg(null);
    setLoadingProvider(provider);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupSlug,
          planId: selectedPlan,
          provider,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        checkoutUrl?: string;
        error?: string;
      };

      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error || "No se pudo iniciar el checkout.");
      }

      window.location.href = data.checkoutUrl;
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Ocurrió un error al conectar con la pasarela."
      );
      setLoadingProvider(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner superior si el grupo ya es PRO */}
      {isPro && (
        <div className="rounded-3xl border-2 border-emerald-400/50 bg-gradient-to-r from-emerald-950 via-zinc-900 to-emerald-950 text-white p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-zinc-950 flex items-center justify-center shrink-0 shadow-lg">
              <Crown size={24} />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-300">
                Suscripción Activa
              </span>
              <h2 className="text-lg font-black">
                {groupName} tiene FulboMundial PRO habilitado
              </h2>
              <p className="text-xs text-zinc-300">
                Plan actual:{" "}
                <strong>
                  {proPlan && PRO_PLANS[proPlan as ProPlanId]
                    ? PRO_PLANS[proPlan as ProPlanId].name
                    : "Campeón PRO"}
                </strong>
                {proExpiresAt
                  ? ` · Vigente hasta el ${new Date(proExpiresAt).toLocaleDateString("es-AR")}`
                  : " · Acceso Vitalicio"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selector de Planes PRO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(PRO_PLANS) as ProPlanId[]).map((planKey) => {
          const plan = PRO_PLANS[planKey];
          const isSelected = selectedPlan === planKey;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative text-left rounded-3xl p-5 transition-all border-2 flex flex-col justify-between ${
                isSelected
                  ? "border-amber-400 bg-gradient-to-br from-zinc-950 via-emerald-950 to-zinc-900 text-white shadow-2xl scale-[1.01]"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 hover:border-amber-400/50"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 right-4 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-yellow-300 text-zinc-950 shadow-md">
                  {plan.badge}
                </span>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-extrabold uppercase tracking-wider ${
                      isSelected ? "text-amber-300" : "text-pitch-600 dark:text-pitch-400"
                    }`}
                  >
                    {plan.name}
                  </span>
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? "border-amber-400 bg-amber-400 text-zinc-950"
                        : "border-zinc-300 dark:border-zinc-700"
                    }`}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </span>
                </div>

                <div className="pt-1">
                  <div className="text-2xl font-black leading-none">{plan.priceArsFormatted}</div>
                  <div
                    className={`text-xs mt-1 ${
                      isSelected ? "text-zinc-300" : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    o {plan.priceUsdFormatted} Internacional · {plan.periodLabel}
                  </div>
                </div>

                <p
                  className={`text-xs pt-2 ${
                    isSelected ? "text-zinc-300" : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  {plan.description}
                </p>
              </div>

              <div
                className={`mt-4 pt-3 border-t text-[11px] font-bold flex items-center gap-1.5 ${
                  isSelected
                    ? "border-white/10 text-emerald-300"
                    : "border-zinc-100 dark:border-zinc-800 text-pitch-600 dark:text-pitch-400"
                }`}
              >
                <Zap size={13} /> Cubre a todos los miembros de {groupName}
              </div>
            </button>
          );
        })}
      </div>

      {/* Caja de Checkout (Mercado Pago + Stripe) */}
      <div className="rounded-3xl border-2 border-amber-400/50 bg-gradient-to-br from-zinc-950 via-emerald-950 to-zinc-900 text-white p-6 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-300">
              <Sparkles size={14} /> Activación Instantánea por Webhook
            </span>
            <h3 className="text-xl font-black mt-0.5">
              {activePlan.name} para “{groupName}”
            </h3>
            <p className="text-xs text-zinc-300">
              Un solo miembro realiza el pago y se desbloquean todas las funciones PRO para el grupo entero.
            </p>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <div className="text-2xl font-black text-amber-300">
              {activePlan.priceArsFormatted}
            </div>
            <div className="text-xs text-zinc-400">
              ({activePlan.priceUsdFormatted} vía Stripe)
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-2xl bg-red-500/20 border border-red-400/40 p-3.5 text-xs font-semibold text-red-200">
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={loadingProvider !== null}
            onClick={() => handleCheckout("mercadopago")}
            className="py-3.5 px-5 rounded-2xl bg-[#009EE3] hover:bg-[#0088c7] disabled:opacity-60 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#009EE3]/30 transition-all"
          >
            {loadingProvider === "mercadopago" ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Redirigiendo a Mercado Pago...
              </>
            ) : (
              <>
                <CreditCard size={18} /> Pagar con Mercado Pago ({activePlan.priceArsFormatted})
              </>
            )}
          </button>

          <button
            type="button"
            disabled={loadingProvider !== null}
            onClick={() => handleCheckout("stripe")}
            className="py-3.5 px-5 rounded-2xl bg-[#635BFF] hover:bg-[#5249e0] disabled:opacity-60 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#635BFF]/30 transition-all"
          >
            {loadingProvider === "stripe" ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Redirigiendo a Stripe...
              </>
            ) : (
              <>
                <CreditCard size={18} /> Pagar con Stripe ({activePlan.priceUsdFormatted})
              </>
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-zinc-400 pt-1">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck size={14} className="text-emerald-400" /> Pagos encriptados SSL 256-bit
          </span>
          <span>•</span>
          <span>Activación automática al acreditarse el pago</span>
          <span>•</span>
          <span>Sin comisiones ocultas</span>
        </div>
      </div>

      {/* Tabla Comparativa Free vs PRO */}
      <div className="card overflow-hidden p-0 border border-zinc-200 dark:border-zinc-800">
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60">
          <h3 className="font-black text-base text-zinc-900 dark:text-zinc-100">
            Comparativa de Planes: Potrero (Gratis) vs Campeón PRO
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            La gestión del partido de la semana es gratis para siempre; el Plan PRO destraba todo el folclore e inteligencia artificial.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left bg-white dark:bg-zinc-950">
                <th className="p-3.5 font-bold text-zinc-600 dark:text-zinc-400">Funcionalidad</th>
                <th className="p-3.5 text-center font-bold text-zinc-600 dark:text-zinc-400">
                  Plan Potrero (Gratis)
                </th>
                <th className="p-3.5 text-center font-black text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20">
                  ⭐ Plan Campeón PRO
                </th>
              </tr>
            </thead>
            <tbody>
              {PRO_FEATURES_COMPARISON.map((row) => (
                <tr
                  key={row.feature}
                  className="border-b border-zinc-100 dark:border-zinc-800/60 last:border-0"
                >
                  <td className="p-3.5 font-medium text-zinc-900 dark:text-zinc-100">
                    {row.feature}
                  </td>
                  <td className="p-3.5 text-center text-zinc-500 dark:text-zinc-400">
                    {row.free}
                  </td>
                  <td className="p-3.5 text-center font-extrabold text-emerald-700 dark:text-emerald-300 bg-amber-50/30 dark:bg-amber-950/10">
                    {row.pro}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
