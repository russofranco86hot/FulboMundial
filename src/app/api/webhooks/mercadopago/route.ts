import { NextResponse } from "next/server";
import {
  activateGroupPro,
  verifyMercadoPagoWebhookSignature,
} from "@/lib/billing";
import type { ProPlanId } from "@/lib/plans";

export const runtime = "nodejs";

/**
 * Webhook oficial de Mercado Pago (IPN / Webhooks v1).
 * Escucha eventos `payment.created` y `payment.updated`.
 */
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const body = (await req.json().catch(() => ({}))) as {
      id?: string | number;
      type?: string;
      action?: string;
      data?: { id?: string | number };
    };

    const topic = body.type || url.searchParams.get("type") || url.searchParams.get("topic");
    const dataId = String(
      body.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id") || ""
    ).trim();

    // Ignorar notificaciones que no sean de pagos (p.ej. test ping vacío)
    if (!dataId || (topic && !topic.includes("payment"))) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const xSignature = req.headers.get("x-signature");
    const xRequestId = req.headers.get("x-request-id");

    const isValidSig = verifyMercadoPagoWebhookSignature({
      xSignature,
      xRequestId,
      dataId,
    });

    if (!isValidSig) {
      return NextResponse.json(
        { error: "Firma de webhook de Mercado Pago inválida." },
        { status: 401 }
      );
    }

    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json(
        { error: "MP_ACCESS_TOKEN no configurado en el servidor." },
        { status: 500 }
      );
    }

    // Consultar estado real del pago en la API de Mercado Pago (fuente de verdad)
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!mpRes.ok) {
      const txt = await mpRes.text();
      console.error(`[Webhook MP] Error consultando pago ${dataId}:`, txt);
      return NextResponse.json({ error: "No se pudo verificar el pago en MP." }, { status: 502 });
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
      return NextResponse.json({
        received: true,
        paymentId: String(payment.id),
        status: payment.status,
      });
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
      console.warn("[Webhook MP] Pago aprobado sin groupId identificable:", payment.id);
      return NextResponse.json({
        received: true,
        warning: "Pago sin groupId en external_reference/metadata",
      });
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
        action: body.action,
      },
    });

    return NextResponse.json({
      received: true,
      activated: activation.ok,
      alreadyProcessed: activation.alreadyProcessed,
      expiresAt: activation.expiresAt,
    });
  } catch (err) {
    console.error("[POST /api/webhooks/mercadopago] Error:", err);
    return NextResponse.json(
      { error: "Error procesando webhook de Mercado Pago." },
      { status: 500 }
    );
  }
}
