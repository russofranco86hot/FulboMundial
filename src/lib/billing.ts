import "server-only";
import crypto from "crypto";
import { db, groups, subscriptionTransactions, type Group } from "@/db";
import { eq, sql } from "drizzle-orm";
import { PRO_PLANS, type ProPlanId, type PaymentProvider } from "./plans";
import { ensureDbUpgrades } from "./db-migrations";

/**
 * Determina si un grupo tiene suscripción PRO activa.
 * Soporta fecha de expiración (`proExpiresAt`) y lista blanca por variable de entorno (`PRO_WHITELIST_SLUGS`).
 */
export function isGroupPro(
  group: Pick<Group, "slug" | "isPro" | "proExpiresAt"> | null | undefined
): boolean {
  if (!group) return false;

  const whitelist = (process.env.PRO_WHITELIST_SLUGS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (whitelist.includes(group.slug.toLowerCase())) {
    return true;
  }

  if (!group.isPro) return false;

  if (group.proExpiresAt) {
    const expires = new Date(group.proExpiresAt);
    if (expires.getTime() < Date.now()) {
      return false;
    }
  }

  return true;
}

/**
 * Activa o extiende el estado PRO de un grupo de forma estrictamente idempotente.
 * Si `externalEventId` ya fue procesado antes, devuelve `{ alreadyProcessed: true }` sin duplicar tiempo.
 */
export async function activateGroupPro(opts: {
  provider: PaymentProvider | "manual";
  externalEventId: string;
  paymentId?: string;
  groupId: number;
  playerId?: number | null;
  planId: ProPlanId;
  amount: number;
  currency: string;
  rawPayload?: unknown;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  mpPreapprovalId?: string | null;
}): Promise<{ ok: boolean; alreadyProcessed: boolean; expiresAt: Date | null }> {
  await ensureDbUpgrades();

  // 1. Verificar idempotencia por externalEventId
  const existing = await db
    .select({ id: subscriptionTransactions.id })
    .from(subscriptionTransactions)
    .where(eq(subscriptionTransactions.externalEventId, opts.externalEventId))
    .limit(1);

  if (existing.length > 0) {
    return { ok: true, alreadyProcessed: true, expiresAt: null };
  }

  const plan = PRO_PLANS[opts.planId] ?? PRO_PLANS.pro_monthly;

  // 2. Obtener estado actual del grupo para extender la fecha si ya tenía días vigentes
  const [currentGroup] = await db
    .select({
      id: groups.id,
      isPro: groups.isPro,
      proExpiresAt: groups.proExpiresAt,
    })
    .from(groups)
    .where(eq(groups.id, opts.groupId))
    .limit(1);

  if (!currentGroup) {
    throw new Error(`Grupo #${opts.groupId} no encontrado al activar PRO.`);
  }

  let newExpiresAt: Date | null = null;
  if (plan.durationDays !== null) {
    const baseDate =
      currentGroup.isPro &&
      currentGroup.proExpiresAt &&
      new Date(currentGroup.proExpiresAt).getTime() > Date.now()
        ? new Date(currentGroup.proExpiresAt)
        : new Date();
    newExpiresAt = new Date(baseDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
  }

  // 3. Registrar transacción (con ON CONFLICT DO NOTHING por seguridad ante concurrencia)
  const inserted = await db
    .insert(subscriptionTransactions)
    .values({
      provider: opts.provider,
      externalEventId: opts.externalEventId,
      paymentId: opts.paymentId ?? null,
      groupId: opts.groupId,
      playerId: opts.playerId ?? null,
      planId: plan.id,
      amount: Math.round(opts.amount),
      currency: opts.currency.toUpperCase(),
      status: "approved",
      rawPayload: opts.rawPayload ?? null,
    })
    .onConflictDoNothing({ target: subscriptionTransactions.externalEventId })
    .returning({ id: subscriptionTransactions.id });

  if (inserted.length === 0) {
    return { ok: true, alreadyProcessed: true, expiresAt: newExpiresAt };
  }

  // 4. Actualizar el grupo a PRO
  await db
    .update(groups)
    .set({
      isPro: true,
      proPlan: plan.id,
      proExpiresAt: newExpiresAt,
      ...(opts.stripeCustomerId ? { stripeCustomerId: opts.stripeCustomerId } : {}),
      ...(opts.stripeSubscriptionId ? { stripeSubscriptionId: opts.stripeSubscriptionId } : {}),
      ...(opts.mpPreapprovalId ? { mpPreapprovalId: opts.mpPreapprovalId } : {}),
    })
    .where(eq(groups.id, opts.groupId));

  return { ok: true, alreadyProcessed: false, expiresAt: newExpiresAt };
}

/**
 * Desactiva la suscripción PRO cuando una suscripción recurrente se cancela definitivamente.
 */
export async function deactivateGroupProBySubscription(opts: {
  stripeSubscriptionId?: string;
  groupId?: number;
}) {
  await ensureDbUpgrades();

  if (opts.groupId) {
    await db
      .update(groups)
      .set({ isPro: false })
      .where(eq(groups.id, opts.groupId));
    return;
  }

  if (opts.stripeSubscriptionId) {
    await db
      .update(groups)
      .set({ isPro: false })
      .where(eq(groups.stripeSubscriptionId, opts.stripeSubscriptionId));
  }
}

/**
 * Crea una preferencia de pago en Mercado Pago (Checkout Pro) para el grupo.
 */
export async function createMercadoPagoPreference(opts: {
  groupId: number;
  groupSlug: string;
  groupName: string;
  playerId: number;
  playerEmail?: string | null;
  planId: ProPlanId;
  origin: string;
}): Promise<{ checkoutUrl: string; preferenceId?: string }> {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  const plan = PRO_PLANS[opts.planId] ?? PRO_PLANS.pro_monthly;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || opts.origin).replace(/\/$/, "");

  // Si no hay MP_ACCESS_TOKEN configurado pero sí hay un link directo de Mercado Pago, usarlo de fallback
  if (!accessToken) {
    const fallbackLink = process.env.NEXT_PUBLIC_MP_PRO_LINK;
    if (fallbackLink) {
      return { checkoutUrl: fallbackLink };
    }
    throw new Error(
      "Mercado Pago no está configurado aún (falta MP_ACCESS_TOKEN en las variables de entorno)."
    );
  }

  const externalReference = JSON.stringify({
    groupId: opts.groupId,
    groupSlug: opts.groupSlug,
    playerId: opts.playerId,
    planId: plan.id,
  });

  const body = {
    items: [
      {
        id: plan.id,
        title: `FulboMundial PRO — ${plan.name} (${opts.groupName})`,
        description: plan.description,
        category_id: "services",
        quantity: 1,
        currency_id: "ARS",
        unit_price: Number(plan.priceArs),
      },
    ],
    external_reference: externalReference,
    metadata: {
      group_id: String(opts.groupId),
      group_slug: opts.groupSlug,
      player_id: String(opts.playerId),
      plan_id: plan.id,
    },
    back_urls: {
      success: `${appUrl}/grupos/${opts.groupSlug}/pro?status=success&provider=mercadopago`,
      failure: `${appUrl}/grupos/${opts.groupSlug}/pro?status=failure&provider=mercadopago`,
      pending: `${appUrl}/grupos/${opts.groupSlug}/pro?status=pending&provider=mercadopago`,
    },
    auto_return: "approved",
    notification_url: `${appUrl}/api/webhooks/mercadopago`,
    statement_descriptor: "FULBOMUNDIAL",
    binary_mode: false,
  };

  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `mp-pref-${opts.groupId}-${plan.id}-${Date.now()}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error al crear preferencia de Mercado Pago (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as {
    id: string;
    init_point: string;
    sandbox_init_point?: string;
  };

  const checkoutUrl =
    process.env.MP_USE_SANDBOX === "true" && data.sandbox_init_point
      ? data.sandbox_init_point
      : data.init_point;

  return { checkoutUrl, preferenceId: data.id };
}

/**
 * Consulta un pago directamente en la API oficial de Mercado Pago (`GET /v1/payments/{id}`)
 * y si está `approved`, activa el plan PRO en el grupo correspondiente de forma idempotente.
 */
export async function verifyAndActivateMercadoPagoPayment(paymentId: string): Promise<{
  ok: boolean;
  status: string;
  activated?: boolean;
  alreadyProcessed?: boolean;
  expiresAt?: Date | null;
}> {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MP_ACCESS_TOKEN no configurado en el servidor.");
  }

  const mpRes = await fetch(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!mpRes.ok) {
    const txt = await mpRes.text();
    throw new Error(`No se pudo verificar el pago ${paymentId} en MP: ${txt}`);
  }

  const payment = (await mpRes.json()) as {
    id: number | string;
    status: string;
    transaction_amount?: number;
    currency_id?: string;
    external_reference?: string;
    metadata?: {
      group_id?: string | number;
      player_id?: string | number;
      plan_id?: string;
    };
  };

  if (payment.status !== "approved") {
    return {
      ok: true,
      status: payment.status,
      activated: false,
    };
  }

  let groupId = Number(payment.metadata?.group_id || 0);
  let playerId = payment.metadata?.player_id ? Number(payment.metadata.player_id) : null;
  let planId: ProPlanId =
    (payment.metadata?.plan_id as ProPlanId) || "pro_monthly";

  if ((!groupId || Number.isNaN(groupId)) && payment.external_reference) {
    try {
      const parsedRef = JSON.parse(payment.external_reference) as {
        groupId?: number;
        playerId?: number;
        planId?: ProPlanId;
      };
      if (parsedRef.groupId) groupId = Number(parsedRef.groupId);
      if (parsedRef.playerId) playerId = Number(parsedRef.playerId);
      if (parsedRef.planId) planId = parsedRef.planId;
    } catch {
      const asNum = Number(payment.external_reference);
      if (!Number.isNaN(asNum) && asNum > 0) {
        groupId = asNum;
      }
    }
  }

  if (!groupId || Number.isNaN(groupId)) {
    return {
      ok: false,
      status: payment.status,
      activated: false,
    };
  }

  const activation = await activateGroupPro({
    provider: "mercadopago",
    externalEventId: `mp_payment_${payment.id}`,
    paymentId: String(payment.id),
    groupId,
    playerId,
    planId,
    amount: payment.transaction_amount ?? 0,
    currency: payment.currency_id ?? "ARS",
    rawPayload: {
      id: payment.id,
      status: payment.status,
    },
  });

  return {
    ok: true,
    status: payment.status,
    activated: activation.ok,
    alreadyProcessed: activation.alreadyProcessed,
    expiresAt: activation.expiresAt,
  };
}

/**
 * Crea una sesión de Checkout en Stripe (USD / Internacional).
 */
export async function createStripeCheckoutSession(opts: {
  groupId: number;
  groupSlug: string;
  groupName: string;
  playerId: number;
  playerEmail?: string | null;
  planId: ProPlanId;
  origin: string;
}): Promise<{ checkoutUrl: string; sessionId: string }> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "Stripe no está configurado aún (falta STRIPE_SECRET_KEY en las variables de entorno)."
    );
  }

  const plan = PRO_PLANS[opts.planId] ?? PRO_PLANS.pro_monthly;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || opts.origin).replace(/\/$/, "");

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${appUrl}/grupos/${opts.groupSlug}/pro?status=success&provider=stripe&session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${appUrl}/grupos/${opts.groupSlug}/pro?status=cancelled&provider=stripe`);
  params.set("client_reference_id", String(opts.groupId));
  if (opts.playerEmail) {
    params.set("customer_email", opts.playerEmail);
  }

  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "usd");
  params.set("line_items[0][price_data][unit_amount]", String(plan.priceUsdCents));
  params.set(
    "line_items[0][price_data][product_data][name]",
    `FulboMundial PRO — ${plan.name} (${opts.groupName})`
  );
  params.set(
    "line_items[0][price_data][product_data][description]",
    plan.description
  );

  params.set("metadata[groupId]", String(opts.groupId));
  params.set("metadata[groupSlug]", opts.groupSlug);
  params.set("metadata[playerId]", String(opts.playerId));
  params.set("metadata[planId]", plan.id);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error al crear Checkout Session de Stripe (${res.status}): ${errText}`);
  }

  const session = (await res.json()) as { id: string; url: string };
  return { checkoutUrl: session.url, sessionId: session.id };
}

/**
 * Verifica la firma HMAC-SHA256 de un Webhook de Mercado Pago (`x-signature`).
 * Formato oficial de MP: manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
 */
export function verifyMercadoPagoWebhookSignature(opts: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  // Si no se configuró MP_WEBHOOK_SECRET, validaremos consultando directamente el pago en la API oficial de MP con MP_ACCESS_TOKEN
  if (!secret) return true;
  if (!opts.xSignature || !opts.dataId) return false;

  const parts = Object.fromEntries(
    opts.xSignature.split(",").map((part) => {
      const [k, v] = part.trim().split("=");
      return [k, v];
    })
  );

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${opts.dataId.toLowerCase()};request-id:${opts.xRequestId || ""};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(v1, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

/**
 * Verifica la firma HMAC-SHA256 de un Webhook de Stripe (`stripe-signature`).
 */
export function verifyStripeWebhookSignature(opts: {
  rawBody: string;
  signatureHeader: string | null;
}): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !opts.signatureHeader) return false;

  const parts = opts.signatureHeader.split(",").reduce<Record<string, string[]>>((acc, item) => {
    const [k, v] = item.trim().split("=");
    if (k && v) {
      acc[k] = acc[k] || [];
      acc[k].push(v);
    }
    return acc;
  }, {});

  const timestamp = parts.t?.[0];
  const signatures = parts.v1 || [];
  if (!timestamp || signatures.length === 0) return false;

  // Tolerancia de 5 minutos contra ataques de replay
  const tsNum = Number(timestamp);
  if (Number.isNaN(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) {
    return false;
  }

  const signedPayload = `${timestamp}.${opts.rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");

  return signatures.some((sig) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
    } catch {
      return false;
    }
  });
}
