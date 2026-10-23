import Link from "next/link";
import { getSessionUser, getCurrentPlayer } from "@/lib/session";
import { User, LogIn } from "lucide-react";

export async function UserHeader() {
  const user = await getSessionUser();
  const player = user ? await getCurrentPlayer() : null;

  if (!user) {
    return (
      <Link
        href="/login"
        className="h-9 px-3 rounded-full bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-700/80 shadow-sm backdrop-blur-md flex items-center gap-1.5 text-xs font-bold text-pitch-700 dark:text-pitch-400 hover:border-pitch-400 dark:hover:border-pitch-500 transition-all select-none"
        title="Iniciar sesión"
      >
        <LogIn size={14} />
        <span>Entrar</span>
      </Link>
    );
  }

  const initial = player?.name ? player.name.trim().charAt(0).toUpperCase() : (user.name ? user.name.charAt(0).toUpperCase() : "U");

  return (
    <Link
      href="/perfil"
      className="h-9 px-2 sm:px-2.5 rounded-full bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-700/80 shadow-sm backdrop-blur-md flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:border-pitch-400 dark:hover:border-pitch-500 hover:shadow transition-all select-none"
      title={`Perfil de ${player?.name || "usuario"} - Click para cambiar nombre o salir`}
    >
      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-pitch-600 to-pitch-400 text-white flex items-center justify-center font-black text-[11px] shadow-sm shrink-0">
        {player?.isGoalkeeper ? "🧤" : initial}
      </div>
      <span className="hidden sm:inline max-w-[85px] truncate font-extrabold text-[11px]">
        {player?.name || "Perfil"}
      </span>
    </Link>
  );
}
