import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { openNextMatch } from "@/lib/match-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Miércoles 23:00 ART → Jueves 02:00 UTC  (cron: 0 2 * * 4)
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const match = await openNextMatch({ notify: true });
    return NextResponse.json({ ok: true, matchId: match.id, matchDate: match.matchDate });
  } catch (e) {
    console.error("[cron/open-signups]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
