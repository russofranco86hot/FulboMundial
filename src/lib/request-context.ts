import { AsyncLocalStorage } from "node:async_hooks";

export type ContextUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  googleId?: string;
};

export type RequestContextState = {
  user: ContextUser | null;
  reqUrl: string;
  cookies: Record<string, string>;
  setCookies: string[];
  cacheStore: Map<symbol, Map<string, unknown>>;
};

export const requestContextStorage = new AsyncLocalStorage<RequestContextState>();

export function parseCookiesHeader(cookieHeader: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}

export function getRequestContext(): RequestContextState | undefined {
  return requestContextStorage.getStore();
}

export function runWithRequestContext<T>(
  initial: Omit<RequestContextState, "cacheStore" | "setCookies"> & { setCookies?: string[] },
  fn: () => Promise<T>
): Promise<T> {
  return requestContextStorage.run(
    {
      ...initial,
      setCookies: initial.setCookies ?? [],
      cacheStore: new Map(),
    },
    fn
  );
}

/**
 * Reemplazo liviano de React `cache()` para el Worker en Hono:
 * memoiza resultados durante el ciclo de vida de una única petición HTTP.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function requestCache<T extends (...args: any[]) => any>(fn: T): T {
  const fnKey = Symbol();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((...args: any[]) => {
    const ctx = requestContextStorage.getStore();
    if (!ctx) return fn(...args);

    let perFn = ctx.cacheStore.get(fnKey);
    if (!perFn) {
      perFn = new Map();
      ctx.cacheStore.set(fnKey, perFn);
    }

    let key = "__void__";
    if (args.length > 0) {
      try {
        key = JSON.stringify(args);
      } catch {
        key = String(args[0]);
      }
    }

    if (perFn.has(key)) {
      return perFn.get(key);
    }
    const result = fn(...args);
    perFn.set(key, result);
    return result;
  }) as T;
}
