"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

const TOKEN_STORAGE_KEY = "fm_token";
const DATA_REFRESH_EVENT = "fm:data-refresh";

const responseCache = new Map<string, unknown>();

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function triggerDataRefresh(): void {
  responseCache.clear();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DATA_REFRESH_EVENT));
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers = new Headers(init.headers);
  const token = getAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });
}

function serializeArg(arg: unknown): unknown {
  if (typeof FormData !== "undefined" && arg instanceof FormData) {
    const entries: [string, string][] = [];
    arg.forEach((value, key) => {
      entries.push([key, typeof value === "string" ? value : value.name]);
    });
    return { __formData: entries };
  }
  return arg;
}

export async function callRpc<T = unknown>(
  module: string,
  fn: string,
  args: unknown[]
): Promise<T> {
  const res = await apiFetch("/api/rpc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      module,
      fn,
      args: args.map(serializeArg),
    }),
  });

  const json = (await res.json()) as {
    ok?: boolean;
    data?: T;
    error?: string;
    __redirect?: string;
  };

  if (!res.ok || !json.ok) {
    throw new Error(json.error || `Error en ${module}.${fn}`);
  }

  triggerDataRefresh();

  if (json.__redirect && typeof window !== "undefined") {
    window.location.assign(json.__redirect);
    // Retornar promesa pendiente durante la redirección para evitar parpadeos de error
    return new Promise<T>(() => {});
  }

  return json.data as T;
}

export function useApiData<T>(path: string | null): {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [data, setData] = useState<T | null>(() => {
    if (!path) return null;
    return (responseCache.get(path) as T | undefined) ?? null;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (!path) return false;
    return !responseCache.has(path);
  });
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    if (!responseCache.has(path)) {
      setLoading(true);
    }
    setError(null);

    apiFetch(path)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return (await res.json()) as T;
      })
      .then((json) => {
        if (cancelled) return;
        responseCache.set(path, json);
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Error cargando datos");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path, tick]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => reload();
    window.addEventListener(DATA_REFRESH_EVENT, handler);
    return () => window.removeEventListener(DATA_REFRESH_EVENT, handler);
  }, [reload]);

  return { data, loading, error, reload };
}

/**
 * Extrae parámetros dinámicos reales (`groupSlug`, `id`) desde la URL actual del navegador,
 * funcionando incluso cuando Cloudflare sirve el shell estático `/grupos/_` o `/partido/_`
 * sin provocar errores de hidratación.
 */
function parseRoutePath(pathname: string): { groupSlug: string; id: string } {
  const parts = pathname.split("/").filter(Boolean);
  let groupSlug = "";
  let id = "";

  if (parts[0] === "grupos" && parts[1] && parts[1] !== "nuevo" && parts[1] !== "unirse" && parts[1] !== "_") {
    groupSlug = decodeURIComponent(parts[1]);
    if (parts[2] === "historial" && parts[3] && parts[3] !== "_") {
      id = decodeURIComponent(parts[3]);
    }
  } else if ((parts[0] === "partido" || parts[0] === "historial") && parts[1] && parts[1] !== "_") {
    id = decodeURIComponent(parts[1]);
  }
  return { groupSlug, id };
}

export function useRouteParams(): { groupSlug: string; id: string } {
  const nextPathname = usePathname() || "";
  const fromNext = parseRoutePath(nextPathname);
  const [browserPath, setBrowserPath] = useState<string | null>(null);

  useEffect(() => {
    setBrowserPath(window.location.pathname);
  }, [nextPathname]);

  if (fromNext.groupSlug || fromNext.id) {
    return fromNext;
  }
  if (browserPath) {
    return parseRoutePath(browserPath);
  }
  return fromNext;
}
