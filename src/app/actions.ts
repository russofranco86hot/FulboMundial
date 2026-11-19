"use client";

import { callRpc } from "@/lib/client-api";
type ActionResult = { ok: boolean; error?: string };

export async function claimPlayer(playerId: number) : Promise<ActionResult> {
  try {
    return await callRpc<ActionResult>("app", "claimPlayer", [playerId]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de conexión" };
  }
}

export async function signupAction(groupId?: number, groupSlug?: string) : Promise<ActionResult> {
  try {
    return await callRpc<ActionResult>("app", "signupAction", [groupId, groupSlug]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de conexión" };
  }
}

export async function withdrawAction(groupId?: number, groupSlug?: string) : Promise<ActionResult> {
  try {
    return await callRpc<ActionResult>("app", "withdrawAction", [groupId, groupSlug]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de conexión" };
  }
}

export async function toggleThirdHalfAction(staying: boolean, groupId?: number, groupSlug?: string) : Promise<ActionResult> {
  try {
    return await callRpc<ActionResult>("app", "toggleThirdHalfAction", [staying, groupId, groupSlug]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de conexión" };
  }
}

export async function addMatchNoteAction(
  matchId: number,
  note: string,
  groupSlug?: string,
  mentionedPlayerIds?: number[]
): Promise<ActionResult> {
  try {
    return await callRpc<ActionResult>("app", "addMatchNoteAction", [
      matchId,
      note,
      groupSlug,
      mentionedPlayerIds,
    ]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de conexión" };
  }
}

export async function voteMatchAwardAction(matchId: number,
  categoryId: "mvp" | "tronco" | "gol",
  candidateId: number,
  groupSlug?: string) : Promise<ActionResult> {
  try {
    return await callRpc<ActionResult>("app", "voteMatchAwardAction", [matchId, categoryId, candidateId, groupSlug]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de conexión" };
  }
}
