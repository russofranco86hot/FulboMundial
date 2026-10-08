import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { getCurrentMatch } from "@/lib/queries";
import { pushToAll } from "@/lib/push";
import { formatArt } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Miércoles 18:00 ART → Miércoles 21:00 UTC  (cron: 0 21 * * 3)
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const match = await getCurrentMatch();
    if (!match) return NextResponse.json({ ok: true, skipped: "sin partido" });
    await pushToAll({
      title: "¡Hoy hay fútbol! ⚽",
      body: `Nos vemos a las ${formatArt(match.matchDate, "HH:mm")}. ¡A la cancha!`,
      url: "/equipos",
      tag: "recordatorio",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[cron/match-reminder]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
