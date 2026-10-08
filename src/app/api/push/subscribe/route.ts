import { NextRequest, NextResponse } from "next/server";
import { db, pushSubscriptions } from "@/db";
import { getCurrentPlayer } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sub = body?.subscription;
    if (!sub?.endpoint || !sub?.keys) {
      return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
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

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[push/subscribe]", e);
    return NextResponse.json({ error: "Error guardando la suscripción" }, { status: 500 });
  }
}
