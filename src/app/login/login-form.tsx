"use client";

import { useActionState, useState } from "react";
import { actionLoginCredentials, actionRegisterCredentials } from "./actions";
import { signIn } from "next-auth/react";
import { LogIn, UserPlus, Mail, Lock, User, AlertCircle } from "lucide-react";

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginState, loginAction, loginPending] = useActionState(actionLoginCredentials, null);
  const [regState, regAction, regPending] = useActionState(actionRegisterCredentials, null);

  return (
    <div className="w-full max-w-sm space-y-5 animate-fade-in">
      {/* Botón de Google */}
      <button
        onClick={() => signIn("google", { callbackUrl: "/" })}
        type="button"
        className="btn-ghost w-full py-2.5 px-4 flex items-center justify-center gap-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750 shadow-sm text-sm font-semibold text-zinc-700 dark:text-zinc-200"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        <span>Continuar con Google</span>
      </button>

      {/* Divisor */}
      <div className="relative flex items-center justify-center">
        <div className="border-t border-zinc-200 dark:border-zinc-800 w-full" />
        <span className="bg-pitch-50 dark:bg-zinc-950 px-3 text-[11px] uppercase tracking-wider text-pitch-900/40 dark:text-zinc-500 font-bold whitespace-nowrap">
          o con correo y clave
        </span>
        <div className="border-t border-zinc-200 dark:border-zinc-800 w-full" />
      </div>

      {/* Selector de Pestañas: Login vs Registro */}
      <div className="flex bg-zinc-100 dark:bg-zinc-800/60 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            mode === "login"
              ? "bg-white dark:bg-zinc-700 text-pitch-800 dark:text-zinc-100 shadow-sm"
              : "text-pitch-900/60 dark:text-zinc-400 hover:text-pitch-800"
          }`}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            mode === "register"
              ? "bg-white dark:bg-zinc-700 text-pitch-800 dark:text-zinc-100 shadow-sm"
              : "text-pitch-900/60 dark:text-zinc-400 hover:text-pitch-800"
          }`}
        >
          Crear cuenta
        </button>
      </div>

      {/* Mensajes de error */}
      {mode === "login" && loginState?.error && (
        <div className="card p-3 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{loginState.error}</span>
        </div>
      )}

      {mode === "register" && regState?.error && (
        <div className="card p-3 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{regState.error}</span>
        </div>
      )}

      {/* Formulario de Login */}
      {mode === "login" && (
        <form action={loginAction} className="card space-y-3.5 p-5">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-pitch-800 dark:text-zinc-300">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-pitch-900/40 dark:text-zinc-500" />
              <input
                type="email"
                name="email"
                placeholder="ejemplo@correo.com"
                className="input w-full pl-9 py-2 text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-pitch-800 dark:text-zinc-300">
              Contraseña
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-pitch-900/40 dark:text-zinc-500" />
              <input
                type="password"
                name="password"
                placeholder="Tu contraseña"
                className="input w-full pl-9 py-2 text-sm"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loginPending}
            className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2 mt-2"
          >
            <LogIn size={16} />
            <span>{loginPending ? "Ingresando..." : "Iniciar sesión"}</span>
          </button>
        </form>
      )}

      {/* Formulario de Registro */}
      {mode === "register" && (
        <form action={regAction} className="card space-y-3.5 p-5">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-pitch-800 dark:text-zinc-300">
              Nombre o apodo <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-pitch-900/40 dark:text-zinc-500" />
              <input
                type="text"
                name="name"
                placeholder="Ej: Franco"
                className="input w-full pl-9 py-2 text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-pitch-800 dark:text-zinc-300">
              Correo electrónico <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-pitch-900/40 dark:text-zinc-500" />
              <input
                type="email"
                name="email"
                placeholder="ejemplo@outlook.com, hotmail, etc."
                className="input w-full pl-9 py-2 text-sm"
                required
              />
            </div>
            <p className="text-[10px] text-pitch-900/50 dark:text-zinc-400">
              Cualquier dominio es válido (Hotmail, Outlook, Yahoo, empresa, etc.).
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-pitch-800 dark:text-zinc-300">
              Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-pitch-900/40 dark:text-zinc-500" />
              <input
                type="password"
                name="password"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                className="input w-full pl-9 py-2 text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-pitch-800 dark:text-zinc-300">
              Confirmar contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-pitch-900/40 dark:text-zinc-500" />
              <input
                type="password"
                name="confirmPassword"
                placeholder="Repetir contraseña"
                minLength={6}
                className="input w-full pl-9 py-2 text-sm"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={regPending}
            className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2 mt-2"
          >
            <UserPlus size={16} />
            <span>{regPending ? "Creando cuenta..." : "Crear cuenta y entrar"}</span>
          </button>
        </form>
      )}
    </div>
  );
}
