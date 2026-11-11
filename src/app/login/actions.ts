"use server";

import { registerOrSetPassword } from "@/lib/auth-credentials";

export type AuthState = {
  error?: string;
  success?: boolean;
};

export async function actionRegisterCredentials(params: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<AuthState> {
  const name = (params.name || "").trim();
  const email = (params.email || "").trim().toLowerCase();
  const password = params.password || "";
  const confirmPassword = params.confirmPassword || "";

  if (!name || !email || !password) {
    return { error: "Por favor completá todos los campos obligatorios." };
  }

  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }

  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const res = await registerOrSetPassword({ name, email, password });
  if (!res.ok) {
    return { error: res.error };
  }

  return { success: true };
}
