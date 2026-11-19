import { Hono } from "hono";
import { z } from "zod";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import {
  db,
  pushSubscriptions,
  matches,
  groups,
  signups,
  matchVotes,
} from "@/db";
import { getCurrentPlayer } from "@/lib/session";
import { getGroupBySlug } from "@/lib/groups";
import {
  createMercadoPagoPreference,
  createStripeCheckoutSession,
  verifyAndActivateMercadoPagoPayment,
  verifyMercadoPagoWebhookSignature,
  activateGroupPro,
  deactivateGroupProBySubscription,
  verifyStripeWebhookSignature,
} from "@/lib/billing";
import { PRO_PLANS, type ProPlanId } from "@/lib/plans";
import {
  generateMatchChronicle,
  cleanAudioText,
  type ChronicleInput,
} from "@/lib/ai-chronicle";
import { isAuthorizedCron } from "@/lib/cron";
import { openNextMatch, closeSignups } from "@/lib/match-actions";
import { getCurrentMatch } from "@/lib/queries";
import { pushToGroupMembers } from "@/lib/push";
import { formatArt } from "@/lib/time";

export const apiRoutesApp = new Hono();

// ─── Billing Checkout ───────────────────────────────────────────────────────
const checkoutSchema = z.object({
  groupSlug: z.string().min(1),
  planId: z.enum(["pro_monthly", "pro_annual", "pro_lifetime"]).default("pro_annual"),
  provider: z.enum(["mercadopago", "stripe"]).default("mercadopago"),
});

apiRoutesApp.post("/billing/checkout", async (c) => {
  try {
    const player = await getCurrentPlayer();
    if (!player) {
      return c.json({ error: "Debés iniciar sesión para activar FulboMundial PRO." }, 401);
    }

    const raw = await c.req.json();
    const parsed = checkoutSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json(
        { error: "Datos de checkout inválidos.", details: parsed.error.flatten() },
        400
      );
    }

    const { groupSlug, planId, provider } = parsed.data;
    const group = await getGroupBySlug(groupSlug);
    if (!group) {
      return c.json({ error: "Grupo no encontrado." }, 404);
    }
    if (!PRO_PLANS[planId as ProPlanId]) {
      return c.json({ error: "Plan seleccionado inválido." }, 400);
    }

    const reqOrigin = new URL(c.req.url).origin;
    const frontendOrigin =
      process.env.APP_URL ||
      (reqOrigin.includes("localhost") ? reqOrigin : "https://fulbomundial.com.ar");

    if (provider === "mercadopago") {
      const result = await createMercadoPagoPreference({
        groupId: group.id,
        groupSlug: group.slug,
        groupName: group.name,
        playerId: player.id,
        playerEmail: player.email,
        planId,
        origin: frontendOrigin,
      });

      return c.json({
        ok: true,
        provider: "mercadopago",
        checkoutUrl: result.checkoutUrl,
        preferenceId: result.preferenceId,
      });
    }

    const result = await createStripeCheckoutSession({
      groupId: group.id,
      groupSlug: group.slug,
      groupName: group.name,
      playerId: player.id,
      playerEmail: player.email,
      planId,
      origin: frontendOrigin,
    });

    return c.json({
      ok: true,
      provider: "stripe",
      checkoutUrl: result.checkoutUrl,
      sessionId: result.sessionId,
    });
  } catch (err) {
    console.error("[POST /api/billing/checkout] Error:", err);
    return c.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "No se pudo iniciar la sesión de pago. Intentá nuevamente.",
      },
      500
    );
  }
});

// ─── Chronicle & TTS ────────────────────────────────────────────────────────
apiRoutesApp.post("/chronicle", async (c) => {
  try {
    const body: ChronicleInput = await c.req.json();
    const result = await generateMatchChronicle(body);
    return c.json(result);
  } catch (error) {
    console.error("Error generating match chronicle:", error);
    return c.json({ error: "No se pudo generar la crónica del partido." }, 500);
  }
});

function splitIntoChunks(text: string, maxLen = 200): string[] {
  const cleaned = cleanAudioText(text);
  if (!cleaned) return [];

  const sentences = cleaned.split(/(?<=[.!?¡¿,;])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const s of sentences) {
    if (!s.trim()) continue;
    if ((current + " " + s).trim().length <= maxLen) {
      current = (current + " " + s).trim();
    } else {
      if (current) chunks.push(current);
      if (s.length <= maxLen) {
        current = s;
      } else {
        const words = s.split(" ");
        let temp = "";
        for (const w of words) {
          if ((temp + " " + w).trim().length <= maxLen) {
            temp = (temp + " " + w).trim();
          } else {
            if (temp) chunks.push(temp);
            temp = w;
          }
        }
        current = temp;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.slice(0, 8);
}

apiRoutesApp.post("/chronicle/tts", async (c) => {
  try {
    const body = (await c.req.json()) as { text?: string; style?: string };
    const rawText = String(body.text || "").trim();
    if (!rawText) {
      return c.json({ error: "Texto vacío" }, 400);
    }

    const chunks = splitIntoChunks(rawText, 190);
    if (chunks.length === 0) {
      return c.json({ error: "Sin contenido" }, 400);
    }

    const voice = "es_mx_002";
    const audioBase64List = await Promise.all(
      chunks.map(async (chunk) => {
        const res = await fetch("https://tiktok-tts.weilnet.workers.dev/api/generation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: chunk, voice }),
        });
        if (!res.ok) {
          throw new Error(`TTS upstream HTTP ${res.status}`);
        }
        const json = (await res.json()) as { success?: boolean; data?: string };
        if (!json.data) {
          throw new Error("TTS upstream sin audio");
        }
        return json.data;
      })
    );

    return c.json({ ok: true, chunks: audioBase64List });
  } catch (err) {
    console.warn("[api/chronicle/tts] Fallback required:", err);
    return c.json({ ok: false, error: "Fallback to local male voice" }, 502);
  }
});

// ─── Push Subscriptions ─────────────────────────────────────────────────────
apiRoutesApp.post("/push/subscribe", async (c) => {
  try {
    const body = await c.req.json();
    const sub = body?.subscription;
    if (!sub?.endpoint || !sub?.keys) {
      return c.json({ error: "Suscripción inválida" }, 400);
    }

    const player = await getCurrentPlayer();

    await db
      .insert(pushSubscriptions)
      .values({
        endpoint: sub.endpoint,
        keys: sub.keys,
        playerId: player?.id ?? null,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { keys: sub.keys, playerId: player?.id ?? null },
      });

    return c.json({ ok: true });
  } catch (e) {
    console.error("[push/subscribe]", e);
    return c.json({ error: "Error guardando la suscripción" }, 500);
  }
});

apiRoutesApp.post("/push/unsubscribe", async (c) => {
  try {
    const body = await c.req.json();
    const endpoint = body?.endpoint;
    if (!endpoint) {
      return c.json({ error: "Falta endpoint" }, 400);
    }
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    return c.json({ ok: true });
  } catch (e) {
    console.error("[push/unsubscribe]", e);
    return c.json({ error: "Error" }, 500);
  }
});

// ─── Webhooks: MercadoPago & Stripe ─────────────────────────────────────────
async function handleMercadoPagoNotification(req: Request) {
  try {
    const url = new URL(req.url);
    const body =
      req.method === "POST"
        ? ((await req.json().catch(() => ({}))) as {
            id?: string | number;
            type?: string;
            action?: string;
            topic?: string;
            data?: { id?: string | number };
          })
        : {};

    const topic =
      body.type || body.topic || url.searchParams.get("type") || url.searchParams.get("topic");
    const dataId = String(
      body.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id") || ""
    ).trim();

    if (!dataId || (topic && !topic.includes("payment"))) {
      return { status: 200 as const, payload: { received: true, ignored: true } };
    }

    const xSignature = req.headers.get("x-signature");
    const xRequestId = req.headers.get("x-request-id");

    const isValidSig = verifyMercadoPagoWebhookSignature({
      xSignature,
      xRequestId,
      dataId,
    });

    if (!isValidSig) {
      return {
        status: 401 as const,
        payload: { error: "Firma de webhook de Mercado Pago inválida." },
      };
    }

    const result = await verifyAndActivateMercadoPagoPayment(dataId);
    return { status: 200 as const, payload: { received: true, ...result } };
  } catch (err) {
    console.error("[Webhook MercadoPago] Error:", err);
    return {
      status: 500 as const,
      payload: { error: "Error procesando notificación de Mercado Pago." },
    };
  }
}

apiRoutesApp.post("/webhooks/mercadopago", async (c) => {
  const res = await handleMercadoPagoNotification(c.req.raw);
  return c.json(res.payload, res.status);
});

apiRoutesApp.get("/webhooks/mercadopago", async (c) => {
  const res = await handleMercadoPagoNotification(c.req.raw);
  return c.json(res.payload, res.status);
});

apiRoutesApp.post("/webhooks/stripe", async (c) => {
  try {
    const rawBody = await c.req.text();
    const signatureHeader = c.req.header("stripe-signature") ?? null;

    if (!verifyStripeWebhookSignature({ rawBody, signatureHeader })) {
      return c.json({ error: "Firma de webhook de Stripe inválida." }, 400);
    }

    const event = JSON.parse(rawBody) as {
      id: string;
      type: string;
      data: {
        object: {
          id?: string;
          client_reference_id?: string | null;
          customer?: string | null;
          subscription?: string | null;
          amount_total?: number | null;
          amount_paid?: number | null;
          currency?: string | null;
          payment_status?: string;
          metadata?: {
            groupId?: string;
            groupSlug?: string;
            playerId?: string;
            planId?: ProPlanId;
          };
        };
      };
    };

    const obj = event.data.object;

    if (
      event.type === "checkout.session.completed" ||
      event.type === "invoice.payment_succeeded"
    ) {
      const groupId = Number(obj.metadata?.groupId || obj.client_reference_id || 0);
      if (!groupId || Number.isNaN(groupId)) {
        return c.json({
          received: true,
          ignored: "No groupId in metadata/client_reference_id",
        });
      }

      const playerId = obj.metadata?.playerId ? Number(obj.metadata.playerId) : null;
      const planId: ProPlanId = obj.metadata?.planId || "pro_annual";
      const amountCents = obj.amount_total ?? obj.amount_paid ?? 0;

      const activation = await activateGroupPro({
        provider: "stripe",
        externalEventId: event.id,
        paymentId: obj.id,
        groupId,
        playerId,
        planId,
        amount: Math.round(amountCents / 100),
        currency: (obj.currency || "USD").toUpperCase(),
        stripeCustomerId: obj.customer ?? null,
        stripeSubscriptionId: obj.subscription ?? null,
        rawPayload: { eventId: event.id, type: event.type, sessionId: obj.id },
      });

      return c.json({
        received: true,
        activated: activation.ok,
        alreadyProcessed: activation.alreadyProcessed,
        expiresAt: activation.expiresAt,
      });
    }

    if (event.type === "customer.subscription.deleted" && obj.id) {
      await deactivateGroupProBySubscription({ stripeSubscriptionId: obj.id });
      return c.json({ received: true, deactivated: true });
    }

    return c.json({ received: true, unhandledType: event.type });
  } catch (err) {
    console.error("[POST /api/webhooks/stripe] Error:", err);
    return c.json({ error: "Error procesando webhook de Stripe." }, 500);
  }
});

// ─── Crons (HTTP + Scheduled Trigger Helpers) ───────────────────────────────
export async function executeOpenSignupsCron() {
  const match = await openNextMatch({ notify: true });
  return { ok: true, matchId: match.id, matchDate: match.matchDate };
}

export async function executeCloseSignupsCron() {
  const match = await getCurrentMatch();
  if (!match || match.status === "finished") {
    return { ok: true, skipped: "sin partido abierto" };
  }
  const selection = await closeSignups(match, { notify: true });
  return {
    ok: true,
    matchId: match.id,
    playing: selection.filter((s) => s.status === "playing").length,
    substitutes: selection.filter((s) => s.status === "substitute").length,
  };
}

export async function executeMatchReminderCron() {
  const now = new Date();
  const in1Hour = new Date(now.getTime() + 1 * 60 * 60 * 1000);
  const in6Hours = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const in20Hours = new Date(now.getTime() + 20 * 60 * 60 * 1000);
  const in28Hours = new Date(now.getTime() + 28 * 60 * 60 * 1000);
  const ago18Hours = new Date(now.getTime() - 18 * 60 * 60 * 1000);

  let sentPre24h = 0;
  let sentMatchDay = 0;
  let sentPostMatch = 0;
  let sentTrialWarnings = 0;

  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const expiringGroups = await db
    .select({
      id: groups.id,
      name: groups.name,
      slug: groups.slug,
      proExpiresAt: groups.proExpiresAt,
      proPlan: groups.proPlan,
    })
    .from(groups)
    .where(
      and(
        eq(groups.isPro, true),
        eq(groups.proPlan, "pro_trial_30d"),
        gte(groups.proExpiresAt, now),
        lte(groups.proExpiresAt, in3Days)
      )
    );

  for (const g of expiringGroups) {
    if (!g.proExpiresAt) continue;
    const diffDays = Math.max(
      1,
      Math.ceil((new Date(g.proExpiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );
    await pushToGroupMembers(g.id, {
      title: `⚠️ ¡Quedan ${diffDays} días de tu Pase Capitán PRO en ${g.name}!`,
      body: `Tu temporada de prueba está por vencer. Cumplido el plazo pasarás al plan gratis. ¡Asegurá el pase para todo el equipo!`,
      url: `/grupos/${g.slug}/pro`,
      tag: `trial-expire-${g.id}`,
    });
    sentTrialWarnings++;
  }

  const upcoming24h = await db
    .select({
      id: matches.id,
      groupId: matches.groupId,
      matchDate: matches.matchDate,
      capacity: matches.capacity,
      groupName: groups.name,
      groupSlug: groups.slug,
    })
    .from(matches)
    .innerJoin(groups, eq(groups.id, matches.groupId))
    .where(
      and(
        sql`${matches.status} <> 'finished'`,
        gte(matches.matchDate, in20Hours),
        lte(matches.matchDate, in28Hours)
      )
    );

  for (const m of upcoming24h) {
    if (!m.groupId) continue;
    const activeCountRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(signups)
      .where(and(eq(signups.matchId, m.id), eq(signups.withdrawn, false)));
    const signedCount = Number(activeCountRows[0]?.count ?? 0);

    await pushToGroupMembers(m.groupId, {
      title: `⏰ ¡Faltan 24hs para jugar en ${m.groupName}!`,
      body: `Confirmá tu asistencia (${signedCount}/${m.capacity} anotados) para que no falte uno a último momento ⚽`,
      url: `/grupos/${m.groupSlug}`,
      tag: `pre-24h-${m.id}`,
    });
    sentPre24h++;
  }

  const upcomingToday = await db
    .select({
      id: matches.id,
      groupId: matches.groupId,
      matchDate: matches.matchDate,
      groupName: groups.name,
      groupSlug: groups.slug,
    })
    .from(matches)
    .innerJoin(groups, eq(groups.id, matches.groupId))
    .where(
      and(
        sql`${matches.status} <> 'finished'`,
        gte(matches.matchDate, in1Hour),
        lte(matches.matchDate, in6Hours)
      )
    );

  for (const m of upcomingToday) {
    if (!m.groupId) continue;
    await pushToGroupMembers(m.groupId, {
      title: `¡Hoy hay fútbol en ${m.groupName}! ⚽`,
      body: `Nos vemos a las ${formatArt(m.matchDate, "HH:mm")}. ¡Mirá la formación y no llegues tarde!`,
      url: `/grupos/${m.groupSlug}/equipos`,
      tag: `match-day-${m.id}`,
    });
    sentMatchDay++;
  }

  const recentlyFinished = await db
    .select({
      id: matches.id,
      groupId: matches.groupId,
      matchDate: matches.matchDate,
      groupName: groups.name,
      groupSlug: groups.slug,
    })
    .from(matches)
    .innerJoin(groups, eq(groups.id, matches.groupId))
    .where(
      and(
        eq(matches.status, "finished"),
        gte(matches.matchDate, ago18Hours),
        lte(matches.matchDate, now)
      )
    );

  for (const m of recentlyFinished) {
    if (!m.groupId) continue;
    const voteRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(matchVotes)
      .where(eq(matchVotes.matchId, m.id));
    const votesCount = Number(voteRows[0]?.count ?? 0);

    if (votesCount < 6) {
      await pushToGroupMembers(m.groupId, {
        title: `🗳️ ¡Calificá a tus compañeros de ${m.groupName}!`,
        body: `Entrá a votar quién fue el MVP de la fecha ⭐ y el Burro de la fecha 🫏.`,
        url: `/partido/${m.id}`,
        tag: `post-vote-${m.id}`,
      });
      sentPostMatch++;
    }
  }

  return { ok: true, sentTrialWarnings, sentPre24h, sentMatchDay, sentPostMatch };
}

apiRoutesApp.get("/cron/open-signups", async (c) => {
  if (!isAuthorizedCron(c.req.raw)) return c.json({ error: "No autorizado" }, 401);
  try {
    return c.json(await executeOpenSignupsCron());
  } catch (e) {
    console.error("[cron/open-signups]", e);
    return c.json({ error: String(e) }, 500);
  }
});

apiRoutesApp.get("/cron/close-signups", async (c) => {
  if (!isAuthorizedCron(c.req.raw)) return c.json({ error: "No autorizado" }, 401);
  try {
    return c.json(await executeCloseSignupsCron());
  } catch (e) {
    console.error("[cron/close-signups]", e);
    return c.json({ error: String(e) }, 500);
  }
});

apiRoutesApp.get("/cron/match-reminder", async (c) => {
  if (!isAuthorizedCron(c.req.raw)) return c.json({ error: "No autorizado" }, 401);
  try {
    return c.json(await executeMatchReminderCron());
  } catch (e) {
    console.error("[cron/match-reminder]", e);
    return c.json({ error: String(e) }, 500);
  }
});

export async function runScheduledCron(cron: string) {
  if (cron === "0 2 * * 4") return executeOpenSignupsCron();
  if (cron === "0 15 * * 3") return executeCloseSignupsCron();
  if (cron === "0 21 * * 3" || cron === "0 21 * * *") return executeMatchReminderCron();
  return null;
}
