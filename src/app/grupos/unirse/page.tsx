import { redirect } from "next/navigation";
import { getSessionUser, getCurrentPlayer } from "@/lib/session";
import { actionRequestJoin } from "../actions";
import Link from "next/link";
import { ArrowLeft, Hash } from "lucide-react";

export default async function UnirsePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const player = await getCurrentPlayer();
  const params = await searchParams;

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

      {params.error && (
        <div className="card bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm p-3 rounded-xl">
          {params.error}
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
              defaultValue={params.code}
              className="input pl-8 uppercase tracking-widest font-mono text-lg"
              autoFocus
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
          Enviar solicitud
        </button>
      </form>

      <p className="text-center text-xs text-pitch-900/40 dark:text-zinc-600">
        El admin del grupo deberá aprobar tu solicitud para que puedas acceder.
      </p>
    </div>
  );
}
