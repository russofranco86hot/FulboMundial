import { NextRequest } from "next/server";

/** Verifica el header de Vercel Cron (Authorization: Bearer $CRON_SECRET). */
export function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}
