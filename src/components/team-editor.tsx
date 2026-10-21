"use client";

import React, { useRef, useState } from "react";
import { Trash2, ArrowRight, ArrowLeft, ArrowLeftRight, Shield, Users } from "lucide-react";
import { actionMoveTeamInGroup, actionRemoveTeamRowInGroup } from "@/app/grupos/actions";

export type TeamRow = {
  id: number;
  name: string;
  stars: number;
  isGoalkeeper: boolean;
  isGuest: boolean;
  team: "A" | "B";
  preferredPosition?: string;
  preferredFoot?: string;
};

/**
 * Editor de equipos táctico EA FC style.
 * Permite cambiar jugadores de equipo con:
 * 1) Arrastre y soltar (Drag & Drop táctil y mouse con pointer events).
 * 2) Botón de cambio rápido en 1 tap (⇄ Pasar de equipo).
 * Nombres 100% legibles sin truncamiento, tipografía atlética y diseño premium.
 */
export function TeamEditor({
  rows: initial,
  groupSlug,
  titleA = "Claro",
  titleB = "Oscuro",
}: {
  rows: TeamRow[];
  groupSlug?: string;
  titleA?: string;
  titleB?: string;
}) {
  const [rows, setRows] = useState<TeamRow[]>(initial);
  const [dragId, setDragId] = useState<number | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState<"A" | "B" | null>(null);
  const [viewMode, setViewMode] = useState<"all" | "A" | "B">("all");

  const zoneA = useRef<HTMLDivElement | null>(null);
  const zoneB = useRef<HTMLDivElement | null>(null);

  const teamA = rows.filter((r) => r.team === "A");
  const teamB = rows.filter((r) => r.team === "B");

  const avg = (l: TeamRow[]) =>
    l.length ? (l.reduce((a, r) => a + r.stars, 0) / l.length).toFixed(1) : "0.0";
  const total = (l: TeamRow[]) => l.reduce((a, r) => a + r.stars, 0).toFixed(1);

  function zoneAt(x: number, y: number): "A" | "B" | null {
    const inRect = (el: HTMLDivElement | null) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };
    if (inRect(zoneA.current)) return "A";
    if (inRect(zoneB.current)) return "B";
    return null;
  }

  function onDown(e: React.PointerEvent, id: number) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragId(id);
    setPos({ x: e.clientX, y: e.clientY });
  }

  function onMove(e: React.PointerEvent) {
    if (dragId == null) return;
    setPos({ x: e.clientX, y: e.clientY });
    setHover(zoneAt(e.clientX, e.clientY));
  }

  function onUp(e: React.PointerEvent) {
    if (dragId == null) return;
    const target = zoneAt(e.clientX, e.clientY);
    const row = rows.find((r) => r.id === dragId);
    if (target && row && row.team !== target) {
      setRows((rs) => rs.map((r) => (r.id === dragId ? { ...r, team: target } : r)));
      void actionMoveTeamInGroup(dragId, target, groupSlug);
    }
    setDragId(null);
    setHover(null);
  }

  function moveToOppositeTeam(id: number) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const target = row.team === "A" ? "B" : "A";
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, team: target } : r)));
    void actionMoveTeamInGroup(id, target, groupSlug);
  }

  function remove(id: number) {
    setRows((rs) => rs.filter((r) => r.id !== id));
    void actionRemoveTeamRowInGroup(id, groupSlug);
  }

  const dragRow = rows.find((r) => r.id === dragId) || null;

  return (
    <div className="select-none space-y-3">
      {/* Barra de control y modos de vista */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
          <ArrowLeftRight size={13} className="text-emerald-500 shrink-0" />
          <span>Arrastrá o usá los botones para cambiar de equipo</span>
        </p>

        {/* Selector de pestañas para pantallas móviles */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs">
          <button
            type="button"
            onClick={() => setViewMode("all")}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              viewMode === "all"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Ambos
          </button>
          <button
            type="button"
            onClick={() => setViewMode("A")}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
              viewMode === "A"
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="truncate max-w-[80px]">{titleA}</span>
            <span className="text-[10px] opacity-80">({teamA.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("B")}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
              viewMode === "B"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-zinc-500 hover:text-cyan-600 dark:hover:text-cyan-400"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="truncate max-w-[80px]">{titleB}</span>
            <span className="text-[10px] opacity-80">({teamB.length})</span>
          </button>
        </div>
      </div>

      {/* Grid de Columnas */}
      <div
        className={`grid gap-3.5 ${
          viewMode === "all" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {(viewMode === "all" || viewMode === "A") && (
          <TeamColumn
            innerRef={zoneA}
            title={titleA}
            targetTeamName={titleB}
            teamSide="A"
            rows={teamA}
            total={total(teamA)}
            avg={avg(teamA)}
            isHovered={hover === "A"}
            dragId={dragId}
            onDown={onDown}
            onMove={onMove}
            onUp={onUp}
            onMoveToOpposite={moveToOppositeTeam}
            onRemove={remove}
          />
        )}

        {(viewMode === "all" || viewMode === "B") && (
          <TeamColumn
            innerRef={zoneB}
            title={titleB}
            targetTeamName={titleA}
            teamSide="B"
            rows={teamB}
            total={total(teamB)}
            avg={avg(teamB)}
            isHovered={hover === "B"}
            dragId={dragId}
            onDown={onDown}
            onMove={onMove}
            onUp={onUp}
            onMoveToOpposite={moveToOppositeTeam}
            onRemove={remove}
          />
        )}
      </div>

      {/* Clon flotante de jugador al arrastrar */}
      {dragRow && (
        <div
          className="pointer-events-none fixed z-[100] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-emerald-400 bg-zinc-950/95 text-white px-4 py-2.5 shadow-2xl shadow-emerald-500/40 scale-105 backdrop-blur-md"
          style={{ left: pos.x, top: pos.y }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-black flex items-center justify-center font-black text-xs shadow-md">
              {dragRow.isGoalkeeper ? "🧤" : dragRow.name.trim().charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="font-black text-sm block leading-none">{dragRow.name}</span>
              <span className="text-[10px] text-amber-300 font-bold">⭐ {dragRow.stars}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamColumn({
  innerRef,
  title,
  targetTeamName,
  teamSide,
  rows,
  total,
  avg,
  isHovered,
  dragId,
  onDown,
  onMove,
  onUp,
  onMoveToOpposite,
  onRemove,
}: {
  innerRef: React.RefObject<HTMLDivElement | null>;
  title: string;
  targetTeamName: string;
  teamSide: "A" | "B";
  rows: TeamRow[];
  total: string;
  avg: string;
  isHovered: boolean;
  dragId: number | null;
  onDown: (e: React.PointerEvent, id: number) => void;
  onMove: (e: React.PointerEvent) => void;
  onUp: (e: React.PointerEvent) => void;
  onMoveToOpposite: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  const isTeamA = teamSide === "A";

  return (
    <div
      ref={innerRef}
      className={`min-h-[240px] flex flex-col rounded-3xl border-2 transition-all duration-200 overflow-hidden shadow-sm ${
        isHovered
          ? isTeamA
            ? "border-emerald-500 ring-4 ring-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/20 scale-[1.01]"
            : "border-cyan-500 ring-4 ring-cyan-500/20 bg-cyan-50/30 dark:bg-cyan-950/20 scale-[1.01]"
          : isTeamA
          ? "border-emerald-500/30 bg-gradient-to-b from-emerald-500/5 via-white/50 to-white dark:via-zinc-900/60 dark:to-zinc-900"
          : "border-cyan-500/30 bg-gradient-to-b from-cyan-500/5 via-white/50 to-white dark:via-zinc-900/60 dark:to-zinc-900"
      }`}
    >
      {/* Header del Equipo */}
      <div
        className={`p-3.5 border-b flex items-center justify-between gap-2 ${
          isTeamA
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-100"
            : "bg-cyan-500/10 border-cyan-500/20 text-cyan-950 dark:text-cyan-100"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-sm shrink-0 ${
              isTeamA ? "bg-emerald-600" : "bg-cyan-600"
            }`}
          >
            <Shield size={14} />
          </div>
          <div className="min-w-0">
            <h4 className="font-black text-sm uppercase tracking-wide truncate">{title}</h4>
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              {rows.length} {rows.length === 1 ? "jugador" : "jugadores"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold shrink-0">
          <span className="bg-white/80 dark:bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-200/50 dark:border-zinc-700/50 text-zinc-700 dark:text-zinc-300">
            ⭐ {total}
          </span>
          <span className="bg-white/80 dark:bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-200/50 dark:border-zinc-700/50 text-zinc-600 dark:text-zinc-400">
            Ø {avg}
          </span>
        </div>
      </div>

      {/* Lista de Jugadores */}
      <ul className="flex-1 p-2.5 space-y-2 relative">
        {rows.map((r) => {
          const isDraggingThis = dragId === r.id;
          const initialChar = r.name ? r.name.trim().charAt(0).toUpperCase() : "•";

          return (
            <li
              key={r.id}
              className={`rounded-2xl border transition-all duration-150 p-2.5 sm:p-3 relative ${
                isDraggingThis
                  ? "opacity-25 scale-95 border-dashed border-zinc-400"
                  : isTeamA
                  ? "bg-white dark:bg-zinc-800/90 border-emerald-100 dark:border-emerald-900/40 hover:border-emerald-400 dark:hover:border-emerald-500 shadow-sm"
                  : "bg-white dark:bg-zinc-800/90 border-cyan-100 dark:border-cyan-900/40 hover:border-cyan-400 dark:hover:border-cyan-500 shadow-sm"
              }`}
            >
              {/* Fila Principal: Handle + Avatar + Nombre completo (sin truncate) + Quitar */}
              <div className="flex items-start gap-2.5">
                {/* Drag handle táctil con pointer capture */}
                <div
                  onPointerDown={(e) => onDown(e, r.id)}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  style={{ touchAction: "none" }}
                  className="cursor-grab active:cursor-grabbing p-1 -m-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 shrink-0 select-none"
                  title="Arrastrar para mover de equipo"
                >
                  <span className="text-base font-bold leading-none select-none tracking-tighter">⋮⋮</span>
                </div>

                {/* Avatar / Inicial */}
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                    r.isGoalkeeper
                      ? "bg-amber-400 text-black border border-amber-300"
                      : isTeamA
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800"
                  }`}
                >
                  {r.isGoalkeeper ? "🧤" : initialChar}
                </div>

                {/* Nombre Completo: 100% visible, sin truncate */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 leading-snug break-words">
                    {r.name}
                  </div>
                </div>

                {/* Botón Quitar */}
                <button
                  type="button"
                  onClick={() => onRemove(r.id)}
                  className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors shrink-0 -mt-0.5"
                  title="Quitar jugador de los equipos"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Fila Inferior: Badges de rol/estrellas + Botón de cambio rápido */}
              <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-700/60 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50 px-2 py-0.5 rounded-md">
                    ⭐ {r.stars}
                  </span>

                  {r.isGoalkeeper && (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-black px-1.5 py-0.5 rounded">
                      POR
                    </span>
                  )}

                  {r.preferredPosition && !r.isGoalkeeper && (
                    <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700/50 px-1.5 py-0.5 rounded">
                      {r.preferredPosition}
                    </span>
                  )}

                  {r.isGuest && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-1.5 py-0.5 rounded">
                      INV
                    </span>
                  )}
                </div>

                {/* Botón de Cambio Rápido de Equipo (1 Tap) */}
                <button
                  type="button"
                  onClick={() => onMoveToOpposite(r.id)}
                  className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl transition-all shadow-2xs ${
                    isTeamA
                      ? "bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/50 dark:hover:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800"
                      : "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  }`}
                  title={`Pasar a ${targetTeamName}`}
                >
                  <span>Mover a {targetTeamName}</span>
                  {isTeamA ? <ArrowRight size={12} /> : <ArrowLeft size={12} />}
                </button>
              </div>
            </li>
          );
        })}

        {rows.length === 0 && (
          <div className="min-h-[140px] border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center p-4 text-center gap-1.5 text-zinc-400 dark:text-zinc-500 bg-zinc-50/50 dark:bg-zinc-800/20">
            <Users size={24} className="opacity-40" />
            <p className="text-xs font-semibold">
              {isHovered ? "¡Soltá acá para sumar a este equipo!" : "No hay jugadores en este equipo"}
            </p>
            <p className="text-[11px] opacity-70">Arrastrá o usá el botón para mover jugadores acá</p>
          </div>
        )}
      </ul>
    </div>
  );
}
