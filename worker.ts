import { Hono } from "hono";
import { cors } from "hono/cors";
import { authApp } from "@/server/auth-routes";
import { rpcApp } from "@/server/rpc";
import { pageDataApp } from "@/server/page-data-routes";
import { apiRoutesApp, runScheduledCron } from "@/server/api-routes";
import { extractTokenFromRequest, verifySessionJwt } from "@/lib/edge-auth";
import { parseCookiesHeader, runWithRequestContext } from "@/lib/request-context";

type WorkerEnv = Record<string, unknown> & {
  APP_URL?: string;
  CRON_SECRET?: string;
  ASSETS?: { fetch(req: Request): Promise<Response> };
};

function syncEnvToProcess(env: Record<string, unknown>) {
  if (!env || typeof process === "undefined" || !process.env) return;
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") {
      process.env[key] = value;
    }
  }
}

const ALLOWED_ORIGINS = new Set([
  "https://fulbomundial.com.ar",
  "https://www.fulbomundial.com.ar",
  "https://api.fulbomundial.com.ar",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function stripExt(seg: string): { base: string; ext: string } {
  if (seg.endsWith(".html")) return { base: seg.slice(0, -5), ext: ".html" };
  if (seg.endsWith(".txt")) return { base: seg.slice(0, -4), ext: ".txt" };
  return { base: seg, ext: "" };
}

/**
 * Mapea rutas dinámicas reales del navegador (p.ej. /grupos/mi-equipo/historial/12)
 * hacia los shells estáticos exportados con placeholder `_` (p.ej. /grupos/_/historial/_).
 */
function rewriteDynamicAssetPath(pathname: string): string | null {
  if (pathname.startsWith("/_next/") || pathname.startsWith("/api/")) return null;

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  // /grupos/[groupSlug]/...
  if (parts[0] === "grupos") {
    const seg1 = stripExt(parts[1]);
    if (seg1.base === "nuevo" || seg1.base === "unirse" || seg1.base === "_") {
      return null;
    }
    const nextParts = [...parts];
    nextParts[1] = `_${seg1.ext}`;

    // /grupos/[groupSlug]/historial/[id]
    if (nextParts.length >= 4 && nextParts[2] === "historial") {
      const seg3 = stripExt(nextParts[3]);
      if (!seg3.base.startsWith("__next.") && seg3.base !== "_") {
        nextParts[3] = `_${seg3.ext}`;
      }
    }
    return "/" + nextParts.join("/");
  }

  // /partido/[id] o /historial/[id]
  if (parts[0] === "partido" || parts[0] === "historial") {
    const seg1 = stripExt(parts[1]);
    if (!seg1.base.startsWith("__next.") && seg1.base !== "_") {
      const nextParts = [...parts];
      nextParts[1] = `_${seg1.ext}`;
      return "/" + nextParts.join("/");
    }
  }

  return null;
}

const app = new Hono<{ Bindings: WorkerEnv }>();

app.use(
  "/api/*",
  cors({
    origin: (origin) => {
      if (!origin) return "https://fulbomundial.com.ar";
      if (ALLOWED_ORIGINS.has(origin) || origin.endsWith(".workers.dev") || origin.endsWith(".pages.dev")) {
        return origin;
      }
      return "https://fulbomundial.com.ar";
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
  })
);

app.use("/api/*", async (c, next) => {
  const cookies = parseCookiesHeader(c.req.header("cookie") ?? null);
  const token = extractTokenFromRequest(c.req.raw, cookies);
  const user = token ? await verifySessionJwt(token) : null;
  const setCookies: string[] = [];

  await runWithRequestContext(
    {
      user,
      reqUrl: c.req.url,
      cookies,
      setCookies,
    },
    async () => {
      await next();
    }
  );

  for (const cookieHeader of setCookies) {
    c.res.headers.append("Set-Cookie", cookieHeader);
  }
});

app.route("/api/auth", authApp);
app.route("/api/rpc", rpcApp);
app.route("/api/page-data", pageDataApp);
app.route("/api", apiRoutesApp);

// Redirecciones legacy
app.get("/admin", (c) => c.redirect("/grupos/futbol-miercoles/admin", 308));
app.get("/admin/*", (c) => {
  const rest = c.req.path.replace(/^\/admin/, "");
  return c.redirect(`/grupos/futbol-miercoles/admin${rest}`, 308);
});
app.get("/equipos", (c) => c.redirect("/grupos/futbol-miercoles/equipos", 308));
app.get("/estadisticas", (c) => c.redirect("/grupos/futbol-miercoles/estadisticas", 308));
app.get("/historial", (c) => c.redirect("/grupos/futbol-miercoles/historial", 308));
app.get("/historial/:id", (c) => c.redirect(`/grupos/futbol-miercoles/historial/${c.req.param("id")}`, 308));

// Assets estáticos + reescritura de shells para rutas dinámicas
app.all("*", async (c) => {
  const assets = c.env?.ASSETS;
  if (!assets) {
    return c.text("Static assets binding not configured", 404);
  }

  const url = new URL(c.req.url);
  const rewritten = rewriteDynamicAssetPath(url.pathname);
  if (rewritten) {
    const rewrittenUrl = new URL(rewritten + url.search, url.origin);
    let res = await assets.fetch(new Request(rewrittenUrl.toString(), c.req.raw));
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (loc) {
        const nextUrl = new URL(loc, url.origin);
        res = await assets.fetch(new Request(nextUrl.toString(), c.req.raw));
      }
    }
    if (res.status !== 404) {
      return res;
    }
  }

  return assets.fetch(c.req.raw);
});

export default {
  async fetch(
    request: Request,
    env: WorkerEnv,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ctx: any
  ) {
    syncEnvToProcess(env);
    return app.fetch(request, env, ctx);
  },

  async scheduled(
    event: { cron: string },
    env: WorkerEnv,
    ctx: { waitUntil(p: Promise<unknown>): void }
  ) {
    syncEnvToProcess(env);
    ctx.waitUntil(
      runScheduledCron(event.cron).catch((err) => {
        console.error("[scheduled cron] Error:", event.cron, err);
      })
    );
  },
};
