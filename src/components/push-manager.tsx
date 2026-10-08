"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Registra el service worker y, si el usuario lo acepta, crea la suscripción
 * push y la guarda en el servidor. Muestra un botón discreto para activar.
 */
export function PushManager() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window;
    setSupported(ok);
    if (ok) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
      setPermission(Notification.permission);
    }
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;

      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapid) {
        console.warn("Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub }),
      });
    } catch (e) {
      console.error("No se pudo activar las notificaciones", e);
    } finally {
      setBusy(false);
    }
  }

  if (!supported || permission === "granted") return null;

  return (
    <div className="fixed inset-x-0 bottom-16 z-30 mx-auto max-w-md px-4">
      <button
        onClick={enable}
        disabled={busy}
        className="btn-primary w-full text-sm shadow-lg"
      >
        🔔 {busy ? "Activando…" : "Activar notificaciones"}
      </button>
    </div>
  );
}
