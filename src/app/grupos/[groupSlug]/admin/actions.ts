"use client";

import { callRpc } from "@/lib/client-api";

export async function adminOpenGroupMatch(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminOpenGroupMatch", [formData]);
}

export async function adminGroupUpdateMatch(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupUpdateMatch", [formData]);
}

export async function adminCloseGroupMatch(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminCloseGroupMatch", [formData]);
}

export async function adminReopenGroupMatch(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminReopenGroupMatch", [formData]);
}

export async function adminGroupFinishMatchWithoutResult(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupFinishMatchWithoutResult", [formData]);
}

export async function adminGroupDeleteMatch(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupDeleteMatch", [formData]);
}

export async function adminGroupToggleSignup(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupToggleSignup", [formData]);
}

export async function adminGroupReorderSignup(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupReorderSignup", [formData]);
}

export async function adminGroupMoveToSubstitute(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupMoveToSubstitute", [formData]);
}

export async function adminGroupMoveToPlaying(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupMoveToPlaying", [formData]);
}

export async function adminGroupResetSignupsOrder(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupResetSignupsOrder", [formData]);
}

export async function adminGroupGenerateTeams(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupGenerateTeams", [formData]);
}

export async function adminGroupMoveTeam(rowId: number, team: "A" | "B", groupSlug: string): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupMoveTeam", [rowId, team, groupSlug]);
}

export async function adminGroupRemoveRow(rowId: number, groupSlug: string): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupRemoveRow", [rowId, groupSlug]);
}

export async function adminGroupClearTeams(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupClearTeams", [formData]);
}

export async function adminGroupAddPlayerToTeam(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupAddPlayerToTeam", [formData]);
}

export async function adminGroupAddGuest(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupAddGuest", [formData]);
}

export async function adminGroupPushTeams(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupPushTeams", [formData]);
}

export async function adminGroupSaveResult(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupSaveResult", [formData]);
}

export async function adminGroupSaveSettings(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupSaveSettings", [formData]);
}

export async function adminGroupManualPush(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupManualPush", [formData]);
}

export async function adminSendPreMatch24hReminder(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminSendPreMatch24hReminder", [formData]);
}

export async function adminSendPostMatchVoteReminder(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminSendPostMatchVoteReminder", [formData]);
}

export async function adminGroupUpdatePlayer(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupUpdatePlayer", [formData]);
}

export async function adminGroupSetStars(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupSetStars", [formData]);
}

export async function adminGroupCreateAndAddMember(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupCreateAndAddMember", [formData]);
}

export async function adminGroupSavePlayerComment(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupSavePlayerComment", [formData]);
}

export async function adminGroupRegenerateComments(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupRegenerateComments", [formData]);
}

export async function adminGroupSavePaymentConfig(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupSavePaymentConfig", [formData]);
}

export async function adminGroupTogglePlayerPaid(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupTogglePlayerPaid", [formData]);
}

export async function adminGroupResetPassword(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupResetPassword", [formData]);
}

export async function adminGroupSaveMatchGoals(formData: FormData): Promise<void> {
  await callRpc<void>("group-admin", "adminGroupSaveMatchGoals", [formData]);
}
