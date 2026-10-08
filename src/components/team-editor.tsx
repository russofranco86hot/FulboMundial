"use client";

import { useRef, useState } from "react";
import { adminMoveTeam, adminRemoveRow } from "@/app/admin/actions";
import { Trash2 } from "lucide-react";

export type TeamRow = {
  id: number;
  name: string;
  stars: number;
  isGoalkeeper: boolean;
  isGuest: boolean;
  team: "A" | "B";
};

/**
 * Editor de equipos con drag & drop (táctil y mouse). Arrastrá un jugador a la
 * otra columna para cambiarlo de equipo. Sin librerías: pointer events.
 */
export function TeamEditor({ rows: initial }: { rows: TeamRow[] }) {
  const [rows, setRows] = useState<TeamRow[]>(initial);
  const [dragId, setDragId] = useState<number | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState<"A" | "B" | null>(null);
  const zoneA = useRef<HTMLDivElement | null>(null);
  const zoneB = useRef<HTMLDivElement | null>(null);

  const teamA = rows.filter((r) => r.team === "A");
  const teamB = rows.filter((r) => r.team === "B");
  const avg = (l: TeamRow[]) =>
    l.length ? (l.reduce((a, r) => a + r.stars, 0) / l.length).toFixed(2) : "0.00";
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
      void adminMoveTeam(dragId, target);
    }
    setDragId(null);
    setHover(null);
  }

  function remove(id: number) {
    setRows((rs) => rs.filter((r) => r.id !== id));
    void adminRemoveRow(id);
  }

  const dragRow = rows.find((r) => r.id === dragId) || null;

  return (
    <div className="select-none">
      <p className="mb-3 text-xs font-medium text-pitch-900/60 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg text-center">
        👆 Mantené presionado y arrastrá para cambiar de equipo
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Column
          innerRef={zoneA}
          title="Claro"
          headerBg="bg-pitch-50 dark:bg-pitch-900/20"
          titleColor="text-pitch-700 dark:text-pitch-400"
          borderColor={hover === "A" ? "border-pitch-500" : "border-pitch-200 dark:border-pitch-900/50"}
          ring={hover === "A"}
          total={total(teamA)}
          avg={avg(teamA)}
          rows={teamA}
          dragId={dragId}
          onDown={onDown}
          onMove={onMove}
          onUp={onUp}
          onRemove={remove}
        />
        <Column
          innerRef={zoneB}
          title="Oscuro"
          headerBg="bg-blue-50 dark:bg-blue-900/20"
          titleColor="text-blue-700 dark:text-blue-400"
          borderColor={hover === "B" ? "border-blue-500" : "border-blue-200 dark:border-blue-900/50"}
          ring={hover === "B"}
          total={total(teamB)}
          avg={avg(teamB)}
          rows={teamB}
          dragId={dragId}
          onDown={onDown}
          onMove={onMove}
          onUp={onUp}
          onRemove={remove}
        />
      </div>

      {/* Clon flotante mientras se arrastra */}
      {dragRow && (
        <div
          className="pointer-events-none fixed z-[80] -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-pitch-500 bg-white/95 backdrop-blur dark:bg-zinc-800/95 dark:text-zinc-100 px-4 py-2 text-sm font-bold shadow-xl shadow-pitch-500/20 scale-105 transition-transform"
          style={{ left: pos.x, top: pos.y }}
        >
          <div className="flex items-center gap-2">
            {dragRow.isGoalkeeper && "🧤 "}
            {dragRow.name}
            <span className="text-xs bg-pitch-100 text-pitch-700 dark:bg-pitch-900 dark:text-pitch-300 px-1.5 rounded">⭐ {dragRow.stars}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Column({
  innerRef,
  title,
  headerBg,
  titleColor,
  borderColor,
  ring,
  total,
  avg,
  rows,
  dragId,
  onDown,
  onMove,
  onUp,
  onRemove,
}: {
  innerRef: React.RefObject<HTMLDivElement | null>;
  title: string;
  headerBg: string;
  titleColor: string;
  borderColor: string;
  ring: boolean;
  total: string;
  avg: string;
  rows: TeamRow[];
  dragId: number | null;
  onDown: (e: React.PointerEvent, id: number) => void;
  onMove: (e: React.PointerEvent) => void;
  onUp: (e: React.PointerEvent) => void;
  onRemove: (id: number) => void;
}) {
  return (
    <div
      ref={innerRef}
      className={`min-h-[200px] flex flex-col rounded-2xl border-2 bg-white/50 dark:bg-zinc-900/30 transition-all duration-200 overflow-hidden ${
        ring ? `${borderColor} shadow-lg scale-[1.02] bg-white dark:bg-zinc-800` : `${borderColor}`
      }`}
    >
      <div className={`${headerBg} p-3 border-b ${borderColor} flex flex-col gap-1`}>
        <div className={`text-base font-extrabold uppercase tracking-wider ${titleColor} text-center`}>
          {title}
        </div>
        <div className="flex items-center justify-center gap-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1 bg-white/50 dark:bg-zinc-900/50 px-2 py-0.5 rounded-full">⭐ {total}</span>
          <span className="flex items-center gap-1 bg-white/50 dark:bg-zinc-900/50 px-2 py-0.5 rounded-full">Prom {avg}</span>
        </div>
      </div>
      
      <ul className="flex-1 p-2 space-y-1.5 relative">
        {rows.map((r) => (
          <li
            key={r.id}
            onPointerDown={(e) => onDown(e, r.id)}
            onPointerMove={onMove}
            onPointerUp={onUp}
            style={{ touchAction: "none" }}
            className={`flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-2.5 text-sm shadow-sm hover:border-pitch-300 dark:hover:border-pitch-600 transition-colors ${
              dragId === r.id ? "opacity-30 scale-95" : ""
            }`}
          >
            <span className="cursor-grab text-zinc-300 dark:text-zinc-600 active:cursor-grabbing">⋮⋮</span>
            <span className="flex-1 truncate font-medium text-zinc-800 dark:text-zinc-200">
              {r.isGoalkeeper && "🧤 "}
              {r.name}
              {r.isGuest && <span className="ml-1 text-[10px] uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1 rounded">Inv</span>}
            </span>
            <span className="text-[10px] font-bold text-zinc-400">⭐{r.stars}</span>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onRemove(r.id)}
              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-1"
              title="Quitar"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
        {rows.length === 0 && (
          <div className="absolute inset-2 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl flex items-center justify-center text-xs font-medium text-zinc-400 dark:text-zinc-500 bg-zinc-50/50 dark:bg-zinc-800/30">
            {ring ? "¡Soltá acá!" : "Arrastrá jugadores acá"}
          </div>
        )}
      </ul>
    </div>
  );
}
