import { NextResponse } from "next/server";
import {
  activateGroupPro,
  deactivateGroupProBySubscription,
  verifyStripeWebhookSignature,
} from "@/lib/billing";
import type { ProPlanId } from "@/lib/plans";

export const runtime = "nodejs";

/**
 * Webhook oficial de Stripe.
 * Escucha `checkout.session.completed`, `invoice.payment_succeeded` y `customer.subscription.deleted`.
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("stripe-signature");

    if (!verifyStripeWebhookSignature({ rawBody, signatureHeader })) {
      return NextResponse.json(
        { error: "Firma de webhook de Stripe inválida." },
        { status: 400 }
      );
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
      const groupId = Number(
        obj.metadata?.groupId || obj.client_reference_id || 0
      );

      if (!groupId || Number.isNaN(groupId)) {
        return NextResponse.json({
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
        rawPayload: {
          eventId: event.id,
          type: event.type,
          sessionId: obj.id,
        },
      });

      return NextResponse.json({
        received: true,
        activated: activation.ok,
        alreadyProcessed: activation.alreadyProcessed,
        expiresAt: activation.expiresAt,
      });
    }

    if (event.type === "customer.subscription.deleted" && obj.id) {
      await deactivateGroupProBySubscription({
        stripeSubscriptionId: obj.id,
      });
      return NextResponse.json({ received: true, deactivated: true });
    }

    return NextResponse.json({ received: true, unhandledType: event.type });
  } catch (err) {
    console.error("[POST /api/webhooks/stripe] Error:", err);
    return NextResponse.json(
      { error: "Error procesando webhook de Stripe." },
      { status: 500 }
    );
  }
}
