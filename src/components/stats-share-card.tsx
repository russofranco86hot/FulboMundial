"use client";

import { useRef, useState } from "react";
import { toBlob, toPng } from "html-to-image";
import {
  Share2,
  Download,
  Copy,
  Check,
  MessageCircle,
  Sparkles,
  Trophy,
  Clover,
  Skull,
  Handshake,
  Swords,
  Eye,
  EyeOff,
} from "lucide-react";

export interface StatsShareProps {
  groupName: string;
  groupSlug: string;
  inviteCode: string;
  isPro: boolean;
  topStandings: {
    name: string;
    pts: number;
    won: number;
    played: number;
  }[];
  talismans: {
    name: string;
    wins: number;
    matches: number;
    winPct: number;
  }[];
  mufas: {
    name: string;
    losses: number;
    matches: number;
    lossPct: number;
  }[];
  topChemistry: {
    player1: string;
    player2: string;
    wins: number;
    matches: number;
    winPct: number;
  }[];
  toxicDuos: {
    player1: string;
    player2: string;
    losses: number;
    matches: number;
    lossPct: number;
  }[];
  topPaternity: {
    winner: string;
    loser: string;
    wins: number;
    matches: number;
    winPct: number;
  }[];
  streaks: {
    name: string;
    type: "win" | "loss" | "unbeaten" | "winless";
    count: number;
  }[];
}

export function StatsShareCard({
  groupName,
  groupSlug,
  inviteCode,
  isPro,
  topStandings,
  talismans,
  mufas,
  topChemistry,
  toxicDuos,
  topPaternity,
  streaks,
}: StatsShareProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPosterPreview, setShowPosterPreview] = useState(false);

  const joinUrl = `https://fulbomundial.com.ar/grupos/unirse?code=${encodeURIComponent(inviteCode)}`;
  const appUrl = "https://fulbomundial.com.ar";

  function buildWhatsAppText(): string {
    const lines: string[] = [];
    lines.push(`📊 *ESTADÍSTICAS Y FOLCLORE — ${groupName.toUpperCase()}* ⚽🔥`);
    lines.push(`Los números no mienten. Así está el historial del grupo:`);
    lines.push(``);

    if (topStandings.length > 0) {
      lines.push(`🏆 *PODIO DE LA TABLA:*`);
      const medals = ["🥇", "🥈", "🥉"];
      topStandings.slice(0, 3).forEach((p, idx) => {
        lines.push(
          `${medals[idx] || "•"} *${p.name}* — ${p.pts} pts (${p.won}G en ${p.played}PJ)`
        );
      });
      lines.push(``);
    }

    if (talismans.length > 0) {
      const topT = talismans[0];
      lines.push(
        `🍀 *El Amuleto (Talismán):* *${topT.name}* (${topT.winPct}% victorias — ${topT.wins}G/${topT.matches}PJ)`
      );
    }

    if (mufas.length > 0) {
      const topM = mufas[0];
      lines.push(
        `🧂 *El Salado (Mufa Oficial):* *${topM.name}* (${topM.lossPct}% caídas — ${topM.losses}P/${topM.matches}PJ)`
      );
    }

    if (isPro) {
      if (topChemistry.length > 0) {
        const c = topChemistry[0];
        lines.push(
          `🤝 *Mejor Sociedad:* *${c.player1} + ${c.player2}* (${c.winPct}% ganados juntos)`
        );
      }
      if (toxicDuos.length > 0) {
        const tx = toxicDuos[0];
        lines.push(
          `⚡ *Dúo Tóxico:* *${tx.player1} + ${tx.player2}* (${tx.lossPct}% derrotas juntos)`
        );
      }
      if (topPaternity.length > 0) {
        const pat = topPaternity[0];
        lines.push(
          `🍼 *Paternidad Oficial:* *${pat.winner}* tiene de hijo a *${pat.loser}* (${pat.winPct}% victorias)`
        );
      }
      const winStreak = streaks.find((s) => s.type === "win");
      if (winStreak) {
        lines.push(
          `🔥 *En llamas:* *${winStreak.name}* lleva ${winStreak.count} victorias al hilo`
        );
      }
    }

    lines.push(``);
    lines.push(
      `👀 *¿Todavía no entraste a ver tu carta, tus estadísticas y votar al MVP?*`
    );
    lines.push(`🎟️ Unite a *${groupName}* con el código *${inviteCode}*:`);
    lines.push(`👉 ${joinUrl}`);
    lines.push(``);
    lines.push(
      `🚀 *¿Jugás en otro grupo?* Creá tu equipo gratis en *FulboMundial* (con 30 días de Pase Capitán PRO de regalo):`
    );
    lines.push(`⚽ ${appUrl}`);

    return lines.join("\n");
  }

  function handleWhatsAppDirect() {
    const text = buildWhatsAppText();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleCopyText() {
    try {
      await navigator.clipboard.writeText(buildWhatsAppText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  }

  async function handleShareOrDownloadPoster() {
    setShowPosterPreview(true);
    setExporting(true);
    try {
      // Esperar un frame por si estaba oculto el preview
      await new Promise((r) => setTimeout(r, 120));
      if (!posterRef.current) return;

      const text = buildWhatsAppText();
      const blob = await toBlob(posterRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#06140d",
      });

      if (blob) {
        const file = new File(
          [blob],
          `fulbomundial-estadisticas-${groupSlug}.png`,
          { type: "image/png" }
        );
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Estadísticas — ${groupName} | FulboMundial`,
            text,
            files: [file],
          });
          return;
        }
      }

      // Fallback descarga PNG en PC
      const dataUrl = await toPng(posterRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#06140d",
      });
      const link = document.createElement("a");
      link.download = `fulbomundial-estadisticas-${groupSlug}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error exportando placa de estadísticas:", err);
    } finally {
      setExporting(false);
    }
  }

  const topTalisman = talismans[0] ?? null;
  const topMufa = mufas[0] ?? null;
  const topChem = isPro ? topChemistry[0] ?? null : null;
  const topPat = isPro ? topPaternity[0] ?? null : null;

  return (
    <div className="card border-emerald-500/40 bg-gradient-to-br from-emerald-950 via-zinc-900 to-zinc-950 text-white p-4 sm:p-5 space-y-4 shadow-xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
            <Sparkles size={12} /> Modo Picante para el Grupo
          </div>
          <h2 className="text-base sm:text-lg font-black text-white">
            📲 Compartí las Estadísticas en WhatsApp
          </h2>
          <p className="text-xs text-zinc-300 max-w-xl">
            Mandá el reporte oficial con el Podio, el Amuleto y el Salado al grupo de WhatsApp. Incluye el enlace y código (<span className="font-mono font-bold text-amber-300">{inviteCode}</span>) para que todos tus compañeros se sumen a la app.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPosterPreview((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-emerald-200 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 transition-colors"
        >
          {showPosterPreview ? <EyeOff size={14} /> : <Eye size={14} />}
          {showPosterPreview ? "Ocultar placa" : "Ver placa visual"}
        </button>
      </div>

      {/* Botonera principal de exportación */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={handleWhatsAppDirect}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.99]"
        >
          <MessageCircle size={18} />
          Enviar por WhatsApp
        </button>

        <button
          type="button"
          onClick={handleShareOrDownloadPoster}
          disabled={exporting}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-400/20 transition-all active:scale-[0.99] disabled:opacity-60"
        >
          {exporting ? (
            <span>Generando placa HD...</span>
          ) : (
            <>
              <Share2 size={17} />
              Compartir / Descargar Placa
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleCopyText}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm border border-white/15 transition-all"
        >
          {copied ? (
            <>
              <Check size={16} className="text-emerald-400" />
              <span className="text-emerald-300">¡Copiado para pegar!</span>
            </>
          ) : (
            <>
              <Copy size={16} />
              Copiar texto e invitación
            </>
          )}
        </button>
      </div>

      {/* Placa Visual Exportable (Visible al abrir vista previa o al exportar) */}
      <div className={showPosterPreview ? "pt-2 overflow-x-auto" : "sr-only"}>
        <div
          ref={posterRef}
          className="w-[380px] mx-auto rounded-3xl overflow-hidden border-2 border-emerald-500/40 bg-gradient-to-b from-[#071f14] via-[#091510] to-[#050c09] text-white p-5 space-y-4 shadow-2xl"
        >
          {/* Header Placa */}
          <div className="text-center space-y-1 border-b border-white/10 pb-3">
            <div className="inline-block px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[10px] font-black uppercase tracking-widest text-emerald-300">
              ⚽ FULBOMUNDIAL.COM.AR
            </div>
            <h3 className="text-xl font-black tracking-tight text-white uppercase">
              {groupName}
            </h3>
            <p className="text-[11px] text-zinc-400 font-semibold">
              Reporte Oficial de Estadísticas y Folclore
            </p>
          </div>

          {/* Podio Top 3 */}
          {topStandings.length > 0 && (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 uppercase tracking-wider">
                <Trophy size={14} /> Podio de la Tabla
              </div>
              <div className="space-y-1.5">
                {topStandings.slice(0, 3).map((p, idx) => {
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs bg-black/30 px-2.5 py-1.5 rounded-xl"
                    >
                      <span className="font-bold text-white truncate">
                        {medals[idx]} {p.name}
                      </span>
                      <span className="font-black text-amber-300 shrink-0">
                        {p.pts} pts{" "}
                        <span className="text-[10px] text-zinc-400 font-normal">
                          ({p.won}G/{p.played}PJ)
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Amuleto & Mufa */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3 space-y-1">
              <div className="flex items-center gap-1 text-[10px] font-black text-emerald-300 uppercase">
                <Clover size={12} /> El Amuleto 🍀
              </div>
              {topTalisman ? (
                <>
                  <p className="font-black text-sm text-white truncate">
                    {topTalisman.name}
                  </p>
                  <p className="text-xs font-bold text-emerald-400">
                    {topTalisman.winPct}% Victorias
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    {topTalisman.wins}G en {topTalisman.matches} PJ
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-zinc-400">Sin &gt;50% aún</p>
              )}
            </div>

            <div className="rounded-2xl bg-purple-500/10 border border-purple-500/30 p-3 space-y-1">
              <div className="flex items-center gap-1 text-[10px] font-black text-purple-300 uppercase">
                <Skull size={12} /> El Salado 🧂
              </div>
              {topMufa ? (
                <>
                  <p className="font-black text-sm text-white truncate">
                    {topMufa.name}
                  </p>
                  <p className="text-xs font-bold text-purple-400">
                    {topMufa.lossPct}% Caídas
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    {topMufa.losses}P en {topMufa.matches} PJ
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-zinc-400">Nadie &gt;50% derrotas</p>
              )}
            </div>
          </div>

          {/* Química & Paternidad (si hay datos) */}
          {(topChem || topPat) && (
            <div className="space-y-2">
              {topChem && (
                <div className="rounded-xl bg-blue-500/10 border border-blue-400/30 px-3 py-2 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] font-black text-blue-300 uppercase flex items-center gap-1">
                      <Handshake size={12} /> Mejor Sociedad
                    </span>
                    <span className="font-bold text-white block truncate">
                      {topChem.player1} + {topChem.player2}
                    </span>
                  </div>
                  <span className="font-black text-blue-300 shrink-0">
                    {topChem.winPct}% G
                  </span>
                </div>
              )}

              {topPat && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-400/30 px-3 py-2 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] font-black text-rose-300 uppercase flex items-center gap-1">
                      <Swords size={12} /> Paternidad Oficial
                    </span>
                    <span className="font-bold text-white block truncate">
                      {topPat.winner} sobre {topPat.loser}
                    </span>
                  </div>
                  <span className="font-black text-rose-300 shrink-0">
                    {topPat.winPct}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Footer Marketing / Call to action */}
          <div className="rounded-2xl bg-gradient-to-r from-emerald-600/30 to-amber-500/20 border border-emerald-400/40 p-3 text-center space-y-1">
            <p className="text-[11px] font-bold text-emerald-200">
              ¿Jugás con nosotros? Unite al grupo con el código:
            </p>
            <div className="inline-block px-3 py-0.5 rounded-lg bg-black/50 border border-amber-400/50 font-mono text-sm font-black tracking-widest text-amber-300">
              {inviteCode}
            </div>
            <p className="text-[10px] text-zinc-300 pt-0.5">
              Organizá tus partidos gratis en{" "}
              <span className="font-black text-white underline">
                fulbomundial.com.ar
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
