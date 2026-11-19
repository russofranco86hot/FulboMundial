"use client";

import { callRpc } from "@/lib/client-api";
export type AuthState = { error?: string; success?: boolean };

export async function actionRegisterCredentials(params: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}) : Promise<AuthState> {
  try {
    return await callRpc<AuthState>("login", "actionRegisterCredentials", [params]);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error de conexión" };
  }
}
