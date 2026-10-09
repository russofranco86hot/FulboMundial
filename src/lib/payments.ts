import "server-only";
import { db, matchPayments, playerPayments, players } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { ensureDbUpgrades } from "./db-migrations";

export type PaymentConfig = {
  totalPrice: number;
  paymentAlias: string | null;
  notes: string | null;
};

export type PlayerPaymentStatus = {
  playerId: number;
  name: string;
  paid: boolean;
  notified: boolean;
  updatedAt: Date;
};

export async function getMatchPaymentConfig(matchId: number): Promise<PaymentConfig | null> {
  await ensureDbUpgrades();
  try {
    const row = (
      await db
        .select()
        .from(matchPayments)
        .where(eq(matchPayments.matchId, matchId))
        .limit(1)
    )[0];

    if (!row) return null;
    return {
      totalPrice: row.totalPrice,
      paymentAlias: row.paymentAlias,
      notes: row.notes,
    };
  } catch (err) {
    console.warn("Could not get match payment config:", err);
    return null;
  }
}

export async function saveMatchPaymentConfig(params: {
  matchId: number;
  totalPrice: number;
  paymentAlias?: string | null;
  notes?: string | null;
}) {
  await ensureDbUpgrades();
  const { matchId, totalPrice, paymentAlias = null, notes = null } = params;

  await db
    .insert(matchPayments)
    .values({
      matchId,
      totalPrice,
      paymentAlias,
      notes,
    })
    .onConflictDoUpdate({
      target: [matchPayments.matchId],
      set: {
        totalPrice,
        paymentAlias,
        notes,
      },
    });
}

export async function getMatchPlayerPayments(matchId: number): Promise<PlayerPaymentStatus[]> {
  await ensureDbUpgrades();
  try {
    const rows = await db
      .select({
        playerId: playerPayments.playerId,
        name: players.name,
        paid: playerPayments.paid,
        notified: playerPayments.notified,
        updatedAt: playerPayments.updatedAt,
      })
      .from(playerPayments)
      .innerJoin(players, eq(players.id, playerPayments.playerId))
      .where(eq(playerPayments.matchId, matchId));

    return rows;
  } catch (err) {
    console.warn("Could not get player payments:", err);
    return [];
  }
}

export async function markPlayerTransferDone(matchId: number, playerId: number) {
  await ensureDbUpgrades();
  await db
    .insert(playerPayments)
    .values({
      matchId,
      playerId,
      paid: false,
      notified: true,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [playerPayments.matchId, playerPayments.playerId],
      set: {
        notified: true,
        updatedAt: new Date(),
      },
    });
}

export async function adminTogglePlayerPaid(matchId: number, playerId: number, paid: boolean) {
  await ensureDbUpgrades();
  await db
    .insert(playerPayments)
    .values({
      matchId,
      playerId,
      paid,
      notified: paid,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [playerPayments.matchId, playerPayments.playerId],
      set: {
        paid,
        updatedAt: new Date(),
      },
    });
}
