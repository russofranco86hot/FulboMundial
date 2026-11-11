// Worker de entrada: Next.js (OpenNext) + Cron Triggers (reemplazo de Vercel Crons).
// @ts-ignore El archivo se genera en el build (.open-next/worker.js)
import handler from "./.open-next/worker.js";

const CRON_ROUTES: Record<string, string> = {
  "0 2 * * 4": "/api/cron/open-signups",
  "0 15 * * 3": "/api/cron/close-signups",
  "0 21 * * 3": "/api/cron/match-reminder",
  "0 21 * * *": "/api/cron/match-reminder",
};

function syncEnvToProcess(env: Record<string, unknown>) {
  if (!env || typeof process === "undefined" || !process.env) return;
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") {
      process.env[key] = value;
    }
  }
}

export default {
  async fetch(
    request: Request,
    env: Record<string, unknown>,
    ctx: { waitUntil(p: Promise<unknown>): void }
  ) {
    syncEnvToProcess(env);
    return handler.fetch(request, env, ctx);
  },

  async scheduled(
    event: { cron: string },
    env: { APP_URL?: string; CRON_SECRET?: string } & Record<string, unknown>,
    ctx: { waitUntil(p: Promise<unknown>): void }
  ) {
    syncEnvToProcess(env);
    const path = CRON_ROUTES[event.cron];
    if (!path) return;
    const req = new Request(`${env.APP_URL || "https://fulbomundial.com.ar"}${path}`, {
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    });
    ctx.waitUntil(handler.fetch(req, env, ctx));
  },
};
