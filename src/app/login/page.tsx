"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { LoginForm } from "./login-form";
import { useApiData } from "@/lib/client-api";

type LoginPageData = {
  authenticated?: boolean;
  redirectTo?: string;
  inviteCode?: string | null;
  invitedGroup?: { id: number; name: string; format: string } | null;
};

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "";
  const code = searchParams.get("code") || "";

  const qs = new URLSearchParams();
  if (callbackUrl) qs.set("callbackUrl", callbackUrl);
  if (code) qs.set("code", code);

  const rawCallback = callbackUrl || (code ? `/grupos/unirse?code=${code}` : "/grupos");
  const safeCallbackUrl = rawCallback.startsWith("/") ? rawCallback : "/grupos";

  const { data } = useApiData<LoginPageData>(`/api/page-data/login?${qs.toString()}`);

  useEffect(() => {
    if (data?.authenticated && data.redirectTo) {
      window.location.replace(data.redirectTo);
    }
  }, [data]);

  const inviteCode = data?.inviteCode ?? (code ? code.trim().toUpperCase() : null);
  const invitedGroup = data?.invitedGroup ?? null;

  return (
    <div className="space-y-6 pt-8 pb-16 flex flex-col items-center max-w-md mx-auto">
      <div className="text-center">
        <div className="text-6xl animate-float">⚽</div>
        <h1 className="mt-3 text-3xl font-extrabold text-pitch-700 dark:text-zinc-100 tracking-tight">
          Fulbo<span className="bg-gradient-to-r from-pitch-400 to-pitch-600 bg-clip-text text-transparent">Mundial</span>
        </h1>
        <p className="text-sm text-pitch-900/60 dark:text-zinc-400 mt-1 font-medium">
          {invitedGroup
            ? `Iniciá sesión o creá tu cuenta para unirte a ${invitedGroup.name}`
            : "Accedé a tus grupos, partidos y estadísticas"}
        </p>
      </div>

      {inviteCode && (
        <div className="w-full max-w-sm rounded-2xl border border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/30 p-3.5 text-center space-y-1 animate-fade-in">
          <p className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
            🎟️ Invitación a grupo detectada {invitedGroup ? `— ${invitedGroup.name}` : ""}
          </p>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-200/80">
            Apenas ingreses o crees tu cuenta, te llevaremos automáticamente a solicitar el acceso con el código{" "}
            <span className="font-mono font-black underline">{inviteCode}</span>.
          </p>
        </div>
      )}

      <LoginForm callbackUrl={safeCallbackUrl} defaultMode={inviteCode ? "register" : "login"} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="pt-16 text-center text-sm text-zinc-500">Cargando...</div>}>
      <LoginContent />
    </Suspense>
  );
}
