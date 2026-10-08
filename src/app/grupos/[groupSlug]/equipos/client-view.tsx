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
        backgroundColor: "white",
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
          className="btn-primary text-sm flex items-center gap-2 py-2 px-4 shadow-sm"
        >
          <Share2 size={16} />
          {sharing ? "Generando imagen..." : "Compartir Formaciones"}
        </button>
      </div>

      <div ref={containerRef} className="space-y-6 bg-white dark:bg-zinc-950 p-4 rounded-3xl border border-pitch-100 dark:border-zinc-800">
        <div className="text-center">
          <p className="text-xs uppercase font-extrabold tracking-widest text-pitch-600 dark:text-pitch-400">
            Partido Confirmado
          </p>
          <h2 className="text-sm font-bold text-slate-800 dark:text-zinc-200 capitalize mt-0.5">
            {dateText}
          </h2>
        </div>

        <div className="space-y-4">
          <Pitch team="A" players={teamA} />
          <Pitch team="B" players={teamB} />
        </div>
      </div>
    </div>
  );
}
