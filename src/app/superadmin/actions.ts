"use client";

import { callRpc } from "@/lib/client-api";

export async function actionSuperAdminTogglePro(formData: FormData): Promise<void> {
  await callRpc<void>("superadmin", "actionSuperAdminTogglePro", [formData]);
}

export async function actionSuperAdminDeleteGroup(formData: FormData): Promise<void> {
  await callRpc<void>("superadmin", "actionSuperAdminDeleteGroup", [formData]);
}
