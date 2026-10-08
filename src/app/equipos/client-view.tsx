"use client";

import React, { useRef, useState } from "react";
import { Pitch } from "@/components/pitch";
import { toBlob } from "html-to-image";
import { Share2 } from "lucide-react";

type Player = { id: number; name: string; isGoalkeeper: boolean; isGuest: boolean };

export function EquiposClientView({
  dateText,
  teamA,
  teamB,
}: {
  dateText: string;
  teamA: Player[];
  teamB: Player[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  const handleShareAll = async () => {
    if (!containerRef.current) return;
    try {
      setSharing(true);
      const blob = await toBlob(containerRef.current, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "white" // Para que no quede transparente
      });
      
      if (!blob) throw new Error("No blob generated");

      const file = new File([blob], "equipos.png", { type: "image/png" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Equipos",
          text: "Así formamos hoy:",
          files: [file],
        });
      } else {
        // Fallback to download if Web Share API doesn't support files
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = "equipos.png";
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

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <button
          onClick={handleShareAll}
          disabled={sharing}
          className="btn-primary animate-bounce-in w-full max-w-sm flex items-center justify-center gap-2"
        >
          <Share2 size={18} />
          {sharing ? "Generando imagen..." : "Compartir Ambos Equipos"}
        </button>
      </div>
      
      <div ref={containerRef} className="space-y-4 p-2 -m-2 bg-white dark:bg-zinc-950 rounded-xl">
        <p className="text-center text-sm capitalize text-pitch-900/60 dark:text-zinc-400">
          {dateText}
        </p>
        <Pitch teamName="Equipo Claro" color="claro" players={teamA} />
        
        <div className="flex justify-center -my-2 relative z-10">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-lg shadow-glow-green bg-gradient-to-r from-pitch-600 to-pitch-400">
            VS
          </div>
        </div>

        <Pitch teamName="Equipo Oscuro" color="oscuro" players={teamB} />
      </div>
    </div>
  );
}
