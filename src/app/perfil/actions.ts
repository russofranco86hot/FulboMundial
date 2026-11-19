"use client";

import { callRpc } from "@/lib/client-api";

export async function actionRequestNameChange(formData: FormData): Promise<void> {
  await callRpc<void>("perfil", "actionRequestNameChange", [formData]);
}

export async function actionCancelNameRequest(formData: FormData): Promise<void> {
  await callRpc<void>("perfil", "actionCancelNameRequest", [formData]);
}

export async function actionUpdatePreferences(formData: FormData): Promise<void> {
  await callRpc<void>("perfil", "actionUpdatePreferences", [formData]);
}

export async function actionSignOut(): Promise<void> {
  await callRpc<void>("perfil", "actionSignOut", []);
}
