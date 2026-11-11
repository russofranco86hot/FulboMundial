import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentPlayer } from "@/lib/session";
import { getGroupBySlug } from "@/lib/groups";
import {
  createMercadoPagoPreference,
  createStripeCheckoutSession,
} from "@/lib/billing";
import { PRO_PLANS, type ProPlanId } from "@/lib/plans";

export const runtime = "nodejs";

const checkoutSchema = z.object({
  groupSlug: z.string().min(1),
  planId: z.enum(["pro_monthly", "pro_annual", "pro_lifetime"]).default("pro_annual"),
  provider: z.enum(["mercadopago", "stripe"]).default("mercadopago"),
});

export async function POST(req: Request) {
  try {
    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json(
        { error: "Debés iniciar sesión para activar FulboMundial PRO." },
        { status: 401 }
      );
    }

    const raw = await req.json();
    const parsed = checkoutSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de checkout inválidos.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { groupSlug, planId, provider } = parsed.data;
    const group = await getGroupBySlug(groupSlug);
    if (!group) {
      return NextResponse.json({ error: "Grupo no encontrado." }, { status: 404 });
    }

    if (!PRO_PLANS[planId as ProPlanId]) {
      return NextResponse.json({ error: "Plan seleccionado inválido." }, { status: 400 });
    }

    const origin = new URL(req.url).origin;

    if (provider === "mercadopago") {
      const result = await createMercadoPagoPreference({
        groupId: group.id,
        groupSlug: group.slug,
        groupName: group.name,
        playerId: player.id,
        playerEmail: player.email,
        planId,
        origin,
      });

      return NextResponse.json({
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
      origin,
    });

    return NextResponse.json({
      ok: true,
      provider: "stripe",
      checkoutUrl: result.checkoutUrl,
      sessionId: result.sessionId,
    });
  } catch (err) {
    console.error("[POST /api/billing/checkout] Error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "No se pudo iniciar la sesión de pago. Intentá nuevamente.",
      },
      { status: 500 }
    );
  }
}
