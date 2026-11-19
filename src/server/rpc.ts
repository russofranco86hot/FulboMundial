import { Hono } from "hono";
import { RpcRedirectError } from "./redirect";
import * as appActions from "./actions/app-actions";
import * as adminActions from "./actions/admin-actions";
import * as gruposActions from "./actions/grupos-actions";
import * as groupAdminActions from "./actions/group-admin-actions";
import * as loginActions from "./actions/login-actions";
import * as perfilActions from "./actions/perfil-actions";
import * as superadminActions from "./actions/superadmin-actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MODULES: Record<string, Record<string, (...args: any[]) => Promise<any>>> = {
  app: appActions,
  admin: adminActions,
  grupos: gruposActions,
  "group-admin": groupAdminActions,
  login: loginActions,
  perfil: perfilActions,
  superadmin: superadminActions,
};

function deserializeArg(arg: unknown): unknown {
  if (
    arg &&
    typeof arg === "object" &&
    "__formData" in arg &&
    Array.isArray((arg as { __formData: unknown }).__formData)
  ) {
    const fd = new FormData();
    for (const pair of (arg as { __formData: [string, string][] }).__formData) {
      if (Array.isArray(pair) && pair.length >= 2) {
        fd.append(String(pair[0]), String(pair[1]));
      }
    }
    return fd;
  }
  return arg;
}

export const rpcApp = new Hono();

rpcApp.post("/", async (c) => {
  try {
    const body = (await c.req.json()) as {
      module?: string;
      fn?: string;
      args?: unknown[];
    };

    const mod = body.module ? MODULES[body.module] : undefined;
    const action = mod && body.fn ? mod[body.fn] : undefined;

    if (typeof action !== "function") {
      return c.json(
        { ok: false, error: `Acción RPC desconocida: ${body.module}.${body.fn}` },
        400
      );
    }

    const args = Array.isArray(body.args) ? body.args.map(deserializeArg) : [];
    const data = await action(...args);
    return c.json({ ok: true, data: data ?? null });
  } catch (err) {
    if (err instanceof RpcRedirectError) {
      return c.json({ ok: true, __redirect: err.url });
    }
    console.error("[RPC] Error:", err);
    return c.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Error ejecutando la acción.",
      },
      500
    );
  }
});
