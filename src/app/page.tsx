import { redirect } from "next/navigation";
import { getSessionUser, getPlayerGroups } from "@/lib/session";
import { signIn } from "@/auth";
import Link from "next/link";
import { PlusCircle, Users, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();

  // Sin login → landing
  if (!user) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-8 pt-8 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="text-6xl animate-bounce-in">⚽</div>
          <h1 className="text-3xl font-extrabold text-pitch-700 dark:text-zinc-100">
            Fulbo<span className="bg-gradient-to-r from-pitch-400 to-pitch-600 bg-clip-text text-transparent">Mundial</span>
          </h1>
          <p className="text-pitch-900/60 dark:text-zinc-400 text-base max-w-xs mx-auto">
            Organizá tu fútbol: anotate, formá equipos y llevá el historial de tus partidos.
          </p>
        </div>

        <div className="card w-full text-center space-y-4 animate-slide-up">
          <p className="text-sm text-pitch-900/70 dark:text-zinc-400">
            Iniciá sesión para ver tus grupos y partidos.
          </p>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <button className="btn-primary w-full text-lg">Entrar con Google</button>
          </form>
          <div className="pt-1">
            <Link href="/login" className="text-xs font-semibold text-pitch-600 hover:text-pitch-700 dark:text-pitch-400 hover:underline">
              O ingresar con correo y contraseña →
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full text-center animate-slide-up" style={{ animationDelay: "150ms" }}>
          {[
            { icon: "📋", label: "Anotate al instante" },
            { icon: "⚖️", label: "Equipos balanceados" },
            { icon: "🏆", label: "Historial y stats" },
          ].map((f) => (
            <div key={f.label} className="card p-3 space-y-2">
              <div className="text-2xl">{f.icon}</div>
              <p className="text-xs text-pitch-900/60 dark:text-zinc-400 font-medium">{f.label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Logueado → redirigir al dashboard de grupos
  redirect("/grupos");
}
