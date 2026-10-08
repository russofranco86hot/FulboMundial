"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db, signups, matches, players } from "@/db";
import { getCurrentPlayer, getSessionUser, isGroupMember } from "@/lib/session";
import { getCurrentMatch, getSelection } from "@/lib/queries";
import { handlePostCloseWithdrawal } from "@/lib/match-actions";
import { pushToPlayer } from "@/lib/push";
import { getGroupBySlug } from "@/lib/groups";

type ActionResult = { ok: boolean; error?: string };

/**
 * Auto-vinculación: en el primer login el usuario elige su nombre de la lista.
 */
export async function claimPlayer(playerId: number): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || (!user.googleId && !user.email)) {
    return { ok: false, error: "Iniciá sesión primero." };
  }

  const already = await getCurrentPlayer();
  if (already) {
    return { ok: false, error: `Ya estás vinculado a ${already.name}. Avisale al admin si querés cambiarlo.` };
  }

  const updated = await db
    .update(players)
    .set({ googleId: user.googleId ?? null, email: user.email ?? null })
    .where(
      and(eq(players.id, playerId), isNull(players.googleId), eq(players.isGuest, false))
    )
    .returning();

  if (updated.length === 0) {
    return { ok: false, error: "Ese nombre ya fue tomado. Elegí otro." };
  }

  revalidatePath("/grupos");
  return { ok: true };
}

/** Anotarse al partido vigente de un grupo. */
export async function signupAction(groupId: number, groupSlug: string): Promise<ActionResult> {
  const player = await getCurrentPlayer();
  if (!player) return { ok: false, error: "No estás vinculado a ningún jugador." };

  const isMember = await isGroupMember(groupId);
  if (!isMember) return { ok: false, error: "No sos miembro de este grupo." };

  const match = await getCurrentMatch(groupId);
  if (!match) return { ok: false, error: "No hay partido disponible." };
  if (match.status !== "open") {
    return { ok: false, error: "La lista ya está cerrada." };
  }

  const existing = await db
    .select()
    .from(signups)
    .where(and(eq(signups.matchId, match.id), eq(signups.playerId, player.id)))
    .limit(1);

  if (existing[0]) {
    await db
      .update(signups)
      .set({ withdrawn: false, withdrawnAt: null, signupAt: new Date() })
      .where(eq(signups.id, existing[0].id));
  } else {
    await db.insert(signups).values({ matchId: match.id, playerId: player.id });
  }

  revalidatePath(`/grupos/${groupSlug}`);
  return { ok: true };
}

/** Darse de baja del partido vigente de un grupo. */
export async function withdrawAction(groupId: number, groupSlug: string): Promise<ActionResult> {
  const player = await getCurrentPlayer();
  if (!player) return { ok: false, error: "No estás vinculado a ningún jugador." };

  const match = await getCurrentMatch(groupId);
  if (!match) return { ok: false, error: "No hay partido disponible." };

  const before = (await getSelection(match))
    .filter((s) => s.status === "playing")
    .map((s) => s.playerId);

  await db
    .update(signups)
    .set({ withdrawn: true, withdrawnAt: new Date() })
    .where(and(eq(signups.matchId, match.id), eq(signups.playerId, player.id)));

  if (match.status !== "open") {
    await handlePostCloseWithdrawal(match, before);
  }

  revalidatePath(`/grupos/${groupSlug}`);
  return { ok: true };
}

export async function toggleThirdHalfAction(staying: boolean, groupId: number, groupSlug: string): Promise<ActionResult> {
  const player = await getCurrentPlayer();
  if (!player) return { ok: false, error: "No estás vinculado" };

  const match = await getCurrentMatch(groupId);
  if (!match) return { ok: false, error: "No hay partido" };

  const { matchThirdHalf } = await import("@/db/schema");

  await db
    .insert(matchThirdHalf)
    .values({ matchId: match.id, playerId: player.id, staying })
    .onConflictDoUpdate({
      target: [matchThirdHalf.matchId, matchThirdHalf.playerId],
      set: { staying, createdAt: new Date() },
    });

  revalidatePath(`/grupos/${groupSlug}`);
  return { ok: true };
}

export async function addMatchNoteAction(matchId: number, note: string, groupSlug: string): Promise<ActionResult> {
  const player = await getCurrentPlayer();
  if (!player) return { ok: false, error: "No estás vinculado" };
  if (!note.trim()) return { ok: false, error: "La nota no puede estar vacía" };

  const { matchNotes } = await import("@/db/schema");
  await db.insert(matchNotes).values({
    matchId,
    playerId: player.id,
    note: note.trim(),
  });

  revalidatePath(`/grupos/${groupSlug}/historial/${matchId}`);
  return { ok: true };
}

export async function voteMatchAwardAction(
  matchId: number,
  categoryId: "mvp" | "tronco" | "gol",
  candidateId: number,
  groupSlug: string
): Promise<ActionResult> {
  const player = await getCurrentPlayer();
  if (!player) return { ok: false, error: "No estás vinculado" };

  const { matchVotes } = await import("@/db/schema");
  await db
    .insert(matchVotes)
    .values({
      matchId,
      voterId: player.id,
      categoryId,
      candidateId,
    })
    .onConflictDoUpdate({
      target: [matchVotes.matchId, matchVotes.voterId, matchVotes.categoryId],
      set: { candidateId, createdAt: new Date() },
    });

  if (candidateId !== player.id) {
    const awardsConfig = {
      mvp: { title: "¡Te votaron como Figura! 🥇", body: "¡Alguien te votó como el MVP del partido!" },
      tronco: { title: "¡Te votaron como Tronco! 🪵", body: "¡Alguien te eligió como el rústico de la fecha!" },
      gol: { title: "¡Te votaron por Mejor Gol! ⚽", body: "¡Alguien votó tu gol como la joya del partido!" },
    };
    const award = awardsConfig[categoryId];
    if (award) {
      pushToPlayer(candidateId, {
        title: award.title,
        body: award.body,
        url: `/grupos/${groupSlug}/historial/${matchId}`,
        tag: `voto-${matchId}-${categoryId}-${Date.now()}`,
      }).catch(console.error);
    }
  }

  revalidatePath(`/grupos/${groupSlug}/historial/${matchId}`);
  return { ok: true };
}
