"use client";

import { useState } from "react";
import { Check, Copy, DollarSign, Wallet, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { actionPlayerNotifyTransfer } from "@/app/grupos/actions";

interface MatchPaymentCardProps {
  matchId: number;
  groupSlug: string;
  totalPrice: number;
  perPlayerPrice: number;
  paymentAlias: string | null;
  notes: string | null;
  paidCount: number;
  totalPlayers: number;
  myStatus: { paid: boolean; notified: boolean } | null;
  canPay: boolean;
}

export function MatchPaymentCard({
  matchId,
  groupSlug,
  totalPrice,
  perPlayerPrice,
  paymentAlias,
  notes,
  paidCount,
  totalPlayers,
  myStatus,
  canPay,
}: MatchPaymentCardProps) {
  const [copied, setCopied] = useState(false);
  const [notified, setNotified] = useState(myStatus?.notified ?? false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCopyAlias = () => {
    if (!paymentAlias) return;
    navigator.clipboard.writeText(paymentAlias);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNotifyTransfer = async () => {
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("matchId", String(matchId));
      fd.append("groupSlug", groupSlug);
      await actionPlayerNotifyTransfer(fd);
      setNotified(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pct = totalPlayers > 0 ? Math.min(100, Math.round((paidCount / totalPlayers) * 100)) : 0;

  return (
    <div className="card space-y-3.5 bg-gradient-to-br from-pitch-50/50 via-white to-emerald-50/30 dark:from-zinc-900 dark:to-zinc-950 border-emerald-500/30 shadow-sm animate-slide-up">
      <div className="flex items-center justify-between border-b border-pitch-100/60 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Wallet size={16} />
          </div>
          <h3 className="font-bold text-sm text-pitch-900 dark:text-zinc-100">
            Pago de Cancha
          </h3>
        </div>
        <span className="chip bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[11px] font-bold px-2 py-0.5">
          ${perPlayerPrice.toLocaleString("es-AR")} c/u
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="p-2.5 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-pitch-100 dark:border-zinc-700/60">
          <span className="text-[11px] text-pitch-900/60 dark:text-zinc-400 font-medium">Total Cancha</span>
          <p className="text-base font-extrabold text-pitch-900 dark:text-zinc-100">
            ${totalPrice.toLocaleString("es-AR")}
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-pitch-100 dark:border-zinc-700/60">
          <span className="text-[11px] text-pitch-900/60 dark:text-zinc-400 font-medium">Recaudación</span>
          <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
            {paidCount} de {totalPlayers} ({pct}%)
          </p>
        </div>
      </div>

      {/* Barra de progreso de pago */}
      <div className="w-full bg-pitch-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
        <div
          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Alias de pago */}
      {paymentAlias && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-pitch-50/80 dark:bg-zinc-800/60 border border-pitch-100 dark:border-zinc-700 text-xs">
          <div className="min-w-0 pr-2">
            <span className="block text-[10px] uppercase font-bold text-pitch-700 dark:text-pitch-400">
              Alias / CBU para transferir:
            </span>
            <p className="font-mono font-bold truncate text-pitch-900 dark:text-zinc-100 select-all">
              {paymentAlias}
            </p>
          </div>
          <button
            onClick={handleCopyAlias}
            type="button"
            className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1 shrink-0"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-600" />
                <span className="text-emerald-600 font-bold">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>
      )}

      {notes && (
        <p className="text-[11px] text-pitch-900/70 dark:text-zinc-400 italic">
          📌 {notes}
        </p>
      )}

      {/* Estado del usuario logueado */}
      {canPay && (
        <div className="pt-2 border-t border-pitch-100/60 dark:border-zinc-800">
          {myStatus?.paid ? (
            <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              <CheckCircle2 size={16} />
              <span>¡Tu pago está confirmado por la administración! 🎉</span>
            </div>
          ) : notified ? (
            <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">
              <Clock size={16} />
              <span>Avisaste que transferiste. Esperando confirmación del admin.</span>
            </div>
          ) : (
            <button
              onClick={handleNotifyTransfer}
              disabled={isSubmitting}
              className="btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-2 font-bold shadow-sm"
            >
              <DollarSign size={15} />
              <span>{isSubmitting ? "Enviando aviso..." : "Ya transferí mi parte 💸"}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
