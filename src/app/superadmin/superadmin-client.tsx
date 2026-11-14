"use client";

import { useState } from "react";
import Link from "next/link";
import { formatArt } from "@/lib/time";
import { actionSuperAdminTogglePro, actionSuperAdminDeleteGroup } from "./actions";
import type {
  SuperAdminDashboardData,
  SuperAdminGroupRow,
} from "@/lib/superadmin";
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
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Search,
  Eye,
  Star,
  Activity,
  Layers,
} from "lucide-react";

interface SuperAdminClientProps {
  data: SuperAdminDashboardData;
  updated?: string;
  mode?: string;
  deleted?: string;
  deletedName?: string;
}

export function SuperAdminClient({
  data,
  updated,
  mode,
  deleted,
  deletedName,
}: SuperAdminClientProps) {
  const { groups, allPlayers, recentMatches, kpis } = data;

  const [activeFilter, setActiveFilter] = useState<
    "all" | "pro" | "free" | "players" | "matches"
  >("all");
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);
  const [expandedTab, setExpandedTab] = useState<"players" | "matches">("players");
  const [playerSearch, setPlayerSearch] = useState("");
  const [deleteModalGroup, setDeleteModalGroup] = useState<SuperAdminGroupRow | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtrado de grupos
  const filteredGroups = groups.filter((g) => {
    if (activeFilter === "pro") return g.effectiveIsPro;
    if (activeFilter === "free") return !g.effectiveIsPro;
    return true;
  });

  // Filtrado de jugadores globales
  const filteredAllPlayers = allPlayers.filter((p) => {
    if (!playerSearch.trim()) return true;
    const q = playerSearch.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      p.groupNames.some((gn) => gn.toLowerCase().includes(q))
    );
  });

  const toggleGroupDetail = (groupId: number, tab: "players" | "matches") => {
    if (expandedGroupId === groupId && expandedTab === tab) {
      setExpandedGroupId(null);
    } else {
      setExpandedGroupId(groupId);
      setExpandedTab(tab);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Cabecera */}
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
            Control integral de la plataforma: auditoría en modo lectura, detalle de jugadores y partidos, borrado seguro de grupos y activación manual PRO.
          </p>
        </div>
      </div>

      {/* Notificaciones de acción */}
      {updated && (
        <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/40 p-4 text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-3 animate-slide-down">
          <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0" size={20} />
          <span>
            {mode === "disable"
              ? `Se desactivó el estado PRO del grupo #${updated}.`
              : `¡Listo! Se asignó el estado PRO (${
                  mode === "monthly" ? "30 días" : mode === "annual" ? "1 Año" : "Vitalicio"
                }) al grupo #${updated}.`}
          </span>
        </div>
      )}

      {deleted && (
        <div className="rounded-2xl bg-red-500/15 border border-red-500/40 p-4 text-xs sm:text-sm font-bold text-red-900 dark:text-red-200 flex items-center gap-3 animate-slide-down">
          <CheckCircle2 className="text-red-600 dark:text-red-400 shrink-0" size={20} />
          <span>
            El grupo {deletedName ? `"${decodeURIComponent(deletedName)}"` : ""} y todos sus partidos, convocatorias y estadísticas fueron eliminados definitivamente.
          </span>
        </div>
      )}

      {/* Tarjetas KPI Interactivas con detalle al presionar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setActiveFilter(activeFilter === "all" ? "all" : "all")}
          className={`card p-4 text-center space-y-1 transition-all cursor-pointer text-left ${
            activeFilter === "all"
              ? "ring-2 ring-pitch-500 shadow-md bg-pitch-50/40 dark:bg-zinc-800/80"
              : "hover:border-pitch-300"
          }`}
          title="Ver todos los grupos"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <Layers size={16} />
            <span className="text-[10px] uppercase font-bold text-pitch-600">Ver listado</span>
          </div>
          <span className="text-2xl font-black text-pitch-700 dark:text-pitch-400 block">
            {kpis.totalGroups}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
            Grupos Totales
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter(activeFilter === "pro" ? "all" : "pro")}
          className={`card p-4 text-center space-y-1 border-amber-400/40 transition-all cursor-pointer ${
            activeFilter === "pro"
              ? "ring-2 ring-amber-500 shadow-md bg-amber-100/50 dark:bg-amber-950/40"
              : "bg-amber-50/30 dark:bg-amber-950/15 hover:border-amber-400"
          }`}
          title="Filtrar solo grupos PRO"
        >
          <div className="flex items-center justify-between text-amber-500 mb-1">
            <Crown size={16} />
            <span className="text-[10px] uppercase font-bold">Filtrar</span>
          </div>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400 block">
            {kpis.proGroupsCount}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 block">
            ⭐ Grupos PRO
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter(activeFilter === "players" ? "all" : "players")}
          className={`card p-4 text-center space-y-1 transition-all cursor-pointer ${
            activeFilter === "players"
              ? "ring-2 ring-blue-500 shadow-md bg-blue-50/50 dark:bg-blue-950/30"
              : "hover:border-blue-400"
          }`}
          title="Presioná para ver el detalle de todos los jugadores"
        >
          <div className="flex items-center justify-between text-blue-500 mb-1">
            <Users size={16} />
            <span className="text-[10px] uppercase font-bold text-blue-600">Ver detalle →</span>
          </div>
          <span className="text-2xl font-black text-zinc-800 dark:text-zinc-200 block">
            {kpis.totalPlayers}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
            Jugadores Totales
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter(activeFilter === "matches" ? "all" : "matches")}
          className={`card p-4 text-center space-y-1 transition-all cursor-pointer ${
            activeFilter === "matches"
              ? "ring-2 ring-emerald-500 shadow-md bg-emerald-50/50 dark:bg-emerald-950/30"
              : "hover:border-emerald-400"
          }`}
          title="Presioná para ver el detalle de partidos jugados"
        >
          <div className="flex items-center justify-between text-emerald-500 mb-1">
            <Activity size={16} />
            <span className="text-[10px] uppercase font-bold text-emerald-600">Ver detalle →</span>
          </div>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block">
            {kpis.totalMatches}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
            Partidos Jugados
          </span>
        </button>
      </div>

      {/* Pestañas de filtrado rápido */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide text-xs font-bold">
        <button
          onClick={() => setActiveFilter("all")}
          className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
            activeFilter === "all"
              ? "bg-pitch-600 text-white shadow-xs"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
          }`}
        >
          Todos los Grupos ({groups.length})
        </button>
        <button
          onClick={() => setActiveFilter("pro")}
          className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
            activeFilter === "pro"
              ? "bg-amber-500 text-zinc-950 shadow-xs font-black"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
          }`}
        >
          ⭐ Solo PRO ({kpis.proGroupsCount})
        </button>
        <button
          onClick={() => setActiveFilter("free")}
          className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
            activeFilter === "free"
              ? "bg-zinc-800 text-white shadow-xs"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
          }`}
        >
          Plan Gratis ({kpis.freeGroupsCount})
        </button>
        <button
          onClick={() => setActiveFilter("players")}
          className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all flex items-center gap-1 ${
            activeFilter === "players"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
          }`}
        >
          <Users size={12} /> Detalle de Jugadores ({allPlayers.length})
        </button>
        <button
          onClick={() => setActiveFilter("matches")}
          className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all flex items-center gap-1 ${
            activeFilter === "matches"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
          }`}
        >
          <Activity size={12} /> Historial de Partidos ({kpis.totalMatches})
        </button>
      </div>

      {/* VISTA 1: DETALLE GLOBAL DE JUGADORES */}
      {activeFilter === "players" && (
        <div className="card p-5 space-y-4 animate-slide-up border-blue-300 dark:border-blue-900/50">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Users className="text-blue-500" size={20} />
                Directorio Global de Jugadores Registrados ({filteredAllPlayers.length})
              </h2>
              <p className="text-xs text-zinc-500">
                Lista de todos los usuarios de FulboMundial con sus grupos, nivel de estrellas y datos.
              </p>
            </div>
            <div className="relative min-w-[220px]">
              <Search size={14} className="absolute left-3 top-3 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar jugador o email..."
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium"
              />
            </div>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[550px] overflow-y-auto">
            {filteredAllPlayers.map((p) => (
              <div
                key={p.id}
                className="py-3 flex items-center justify-between gap-3 flex-wrap hover:bg-zinc-50 dark:hover:bg-zinc-800/40 px-2 rounded-xl transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      {p.name}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">#{p.id}</span>
                    {p.isGoalkeeper && (
                      <span className="chip text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 font-bold">
                        🧤 Arquero
                      </span>
                    )}
                    {p.stars > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-amber-500 text-xs font-bold">
                        <Star size={11} fill="currentColor" /> {p.stars}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2 flex-wrap">
                    {p.email && <span>{p.email}</span>}
                    {p.preferredPosition && (
                      <span>• Pos: <strong>{p.preferredPosition}</strong></span>
                    )}
                    <span>• Alta: {formatArt(p.createdAt, "dd/MM/yyyy")}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {p.groupNames.length === 0 ? (
                    <span className="text-[11px] text-zinc-400 italic">Sin grupo activo</span>
                  ) : (
                    p.groupNames.map((gn) => (
                      <span
                        key={gn}
                        className="chip text-[10px] bg-pitch-50 dark:bg-zinc-800 text-pitch-700 dark:text-zinc-300 font-bold px-2 py-0.5 border border-pitch-200 dark:border-zinc-700"
                      >
                        {gn}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISTA 2: HISTORIAL DE PARTIDOS RECIENTES */}
      {activeFilter === "matches" && (
        <div className="card p-5 space-y-4 animate-slide-up border-emerald-300 dark:border-emerald-900/50">
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Activity className="text-emerald-500" size={20} />
              Partidos Recientes en Toda la Plataforma ({recentMatches.length})
            </h2>
            <p className="text-xs text-zinc-500">
              Auditoría de actividad de encuentros en todos los grupos.
            </p>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[550px] overflow-y-auto">
            {recentMatches.map((m) => (
              <div
                key={m.id}
                className="py-3 flex items-center justify-between gap-3 flex-wrap hover:bg-zinc-50 dark:hover:bg-zinc-800/40 px-2 rounded-xl transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-zinc-400">#{m.id}</span>
                    <Link
                      href={m.groupSlug ? `/grupos/${m.groupSlug}` : "#"}
                      className="font-bold text-sm text-pitch-700 dark:text-pitch-400 hover:underline flex items-center gap-1"
                    >
                      {m.groupName}
                      <ExternalLink size={11} />
                    </Link>
                    <span className="chip text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 font-bold">
                      {m.format}
                    </span>
                    <span
                      className={`chip text-[10px] font-bold px-1.5 py-0.5 ${
                        m.status === "finished"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : m.status === "open"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                          : "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {m.status === "finished"
                        ? "Finalizado"
                        : m.status === "open"
                        ? "Abierto"
                        : "Cerrado"}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {formatArt(m.matchDate, "EEEE dd/MM/yyyy 'a las' HH:mm")}
                  </div>
                </div>

                <div className="text-right">
                  {m.scoreA !== null && m.scoreB !== null ? (
                    <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
                      {m.scoreA} - {m.scoreB}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400 italic">Por disputarse</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISTA PRINCIPAL: LISTADO DE GRUPOS */}
      {(activeFilter === "all" || activeFilter === "pro" || activeFilter === "free") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Trophy size={18} className="text-amber-500" />
              Grupos en la Plataforma ({filteredGroups.length})
            </h2>
            <span className="text-xs text-zinc-400">
              Tocá en los totales de cada tarjeta para ver jugadores y partidos
            </span>
          </div>

          {filteredGroups.map((g) => {
            const isExpanded = expandedGroupId === g.id;

            return (
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
                        Código invitación:{" "}
                        <strong className="font-mono text-zinc-700 dark:text-zinc-200">
                          {g.inviteCode}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>Creado: {formatArt(g.createdAt, "dd/MM/yyyy")}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/grupos/${g.slug}`}
                      className="btn-ghost text-xs py-1.5 px-3 rounded-xl font-bold flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-700 hover:border-pitch-500 shadow-2xs"
                      title="Abrir este grupo en modo lectura / auditoría"
                    >
                      <Eye size={13} className="text-pitch-600" />
                      <span>Ver en modo lectura</span>
                      <ExternalLink size={12} />
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setDeleteModalGroup(g);
                        setConfirmInput("");
                      }}
                      className="py-1.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Eliminar este grupo y sus datos asociados"
                    >
                      <Trash2 size={13} />
                      <span>Borrar Grupo</span>
                    </button>
                  </div>
                </div>

                {/* Métricas y Administradores con interactividad al presionar sobre los totales */}
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

                  <div className="space-y-2">
                    <div className="font-extrabold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Users size={14} className="text-blue-500" />
                      Totales del Grupo (Tocá para ver detalle):
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => toggleGroupDetail(g.id, "players")}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                          isExpanded && expandedTab === "players"
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60 hover:bg-blue-50"
                        }`}
                        title="Ver lista detallada de jugadores de este grupo"
                      >
                        <Users size={12} />
                        <strong>{g.memberCount}</strong> jugadores
                        {isExpanded && expandedTab === "players" ? (
                          <ChevronUp size={12} />
                        ) : (
                          <ChevronDown size={12} />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleGroupDetail(g.id, "matches")}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                          isExpanded && expandedTab === "matches"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-50"
                        }`}
                        title="Ver lista de partidos de este grupo"
                      >
                        <Calendar size={12} />
                        <strong>{g.matchCount}</strong> partidos
                        {isExpanded && expandedTab === "matches" ? (
                          <ChevronUp size={12} />
                        ) : (
                          <ChevronDown size={12} />
                        )}
                      </button>
                    </div>

                    <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
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

                {/* DETALLE DESPLEGABLE DEL GRUPO (JUGADORES O PARTIDOS) */}
                {isExpanded && (
                  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 p-4 space-y-3 animate-slide-down">
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-700 pb-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedTab("players")}
                          className={`text-xs font-extrabold px-3 py-1 rounded-lg transition-colors ${
                            expandedTab === "players"
                              ? "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300"
                              : "text-zinc-500 hover:text-zinc-900"
                          }`}
                        >
                          Jugadores de {g.name} ({g.members.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedTab("matches")}
                          className={`text-xs font-extrabold px-3 py-1 rounded-lg transition-colors ${
                            expandedTab === "matches"
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                              : "text-zinc-500 hover:text-zinc-900"
                          }`}
                        >
                          Partidos de {g.name} ({g.matches.length})
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedGroupId(null)}
                        className="text-xs text-zinc-400 hover:text-zinc-700 font-bold"
                      >
                        Cerrar ✕
                      </button>
                    </div>

                    {/* Contenido pestaña Jugadores */}
                    {expandedTab === "players" && (
                      <div className="divide-y divide-zinc-100 dark:divide-zinc-700/60 max-h-64 overflow-y-auto">
                        {g.members.length === 0 ? (
                          <p className="text-xs text-zinc-400 italic py-2">
                            No hay jugadores activos en este grupo.
                          </p>
                        ) : (
                          g.members.map((m) => (
                            <div
                              key={m.playerId}
                              className="py-2 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                  {m.name}
                                </span>
                                {m.role === "admin" && (
                                  <span className="chip text-[10px] bg-pitch-100 dark:bg-pitch-950/60 text-pitch-800 dark:text-pitch-300 px-1.5 py-0.5 font-bold">
                                    Admin
                                  </span>
                                )}
                                {m.isGoalkeeper && (
                                  <span className="chip text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-1.5 py-0.5">
                                    🧤 Arquero
                                  </span>
                                )}
                                {m.preferredPosition && (
                                  <span className="text-[11px] text-zinc-400">
                                    ({m.preferredPosition})
                                  </span>
                                )}
                              </div>
                              <div className="text-zinc-400 font-mono text-[11px]">
                                {m.email || "Sin email"}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Contenido pestaña Partidos */}
                    {expandedTab === "matches" && (
                      <div className="divide-y divide-zinc-100 dark:divide-zinc-700/60 max-h-64 overflow-y-auto">
                        {g.matches.length === 0 ? (
                          <p className="text-xs text-zinc-400 italic py-2">
                            No hay partidos creados en este grupo todavía.
                          </p>
                        ) : (
                          g.matches.map((match) => (
                            <div
                              key={match.id}
                              className="py-2 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-zinc-400">#{match.id}</span>
                                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                  {formatArt(match.matchDate, "dd/MM/yyyy HH:mm")}
                                </span>
                                <span className="chip text-[10px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold">
                                  {match.format}
                                </span>
                                <span
                                  className={`chip text-[10px] font-bold px-1.5 py-0.5 ${
                                    match.status === "finished"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                      : match.status === "open"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                                      : "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                                  }`}
                                >
                                  {match.status}
                                </span>
                              </div>
                              <div>
                                {match.scoreA !== null && match.scoreB !== null ? (
                                  <span className="font-black bg-zinc-100 dark:bg-zinc-700 px-2 py-0.5 rounded">
                                    {match.scoreA} - {match.scoreB}
                                  </span>
                                ) : (
                                  <span className="text-zinc-400 italic">Sin resultado</span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

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
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer"
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
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer"
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
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-zinc-950 font-black text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer"
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
                        className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/50 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <XCircle size={12} /> Quitar PRO DB
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN PARA BORRAR GRUPO */}
      {deleteModalGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border-2 border-red-500/50 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-2.5 rounded-full bg-red-100 dark:bg-red-950/60">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">
                  ¿Borrar el grupo definitivamente?
                </h3>
                <span className="text-xs text-red-600 dark:text-red-400 font-bold">
                  Acción irreversible (Panel de Dueño)
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-red-50 dark:bg-red-950/30 p-4 border border-red-200 dark:border-red-900/50 text-xs text-red-900 dark:text-red-200 space-y-2">
              <p className="font-bold">
                ⚠️ Estás a punto de eliminar definitivamente el grupo{" "}
                <span className="underline font-black">{deleteModalGroup.name}</span>.
              </p>
              <p>
                Se borrarán en cascada todos sus <strong>{deleteModalGroup.matchCount} partidos</strong>, las convocatorias, resultados históricos, estadísticas, pagos registrados y comentarios de jugadores vinculados a este grupo.
              </p>
            </div>

            <form
              action={actionSuperAdminDeleteGroup}
              onSubmit={() => setIsDeleting(true)}
              className="space-y-4"
            >
              <input type="hidden" name="groupId" value={deleteModalGroup.id} />
              <input type="hidden" name="groupSlug" value={deleteModalGroup.slug} />
              <input type="hidden" name="actualName" value={deleteModalGroup.name} />

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Para confirmar, escribí exactamente{" "}
                  <strong className="text-red-600 dark:text-red-400 select-all font-mono">
                    {deleteModalGroup.name}
                  </strong>
                  :
                </label>
                <input
                  type="text"
                  name="confirmName"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder={deleteModalGroup.name}
                  className="w-full text-xs p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-bold"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModalGroup(null);
                    setConfirmInput("");
                  }}
                  className="btn-ghost flex-1 text-xs py-2.5 font-bold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    confirmInput.trim().toLowerCase() !==
                      deleteModalGroup.name.trim().toLowerCase() || isDeleting
                  }
                  className="flex-1 py-2.5 px-4 rounded-xl font-black text-xs text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>{isDeleting ? "Borrando..." : "Sí, borrar grupo"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
