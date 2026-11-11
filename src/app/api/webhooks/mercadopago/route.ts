import { NextResponse } from "next/server";
import {
  verifyAndActivateMercadoPagoPayment,
  verifyMercadoPagoWebhookSignature,
} from "@/lib/billing";

export const runtime = "nodejs";

async function handleNotification(req: Request) {
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
      body.type ||
      body.topic ||
      url.searchParams.get("type") ||
      url.searchParams.get("topic");
    const dataId = String(
      body.data?.id ||
        url.searchParams.get("data.id") ||
        url.searchParams.get("id") ||
        ""
    ).trim();

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

    const result = await verifyAndActivateMercadoPagoPayment(dataId);

    return NextResponse.json({
      received: true,
      ...result,
    });
  } catch (err) {
    console.error("[Webhook MercadoPago] Error:", err);
    return NextResponse.json(
      { error: "Error procesando notificación de Mercado Pago." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return handleNotification(req);
}

export async function GET(req: Request) {
  return handleNotification(req);
}
