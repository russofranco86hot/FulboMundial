"use client";

import { useEffect, useState } from "react";

/** Cuenta regresiva en vivo hacia un instante (ISO string). */
export function Countdown({ to, label }: { to: string; label: string }) {
  const target = new Date(to).getTime();
  // Inicia en 0 para que el HTML del server y el primer render del cliente
  // coincidan (evita errores de hidratación); se actualiza al montar.
  const [diff, setDiff] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDiff(target - Date.now());
    const id = setInterval(() => setDiff(target - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (mounted && diff <= 0) {
    return (
      <div className="text-center">
        <div className="text-xs uppercase tracking-wide text-pitch-900/50 dark:text-zinc-500">{label}</div>
        <div className="text-lg font-bold text-pitch-700 dark:text-pitch-400 animate-bounce-in">¡Ya!</div>
      </div>
    );
  }

  const safe = Math.max(0, diff);
  const d = Math.floor(safe / 86400000);
  const h = Math.floor((safe % 86400000) / 3600000);
  const m = Math.floor((safe % 3600000) / 60000);
  const s = Math.floor((safe % 60000) / 1000);

  const part = (n: number, u: string) => (
    <div className="flex flex-col items-center rounded-xl bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm px-3 py-2 shadow-sm border border-white/40 dark:border-zinc-700/40">
      <span className="text-3xl font-black tabular-nums bg-gradient-to-r from-pitch-600 to-pitch-500 bg-clip-text text-transparent">
        {String(n).padStart(2, "0")}
      </span>
      <span className="text-[10px] uppercase text-pitch-900/60 dark:text-zinc-400 font-semibold mt-0.5">{u}</span>
    </div>
  );

  return (
    <div className="text-center">
      <div className="mb-2 text-xs uppercase tracking-wide text-pitch-900/50 dark:text-zinc-500">{label}</div>
      <div className="flex items-center justify-center gap-1.5">
        {d > 0 && (
          <>
            {part(d, "días")}
            <span className="text-xl font-bold text-pitch-300 dark:text-pitch-700/50 animate-pulse-soft mb-4">:</span>
          </>
        )}
        {part(h, "hs")}
        <span className="text-xl font-bold text-pitch-300 dark:text-pitch-700/50 animate-pulse-soft mb-4">:</span>
        {part(m, "min")}
        <span className="text-xl font-bold text-pitch-300 dark:text-pitch-700/50 animate-pulse-soft mb-4">:</span>
        {part(s, "seg")}
      </div>
    </div>
  );
}
