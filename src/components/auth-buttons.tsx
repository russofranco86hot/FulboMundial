"use client";

import { signIn, signOut } from "next-auth/react";
import { LogIn, LogOut } from "lucide-react";
import { useState, type ReactNode } from "react";

export function GoogleSignInButton({
  callbackUrl = "/grupos",
  className = "btn-primary w-full text-lg flex items-center justify-center gap-2",
  children,
}: {
  callbackUrl?: string;
  className?: string;
  children?: ReactNode;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        signIn("google", { callbackUrl });
      }}
      className={className}
    >
      {children ?? (
        <>
          <LogIn size={18} />
          <span>{loading ? "Conectando con Google..." : "Entrar con Google"}</span>
        </>
      )}
    </button>
  );
}

export function SignOutButton({
  callbackUrl = "/",
  className,
  label = "Cerrar sesión (Desloguearse)",
  compact = false,
}: {
  callbackUrl?: string;
  className?: string;
  label?: string;
  compact?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        signOut({ callbackUrl });
      }}
      className={
        className ??
        (compact
          ? "btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/40 rounded-xl font-bold"
          : "w-full py-3 px-4 rounded-2xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 font-black text-sm flex items-center justify-center gap-2 transition-all shadow-sm")
      }
      title="Cerrar sesión"
    >
      <LogOut size={compact ? 14 : 16} />
      <span>{loading ? "Saliendo..." : compact ? "Salir" : label}</span>
    </button>
  );
}
