"use client";

import React, { useRef, useState, useMemo } from "react";
import { Pitch, type PitchPlayer } from "@/components/pitch";
import { toBlob } from "html-to-image";
import { Share2, LayoutGrid, ListFilter, Sparkles, Shield, Trophy } from "lucide-react";

export type EquiposPlayer = PitchPlayer;

export function EquiposClientView({
  dateText,
  teamA,
  teamB,
  teamAName = "Equipo Claro",
  teamBName = "Equipo Oscuro",
}: {
  dateText: string;
  teamA: EquiposPlayer[];
  teamB: EquiposPlayer[];
  teamAName?: string;
  teamBName?: string;
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
        backgroundColor: "#030e07",
      });

      if (!blob) throw new Error("No blob generated");

      const file = new File([blob], "equipos-fulbomundial.png", { type: "image/png" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Formaciones Confirmadas ⚽",
          text: `Formaciones Oficiales para el partido del ${dateText}: ${teamAName} vs ${teamBName}`,
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `formaciones-${teamAName.toLowerCase()}-vs-${teamBName.toLowerCase()}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Error al compartir formaciones", err);
    } finally {
      setSharing(false);
    }
  };

  const getLineCounts = (players: EquiposPlayer[]) => {
    let gk = 0,
      def = 0,
      med = 0,
      del = 0;
    players.forEach((p) => {
      const pos = (p.preferredPosition || "").toUpperCase();
      if (p.isGoalkeeper || pos === "GK" || pos === "POR" || pos === "ARQ") gk++;
      else if (pos === "DEF") def++;
      else if (pos === "FWD" || pos === "DEL" || pos === "ATA") del++;
      else med++;
    });
    return { gk, def, med, del };
  };

  const countsA = useMemo(() => getLineCounts(teamA), [teamA]);
  const countsB = useMemo(() => getLineCounts(teamB), [teamB]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Barra superior con selector de modo de vista y botón compartir */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setViewMode("pitch")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              viewMode === "pitch"
                ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-md border border-zinc-200/50 dark:border-zinc-700"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
            }`}
          >
            <LayoutGrid size={14} />
            <span>Cancha 2D EA FC</span>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              viewMode === "list"
                ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-md border border-zinc-200/50 dark:border-zinc-700"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
            }`}
          >
            <ListFilter size={14} />
            <span>Alineación en Lista</span>
          </button>
        </div>

        <button
          onClick={handleShareAll}
          disabled={sharing}
          className="btn-primary text-xs flex items-center gap-2 py-2 px-4 shadow-glow-green font-black uppercase tracking-wider"
        >
          <Share2 size={14} />
          <span>{sharing ? "Generando..." : "Compartir Ambos Equipos"}</span>
        </button>
      </div>

      {/* Contenedor que se comparte (Estética EA FC Matchday) */}
      <div
        ref={containerRef}
        className="space-y-6 bg-gradient-to-b from-[#051c11] via-[#03140c] to-[#020b06] p-4 sm:p-6 rounded-3xl border-2 border-emerald-500/30 shadow-2xl text-white relative overflow-hidden"
      >
        {/* Luces atmosféricas de estadio */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Encabezado oficial EA FC Style */}
        <div className="text-center pt-2 relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 bg-black/60 border border-emerald-400/30 text-emerald-300 px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-widest shadow-lg">
            <Sparkles size={12} className="text-amber-400" />
            <span>Formaciones Oficiales</span>
            <span className="text-white/30">•</span>
            <span className="text-white/80 font-bold">EA FC Tactical Board</span>
          </div>

          <h2 className="text-lg sm:text-2xl font-black capitalize text-white tracking-wide">
            {teamAName} <span className="text-emerald-400 font-extrabold px-1">VS</span> {teamBName}
          </h2>

          <p className="text-xs text-zinc-400 font-semibold capitalize">
            {dateText}
          </p>
        </div>

        {viewMode === "pitch" ? (
          <div className="space-y-6 relative z-10">
            {/* Cancha Equipo A */}
            <div className="bg-black/30 backdrop-blur-md p-3.5 rounded-3xl border border-emerald-500/20 shadow-xl">
              <Pitch teamName={teamAName} color="claro" players={teamA} />
            </div>

            {/* Divisor VS Futurista EA FC */}
            <div className="flex justify-center -my-3 relative z-20">
              <div className="px-6 py-2 rounded-2xl flex items-center gap-3 text-white font-black text-sm shadow-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 border border-white/40 tracking-widest uppercase">
                <span className="drop-shadow-sm">{teamAName}</span>
                <span className="bg-black/70 text-amber-300 px-2.5 py-0.5 rounded-lg text-xs font-black shadow-inner">
                  VS
                </span>
                <span className="drop-shadow-sm">{teamBName}</span>
              </div>
            </div>

            {/* Cancha Equipo B */}
            <div className="bg-black/30 backdrop-blur-md p-3.5 rounded-3xl border border-cyan-500/20 shadow-xl">
              <Pitch teamName={teamBName} color="oscuro" players={teamB} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
            {/* Tarjeta Equipo A */}
            <div className="bg-zinc-950/90 text-white rounded-3xl p-5 border border-emerald-500/30 shadow-xl space-y-3.5 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-black flex items-center justify-center font-black text-sm shadow-md">
                    <Shield size={16} />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white uppercase tracking-wider">
                      {teamAName}
                    </h3>
                    <span className="text-[11px] text-zinc-400 font-medium">
                      {teamA.length} Convocados
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-xl">
                  <span>🧤 {countsA.gk}</span>
                  <span>🛡️ {countsA.def}</span>
                  <span>🎯 {countsA.med}</span>
                  <span>⚡ {countsA.del}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                {teamA.map((p) => {
                  const pos = (p.preferredPosition || "").toUpperCase();
                  const isGk = p.isGoalkeeper || pos === "GK" || pos === "POR" || pos === "ARQ";
                  const posBadge = isGk
                    ? "🧤 POR"
                    : pos === "DEF"
                    ? "🛡️ DEF"
                    : pos === "FWD" || pos === "DEL"
                    ? "⚡ DEL"
                    : "🎯 MED";

                  const badgeClass = isGk
                    ? "bg-amber-400 text-black"
                    : pos === "DEF"
                    ? "bg-sky-400 text-black"
                    : pos === "FWD" || pos === "DEL"
                    ? "bg-rose-500 text-white"
                    : "bg-emerald-400 text-black";

                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 hover:border-emerald-500/50 transition-all text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{p.name}</span>
                        {p.isGuest && (
                          <span className="chip bg-zinc-800 text-zinc-300 text-[9px] px-1.5 py-0.2 font-semibold border border-zinc-700">
                            Invitado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`chip text-[10px] px-2 py-0.5 font-black uppercase rounded shadow-sm ${badgeClass}`}>
                          {posBadge}
                        </span>
                        {p.preferredFoot && (
                          <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                            {p.preferredFoot === "L"
                              ? "🦵 Zurdo"
                              : p.preferredFoot === "BOTH"
                              ? "🦵 Amb"
                              : "🦵 Diestro"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tarjeta Equipo B */}
            <div className="bg-zinc-950/90 text-white rounded-3xl p-5 border border-cyan-500/30 shadow-xl space-y-3.5 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-black flex items-center justify-center font-black text-sm shadow-md">
                    <Shield size={16} />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white uppercase tracking-wider">
                      {teamBName}
                    </h3>
                    <span className="text-[11px] text-zinc-400 font-medium">
                      {teamB.length} Convocados
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-black text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-1 rounded-xl">
                  <span>🧤 {countsB.gk}</span>
                  <span>🛡️ {countsB.def}</span>
                  <span>🎯 {countsB.med}</span>
                  <span>⚡ {countsB.del}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                {teamB.map((p) => {
                  const pos = (p.preferredPosition || "").toUpperCase();
                  const isGk = p.isGoalkeeper || pos === "GK" || pos === "POR" || pos === "ARQ";
                  const posBadge = isGk
                    ? "🧤 POR"
                    : pos === "DEF"
                    ? "🛡️ DEF"
                    : pos === "FWD" || pos === "DEL"
                    ? "⚡ DEL"
                    : "🎯 MED";

                  const badgeClass = isGk
                    ? "bg-amber-400 text-black"
                    : pos === "DEF"
                    ? "bg-sky-400 text-black"
                    : pos === "FWD" || pos === "DEL"
                    ? "bg-rose-500 text-white"
                    : "bg-cyan-400 text-black";

                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 hover:border-cyan-500/50 transition-all text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{p.name}</span>
                        {p.isGuest && (
                          <span className="chip bg-zinc-800 text-zinc-300 text-[9px] px-1.5 py-0.2 font-semibold border border-zinc-700">
                            Invitado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`chip text-[10px] px-2 py-0.5 font-black uppercase rounded shadow-sm ${badgeClass}`}>
                          {posBadge}
                        </span>
                        {p.preferredFoot && (
                          <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                            {p.preferredFoot === "L"
                              ? "🦵 Zurdo"
                              : p.preferredFoot === "BOTH"
                              ? "🦵 Amb"
                              : "🦵 Diestro"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="text-center text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/80 relative z-10 flex items-center justify-center gap-2">
          <span>⚡ FULBOMUNDIAL • TACTICAL ENGINE</span>
          <span>·</span>
          <span>ARMADO EQUILIBRADO CON IA</span>
        </div>
      </div>
    </div>
  );
}
