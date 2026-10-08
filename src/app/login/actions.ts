"use server";

import { signIn } from "@/auth";
import { registerOrSetPassword } from "@/lib/auth-credentials";
import { AuthError } from "next-auth";

export type AuthState = {
  error?: string;
  success?: boolean;
};

export async function actionLoginCredentials(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Por favor ingresá tu correo y contraseña." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Correo o contraseña incorrectos." };
        default:
          return { error: "Error al iniciar sesión. Verificá tus credenciales." };
      }
    }
    // Next.js redirection error debe re-lanzarse
    throw error;
  }
}

export async function actionRegisterCredentials(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

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

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Cuenta registrada, pero ocurrió un problema al loguear. Probá iniciar sesión." };
    }
    throw error;
  }
}
