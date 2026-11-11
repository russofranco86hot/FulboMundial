"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  VolumeX,
  Play,
  Pause,
  Copy,
  Check,
  Radio,
  FileText,
  MessageCircle,
  Loader2,
} from "lucide-react";
import type { ChronicleInput, ChronicleResult, ChronicleStyle } from "@/lib/ai-chronicle";

interface AIChronicleCardProps {
  inputData: ChronicleInput;
  initialChronicle?: string;
  onApplyToNotes?: (text: string) => void;
  isAdminView?: boolean;
}

/**
 * Sintetizador de Ambiente de Cancha (Hinchada de fondo + Silbato inicial) en Web Audio API.
 */
function startStadiumAmbience(ctx: AudioContext, style: ChronicleStyle): () => void {
  let stopped = false;

  // 1) Silbato de árbitro al arrancar el modo Relator Exaltado
  if (style === "relator") {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(2850, ctx.currentTime);
      osc.frequency.setValueAtTime(2980, ctx.currentTime + 0.06);
      osc.frequency.setValueAtTime(2850, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } catch {}
  }

  // 2) Murmullo / aliento de tribuna de estadio suave de fondo (ruido rosa filtrado)
  let noiseSource: AudioBufferSourceNode | null = null;
  try {
    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let b0 = 0,
      b1 = 0,
      b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      output[i] = (b0 + b1 + b2) * 0.18;
    }

    noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = style === "relator" ? 650 : 480;
    filter.Q.value = 1.2;

    const crowdGain = ctx.createGain();
    crowdGain.gain.value = style === "relator" ? 0.055 : 0.025;

    noiseSource.connect(filter);
    filter.connect(crowdGain);
    crowdGain.connect(ctx.destination);
    noiseSource.start();
  } catch {}

  return () => {
    if (stopped) return;
    stopped = true;
    try {
      noiseSource?.stop();
      noiseSource?.disconnect();
    } catch {}
  };
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function AIChronicleCard({
  inputData,
  initialChronicle,
  onApplyToNotes,
  isAdminView = false,
}: AIChronicleCardProps) {
  const [style, setStyle] = useState<ChronicleStyle>("relator");
  const [loading, setLoading] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
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
  const [isPlaying, setIsPlaying] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const stopAmbienceRef = useRef<(() => void) | null>(null);
  const abortPlayRef = useRef(false);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const stopAudio = () => {
    abortPlayRef.current = true;
    setIsPlaying(false);
    setLoadingAudio(false);

    try {
      currentSourceRef.current?.stop();
      currentSourceRef.current?.disconnect();
      currentSourceRef.current = null;
    } catch {}

    try {
      stopAmbienceRef.current?.();
      stopAmbienceRef.current = null;
    } catch {}

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  const handleGenerate = async (chosenStyle: ChronicleStyle = style): Promise<ChronicleResult | null> => {
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
      return data;
    } catch (e) {
      console.error("Error generando crónica:", e);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reproduce el relato con Voz Masculina Neuronal de Relator + Ambiente de Estadio,
   * ajustando cadencia y tono según el estilo ("relator", "picante", "periodista").
   */
  const handlePlayAudio = async () => {
    stopAudio();
    abortPlayRef.current = false;

    let activeResult = result;
    // Si todavía no había guion generado para este estilo, lo generamos al vuelo
    if (!activeResult || activeResult.title === "Crónica Oficial del Partido") {
      const generated = await handleGenerate(style);
      if (generated) activeResult = generated;
    }
    if (!activeResult) return;

    const script = activeResult.audioScript || activeResult.chronicle;
    setLoadingAudio(true);

    try {
      const res = await fetch("/api/chronicle/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: script, style }),
      });

      if (!res.ok) throw new Error("TTS API fallback");
      const data = (await res.json()) as { ok?: boolean; chunks?: string[] };
      if (!data.ok || !data.chunks || data.chunks.length === 0) {
        throw new Error("Empty TTS chunks");
      }

      if (abortPlayRef.current) return;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      // Decodificar todos los fragmentos MP3 en paralelo
      const decodedBuffers = await Promise.all(
        data.chunks.map((b64) => ctx.decodeAudioData(base64ToArrayBuffer(b64)))
      );

      if (abortPlayRef.current) return;

      setLoadingAudio(false);
      setIsPlaying(true);

      // Iniciar sonido ambiente de estadio según el modo elegido
      stopAmbienceRef.current = startStadiumAmbience(ctx, style);

      // Configurar velocidad según el estilo seleccionado
      const playbackRate =
        style === "relator" ? 1.13 : style === "picante" ? 1.07 : 0.99;

      // Reproducir cada oración encadenada con fluidez
      for (const buffer of decodedBuffers) {
        if (abortPlayRef.current) break;
        await new Promise<void>((resolve) => {
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.playbackRate.value = playbackRate;

          // Filtro sutil de cabina de transmisión radial
          const eq = ctx.createBiquadFilter();
          eq.type = "peaking";
          eq.frequency.value = 1800;
          eq.gain.value = style === "relator" ? 3.5 : 1.5;

          source.connect(eq);
          eq.connect(ctx.destination);
          currentSourceRef.current = source;

          source.onended = () => resolve();
          source.start();
        });
      }

      stopAudio();
    } catch (err) {
      // Fallback: Web Speech API buscando explícitamente una voz masculina y grave
      console.warn("Usando voz masculina local de respaldo:", err);
      setLoadingAudio(false);
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

      const utterance = new SpeechSynthesisUtterance(script);
      const voices = window.speechSynthesis.getVoices();
      const esVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("es"));

      // Priorizar voces masculinas por nombre conocido y descartar Sabina/Helena/Laura/Paulina
      const maleKeywords = ["tomas", "jorge", "alvaro", "pablo", "raul", "diego", "carlos", "male", "hombre"];
      const femaleKeywords = ["sabina", "helena", "laura", "paulina", "paloma", "elvira", "dalia", "elena", "female"];

      const maleVoice =
        esVoices.find((v) =>
          maleKeywords.some((k) => v.name.toLowerCase().includes(k))
        ) ||
        esVoices.find(
          (v) => !femaleKeywords.some((k) => v.name.toLowerCase().includes(k))
        ) ||
        esVoices[0];

      if (maleVoice) utterance.voice = maleVoice;

      utterance.rate = style === "relator" ? 1.18 : style === "picante" ? 1.1 : 1.0;
      utterance.pitch = style === "relator" ? 0.85 : style === "picante" ? 0.8 : 0.72;

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      window.speechSynthesis.speak(utterance);
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

  const styleSubtitle =
    style === "relator"
      ? "Voz de cabina radial eufórica con ambiente de cancha"
      : style === "picante"
      ? "Locutor de vestuario con chicana y gastada futbolera"
      : "Narrador profundo estilo documental épico";

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
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-base text-zinc-100 uppercase tracking-wide">
                Crónica & Relator de Fútbol IA 🎙️
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                Voz Relator Masculino
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium">
              Elegí el estilo abajo: cambia tanto el guion como la forma de relatar.
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
          <span>{loading ? "Armando relato..." : result ? "Regenerar Relato" : "Generar Relato IA"}</span>
        </button>
      </div>

      {/* Selector de estilo (cambia guion y cadencia del relator) */}
      <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/10 text-xs relative z-10 overflow-x-auto scrollbar-hide">
        <button
          type="button"
          onClick={() => {
            setStyle("relator");
            handleGenerate("relator");
          }}
          className={`flex-1 min-w-[110px] py-2 px-2.5 rounded-xl font-black transition-all flex items-center justify-center gap-1.5 ${
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
            handleGenerate("picante");
          }}
          className={`flex-1 min-w-[110px] py-2 px-2.5 rounded-xl font-black transition-all flex items-center justify-center gap-1.5 ${
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
            handleGenerate("periodista");
          }}
          className={`flex-1 min-w-[110px] py-2 px-2.5 rounded-xl font-black transition-all flex items-center justify-center gap-1.5 ${
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
            <h4 className="font-black text-sm text-amber-300 tracking-wide uppercase flex items-center gap-2 leading-snug">
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
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-zinc-900 to-teal-950/80 border border-emerald-500/40 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              {loadingAudio ? (
                <div className="w-11 h-11 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-md shrink-0">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : isPlaying ? (
                <button
                  type="button"
                  onClick={stopAudio}
                  className="w-11 h-11 rounded-full bg-amber-400 text-black flex items-center justify-center hover:scale-105 transition-all shadow-md shrink-0"
                  title="Detener transmisión"
                >
                  <Pause size={19} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePlayAudio}
                  className="w-11 h-11 rounded-full bg-emerald-400 text-black flex items-center justify-center hover:scale-105 transition-all shadow-lg shadow-emerald-400/30 shrink-0"
                  title="Escuchar al Relator"
                >
                  <Play size={19} className="ml-0.5" />
                </button>
              )}

              {isPlaying && (
                <button
                  type="button"
                  onClick={stopAudio}
                  className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                  title="Cortar audio"
                >
                  <VolumeX size={16} />
                </button>
              )}

              <div>
                <span className="text-xs font-black text-zinc-100 block">
                  {loadingAudio
                    ? "Conectando con la cabina de transmisión..."
                    : isPlaying
                    ? `En vivo: ${
                        style === "relator"
                          ? "Relator Exaltado 🎙️"
                          : style === "picante"
                          ? "Modo Gastada 🔥"
                          : "Periodista Épico 📰"
                      }`
                    : `Escuchar Relato (${
                        style === "relator"
                          ? "Relator Exaltado"
                          : style === "picante"
                          ? "Modo Gastada"
                          : "Periodista Épico"
                      })`}
                </span>
                <span className="text-[11px] text-zinc-400 font-medium block">
                  {styleSubtitle}
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
