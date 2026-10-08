import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { getCurrentMatch } from "@/lib/queries";
import { closeSignups } from "@/lib/match-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Miércoles 12:00 ART → Miércoles 15:00 UTC  (cron: 0 15 * * 3)
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const match = await getCurrentMatch();
    if (!match || match.status === "finished") {
      return NextResponse.json({ ok: true, skipped: "sin partido abierto" });
    }
    const selection = await closeSignups(match, { notify: true });
    return NextResponse.json({
      ok: true,
      matchId: match.id,
      playing: selection.filter((s) => s.status === "playing").length,
      substitutes: selection.filter((s) => s.status === "substitute").length,
    });
  } catch (e) {
    console.error("[cron/close-signups]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
