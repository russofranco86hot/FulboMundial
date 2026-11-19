
import { rpcRevalidatePath as revalidatePath } from "../redirect";
import { and, eq, isNull } from "drizzle-orm";
import { db, signups, matches, players, groupMembers, teams } from "@/db";
import { getCurrentPlayer, getSessionUser, isGroupMember } from "@/lib/session";
import { getCurrentMatch, getSelection } from "@/lib/queries";
import { handlePostCloseWithdrawal } from "@/lib/match-actions";
import { pushToPlayer } from "@/lib/push";

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

/** Anotarse al partido vigente de un grupo o partido general. */
export async function signupAction(groupId?: number, groupSlug?: string): Promise<ActionResult> {
  const player = await getCurrentPlayer();
  if (!player) return { ok: false, error: "No estás vinculado a ningún jugador." };

  if (groupId) {
    const isMember = await isGroupMember(groupId);
    if (!isMember) return { ok: false, error: "No sos miembro de este grupo." };
  }

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

  if (groupSlug) {
    revalidatePath(`/grupos/${groupSlug}`);
  } else {
    revalidatePath("/");
  }
  return { ok: true };
}

/** Darse de baja del partido vigente de un grupo o partido general. */
export async function withdrawAction(groupId?: number, groupSlug?: string): Promise<ActionResult> {
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

  if (groupSlug) {
    revalidatePath(`/grupos/${groupSlug}`);
  } else {
    revalidatePath("/");
  }
  return { ok: true };
}

export async function toggleThirdHalfAction(staying: boolean, groupId?: number, groupSlug?: string): Promise<ActionResult> {
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

  if (groupSlug) {
    revalidatePath(`/grupos/${groupSlug}`);
  } else {
    revalidatePath("/");
  }
  return { ok: true };
}

function normalizeMentionText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export async function addMatchNoteAction(
  matchId: number,
  note: string,
  groupSlug?: string,
  mentionedPlayerIds?: number[]
): Promise<ActionResult> {
  const player = await getCurrentPlayer();
  if (!player) return { ok: false, error: "No estás vinculado" };
  const trimmedNote = note.trim();
  if (!trimmedNote) return { ok: false, error: "La nota no puede estar vacía" };

  const { matchNotes } = await import("@/db/schema");
  await db.insert(matchNotes).values({
    matchId,
    playerId: player.id,
    note: trimmedNote,
  });

  // Resolver menciones (@Nombre o IDs explícitos) para notificar por push a los miembros elegidos
  try {
    const matchRow = (
      await db
        .select({ groupId: matches.groupId })
        .from(matches)
        .where(eq(matches.id, matchId))
        .limit(1)
    )[0];

    const candidatesMap = new Map<number, string>();
    if (matchRow?.groupId) {
      const members = await db
        .select({ id: players.id, name: players.name })
        .from(groupMembers)
        .innerJoin(players, eq(players.id, groupMembers.playerId))
        .where(and(eq(groupMembers.groupId, matchRow.groupId), eq(groupMembers.status, "active")));
      for (const m of members) candidatesMap.set(m.id, m.name);
    }

    const teamPlayers = await db
      .select({ id: players.id, name: players.name })
      .from(teams)
      .innerJoin(players, eq(players.id, teams.playerId))
      .where(eq(teams.matchId, matchId));
    for (const tp of teamPlayers) {
      if (tp.id) candidatesMap.set(tp.id, tp.name);
    }

    const targets = new Set<number>();
    if (Array.isArray(mentionedPlayerIds)) {
      for (const rawId of mentionedPlayerIds) {
        const pid = Number(rawId);
        if (pid && !Number.isNaN(pid) && candidatesMap.has(pid)) {
          targets.add(pid);
        }
      }
    }

    // Detectar también @Nombre escritos manualmente en el comentario
    const normalizedNote = normalizeMentionText(trimmedNote);
    if (normalizedNote.includes("@")) {
      const sortedCandidates = Array.from(candidatesMap.entries()).sort(
        (a, b) => b[1].length - a[1].length
      );
      for (const [pid, rawName] of sortedCandidates) {
        const normName = normalizeMentionText(rawName);
        if (!normName) continue;
        const escaped = normName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const rx = new RegExp(`(?:^|\\s)@${escaped}(?=$|[\\s.,;:!?])`);
        if (rx.test(normalizedNote)) {
          targets.add(pid);
        }
      }
    }

    const targetUrl = groupSlug
      ? `/grupos/${groupSlug}/historial/${matchId}`
      : `/partido/${matchId}`;

    for (const targetPlayerId of targets) {
      await pushToPlayer(targetPlayerId, {
        title: `💬 ${player.name} te mencionó en un comentario`,
        body: trimmedNote.slice(0, 140),
        url: targetUrl,
        tag: `mention-${matchId}-${targetPlayerId}-${Date.now()}`,
      });
    }
  } catch (err) {
    console.error("[addMatchNoteAction] Error enviando push por mención:", err);
  }

  if (groupSlug) {
    revalidatePath(`/grupos/${groupSlug}/historial/${matchId}`);
  } else {
    revalidatePath(`/historial/${matchId}`);
  }
  return { ok: true };
}

export async function voteMatchAwardAction(
  matchId: number,
  categoryId: "mvp" | "tronco" | "gol",
  candidateId: number,
  groupSlug?: string
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

  const awardsConfig = {
    mvp: {
      title: "¡Te votaron como MVP! ⭐",
      body: `¡${player.name} te eligió como la Figura del partido!`,
    },
    tronco: {
      title: "¡Te votaron como Tronco! 🪵",
      body: `¡${player.name} te eligió como el rústico de la fecha!`,
    },
    gol: {
      title: "¡Te votaron por Mejor Gol! ⚽",
      body: `¡${player.name} eligió tu gol como la joya del partido!`,
    },
  };
  const award = awardsConfig[categoryId];
  if (award && candidateId) {
    const url = groupSlug
      ? `/grupos/${groupSlug}/historial/${matchId}`
      : `/historial/${matchId}`;
    try {
      await pushToPlayer(candidateId, {
        title: award.title,
        body: award.body,
        url,
        tag: `voto-${matchId}-${categoryId}-${Date.now()}`,
      });
    } catch (err) {
      console.error("[voteMatchAwardAction] Error enviando push:", err);
    }
  }

  if (groupSlug) {
    revalidatePath(`/grupos/${groupSlug}/historial/${matchId}`);
  } else {
    revalidatePath(`/historial/${matchId}`);
  }
  return { ok: true };
}
