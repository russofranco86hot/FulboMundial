"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Home, AlertTriangle } from "lucide-react";

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[FulboMundial Route Error]:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="card max-w-md w-full text-center space-y-4 p-6">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
          <AlertTriangle size={24} />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100">
            Ups, se trabó la pelota en el barro
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Ocurrió un inconveniente temporal al cargar esta pantalla.
          </p>
          {error?.digest && (
            <p className="text-[10px] font-mono text-zinc-400 pt-1">
              Código: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              reset();
              window.location.reload();
            }}
            className="btn-primary flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <RefreshCw size={14} /> Reintentar
          </button>
          <Link
            href="/"
            className="btn-ghost flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Home size={14} /> Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
