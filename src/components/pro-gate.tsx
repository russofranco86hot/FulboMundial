import Link from "next/link";
import { Crown, Lock, Sparkles, ArrowRight, Clock, AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

export function ProBadge({
  active = false,
  isTrial = false,
  daysRemaining,
}: {
  active?: boolean;
  isTrial?: boolean;
  daysRemaining?: number | null;
}) {
  if (active) {
    if (isTrial && daysRemaining !== null && daysRemaining !== undefined) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-emerald-400 text-zinc-950 shadow-sm" title={`Temporada de prueba: quedan ${daysRemaining} días`}>
          <Clock size={12} /> Pase Capitán ({daysRemaining}d)
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-yellow-300 text-zinc-950 shadow-sm">
        <Crown size={12} /> PRO Activo
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-400/40">
      <Lock size={10} /> PRO
    </span>
  );
}

export function TrialExpiringBanner({
  groupSlug,
  daysRemaining,
}: {
  groupSlug: string;
  daysRemaining: number;
}) {
  const isLastDay = daysRemaining <= 1;

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-amber-500/70 bg-gradient-to-r from-amber-950/60 via-zinc-950 to-zinc-900 text-white p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-down">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-zinc-950 flex items-center justify-center shrink-0 shadow-md">
          <AlertTriangle size={20} className="animate-bounce" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-extrabold text-sm text-amber-300">
              {isLastDay
                ? "¡Últimas 24 horas del Pase Capitán / Prueba PRO!"
                : `¡Tu Pase Capitán finaliza en ${daysRemaining} días!`}
            </h4>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/40">
              Momento de Pérdida
            </span>
          </div>
          <p className="text-xs text-zinc-300 mt-1">
            Cumplido el plazo el grupo pasa automáticamente al Plan Gratis (se limitará el historial ilimitado, placas HD y métricas de folclore). ¡Asegurá el pase para toda la temporada!
          </p>
        </div>
      </div>

      <Link
        href={`/grupos/${groupSlug}/pro`}
        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-zinc-950 font-black text-xs sm:text-sm shrink-0 shadow-md transition-all whitespace-nowrap"
      >
        <Crown size={15} />
        Renovar a Plan PRO
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}

export function ProBanner({
  groupSlug,
  title = "Desbloqueá el Historial Ilimitado y las Métricas Picantes",
  description = "Pasate a FulboMundial PRO con tu grupo por menos de lo que sale una gaseosa por jugador.",
  ctaLabel = "Ver planes PRO",
}: {
  groupSlug: string;
  title?: string;
  description?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-r from-zinc-950 via-emerald-950 to-zinc-900 text-white p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="absolute -right-10 -top-10 w-36 h-36 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-zinc-950 flex items-center justify-center shrink-0 shadow-md">
          <Crown size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-sm sm:text-base text-white">{title}</h3>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
              Freemium PRO
            </span>
          </div>
          <p className="text-xs text-zinc-300 mt-0.5">{description}</p>
        </div>
      </div>

      <Link
        href={`/grupos/${groupSlug}/pro`}
        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-zinc-950 font-black text-xs sm:text-sm shrink-0 shadow-lg shadow-amber-400/20 transition-all"
      >
        <Sparkles size={15} />
        {ctaLabel}
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}

export function ProLockOverlay({
  isPro,
  groupSlug,
  title = "Estadísticas Avanzadas y Folclore PRO",
  description = "Desbloqueá Dúos Tóxicos, El Clásico del Grupo, Mejores Sociedades, Paternidad histórica y Rachas activas para todo el equipo.",
  children,
}: {
  isPro: boolean;
  groupSlug: string;
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  if (isPro) {
    return <>{children}</>;
  }

  return (
    <div className="relative rounded-3xl overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none select-none blur-[5px] opacity-55 saturate-50 transition-all"
      >
        {children}
      </div>

      <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-gradient-to-b from-white/40 via-white/80 to-white/95 dark:from-zinc-950/40 dark:via-zinc-950/85 dark:to-zinc-950/95 backdrop-blur-[2px]">
        <div className="max-w-md w-full rounded-3xl border-2 border-amber-400/60 bg-gradient-to-br from-zinc-950 via-emerald-950 to-zinc-900 text-white p-6 shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-zinc-950 flex items-center justify-center mx-auto shadow-lg shadow-amber-400/30">
            <Lock size={22} />
          </div>
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-amber-300">
              <Sparkles size={12} /> Exclusivo Plan Campeón PRO
            </span>
            <h3 className="text-lg sm:text-xl font-black leading-tight">{title}</h3>
            <p className="text-xs sm:text-sm text-zinc-300">{description}</p>
          </div>
          <div className="pt-1 flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href={`/grupos/${groupSlug}/pro`}
              className="inline-flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-zinc-950 font-black text-sm shadow-lg shadow-amber-400/25 transition-all"
            >
              <Crown size={16} /> Desbloquear PRO para el Grupo
            </Link>
          </div>
          <p className="text-[11px] text-zinc-400">
            Un solo pago desbloquea las métricas para todos los jugadores del grupo.
          </p>
        </div>
      </div>
    </div>
  );
}
