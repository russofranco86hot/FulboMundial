import { getSessionUser } from "@/lib/session";
import { getGroupByInviteCode } from "@/lib/groups";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; code?: string }>;
}) {
  const params = await searchParams;
  const rawCallback = params.callbackUrl || (params.code ? `/grupos/unirse?code=${params.code}` : "/grupos");
  const safeCallbackUrl = rawCallback.startsWith("/") ? rawCallback : "/grupos";

  const user = await getSessionUser();
  if (user) redirect(safeCallbackUrl);

  // Detectar si viene de un link de invitación con código (?code=XXXXXX)
  let inviteCode: string | null = params.code ? params.code.trim().toUpperCase() : null;
  if (!inviteCode && safeCallbackUrl.includes("code=")) {
    try {
      const urlObj = new URL(safeCallbackUrl, "https://fulbomundial.com.ar");
      const codeParam = urlObj.searchParams.get("code");
      if (codeParam) inviteCode = codeParam.trim().toUpperCase();
    } catch {
      // ignore
    }
  }

  const invitedGroup = inviteCode ? await getGroupByInviteCode(inviteCode) : null;

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
