import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

  return (
    <div className="space-y-6 pt-10 pb-16 flex flex-col items-center max-w-md mx-auto">
      <div className="text-center">
        <div className="text-6xl animate-float">⚽</div>
        <h1 className="mt-3 text-3xl font-extrabold text-pitch-700 dark:text-zinc-100 tracking-tight">
          Fulbo<span className="bg-gradient-to-r from-pitch-400 to-pitch-600 bg-clip-text text-transparent">Mundial</span>
        </h1>
        <p className="text-sm text-pitch-900/60 dark:text-zinc-400 mt-1 font-medium">
          Accedé a tus grupos, partidos y estadísticas
        </p>
      </div>

      <LoginForm />
    </div>
  );
}
