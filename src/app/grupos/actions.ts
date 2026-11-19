"use client";

import { callRpc } from "@/lib/client-api";

export async function actionCreateGroup(formData: FormData): Promise<void> {
  await callRpc<void>("grupos", "actionCreateGroup", [formData]);
}

export async function actionRequestJoin(formData: FormData): Promise<void> {
  await callRpc<void>("grupos", "actionRequestJoin", [formData]);
}

export async function actionApproveRequest(formData: FormData): Promise<void> {
  await callRpc<void>("grupos", "actionApproveRequest", [formData]);
}

export async function actionRejectRequest(formData: FormData): Promise<void> {
  await callRpc<void>("grupos", "actionRejectRequest", [formData]);
}

export async function actionApproveNameChange(formData: FormData): Promise<void> {
  await callRpc<void>("grupos", "actionApproveNameChange", [formData]);
}

export async function actionRejectNameChange(formData: FormData): Promise<void> {
  await callRpc<void>("grupos", "actionRejectNameChange", [formData]);
}

export async function actionPromoteToAdmin(formData: FormData): Promise<void> {
  await callRpc<void>("grupos", "actionPromoteToAdmin", [formData]);
}

export async function actionDemoteAdmin(formData: FormData): Promise<void> {
  await callRpc<void>("grupos", "actionDemoteAdmin", [formData]);
}

export async function actionRemoveMember(formData: FormData): Promise<void> {
  await callRpc<void>("grupos", "actionRemoveMember", [formData]);
}

export async function actionPlayerNotifyTransfer(formData: FormData): Promise<void> {
  await callRpc<void>("grupos", "actionPlayerNotifyTransfer", [formData]);
}

export async function actionMoveTeamInGroup(rowId: number, team: "A" | "B", groupSlug?: string): Promise<void> {
  await callRpc<void>("grupos", "actionMoveTeamInGroup", [rowId, team, groupSlug]);
}

export async function actionRemoveTeamRowInGroup(rowId: number, groupSlug?: string): Promise<void> {
  await callRpc<void>("grupos", "actionRemoveTeamRowInGroup", [rowId, groupSlug]);
}
