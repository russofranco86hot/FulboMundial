"use client";

import Link from "next/link";
import { PlusCircle, LogIn, ChevronRight, Calendar, Shield, User, Crown } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth-buttons";
import { TuMomentoMarquee, type TuMomentoItem } from "@/components/tu-momento-marquee";
import { formatArt } from "@/lib/time";
import { useApiData } from "@/lib/client-api";

type GroupItem = {
  id: number;
  name: string;
  slug: string;
  format: string;
  defaultDayOfWeek: number | null;
  defaultTime: string | null;
  championshipName?: string | null;
  role: "admin" | "member";
  proActive: boolean;
};

type OpenMatchItem = {
  id: number;
  groupId: number | null;
  matchDate: string | Date;
  status: "open" | "closed" | "finished";
  capacity: number;
  format: string;
};

type GruposPageData = {
  user: { name?: string | null; email?: string | null } | null;
  player: { id: number; name: string; isGoalkeeper: boolean } | null;
  superAdmin?: boolean;
  playerGroups?: GroupItem[];
  validComments?: TuMomentoItem[];
  openMatchByGroup?: Record<number, OpenMatchItem>;
};

export default function GruposPage() {
  const { data, loading } = useApiData<GruposPageData>("/api/page-data/grupos");

  if (loading && !data) {
    return (
      <div className="space-y-4 pt-10 animate-pulse">
        <div className="h-8 w-40 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-28 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-24 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  const user = data?.user ?? null;

  if (!user) {
    return (
      <div className="space-y-6 pt-10 animate-fade-in">
        <h1 className="text-2xl font-extrabold text-pitch-700 dark:text-zinc-100">Mis grupos ⚽</h1>
        <div className="card text-center space-y-4">
          <p className="text-pitch-900/70 dark:text-zinc-400">
            Iniciá sesión para ver tus grupos.
          </p>
          <GoogleSignInButton
            callbackUrl="/grupos"
            className="btn-primary w-full flex items-center justify-center gap-2"
          />
          <div>
            <Link
              href="/login"
              className="text-xs font-semibold text-pitch-600 hover:text-pitch-700 dark:text-pitch-400 hover:underline"
            >
              O ingresar con correo y contraseña →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const player = data?.player ?? null;

  if (!player) {
    return (
      <div className="space-y-6 pt-10 animate-fade-in">
        <h1 className="text-2xl font-extrabold text-pitch-700 dark:text-zinc-100">Mis grupos ⚽</h1>
        <div className="card text-center space-y-3 animate-slide-up">
          <div className="text-4xl">👋</div>
          <p className="font-bold dark:text-zinc-100">¡Bienvenido!</p>
          <p className="text-sm text-pitch-900/60 dark:text-zinc-400">
            Tu cuenta ({user.email}) está lista. Podés crear tu propio grupo o unirte con un código de invitación.
          </p>
          <div className="space-y-2 pt-2">
            <Link href="/grupos/nuevo" className="btn-primary w-full flex items-center justify-center gap-2">
              <PlusCircle size={18} /> Crear mi primer grupo
            </Link>
            <Link href="/grupos/unirse" className="btn-ghost w-full flex items-center justify-center gap-2">
              <LogIn size={18} /> Unirse con código
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const playerGroups = data?.playerGroups ?? [];
  const superAdmin = Boolean(data?.superAdmin);
  const validComments = data?.validComments ?? [];
  const openMatchByGroup = data?.openMatchByGroup ?? {};

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-pitch-700 dark:text-zinc-100">
            Mis grupos <span className="inline-block animate-bounce">⚽</span>
          </h1>
          <p className="text-sm text-pitch-900/60 dark:text-zinc-400">Hola, {player.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {superAdmin && (
            <Link
              href="/superadmin"
              className="py-1.5 px-3 rounded-xl font-black text-xs flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-yellow-300 text-zinc-950 shadow-sm hover:opacity-95 transition-opacity"
              title="Panel de Dueño: administrar todos los grupos y activar PRO manualmente"
            >
              <Crown size={14} />
              <span>Panel Dueño</span>
            </Link>
          )}
          <Link
            href="/perfil"
            className="btn-ghost text-xs py-1.5 px-3 rounded-xl font-bold flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-700 shadow-2xs hover:border-pitch-400"
            title="Ver mi perfil y cambiar nombre"
          >
            <User size={14} className="text-pitch-600 dark:text-pitch-400" />
            <span>Mi Perfil</span>
          </Link>
        </div>
      </div>

      <TuMomentoMarquee items={validComments} />

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
              <GroupCard
                key={group.id}
                group={group}
                openMatch={openMatchByGroup[group.id] ?? null}
              />
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

function GroupCard({
  group,
  openMatch,
}: {
  group: GroupItem;
  openMatch: OpenMatchItem | null;
}) {
  return (
    <Link
      href={`/grupos/${group.slug}`}
      prefetch={false}
      className="card block space-y-3 hover:-translate-y-0.5 transition-all duration-200 animate-slide-up"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-pitch-700 dark:text-zinc-100 truncate">{group.name}</h2>
            {group.proActive && (
              <span className="chip bg-gradient-to-r from-amber-400 to-yellow-300 text-zinc-950 text-[10px] font-black px-2 py-0.5 shrink-0 flex items-center gap-1 shadow-2xs">
                <Crown size={10} /> PRO
              </span>
            )}
            {group.role === "admin" && (
              <span className="chip bg-pitch-600 text-white text-[10px] px-1.5 py-0.5 shrink-0 flex items-center gap-1">
                <Shield size={10} /> Admin
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="chip bg-pitch-100 text-pitch-700 dark:bg-zinc-800 dark:text-zinc-300 text-xs">
              {group.format}
            </span>
            {group.championshipName && (
              <span className="chip bg-amber-100/90 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 text-[11px] font-bold">
                🏆 {group.championshipName}
              </span>
            )}
            {group.defaultTime && (
              <span className="text-xs text-pitch-900/50 dark:text-zinc-500">
                {group.defaultDayOfWeek !== null &&
                  ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][group.defaultDayOfWeek ?? 0]}{" "}
                {group.defaultTime}
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
          <span
            className={`chip text-xs ${
              openMatch.status === "open" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {openMatch.status === "open" ? "Abierto" : "Cerrado"}
          </span>
        </div>
      ) : (
        <p className="text-xs text-pitch-900/40 dark:text-zinc-600">Sin partido próximo</p>
      )}
    </Link>
  );
}
