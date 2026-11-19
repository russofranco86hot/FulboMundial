"use client";

import { callRpc } from "@/lib/client-api";

export async function adminLogin(formData: FormData): Promise<void> {
  await callRpc<void>("admin", "adminLogin", [formData]);
}

export async function adminLogout(): Promise<void> {
  await callRpc<void>("admin", "adminLogout", []);
}

export async function createPlayer(formData: FormData): Promise<void> {
  await callRpc<void>("admin", "createPlayer", [formData]);
}

export async function updatePlayer(formData: FormData): Promise<void> {
  await callRpc<void>("admin", "updatePlayer", [formData]);
}

export async function setStars(formData: FormData): Promise<void> {
  await callRpc<void>("admin", "setStars", [formData]);
}

export async function deletePlayer(formData: FormData): Promise<void> {
  await callRpc<void>("admin", "deletePlayer", [formData]);
}

export async function adminUnlinkPlayer(formData: FormData): Promise<void> {
  await callRpc<void>("admin", "adminUnlinkPlayer", [formData]);
}

export async function adminSetAdjustments(formData: FormData): Promise<void> {
  await callRpc<void>("admin", "adminSetAdjustments", [formData]);
}

export async function movePlayer(formData: FormData): Promise<void> {
  await callRpc<void>("admin", "movePlayer", [formData]);
}

export async function adminOpenMatch(): Promise<void> {
  await callRpc<void>("admin", "adminOpenMatch", []);
}

export async function adminCloseMatch(): Promise<void> {
  await callRpc<void>("admin", "adminCloseMatch", []);
}

export async function adminReopenMatch(): Promise<void> {
  await callRpc<void>("admin", "adminReopenMatch", []);
}

export async function adminToggleSignup(formData: FormData): Promise<void> {
  await callRpc<void>("admin", "adminToggleSignup", [formData]);
}

export async function adminGenerateTeams(formData: FormData): Promise<void> {
  await callRpc<void>("admin", "adminGenerateTeams", [formData]);
}

export async function adminSwapTeam(formData: FormData): Promise<void> {
  await callRpc<void>("admin", "adminSwapTeam", [formData]);
}

export async function adminMoveTeam(rowId: number, team: "A" | "B"): Promise<void> {
  await callRpc<void>("admin", "adminMoveTeam", [rowId, team]);
}

export async function adminRemoveRow(rowId: number): Promise<void> {
  await callRpc<void>("admin", "adminRemoveRow", [rowId]);
}

export async function adminAddPlayerToTeam(formData: FormData): Promise<void> {
  await callRpc<void>("admin", "adminAddPlayerToTeam", [formData]);
}

export async function adminAddGuest(formData: FormData): Promise<void> {
  await callRpc<void>("admin", "adminAddGuest", [formData]);
}

export async function adminRemoveTeamMember(formData: FormData): Promise<void> {
  await callRpc<void>("admin", "adminRemoveTeamMember", [formData]);
}

export async function adminPushTeams(): Promise<void> {
  await callRpc<void>("admin", "adminPushTeams", []);
}

export async function adminSaveResult(formData: FormData): Promise<void> {
  await callRpc<void>("admin", "adminSaveResult", [formData]);
}

export async function adminManualPush(formData: FormData): Promise<void> {
  await callRpc<void>("admin", "adminManualPush", [formData]);
}
