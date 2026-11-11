import { redirect } from "next/navigation";
import Link from "next/link";
import {
  isSuperAdmin,
  getSuperAdminDashboardData,
} from "@/lib/superadmin";
import { actionSuperAdminTogglePro } from "./actions";
import { formatArt } from "@/lib/time";
import {
  Crown,
  Shield,
  Users,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Sparkles,
  Trophy,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; mode?: string }>;
}) {
  const allowed = await isSuperAdmin();
  if (!allowed) {
    redirect("/grupos");
  }

  const { updated, mode } = await searchParams;
  const { groups, kpis } = await getSuperAdminDashboardData();

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link
            href="/grupos"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-pitch-600 dark:text-pitch-400 hover:underline mb-2"
          >
            <ArrowLeft size={14} /> Volver a Mis Grupos
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <Crown className="text-amber-500" size={28} />
            Panel de Dueño (SuperAdmin)
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Control global de grupos, administradores y activación manual de cuentas PRO sin pago.
          </p>
        </div>
      </div>

      {updated && (
        <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/40 p-4 text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-3">
          <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0" size={20} />
          <span>
            {mode === "disable"
              ? `Se desactivó el estado PRO manual del grupo #${updated}.`
              : `¡Listo! Se habilitó FulboMundial PRO (${
                  mode === "monthly" ? "30 días" : mode === "annual" ? "1 Año" : "Vitalicio"
                }) para el grupo #${updated} de forma manual.`}
          </span>
        </div>
      )}

      {/* KPIs Globales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 text-center space-y-1">
          <span className="text-2xl font-black text-pitch-700 dark:text-pitch-400 block">
            {kpis.totalGroups}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Grupos Totales
          </span>
        </div>
        <div className="card p-4 text-center space-y-1 border-amber-400/40 bg-amber-50/30 dark:bg-amber-950/15">
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400 block">
            {kpis.proGroupsCount}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            ⭐ Grupos PRO
          </span>
        </div>
        <div className="card p-4 text-center space-y-1">
          <span className="text-2xl font-black text-zinc-800 dark:text-zinc-200 block">
            {kpis.totalPlayers}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Jugadores
          </span>
        </div>
        <div className="card p-4 text-center space-y-1">
          <span className="text-2xl font-black text-blue-600 dark:text-blue-400 block">
            {kpis.totalMatches}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Partidos Jugados
          </span>
        </div>
      </div>

      {/* Lista de todos los grupos */}
      <div className="space-y-4">
        <h2 className="font-extrabold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Trophy size={18} className="text-amber-500" />
          Todos los Grupos / Equipos en la Plataforma ({groups.length})
        </h2>

        {groups.map((g) => (
          <div
            key={g.id}
            className={`card p-5 space-y-4 border-2 transition-all ${
              g.effectiveIsPro
                ? "border-amber-400/60 bg-gradient-to-br from-amber-50/30 via-white to-white dark:from-amber-950/20 dark:via-zinc-900 dark:to-zinc-900"
                : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            {/* Cabecera del Grupo */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-zinc-400">#{g.id}</span>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">
                    {g.name}
                  </h3>
                  <span className="chip bg-pitch-100 dark:bg-zinc-800 text-pitch-800 dark:text-zinc-300 text-xs font-bold px-2 py-0.5">
                    {g.format}
                  </span>
                  {g.effectiveIsPro ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-gradient-to-r from-amber-400 to-yellow-300 text-zinc-950 shadow-xs">
                      <Crown size={12} /> PRO Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      Plan Gratis
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex-wrap">
                  <span>
                    Slug: <code className="font-mono font-bold">/grupos/{g.slug}</code>
                  </span>
                  <span>•</span>
                  <span>
                    Código invitación: <strong className="font-mono text-zinc-700 dark:text-zinc-200">{g.inviteCode}</strong>
                  </span>
                  <span>•</span>
                  <span>Creado: {formatArt(g.createdAt, "dd/MM/yyyy")}</span>
                </div>
              </div>

              <Link
                href={`/grupos/${g.slug}`}
                className="btn-ghost text-xs py-1.5 px-3 rounded-xl font-bold flex items-center gap-1 border border-zinc-200 dark:border-zinc-700"
              >
                <span>Abrir grupo</span>
                <ExternalLink size={12} />
              </Link>
            </div>

            {/* Métricas y Administradores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-50/80 dark:bg-zinc-800/40 rounded-2xl p-3.5 text-xs border border-zinc-200/60 dark:border-zinc-700/50">
              <div className="space-y-1.5">
                <div className="font-extrabold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Shield size={14} className="text-pitch-600" />
                  Administrador(es) del Grupo:
                </div>
                {g.admins.length === 0 ? (
                  <p className="text-zinc-400 italic">Sin admin registrado</p>
                ) : (
                  <ul className="space-y-1">
                    {g.admins.map((adm) => (
                      <li key={adm.playerId} className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">
                          {adm.name}
                        </span>
                        {adm.email && (
                          <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                            ({adm.email})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="font-extrabold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Users size={14} className="text-blue-500" />
                  Actividad y Suscripción:
                </div>
                <p className="text-zinc-600 dark:text-zinc-300">
                  <strong>{g.memberCount}</strong> jugadores activos ·{" "}
                  <strong>{g.matchCount}</strong> partidos
                  {g.lastMatchDate && ` (último: ${formatArt(g.lastMatchDate, "dd/MM/yyyy")})`}
                </p>
                <p className="text-zinc-500 dark:text-zinc-400">
                  Estado PRO:{" "}
                  {g.isWhitelistPro && !g.isProDb ? (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      Bonificado por PRO_WHITELIST_SLUGS
                    </span>
                  ) : g.isProDb ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Habilitado en DB ({g.proPlan || "pro_lifetime"}
                      {g.proExpiresAt
                        ? ` · vence ${formatArt(g.proExpiresAt, "dd/MM/yyyy")}`
                        : " · Vitalicio"}
                      )
                    </span>
                  ) : (
                    <span>Desactivado (Gratis)</span>
                  )}
                </p>
              </div>
            </div>

            {/* Botones de Activación / Desactivación Manual PRO */}
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mr-1">
                Control PRO Manual (sin pago):
              </span>

              <form action={actionSuperAdminTogglePro}>
                <input type="hidden" name="groupId" value={g.id} />
                <input type="hidden" name="groupSlug" value={g.slug} />
                <input type="hidden" name="mode" value="monthly" />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all"
                >
                  <Calendar size={12} /> +30 Días PRO
                </button>
              </form>

              <form action={actionSuperAdminTogglePro}>
                <input type="hidden" name="groupId" value={g.id} />
                <input type="hidden" name="groupSlug" value={g.slug} />
                <input type="hidden" name="mode" value="annual" />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all"
                >
                  <Sparkles size={12} /> +1 Año PRO
                </button>
              </form>

              <form action={actionSuperAdminTogglePro}>
                <input type="hidden" name="groupId" value={g.id} />
                <input type="hidden" name="groupSlug" value={g.slug} />
                <input type="hidden" name="mode" value="lifetime" />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-zinc-950 font-black text-xs flex items-center gap-1 shadow-xs transition-all"
                >
                  <Crown size={12} /> Dar PRO Vitalicio
                </button>
              </form>

              {g.isProDb && (
                <form action={actionSuperAdminTogglePro}>
                  <input type="hidden" name="groupId" value={g.id} />
                  <input type="hidden" name="groupSlug" value={g.slug} />
                  <input type="hidden" name="mode" value="disable" />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/50 font-bold text-xs flex items-center gap-1 transition-all"
                  >
                    <XCircle size={12} /> Quitar PRO DB
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
