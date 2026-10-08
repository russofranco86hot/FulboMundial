"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };

/**
 * Banner "Agregar a inicio". En Android/desktop usa el evento nativo
 * beforeinstallprompt. En iPhone avisa que hay que instalar la app para
 * recibir notificaciones (limitación de iOS).
 */
export function InstallBanner() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [standalone, setStandalone] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    setIsIOS(ios);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setStandalone(isStandalone);
    setDismissed(sessionStorage.getItem("fm_install_dismissed") === "1");

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  if (standalone || dismissed) return null;

  function close() {
    setDismissed(true);
    sessionStorage.setItem("fm_install_dismissed", "1");
  }

  // iOS: no hay prompt nativo → instrucciones
  if (isIOS) {
    return (
      <div className="fixed inset-x-0 top-2 z-50 mx-auto max-w-md px-4 animate-slide-down">
        <div className="card flex items-start gap-3 border-pitch-500/30 bg-pitch-50 dark:bg-zinc-800 dark:border-zinc-700 text-sm p-4 shadow-lg">
          <span className="text-2xl mt-0.5">📲</span>
          <div className="flex-1 text-pitch-800 dark:text-zinc-200">
            <b>Instalá la app</b> para recibir avisos: tocá{" "}
            <span className="font-semibold text-pitch-700 dark:text-white">Compartir</span> y luego{" "}
            <span className="font-semibold text-pitch-700 dark:text-white">“Agregar a inicio”</span>.
          </div>
          <button onClick={close} className="text-pitch-700/60 dark:text-zinc-400 hover:bg-pitch-200 dark:hover:bg-zinc-700 p-1.5 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (!deferred) return null;

  return (
    <div className="fixed inset-x-0 top-2 z-50 mx-auto max-w-md px-4 animate-slide-down">
      <div className="card flex items-center gap-3 border-pitch-500/30 bg-white dark:bg-zinc-800 dark:border-zinc-700 text-sm p-3 shadow-lg">
        <span className="text-2xl">📲</span>
        <div className="flex-1 font-medium text-pitch-800 dark:text-zinc-200">Agregá la app a tu pantalla de inicio.</div>
        <button
          onClick={async () => {
            await deferred.prompt();
            setDeferred(null);
          }}
          className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5 shadow-md"
        >
          <Download size={14} />
          Instalar
        </button>
        <button onClick={close} className="text-pitch-700/60 dark:text-zinc-400 hover:bg-pitch-100 dark:hover:bg-zinc-700 p-1.5 rounded-full transition-colors">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
