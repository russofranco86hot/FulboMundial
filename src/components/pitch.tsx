"use client";

import React, { useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Share2, Shield, Sparkles, Move } from "lucide-react";

export type PitchPlayer = {
  id: number;
  name: string;
  isGoalkeeper: boolean;
  isGuest: boolean;
  stars?: number;
  preferredPosition?: string | null;
  preferredFoot?: string | null;
};

type TacticalRole = "GK" | "DEF" | "MED" | "DEL";

type PlayerPlacement = {
  top: string;
  left: string;
  role: TacticalRole;
  roleLabel: string;
};

/**
 * Distribuye tácticamente a los jugadores como en EA FC (FUT Squad Screen),
 * asegurando líneas claras (Arquero, Defensa, Mediocampo, Ataque) y separación horizontal sin solapamiento.
 */
function computeTacticalLayout(players: PitchPlayer[]): {
  placements: Map<number, PlayerPlacement>;
  formationSummary: string;
} {
  const placements = new Map<number, PlayerPlacement>();
  if (players.length === 0) {
    return { placements, formationSummary: "Sin jugadores" };
  }

  // 1. Identificar arqueros
  const keepers: PitchPlayer[] = [];
  const outfield: PitchPlayer[] = [];

  players.forEach((p) => {
    const rawPos = (p.preferredPosition || "").toUpperCase();
    if (p.isGoalkeeper || rawPos === "GK" || rawPos === "POR" || rawPos === "ARQ") {
      keepers.push(p);
    } else {
      outfield.push(p);
    }
  });

  // Si no hay arquero explícito, el primero toma la portería
  if (keepers.length === 0 && outfield.length > 0) {
    keepers.push(outfield.shift()!);
  }

  // Ubicar arquero(s)
  if (keepers.length === 1) {
    placements.set(keepers[0].id, {
      top: "87%",
      left: "50%",
      role: "GK",
      roleLabel: "POR",
    });
  } else {
    keepers.forEach((k, i) => {
      const left =
        keepers.length === 2
          ? i === 0
            ? "35%"
            : "65%"
          : `${Math.round(((i + 1) / (keepers.length + 1)) * 100)}%`;
      placements.set(k.id, {
        top: "87%",
        left,
        role: "GK",
        roleLabel: "POR",
      });
    });
  }

  // 2. Clasificar jugadores de campo
  const defs: PitchPlayer[] = [];
  const mids: PitchPlayer[] = [];
  const fwds: PitchPlayer[] = [];
  const unassigned: PitchPlayer[] = [];

  outfield.forEach((p) => {
    const raw = (p.preferredPosition || "").toUpperCase();
    if (raw === "DEF") defs.push(p);
    else if (raw === "FWD" || raw === "DEL" || raw === "ATA") fwds.push(p);
    else if (raw === "MED" || raw === "MID") mids.push(p);
    else unassigned.push(p);
  });

  // Repartir no asignados según balance táctico
  unassigned.forEach((p) => {
    const totalOut = outfield.length;
    const targetDefs = Math.max(1, Math.round(totalOut * 0.4));
    const targetFwds = Math.max(1, Math.round(totalOut * 0.25));

    if (defs.length < targetDefs) {
      defs.push(p);
    } else if (fwds.length < targetFwds) {
      fwds.push(p);
    } else {
      mids.push(p);
    }
  });

  // Garantizar que haya al menos 1 jugador en defensa si hay de campo
  if (defs.length === 0 && (mids.length > 1 || fwds.length > 1)) {
    if (mids.length > 0) defs.push(mids.shift()!);
    else if (fwds.length > 0) defs.push(fwds.shift()!);
  }

  // Formación calculada: p. ej. "1-2-1-1"
  const formationSummary = `${keepers.length}-${defs.length}-${mids.length}-${fwds.length}`.replace(
    /-0$/,
    ""
  );

  const getHorizontalSpread = (count: number): string[] => {
    if (count <= 1) return ["50%"];
    if (count === 2) return ["30%", "70%"];
    if (count === 3) return ["20%", "50%", "80%"];
    if (count === 4) return ["16%", "38%", "62%", "84%"];
    if (count === 5) return ["14%", "32%", "50%", "68%", "86%"];
    return Array.from({ length: count }, (_, i) => `${Math.round(((i + 1) / (count + 1)) * 100)}%`);
  };

  const defSpreads = getHorizontalSpread(defs.length);
  defs.forEach((p, i) => {
    placements.set(p.id, {
      top: "67%",
      left: defSpreads[i],
      role: "DEF",
      roleLabel: "DEF",
    });
  });

  const midSpreads = getHorizontalSpread(mids.length);
  mids.forEach((p, i) => {
    placements.set(p.id, {
      top: "45%",
      left: midSpreads[i],
      role: "MED",
      roleLabel: "MED",
    });
  });

  const fwdSpreads = getHorizontalSpread(fwds.length);
  fwds.forEach((p, i) => {
    placements.set(p.id, {
      top: "21%",
      left: fwdSpreads[i],
      role: "DEL",
      roleLabel: "DEL",
    });
  });

  return { placements, formationSummary };
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

  const { placements, formationSummary } = useMemo(
    () => computeTacticalLayout(players),
    [players]
  );

  const isClaro = color === "claro";

  const handleShare = async () => {
    if (!pitchRef.current) return;
    try {
      setSharing(true);
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(pitchRef.current, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#05180f",
      });
      if (!blob) return;

      const file = new File(
        [blob],
        `tactica-${teamName.toLowerCase().replace(/\s+/g, "-")}.png`,
        { type: "image/png" }
      );

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Táctica Oficial: ${teamName}`,
          text: `Formación táctica para ${teamName} (${formationSummary})`,
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
      console.error("Error al exportar la táctica", err);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header táctico EA FC */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shadow-md border ${
              isClaro
                ? "bg-gradient-to-br from-emerald-400 to-teal-600 text-black border-emerald-300"
                : "bg-gradient-to-br from-cyan-400 to-blue-600 text-white border-cyan-300"
            }`}
          >
            <Shield size={16} />
          </div>
          <div>
            <h3 className="font-black text-base tracking-wide uppercase text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>{teamName}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pitch-100 text-pitch-800 dark:bg-zinc-800 dark:text-emerald-400 border border-pitch-200 dark:border-zinc-700 tracking-wider">
                {formationSummary}
              </span>
            </h3>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
              {players.length} convocados · Formación inicial
            </span>
          </div>
        </div>

        <button
          onClick={handleShare}
          disabled={sharing}
          className="btn-ghost py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-50 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
          title="Exportar imagen de este equipo"
        >
          <Share2 size={13} />
          <span>{sharing ? "..." : "Exportar"}</span>
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 px-1 font-medium">
        <Move size={12} className="text-emerald-500 shrink-0" />
        <span>Arrastrá a cualquier jugador por el campo para ajustar la táctica</span>
      </div>

      {/* ─── Cancha de Fútbol Futurista EA FC ─── */}
      <div
        ref={pitchRef}
        className="relative w-full aspect-[3/4] rounded-3xl border-2 border-emerald-500/30 overflow-hidden shadow-2xl select-none"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, #0c3820 0%, #072514 65%, #04140b 100%)",
        }}
      >
        {/* Franjas de corte de césped cortadas alternadas */}
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent, transparent 44px, rgba(255,255,255,0.06) 44px, rgba(255,255,255,0.06) 88px)",
          }}
        />

        {/* Luces de estadio / destellos futuristas en esquinas */}
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />

        {/* Marca de agua EA FC Style en la cancha */}
        <div className="absolute top-4 left-0 w-full text-center pointer-events-none z-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/90 shadow-lg">
            <Sparkles size={11} className={isClaro ? "text-emerald-400" : "text-cyan-400"} />
            <span className="font-black tracking-widest uppercase text-[11px]">{teamName}</span>
            <span className="text-white/40 text-[10px]">|</span>
            <span className="text-[10px] font-bold text-emerald-400 tracking-wider">
              {formationSummary}
            </span>
          </div>
        </div>

        {/* Líneas Vectoriales de la Cancha (SVG HD Neón) */}
        <svg
          viewBox="0 0 600 800"
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#ffffff" floodOpacity="0.6" />
            </filter>
            <pattern id="netPattern" width="6" height="6" patternUnits="userSpaceOnUse">
              <path d="M 6 0 L 0 0 0 6" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
            </pattern>
          </defs>

          {/* Límites de la cancha */}
          <rect
            x="24"
            y="24"
            width="552"
            height="752"
            rx="8"
            fill="none"
            stroke="rgba(255,255,255,0.75)"
            strokeWidth="2.5"
            filter="url(#neonGlow)"
          />

          {/* Redes de arcos exteriores */}
          {/* Arco superior */}
          <rect x="235" y="8" width="130" height="16" rx="2" fill="url(#netPattern)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
          {/* Arco inferior */}
          <rect x="235" y="776" width="130" height="16" rx="2" fill="url(#netPattern)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />

          {/* Línea de mitad de campo */}
          <line
            x1="24"
            y1="400"
            x2="576"
            y2="400"
            stroke="rgba(255,255,255,0.75)"
            strokeWidth="2.5"
            filter="url(#neonGlow)"
          />

          {/* Círculo central */}
          <circle
            cx="300"
            cy="400"
            r="70"
            fill="none"
            stroke="rgba(255,255,255,0.75)"
            strokeWidth="2.5"
            filter="url(#neonGlow)"
          />

          {/* Punto central */}
          <circle cx="300" cy="400" r="4.5" fill="white" filter="url(#neonGlow)" />

          {/* Arcos de esquina (Corners) */}
          <path d="M 24 44 A 20 20 0 0 0 44 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2" />
          <path d="M 556 24 A 20 20 0 0 0 576 44" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2" />
          <path d="M 24 756 A 20 20 0 0 1 44 776" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2" />
          <path d="M 556 776 A 20 20 0 0 1 576 756" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2" />

          {/* ─── Área Superior (Rival/Ataque) ─── */}
          {/* Área grande */}
          <rect
            x="150"
            y="24"
            width="300"
            height="130"
            fill="none"
            stroke="rgba(255,255,255,0.75)"
            strokeWidth="2.5"
            filter="url(#neonGlow)"
          />
          {/* Área chica */}
          <rect
            x="225"
            y="24"
            width="150"
            height="46"
            fill="none"
            stroke="rgba(255,255,255,0.65)"
            strokeWidth="2"
          />
          {/* Punto penal superior */}
          <circle cx="300" cy="110" r="3.5" fill="white" />
          {/* Medialuna superior */}
          <path
            d="M 252 154 A 65 65 0 0 0 348 154"
            fill="none"
            stroke="rgba(255,255,255,0.65)"
            strokeWidth="2"
          />

          {/* ─── Área Inferior (Propia/Defensa) ─── */}
          {/* Área grande */}
          <rect
            x="150"
            y="646"
            width="300"
            height="130"
            fill="none"
            stroke="rgba(255,255,255,0.75)"
            strokeWidth="2.5"
            filter="url(#neonGlow)"
          />
          {/* Área chica */}
          <rect
            x="225"
            y="730"
            width="150"
            height="46"
            fill="none"
            stroke="rgba(255,255,255,0.65)"
            strokeWidth="2"
          />
          {/* Punto penal inferior */}
          <circle cx="300" cy="690" r="3.5" fill="white" />
          {/* Medialuna inferior */}
          <path
            d="M 252 646 A 65 65 0 0 1 348 646"
            fill="none"
            stroke="rgba(255,255,255,0.65)"
            strokeWidth="2"
          />
        </svg>

        {/* Indicador de dirección de ataque */}
        <div className="absolute top-[49%] right-4 -translate-y-1/2 pointer-events-none opacity-40 flex items-center gap-1 text-[9px] font-black tracking-widest text-white/80 uppercase [writing-mode:vertical-rl] rotate-180">
          <span>ATAQUE ➔</span>
        </div>

        {/* ─── Fichas de Jugadores Tácticas EA FC Style ─── */}
        {players.map((p) => {
          const placement = placements.get(p.id) || {
            top: "50%",
            left: "50%",
            role: "MED" as const,
            roleLabel: "MED",
          };

          const isKeeper = placement.role === "GK";

          // Colores de badges de posición inspirados en EA FC Ultimate Team
          const badgeStyle = isKeeper
            ? "bg-amber-400 text-black shadow-amber-400/50"
            : placement.role === "DEF"
            ? "bg-sky-400 text-black shadow-sky-400/50"
            : placement.role === "DEL"
            ? "bg-rose-500 text-white shadow-rose-500/50"
            : "bg-emerald-400 text-black shadow-emerald-400/50";

          const initialChar = p.name ? p.name.trim().charAt(0).toUpperCase() : "•";
          const footLabel =
            p.preferredFoot === "L" ? "Z" : p.preferredFoot === "BOTH" ? "Amb" : p.preferredFoot === "R" ? "D" : null;

          return (
            <motion.div
              key={p.id}
              drag
              dragConstraints={pitchRef}
              dragElastic={0}
              dragMomentum={false}
              whileDrag={{ scale: 1.15, zIndex: 40 }}
              initial={{ top: placement.top, left: placement.left, x: "-50%", y: "-50%" }}
              className="absolute cursor-grab active:cursor-grabbing z-10 select-none flex flex-col items-center"
              style={{ touchAction: "none" }}
            >
              {/* Tarjeta de Jugador EA FC Token */}
              <div
                className={`relative flex flex-col items-center rounded-2xl transition-all duration-200 ${
                  isClaro
                    ? "bg-gradient-to-b from-white/95 via-zinc-100/90 to-emerald-50/85 text-zinc-900 border-2 border-emerald-400 shadow-[0_4px_16px_rgba(16,185,129,0.45)]"
                    : "bg-gradient-to-b from-zinc-900/95 via-zinc-950/90 to-cyan-950/85 text-white border-2 border-cyan-400 shadow-[0_4px_16px_rgba(6,182,212,0.45)]"
                } px-2 pt-1 pb-1.5 min-w-[68px] sm:min-w-[76px] backdrop-blur-md`}
              >
                {/* Cabecera del token: Badge de posición + Pie hábil */}
                <div className="flex items-center justify-between w-full gap-1 mb-0.5">
                  <span
                    className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm ${badgeStyle}`}
                  >
                    {placement.roleLabel}
                  </span>

                  {footLabel && (
                    <span
                      className={`text-[8px] font-bold px-1 rounded ${
                        isClaro
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-cyan-950 text-cyan-300 border border-cyan-800"
                      }`}
                      title={`Pie hábil: ${footLabel === "Z" ? "Zurdo" : footLabel === "D" ? "Diestro" : "Ambidiestro"}`}
                    >
                      {footLabel}
                    </span>
                  )}
                </div>

                {/* Ícono central / Avatar atlético */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-inner my-0.5 ${
                    isKeeper
                      ? "bg-amber-400 text-amber-950 border border-amber-300"
                      : isClaro
                      ? "bg-gradient-to-tr from-emerald-500 to-teal-400 text-white border border-emerald-300"
                      : "bg-gradient-to-tr from-cyan-500 to-blue-600 text-white border border-cyan-300"
                  }`}
                >
                  {isKeeper ? "🧤" : initialChar}
                </div>

                {/* Placa de Nombre EA FC (Tipografía atlética en negrita, sin puntuación de estrellas) */}
                <div className="w-full text-center mt-0.5">
                  <span
                    className={`block text-[10px] font-black uppercase tracking-tight truncate max-w-[62px] sm:max-w-[70px] ${
                      isClaro ? "text-zinc-900" : "text-white"
                    }`}
                  >
                    {p.name}
                  </span>
                  {p.isGuest && (
                    <span className="inline-block text-[7px] font-black uppercase tracking-wider bg-zinc-300 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-1 rounded-sm mt-0.5">
                      INV
                    </span>
                  )}
                </div>
              </div>

              {/* Sombra de proyección en el césped */}
              <div className="w-8 h-1.5 bg-black/40 rounded-full blur-[2px] -mt-0.5 pointer-events-none" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
