"use client";

import React, { useRef, useState } from "react";
import { Pitch, type PitchPlayer } from "@/components/pitch";
import { toBlob } from "html-to-image";
import { Share2, LayoutGrid, ListFilter, Shield, Zap, Sparkles } from "lucide-react";

export type EquiposPlayer = PitchPlayer;

export function EquiposClientView({
  dateText,
  teamA,
  teamB,
}: {
  dateText: string;
  teamA: EquiposPlayer[];
  teamB: EquiposPlayer[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const [viewMode, setViewMode] = useState<"pitch" | "list">("pitch");

  const handleShareAll = async () => {
    if (!containerRef.current) return;
    try {
      setSharing(true);
      const blob = await toBlob(containerRef.current, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#0d5c36",
      });

      if (!blob) throw new Error("No blob generated");

      const file = new File([blob], "equipos-fulbomundial.png", { type: "image/png" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Equipos Confirmados ⚽",
          text: `Formaciones para el partido del ${dateText}:`,
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = "equipos-fulbomundial.png";
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Error al compartir", err);
    } finally {
      setSharing(false);
    }
  };

  const starsA = teamA.reduce((acc, p) => acc + (p.stars ?? 0), 0);
  const starsB = teamB.reduce((acc, p) => acc + (p.stars ?? 0), 0);
  const avgA = teamA.length ? (starsA / teamA.length).toFixed(1) : "0";
  const avgB = teamB.length ? (starsB / teamB.length).toFixed(1) : "0";

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Barra superior con selector de modo de vista y botón compartir */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center bg-pitch-100/60 dark:bg-zinc-800 p-1 rounded-xl">
          <button
            onClick={() => setViewMode("pitch")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === "pitch"
                ? "bg-white dark:bg-zinc-900 text-pitch-800 dark:text-zinc-100 shadow-sm"
                : "text-pitch-900/60 dark:text-zinc-400 hover:text-pitch-800"
            }`}
          >
            <LayoutGrid size={14} />
            <span>Cancha 2D</span>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === "list"
                ? "bg-white dark:bg-zinc-900 text-pitch-800 dark:text-zinc-100 shadow-sm"
                : "text-pitch-900/60 dark:text-zinc-400 hover:text-pitch-800"
            }`}
          >
            <ListFilter size={14} />
            <span>Lista</span>
          </button>
        </div>

        <button
          onClick={handleShareAll}
          disabled={sharing}
          className="btn-primary text-xs flex items-center gap-2 py-2 px-3.5 shadow-sm font-bold"
        >
          <Share2 size={14} />
          <span>{sharing ? "Generando..." : "Compartir Formación"}</span>
        </button>
      </div>

      {/* Contenedor que se comparte */}
      <div
        ref={containerRef}
        className="space-y-5 bg-gradient-to-b from-pitch-900 via-pitch-800 to-pitch-950 p-4 sm:p-5 rounded-3xl border border-pitch-700 shadow-xl text-white"
      >
        <div className="text-center pt-1">
          <div className="inline-flex items-center gap-1.5 bg-pitch-700/80 border border-pitch-500/40 text-pitch-200 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider mb-1">
            <Sparkles size={12} className="text-amber-400" />
            <span>Equipos Confirmados</span>
          </div>
          <h2 className="text-sm sm:text-base font-extrabold capitalize text-white">
            {dateText}
          </h2>
        </div>

        {viewMode === "pitch" ? (
          <div className="space-y-4">
            <Pitch teamName="Equipo Claro" color="claro" players={teamA} />

            <div className="flex justify-center -my-3 relative z-10">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-sm shadow-xl bg-gradient-to-r from-emerald-500 to-pitch-600 border-2 border-white/30">
                VS
              </div>
            </div>

            <Pitch teamName="Equipo Oscuro" color="oscuro" players={teamB} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tarjeta Equipo Claro */}
            <div className="bg-white/95 dark:bg-zinc-900/95 text-pitch-950 dark:text-white rounded-2xl p-4 border border-pitch-200/50 shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-pitch-100 dark:border-zinc-800 pb-2">
                <div>
                  <h3 className="font-extrabold text-base text-pitch-700 dark:text-pitch-400 uppercase tracking-wide">
                    Equipo Claro
                  </h3>
                  <span className="text-[11px] text-pitch-900/60 dark:text-zinc-400">
                    {teamA.length} jugadores • Promedio {avgA}★
                  </span>
                </div>
                <span className="chip bg-pitch-100 text-pitch-800 dark:bg-pitch-950 dark:text-pitch-300 font-extrabold text-xs px-2 py-0.5">
                  {starsA}★ Total
                </span>
              </div>

              <div className="space-y-1.5">
                {teamA.map((p) => {
                  const pos = (p.preferredPosition || "").toUpperCase();
                  const posBadge =
                    p.isGoalkeeper || pos === "GK"
                      ? "🧤 ARQ"
                      : pos === "DEF"
                      ? "🛡️ DEF"
                      : pos === "FWD" || pos === "DEL"
                      ? "⚡ DEL"
                      : "🎯 MED";

                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-pitch-50/50 dark:bg-zinc-800/50 border border-pitch-100/50 dark:border-zinc-700/40 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-pitch-900 dark:text-zinc-100">{p.name}</span>
                        {p.isGuest && (
                          <span className="chip bg-zinc-200 text-zinc-700 text-[10px] px-1 py-0.2">
                            Invitado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="chip bg-pitch-100/80 text-pitch-800 dark:bg-zinc-700 dark:text-zinc-300 text-[10px] px-1.5 py-0.5 font-bold">
                          {posBadge}
                        </span>
                        {p.preferredFoot && (
                          <span className="text-[10px] text-pitch-900/50 dark:text-zinc-400">
                            {p.preferredFoot === "L" ? "🦵Z" : p.preferredFoot === "BOTH" ? "🦵Amb" : "🦵D"}
                          </span>
                        )}
                        <span className="font-bold text-amber-500 text-xs">
                          {p.stars ?? 0}★
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tarjeta Equipo Oscuro */}
            <div className="bg-zinc-900/95 text-white rounded-2xl p-4 border border-zinc-800 shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div>
                  <h3 className="font-extrabold text-base text-blue-400 uppercase tracking-wide">
                    Equipo Oscuro
                  </h3>
                  <span className="text-[11px] text-zinc-400">
                    {teamB.length} jugadores • Promedio {avgB}★
                  </span>
                </div>
                <span className="chip bg-blue-950 text-blue-300 font-extrabold text-xs px-2 py-0.5 border border-blue-800">
                  {starsB}★ Total
                </span>
              </div>

              <div className="space-y-1.5">
                {teamB.map((p) => {
                  const pos = (p.preferredPosition || "").toUpperCase();
                  const posBadge =
                    p.isGoalkeeper || pos === "GK"
                      ? "🧤 ARQ"
                      : pos === "DEF"
                      ? "🛡️ DEF"
                      : pos === "FWD" || pos === "DEL"
                      ? "⚡ DEL"
                      : "🎯 MED";

                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{p.name}</span>
                        {p.isGuest && (
                          <span className="chip bg-zinc-700 text-zinc-300 text-[10px] px-1 py-0.2">
                            Invitado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="chip bg-zinc-800 text-zinc-300 text-[10px] px-1.5 py-0.5 font-bold border border-zinc-700">
                          {posBadge}
                        </span>
                        {p.preferredFoot && (
                          <span className="text-[10px] text-zinc-400">
                            {p.preferredFoot === "L" ? "🦵Z" : p.preferredFoot === "BOTH" ? "🦵Amb" : "🦵D"}
                          </span>
                        )}
                        <span className="font-bold text-amber-400 text-xs">
                          {p.stars ?? 0}★
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="text-center text-[11px] text-pitch-300/70 pt-1 border-t border-pitch-700/50">
          FulboMundial • Armado equilibrado con IA
        </div>
      </div>
    </div>
  );
}
