"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Share2,
  Copy,
  Check,
  Flame,
  Radio,
  FileText,
  MessageCircle,
} from "lucide-react";
import type { ChronicleInput, ChronicleResult, ChronicleStyle } from "@/lib/ai-chronicle";

interface AIChronicleCardProps {
  inputData: ChronicleInput;
  initialChronicle?: string;
  onApplyToNotes?: (text: string) => void;
  isAdminView?: boolean;
}

export function AIChronicleCard({
  inputData,
  initialChronicle,
  onApplyToNotes,
  isAdminView = false,
}: AIChronicleCardProps) {
  const [style, setStyle] = useState<ChronicleStyle>("relator");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChronicleResult | null>(() => {
    if (initialChronicle) {
      return {
        title: "Crónica Oficial del Partido",
        chronicle: initialChronicle,
        audioScript: initialChronicle,
        whatsappText: initialChronicle,
        punchline: "",
      };
    }
    return null;
  });

  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  // Audio state (Web Speech API)
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setSpeechSupported(true);
    }
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleGenerate = async (chosenStyle: ChronicleStyle = style) => {
    try {
      setLoading(true);
      stopAudio();

      const res = await fetch("/api/chronicle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...inputData,
          style: chosenStyle,
        }),
      });

      if (!res.ok) throw new Error("Error en la llamada");
      const data: ChronicleResult = await res.json();
      setResult(data);
    } catch (e) {
      console.error("Error generando crónica:", e);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = () => {
    if (!speechSupported || !result) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    window.speechSynthesis.cancel();

    const script = result.audioScript || result.chronicle;
    const utterance = new SpeechSynthesisUtterance(script);
    utteranceRef.current = utterance;

    // Configurar tono y ritmo enérgico de relator de fútbol
    utterance.rate = 1.05;
    utterance.pitch = 1.05;

    // Buscar una voz en español (preferentemente Argentina o América Latina)
    const voices = window.speechSynthesis.getVoices();
    const argVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().includes("es-ar") ||
        v.lang.toLowerCase().includes("es-419") ||
        v.lang.toLowerCase().includes("es-us")
    ) || voices.find((v) => v.lang.toLowerCase().startsWith("es"));

    if (argVoice) {
      utterance.voice = argVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePauseAudio = () => {
    if (speechSupported && isPlaying) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const stopAudio = () => {
    if (speechSupported) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.whatsappText || result.chronicle);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleWhatsApp = () => {
    if (!result) return;
    const text = encodeURIComponent(result.whatsappText || result.chronicle);
    const url = `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, "_blank");
  };

  const handleApply = () => {
    if (!result) return;
    if (onApplyToNotes) {
      onApplyToNotes(result.chronicle);
      setApplied(true);
      setTimeout(() => setApplied(false), 2500);
    }
  };

  return (
    <div className="rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-zinc-950 via-pitch-950 to-zinc-900 text-white p-4 sm:p-5 shadow-2xl relative overflow-hidden space-y-4">
      {/* Luz ambiental de fondo */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 relative z-10 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-black flex items-center justify-center font-black shadow-lg shadow-emerald-500/30 shrink-0">
            <Radio size={18} className={isPlaying ? "animate-pulse" : ""} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base text-zinc-100 uppercase tracking-wide">
                Crónica & Bot de Audio IA 🎙️
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                Relato Picante
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium">
              Relato radial apasionado con datos duros y un toque de gastada sana.
            </p>
          </div>
        </div>

        {/* Botón principal de generar */}
        <button
          type="button"
          onClick={() => handleGenerate(style)}
          disabled={loading}
          className="btn-primary text-xs py-2 px-3.5 font-bold shadow-glow-green flex items-center gap-1.5 shrink-0"
        >
          <Sparkles size={14} className={loading ? "animate-spin" : ""} />
          <span>{loading ? "Relatando..." : result ? "Regenerar Crónica" : "Generar con IA"}</span>
        </button>
      </div>

      {/* Selector de estilo */}
      <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/10 text-xs relative z-10 overflow-x-auto scrollbar-hide">
        <button
          type="button"
          onClick={() => {
            setStyle("relator");
            if (result) handleGenerate("relator");
          }}
          className={`flex-1 min-w-[110px] py-1.5 px-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
            style === "relator"
              ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <span>🎙️</span>
          <span>Relator Exaltado</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setStyle("picante");
            if (result) handleGenerate("picante");
          }}
          className={`flex-1 min-w-[110px] py-1.5 px-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
            style === "picante"
              ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <span>🔥</span>
          <span>Modo Gastada</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setStyle("periodista");
            if (result) handleGenerate("periodista");
          }}
          className={`flex-1 min-w-[110px] py-1.5 px-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
            style === "periodista"
              ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <span>📰</span>
          <span>Periodista Épico</span>
        </button>
      </div>

      {/* Contenido de la crónica */}
      {result && (
        <div className="space-y-3 relative z-10 animate-fade-in">
          {/* Título y texto */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <h4 className="font-black text-sm text-amber-300 tracking-wide uppercase flex items-center gap-2">
              <span>⚡</span> {result.title}
            </h4>
            <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-line font-medium">
              {result.chronicle}
            </div>
            {result.punchline && (
              <div className="pt-2 mt-2 border-t border-white/10 text-xs italic text-rose-300 font-semibold flex items-start gap-1.5">
                <span className="not-italic">🥊</span>
                <span>"{result.punchline}"</span>
              </div>
            )}
          </div>

          {/* Reproductor de Audio del Relator */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-zinc-900 to-teal-950/70 border border-emerald-500/30 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              {isPlaying ? (
                <button
                  type="button"
                  onClick={handlePauseAudio}
                  className="w-10 h-10 rounded-full bg-amber-400 text-black flex items-center justify-center hover:scale-105 transition-all shadow-md shrink-0"
                  title="Pausar audio"
                >
                  <Pause size={18} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePlayAudio}
                  className="w-10 h-10 rounded-full bg-emerald-400 text-black flex items-center justify-center hover:scale-105 transition-all shadow-lg shadow-emerald-400/30 shrink-0"
                  title="Escuchar audio del relato"
                >
                  <Play size={18} className="ml-0.5" />
                </button>
              )}

              {isPlaying && (
                <button
                  type="button"
                  onClick={stopAudio}
                  className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                  title="Detener"
                >
                  <VolumeX size={16} />
                </button>
              )}

              <div>
                <span className="text-xs font-bold text-zinc-100 block">
                  {isPlaying ? "Transmitiendo relato en vivo..." : isPaused ? "Relato en pausa" : "Audio del Relator"}
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">
                  {isPlaying ? "Voz radial apasionada de fútbol" : "Tocá Play para escuchar la narración"}
                </span>
              </div>
            </div>

            {/* Ecualizador animado */}
            {isPlaying && (
              <div className="flex items-end gap-1 h-5 pr-2">
                <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite] h-4" />
                <span className="w-1 bg-teal-300 rounded-full animate-[bounce_0.6s_infinite_0.1s] h-5" />
                <span className="w-1 bg-cyan-400 rounded-full animate-[bounce_0.9s_infinite_0.2s] h-3" />
                <span className="w-1 bg-emerald-300 rounded-full animate-[bounce_0.7s_infinite_0.3s] h-5" />
                <span className="w-1 bg-amber-300 rounded-full animate-[bounce_0.5s_infinite_0.15s] h-4" />
              </div>
            )}
          </div>

          {/* Botones de acción: WhatsApp, Copiar, y Aplicar a Notas */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex-1 min-w-[140px] py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all"
            >
              <MessageCircle size={15} />
              <span>Mandar a WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
              title="Copiar texto para WhatsApp"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? "¡Copiado!" : "Copiar"}</span>
            </button>

            {isAdminView && onApplyToNotes && (
              <button
                type="button"
                onClick={handleApply}
                className="py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                title="Poner este texto en las notas oficiales del partido"
              >
                {applied ? <Check size={14} /> : <FileText size={14} />}
                <span>{applied ? "¡Pegado en Notas!" : "Usar en Notas"}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
