"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Share2 } from "lucide-react";
import { toBlob } from "html-to-image";

export type PitchPlayer = {
  id: number;
  name: string;
  isGoalkeeper: boolean;
  isGuest: boolean;
  stars?: number;
  preferredPosition?: string | null;
  preferredFoot?: string | null;
};

function getTacticalCoords(player: PitchPlayer, index: number, totalKeepers: number, totalField: number) {
  const pos = (player.preferredPosition || "").toUpperCase();
  if (player.isGoalkeeper || pos === "GK") {
    return { top: "86%", left: "50%" };
  }
  if (pos === "DEF") {
    return { top: "68%", left: index % 2 === 0 ? "35%" : "65%" };
  }
  if (pos === "FWD" || pos === "DEL") {
    return { top: "18%", left: index % 2 === 0 ? "35%" : "65%" };
  }
  // MED o por defecto
  const fieldSpread = [
    { top: "45%", left: "30%" },
    { top: "45%", left: "70%" },
    { top: "35%", left: "50%" },
    { top: "55%", left: "50%" },
    { top: "25%", left: "50%" },
  ];
  return fieldSpread[index % fieldSpread.length] ?? { top: "50%", left: "50%" };
}

export function Pitch({
  teamName,
  color,
  players,
}: {
  teamName: string;
  color: "claro" | "oscuro";
  players: PitchPlayer[];
}) {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  // Ordenar para intentar poner al arquero primero si existe, y los demás después.
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.isGoalkeeper && !b.isGoalkeeper) return -1;
    if (!a.isGoalkeeper && b.isGoalkeeper) return 1;
    return 0;
  });

  const handleShare = async () => {
    if (!pitchRef.current) return;
    try {
      setSharing(true);
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(pitchRef.current, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: pitchBg,
      });
      if (!blob) return;

      const file = new File([blob], `tactica-${teamName.toLowerCase().replace(" ", "-")}.png`, { type: "image/png" });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: teamName,
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = file.name;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Error al compartir la imagen", err);
    } finally {
      setSharing(false);
    }
  };

  const bgColor = color === "claro" ? "bg-white text-pitch-900 border-pitch-200" : "bg-zinc-800 text-white border-zinc-600";
  const pitchBg = "#15803d"; // bg-green-700 in hex for html-to-image bg

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">{teamName}</h3>
        <button
          onClick={handleShare}
          disabled={sharing}
          className="btn-ghost py-1.5 px-3 text-xs gap-1.5"
        >
          <Share2 size={14} />
          {sharing ? "Generando..." : "Compartir"}
        </button>
      </div>
      
      <p className="text-[11px] text-pitch-900/50 dark:text-zinc-400 leading-tight">
        * Arrastra los jugadores por la cancha para armar la táctica antes de exportar.
      </p>

      {/* Cancha de fútbol */}
      <div 
        ref={pitchRef}
        style={{ background: "repeating-linear-gradient(to bottom, #15803d 0px, #15803d 40px, #166534 40px, #166534 80px)" }}
        className={`relative w-full aspect-[3/4] rounded-lg border-2 border-white/60 overflow-hidden shadow-inner flex flex-col`}
      >
        {/* Marca de agua / Título en la imagen exportada */}
        <div className="absolute top-2 left-0 w-full text-center opacity-50 pointer-events-none">
          <span className="text-white/80 font-black tracking-widest uppercase text-base">{teamName}</span>
        </div>

        {/* Líneas de la cancha */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Línea central */}
          <div className="absolute top-1/2 left-0 w-full h-[3px] bg-white/60 -translate-y-1/2" />
          {/* Círculo central */}
          <div className="absolute top-1/2 left-1/2 w-24 h-24 border-[3px] border-white/60 rounded-full -translate-x-1/2 -translate-y-1/2" />
          {/* Punto central */}
          <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-white/60 rounded-full -translate-x-1/2 -translate-y-1/2" />
          
          {/* Área superior */}
          <div className="absolute top-0 left-1/2 w-1/2 h-1/6 border-x-[3px] border-b-[3px] border-white/60 -translate-x-1/2" />
          {/* Semicírculo área superior */}
          <div className="absolute top-[16.666%] left-1/2 w-12 h-6 border-b-[3px] border-x-[3px] border-white/60 rounded-b-full -translate-x-1/2" />
          
          {/* Área inferior */}
          <div className="absolute bottom-0 left-1/2 w-1/2 h-1/6 border-x-[3px] border-t-[3px] border-white/60 -translate-x-1/2" />
          {/* Semicírculo área inferior */}
          <div className="absolute bottom-[16.666%] left-1/2 w-12 h-6 border-t-[3px] border-x-[3px] border-white/60 rounded-t-full -translate-x-1/2" />
        </div>

        {/* Fichas de jugadores */}
        {sortedPlayers.map((p, i) => {
          const pos = getTacticalCoords(p, i, sortedPlayers.filter((x) => x.isGoalkeeper).length, sortedPlayers.length);
          const footLabel = p.preferredFoot === "L" ? " (Z)" : p.preferredFoot === "BOTH" ? " (Amb)" : "";
          
          return (
            <motion.div
              key={p.id}
              drag
              dragConstraints={pitchRef}
              dragElastic={0}
              dragMomentum={false}
              initial={{ top: pos.top, left: pos.left, x: "-50%", y: "-50%" }}
              className={`absolute cursor-grab active:cursor-grabbing flex flex-col items-center justify-center gap-0.5 z-10 select-none`}
            >
              {/* Círculo de la ficha */}
              <div className={`w-11 h-11 rounded-full border-2 ring-2 ring-white/60 shadow-xl flex flex-col items-center justify-center text-xs font-black relative ${bgColor}`}>
                <span>{p.isGoalkeeper ? "🧤" : p.name.substring(0, 1).toUpperCase()}</span>
                {typeof p.stars === "number" && p.stars > 0 && (
                  <span className="text-[9px] font-bold text-amber-500 leading-none">
                    {p.stars}★
                  </span>
                )}
              </div>
              {/* Nombre y pie debajo de la ficha */}
              <div className="bg-black/75 text-white text-[10px] px-1.5 py-0.5 rounded-md whitespace-nowrap font-medium backdrop-blur-sm shadow-md border border-white/10">
                {p.name}{footLabel}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
