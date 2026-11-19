"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Hash, Shield } from "lucide-react";
import { actionRequestJoin } from "../actions";
import { useApiData } from "@/lib/client-api";

type UnirseData = {
  authRequired?: boolean;
  invitedGroup?: { id: number; name: string; format: string } | null;
};

function UnirseContent() {
  const searchParams = useSearchParams();
  const rawCode = searchParams.get("code") || "";
  const cleanCode = rawCode.trim().toUpperCase();
  const errorMsg = searchParams.get("error");

  const { data, loading } = useApiData<UnirseData>(
    `/api/page-data/unirse?code=${encodeURIComponent(cleanCode)}`
  );

  useEffect(() => {
    if (data?.authRequired) {
      const callback = cleanCode ? `/grupos/unirse?code=${cleanCode}` : "/grupos/unirse";
      window.location.replace(`/login?callbackUrl=${encodeURIComponent(callback)}`);
    }
  }, [data?.authRequired, cleanCode]);

  if ((loading && !data) || data?.authRequired) {
    return <div className="pt-12 text-center text-sm text-zinc-500">Verificando invitación...</div>;
  }

  const invitedGroup = data?.invitedGroup ?? null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/grupos" className="btn-ghost p-2 rounded-full">
          <ArrowLeft size={20} className="text-pitch-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-pitch-700 dark:text-zinc-100">Unirse a un grupo</h1>
          <p className="text-sm text-pitch-900/60 dark:text-zinc-400">Usá el código que te compartieron</p>
        </div>
      </div>

      {invitedGroup && (
        <div className="card border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/30 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Shield size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Grupo encontrado
            </p>
            <p className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 truncate">
              {invitedGroup.name}{" "}
              <span className="text-xs font-semibold text-zinc-500">({invitedGroup.format})</span>
            </p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="card bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm p-3 rounded-xl">
          {errorMsg}
        </div>
      )}

      <form action={actionRequestJoin} className="card space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-pitch-900/70 dark:text-zinc-300">
            Código de invitación
          </label>
          <div className="relative">
            <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-pitch-400" />
            <input
              type="text"
              name="code"
              placeholder="FULB01"
              maxLength={6}
              defaultValue={cleanCode}
              className="input pl-8 uppercase tracking-widest font-mono text-lg"
              autoFocus={!cleanCode}
            />
          </div>
          <p className="text-xs text-pitch-900/40 dark:text-zinc-600">
            6 caracteres. Lo compartió el admin del grupo.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-pitch-900/70 dark:text-zinc-300">
            Mensaje al admin (opcional)
          </label>
          <input
            type="text"
            name="message"
            placeholder="Ej: Soy el primo de Juan"
            className="input"
          />
        </div>

        <button type="submit" className="btn-primary w-full">
          {invitedGroup ? `Solicitar unirme a ${invitedGroup.name}` : "Enviar solicitud"}
        </button>
      </form>

      <p className="text-center text-xs text-pitch-900/40 dark:text-zinc-600">
        El admin del grupo deberá aprobar tu solicitud para que puedas acceder.
      </p>
    </div>
  );
}

export default function UnirsePage() {
  return (
    <Suspense fallback={<div className="pt-12 text-center text-sm text-zinc-500">Cargando...</div>}>
      <UnirseContent />
    </Suspense>
  );
}
