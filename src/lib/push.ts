import "server-only";
import webpush from "web-push";
import { db, pushSubscriptions, groupMembers } from "@/db";
import { and, eq, inArray } from "drizzle-orm";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@futbol.local";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

type SubRow = typeof pushSubscriptions.$inferSelect;

async function deliver(subs: SubRow[], payload: PushPayload) {
  if (!ensureConfigured()) {
    console.warn("[push] VAPID no configurado; se omite el envío.");
    return { sent: 0, removed: 0 };
  }
  let sent = 0;
  const dead: number[] = [];
  const data = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: s.keys as { p256dh: string; auth: string } },
          data
        );
        sent++;
      } catch (err: unknown) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.id);
        else console.error("[push] error enviando:", code ?? err);
      }
    })
  );

  if (dead.length) {
    await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, dead));
  }
  return { sent, removed: dead.length };
}

/** Notifica a TODAS las suscripciones. */
export async function pushToAll(payload: PushPayload) {
  const subs = await db.select().from(pushSubscriptions);
  return deliver(subs, payload);
}

/** Notifica a las suscripciones de un jugador puntual. */
export async function pushToPlayer(playerId: number, payload: PushPayload) {
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.playerId, playerId));
  return deliver(subs, payload);
}

/** Notifica a los administradores activos de un grupo. */
export async function pushToGroupAdmins(groupId: number, payload: PushPayload) {
  const admins = await db
    .select({ playerId: groupMembers.playerId })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.status, "active"),
        eq(groupMembers.role, "admin")
      )
    );

  const playerIds = admins.map((m) => m.playerId).filter(Boolean);
  if (playerIds.length === 0) return { sent: 0, removed: 0 };

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.playerId, playerIds));

  if (subs.length === 0) return { sent: 0, removed: 0 };
  return deliver(subs, payload);
}

/** Notifica a todos los miembros activos de un grupo (con fallback a pushToAll si no hay playerIds asociados). */
export async function pushToGroupMembers(groupId: number, payload: PushPayload) {
  const members = await db
    .select({ playerId: groupMembers.playerId })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.status, "active")));

  const playerIds = members.map((m) => m.playerId).filter(Boolean);
  if (playerIds.length > 0) {
    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(inArray(pushSubscriptions.playerId, playerIds));
    if (subs.length > 0) {
      return deliver(subs, payload);
    }
  }
  return pushToAll(payload);
}
