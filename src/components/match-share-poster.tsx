"use client";

import { useRef, useState } from "react";
import { toBlob, toPng } from "html-to-image";
import {
  Download,
  Share2,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import type { MatchPosterVoteLeader } from "@/lib/vote-leaders";

export interface MatchSharePosterProps {
  matchId: number;
  groupName: string;
  groupSlug?: string;
  matchDateFormatted: string;
  format?: string;
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
  playersA: string[];
  playersB: string[];
  scorers?: { name: string; goals: number; assists?: number }[];
  mvpLeader?: MatchPosterVoteLeader | null;
  burroLeader?: MatchPosterVoteLeader | null;
  golLeader?: MatchPosterVoteLeader | null;
  showPublicLinkButton?: boolean;
}

export function MatchSharePoster({
  matchId,
  groupName,
  matchDateFormatted,
  format = "F5",
  teamAName,
  teamBName,
  scoreA,
  scoreB,
  playersA,
  playersB,
  scorers = [],
  mvpLeader,
  burroLeader,
  golLeader,
  showPublicLinkButton = true,
}: MatchSharePosterProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicUrl = `https://fulbomundial.com.ar/partido/${matchId}`;
  const watermarkText = `fulbomundial.com.ar/partido/${matchId}`;

  const isWinnerA = scoreA > scoreB;
  const isWinnerB = scoreB > scoreA;
  const isDraw = scoreA === scoreB;

  const topScorers = scorers.filter((s) => s.goals > 0);
  const goalsByName = new Map<string, { goals: number; assists: number }>();
  for (const s of scorers) {
    goalsByName.set(s.name.trim().toLowerCase(), {
      goals: s.goals,
      assists: s.assists ?? 0,
    });
  }

  function buildWhatsAppViralText() {
    const lines: string[] = [];
    lines.push(`⚽ *RESULTADO OFICIAL — ${groupName.toUpperCase()}*`);
    lines.push(`📅 ${matchDateFormatted}`);
    lines.push(``);
    lines.push(`🏆 *${teamAName} ${scoreA} - ${scoreB} ${teamBName}*`);
    if (topScorers.length > 0) {
      lines.push(
        `🥅 Goles: ${topScorers.map((s) => `${s.name} (${s.goals})`).join(", ")}`
      );
    }
    lines.push(``);
    lines.push(
      `⭐ *MVP de la Fecha:* ${
        mvpLeader ? `${mvpLeader.name} (${mvpLeader.votes} votos)` : "Votación abierta"
      }`
    );
    lines.push(
      `🫏 *El Burro de la Fecha:* ${
        burroLeader
          ? `${burroLeader.name} (${burroLeader.votes} votos)`
          : "Votación abierta"
      }`
    );
    if (golLeader) {
      lines.push(`🚀 *Mejor Gol:* ${golLeader.name} (${golLeader.votes} votos)`);
    }
    lines.push(``);
    lines.push(`🗳️ *Mirá la placa, votá al MVP/Burro y armá tu partido acá:*`);
    lines.push(`👉 ${publicUrl}`);
    return lines.join("\n");
  }

  async function handleDownloadPng() {
    if (!posterRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(posterRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
      });
      const link = document.createElement("a");
      link.download = `fulbomundial-partido-${matchId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error exportando placa:", err);
    } finally {
      setExporting(false);
    }
  }

  async function handleShareWhatsApp() {
    const text = buildWhatsAppViralText();

    if (posterRef.current && typeof navigator !== "undefined" && navigator.share) {
      setExporting(true);
      try {
        const blob = await toBlob(posterRef.current, {
          cacheBust: true,
          pixelRatio: 2,
        });
        if (blob) {
          const file = new File([blob], `fulbomundial-partido-${matchId}.png`, {
            type: "image/png",
          });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `${teamAName} ${scoreA} - ${scoreB} ${teamBName} | ${groupName}`,
              text,
              files: [file],
            });
            setExporting(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Fallback a WhatsApp URL:", err);
      } finally {
        setExporting(false);
      }
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <Sparkles size={13} /> Placa Viral para WhatsApp e Instagram
          </span>
          <h3 className="text-lg font-black text-pitch-800 dark:text-zinc-100">
            Resumen Oficial de la Fecha
          </h3>
        </div>
        {showPublicLinkButton && (
          <Link
            href={`/partido/${matchId}`}
            target="_blank"
            className="text-xs font-bold text-pitch-600 dark:text-pitch-400 hover:underline inline-flex items-center gap-1"
          >
            Ver página pública <ExternalLink size={12} />
          </Link>
        )}
      </div>

      {/* PLACA ESTILIZADA EXPORTABLE — DISEÑO ADAPTABLE SIN RECORTES */}
      <div
        ref={posterRef}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-950 via-emerald-950 to-zinc-950 text-white p-4 sm:p-6 border-2 border-emerald-500/40 shadow-2xl space-y-4"
      >
        {/* Efectos de luz de estadio */}
        <div className="pointer-events-none absolute -top-20 -left-20 w-56 h-56 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 w-56 h-56 rounded-full bg-amber-500/15 blur-3xl" />

        {/* Cabecera del Grupo y Fecha Completa */}
        <div className="relative border-b border-white/10 pb-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              {format} · Fecha Oficial #{matchId}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
              ⚽ FULBOMUNDIAL
            </span>
          </div>

          <h4 className="text-base sm:text-xl font-black tracking-tight text-white leading-snug break-words">
            {groupName}
          </h4>

          <p className="text-xs text-zinc-300 font-semibold capitalize leading-snug break-words">
            📅 {matchDateFormatted}
          </p>
        </div>

        {/* Marcador Central + Lista Completa de Jugadores */}
        <div className="relative rounded-2xl bg-black/45 border border-white/10 p-3.5 sm:p-5 space-y-4">
          <div className="grid grid-cols-3 items-center gap-2 text-center">
            <div className="space-y-1">
              <div className="text-xs sm:text-sm font-black uppercase tracking-wide text-emerald-300 leading-tight break-words">
                {teamAName}
              </div>
              <div
                className={`text-4xl sm:text-5xl font-black leading-none ${
                  isWinnerA ? "text-white" : "text-zinc-300"
                }`}
              >
                {scoreA}
              </div>
              {isWinnerA && (
                <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500 text-zinc-950">
                  Ganador
                </span>
              )}
            </div>

            <div className="flex flex-col items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                FINAL
              </span>
              <span className="text-xl sm:text-2xl font-black text-zinc-500 my-0.5">VS</span>
              {isDraw && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-400 text-zinc-950">
                  Empate
                </span>
              )}
            </div>

            <div className="space-y-1">
              <div className="text-xs sm:text-sm font-black uppercase tracking-wide text-cyan-300 leading-tight break-words">
                {teamBName}
              </div>
              <div
                className={`text-4xl sm:text-5xl font-black leading-none ${
                  isWinnerB ? "text-white" : "text-zinc-300"
                }`}
              >
                {scoreB}
              </div>
              {isWinnerB && (
                <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-cyan-400 text-zinc-950">
                  Ganador
                </span>
              )}
            </div>
          </div>

          {/* Planteles Completos de ambos equipos (visibles al 100%, sin recortar) */}
          {(playersA.length > 0 || playersB.length > 0) && (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 pt-3 border-t border-white/10">
              {/* Columna Equipo A */}
              <div className="space-y-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400/90 mb-1">
                  Formación {teamAName} ({playersA.length})
                </div>
                <ul className="space-y-1">
                  {playersA.map((pName, idx) => {
                    const stat = goalsByName.get(pName.trim().toLowerCase());
                    return (
                      <li
                        key={idx}
                        className="flex items-center justify-between gap-1 rounded-lg bg-white/5 px-2 py-1 text-[11px] font-semibold text-zinc-100 leading-tight"
                      >
                        <span className="break-words">{pName}</span>
                        {stat && (stat.goals > 0 || stat.assists > 0) && (
                          <span className="shrink-0 text-[10px] font-black text-amber-300">
                            {stat.goals > 0 ? `⚽${stat.goals > 1 ? stat.goals : ""}` : ""}
                            {stat.assists > 0 ? ` 👟${stat.assists > 1 ? stat.assists : ""}` : ""}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Columna Equipo B */}
              <div className="space-y-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-cyan-400/90 text-right mb-1">
                  Formación {teamBName} ({playersB.length})
                </div>
                <ul className="space-y-1">
                  {playersB.map((pName, idx) => {
                    const stat = goalsByName.get(pName.trim().toLowerCase());
                    return (
                      <li
                        key={idx}
                        className="flex items-center justify-between gap-1 rounded-lg bg-white/5 px-2 py-1 text-[11px] font-semibold text-zinc-100 leading-tight"
                      >
                        <span className="break-words">{pName}</span>
                        {stat && (stat.goals > 0 || stat.assists > 0) && (
                          <span className="shrink-0 text-[10px] font-black text-amber-300">
                            {stat.goals > 0 ? `⚽${stat.goals > 1 ? stat.goals : ""}` : ""}
                            {stat.assists > 0 ? ` 👟${stat.assists > 1 ? stat.assists : ""}` : ""}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}

          {/* Resumen de Goleadores adicionales si hay */}
          {topScorers.length > 0 && (
            <div className="pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-center gap-1.5">
              {topScorers.map((s, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-[10px] font-bold text-amber-200"
                >
                  ⚽ {s.name} {s.goals > 1 ? `(${s.goals})` : ""}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* EL GANCHO VISUAL: MVP DE LA FECHA + EL BURRO DE LA FECHA */}
        <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* MVP de la Fecha */}
          <div className="rounded-2xl bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-transparent border border-amber-400/40 p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-zinc-950 flex items-center justify-center text-lg font-black shrink-0 shadow-md">
              ⭐
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block">
                MVP de la Fecha (Figura)
              </span>
              <p className="text-xs sm:text-sm font-black text-white leading-snug break-words">
                {mvpLeader ? mvpLeader.name : "Votación abierta"}
              </p>
              <span className="text-[10px] text-amber-200/80 block">
                {mvpLeader
                  ? `Elegido por el grupo (${mvpLeader.votes} ${
                      mvpLeader.votes === 1 ? "voto" : "votos"
                    })`
                  : "Entrá al link para votar"}
              </span>
            </div>
          </div>

          {/* El Burro de la Fecha */}
          <div className="rounded-2xl bg-gradient-to-br from-red-500/20 via-orange-500/10 to-transparent border border-red-400/40 p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-500 to-orange-400 text-white flex items-center justify-center text-lg font-black shrink-0 shadow-md">
              🫏
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-red-300 block">
                El Burro de la Fecha
              </span>
              <p className="text-xs sm:text-sm font-black text-white leading-snug break-words">
                {burroLeader ? burroLeader.name : "Votación abierta"}
              </p>
              <span className="text-[10px] text-red-200/80 block">
                {burroLeader
                  ? `Rústico oficial (${burroLeader.votes} ${
                      burroLeader.votes === 1 ? "voto" : "votos"
                    })`
                  : "Entrá al link para votar"}
              </span>
            </div>
          </div>
        </div>

        {/* WATERMARK INTERACTIVO */}
        <div className="relative pt-2.5 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-[10px] sm:text-[11px] text-zinc-300 font-medium leading-tight">
              Estadísticas, votación y armá tu grupo gratis en:
            </span>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-zinc-950 font-black text-[11px] tracking-tight shadow-sm self-start sm:self-auto break-all">
            🔗 {watermarkText}
          </div>
        </div>
      </div>

      {/* BOTONES DE ACCIÓN PARA COMPARTIR EN WHATSAPP / DESCARGAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={handleShareWhatsApp}
          disabled={exporting}
          className="py-3 px-4 rounded-2xl bg-[#25D366] hover:bg-[#1ebe5a] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/25 transition-all"
        >
          <Share2 size={16} />
          <span>Compartir en WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={exporting}
          className="py-3 px-4 rounded-2xl bg-pitch-600 hover:bg-pitch-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <Download size={16} />
          <span>{exporting ? "Generando imagen..." : "Descargar Placa PNG"}</span>
        </button>

        <button
          type="button"
          onClick={handleCopyLink}
          className="py-3 px-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:border-pitch-400 transition-all"
        >
          {copied ? (
            <>
              <Check size={16} className="text-emerald-500" />
              <span>¡Link copiado!</span>
            </>
          ) : (
            <>
              <Copy size={16} />
              <span>Copiar link del partido</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
