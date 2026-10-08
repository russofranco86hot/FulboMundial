import { redirect } from "next/navigation";
import { getSessionUser, getCurrentPlayer, getPlayerGroups } from "@/lib/session";
import { signIn } from "@/auth";
import { getCurrentMatch } from "@/lib/queries";
import { formatArt } from "@/lib/time";
import Link from "next/link";
import { PlusCircle, LogIn, ChevronRight, Calendar, Users, Shield } from "lucide-react";
import { db, matches, results, groups } from "@/db";
import { and, desc, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function GruposPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="space-y-6 pt-10 animate-fade-in">
        <h1 className="text-2xl font-extrabold text-pitch-700 dark:text-zinc-100">Mis grupos ⚽</h1>
        <div className="card text-center space-y-4">
          <p className="text-pitch-900/70 dark:text-zinc-400">
            Iniciá sesión para ver tus grupos.
          </p>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/grupos" });
            }}
          >
            <button className="btn-primary w-full flex items-center justify-center gap-2">
              <LogIn size={18} /> Entrar con Google
            </button>
          </form>
        </div>
      </div>
    );
  }

  const player = await getCurrentPlayer();

  // Logueado pero sin jugador vinculado → necesita crear su perfil
  if (!player) {
    return (
      <div className="space-y-6 pt-10 animate-fade-in">
        <h1 className="text-2xl font-extrabold text-pitch-700 dark:text-zinc-100">Mis grupos ⚽</h1>
        <div className="card text-center space-y-3 animate-slide-up">
          <div className="text-4xl">👋</div>
          <p className="font-bold dark:text-zinc-100">¡Bienvenido!</p>
          <p className="text-sm text-pitch-900/60 dark:text-zinc-400">
            Tu cuenta de Google ({user.email}) está lista. Para continuar, un administrador de grupo debe vincularte, o podés crear tu propio grupo.
          </p>
          <Link href="/grupos/nuevo" className="btn-primary w-full flex items-center justify-center gap-2">
            <PlusCircle size={18} /> Crear mi primer grupo
          </Link>
        </div>
      </div>
    );
  }

  const playerGroups = await getPlayerGroups();

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-pitch-700 dark:text-zinc-100">
            Mis grupos <span className="inline-block animate-bounce">⚽</span>
          </h1>
          <p className="text-sm text-pitch-900/60 dark:text-zinc-400">Hola, {player.name}</p>
        </div>
      </div>

      {playerGroups.length === 0 ? (
        <div className="card text-center space-y-4 animate-slide-up">
          <div className="text-4xl">🏟️</div>
          <p className="font-bold dark:text-zinc-100">Todavía no estás en ningún grupo</p>
          <p className="text-sm text-pitch-900/60 dark:text-zinc-400">
            Creá tu propio grupo o unite con un código de invitación.
          </p>
          <div className="space-y-2">
            <Link href="/grupos/nuevo" className="btn-primary w-full flex items-center justify-center gap-2">
              <PlusCircle size={18} /> Crear grupo
            </Link>
            <Link href="/grupos/unirse" className="btn-ghost w-full flex items-center justify-center gap-2">
              <LogIn size={18} /> Unirse con código
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {playerGroups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>

          <div className="flex gap-2">
            <Link href="/grupos/nuevo" className="btn-ghost flex-1 flex items-center justify-center gap-2 text-sm">
              <PlusCircle size={16} /> Crear grupo
            </Link>
            <Link href="/grupos/unirse" className="btn-ghost flex-1 flex items-center justify-center gap-2 text-sm">
              <LogIn size={16} /> Unirse con código
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

async function GroupCard({ group }: { group: Awaited<ReturnType<typeof getPlayerGroups>>[0] }) {
  // Buscar partido actual del grupo
  const openMatch = await db
    .select({
      id: matches.id,
      matchDate: matches.matchDate,
      status: matches.status,
      capacity: matches.capacity,
      format: matches.format,
    })
    .from(matches)
    .where(and(eq(matches.groupId, group.id), sql`${matches.status} <> 'finished'`))
    .orderBy(matches.matchDate)
    .limit(1)
    .then((r) => r[0] ?? null);

  return (
    <Link
      href={`/grupos/${group.slug}`}
      className="card block space-y-3 hover:-translate-y-0.5 transition-all duration-200 animate-slide-up"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-pitch-700 dark:text-zinc-100 truncate">{group.name}</h2>
            {group.role === "admin" && (
              <span className="chip bg-pitch-600 text-white text-[10px] px-1.5 py-0.5 shrink-0 flex items-center gap-1">
                <Shield size={10} /> Admin
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="chip bg-pitch-100 text-pitch-700 dark:bg-zinc-800 dark:text-zinc-300 text-xs">
              {group.format}
            </span>
            {group.defaultTime && (
              <span className="text-xs text-pitch-900/50 dark:text-zinc-500">
                {group.defaultDayOfWeek !== null && ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][group.defaultDayOfWeek ?? 0]} {group.defaultTime}
              </span>
            )}
          </div>
        </div>
        <ChevronRight size={18} className="text-pitch-400 shrink-0 mt-1" />
      </div>

      {openMatch ? (
        <div className="flex items-center justify-between bg-pitch-50 dark:bg-zinc-900 rounded-xl px-3 py-2">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-pitch-600" />
            <span className="text-sm font-medium text-pitch-800 dark:text-zinc-300 capitalize">
              {formatArt(openMatch.matchDate, "EEE dd/MM 'a las' HH:mm")}
            </span>
          </div>
          <span className={`chip text-xs ${openMatch.status === "open" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
            {openMatch.status === "open" ? "Abierto" : "Cerrado"}
          </span>
        </div>
      ) : (
        <p className="text-xs text-pitch-900/40 dark:text-zinc-600">Sin partido próximo</p>
      )}
    </Link>
  );
}
