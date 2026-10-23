"use client";

import { useState } from "react";
import { Copy, Check, Share2, MessageCircle } from "lucide-react";

export function CopyInviteCode({
  code,
  groupName,
  inline = false,
}: {
  code: string;
  groupName?: string;
  inline?: boolean;
}) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const getInviteUrl = () => {
    if (typeof window === "undefined") return `/grupos/unirse?code=${code}`;
    return `${window.location.origin}/grupos/unirse?code=${code}`;
  };

  const copyToClipboard = async (text: string, isLink: boolean = false) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback para navegadores antiguos o webviews restringidas
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      if (isLink) {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2500);
      }
    } catch (err) {
      console.error("Error al copiar al portapapeles:", err);
    }
  };

  if (inline) {
    return (
      <button
        type="button"
        onClick={() => copyToClipboard(code, false)}
        className="inline-flex items-center gap-1 font-mono font-black text-pitch-700 dark:text-pitch-400 bg-pitch-100 dark:bg-pitch-900/40 hover:bg-pitch-200 dark:hover:bg-pitch-900/60 px-2 py-0.5 rounded-lg border border-pitch-300 dark:border-pitch-700 transition-colors cursor-pointer"
        title="Hacé click para copiar el código"
      >
        <span>{code}</span>
        {copiedCode ? (
          <Check size={12} className="text-green-600 dark:text-green-400 animate-bounce-in" />
        ) : (
          <Copy size={12} className="opacity-60" />
        )}
      </button>
    );
  }

  const shareText = `¡Sumate a nuestro grupo ${groupName ? `"${groupName}" ` : ""}en FulboMundial! ⚽\nEntrá a este enlace o usá el código de invitación: *${code}*\n\n${getInviteUrl()}`;

  const waShareUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="space-y-2.5">
      {/* Botón principal de código: al hacer click se copia */}
      <button
        type="button"
        onClick={() => copyToClipboard(code, false)}
        className={`w-full group text-left flex items-center justify-between gap-3 p-3.5 rounded-2xl border-2 transition-all cursor-pointer select-none ${
          copiedCode
            ? "bg-green-500/10 border-green-500 ring-2 ring-green-500/20"
            : "bg-white dark:bg-zinc-800/90 border-pitch-200/80 dark:border-zinc-700 hover:border-pitch-400 dark:hover:border-pitch-500 shadow-sm hover:shadow"
        }`}
        title="Hacé click para copiar el código al portapapeles"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-colors ${
              copiedCode
                ? "bg-green-500 text-white"
                : "bg-pitch-100 dark:bg-zinc-700 text-pitch-700 dark:text-pitch-300 group-hover:bg-pitch-200"
            }`}
          >
            {copiedCode ? <Check size={20} className="animate-bounce-in" /> : <Copy size={18} />}
          </div>
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-pitch-900/50 dark:text-zinc-400">
              {copiedCode ? "¡Código copiado!" : "Click para copiar código"}
            </span>
            <span className="font-mono text-2xl font-black tracking-widest text-pitch-700 dark:text-pitch-400">
              {code}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span
            className={`chip text-xs font-bold px-2.5 py-1 rounded-xl transition-all ${
              copiedCode
                ? "bg-green-600 text-white shadow-sm"
                : "bg-pitch-50 dark:bg-zinc-700 text-pitch-700 dark:text-pitch-300 group-hover:bg-pitch-600 group-hover:text-white"
            }`}
          >
            {copiedCode ? "✓ Copiado" : "Copiar"}
          </span>
        </div>
      </button>

      {/* Botones de acción rápida: Copiar Enlace y Compartir por WhatsApp */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <button
          type="button"
          onClick={() => copyToClipboard(getInviteUrl(), true)}
          className={`btn-ghost py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 font-bold transition-all ${
            copiedLink ? "text-green-600 border-green-500 bg-green-50 dark:bg-green-950/20" : ""
          }`}
          title="Copiar link directo para unirse"
        >
          {copiedLink ? <Check size={14} className="text-green-600" /> : <Share2 size={14} />}
          <span>{copiedLink ? "¡Link copiado!" : "Copiar link"}</span>
        </button>

        <a
          href={waShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 font-bold text-[#25D366] hover:bg-[#25D366]/10 border-[#25D366]/30 transition-all"
          title="Enviar código y enlace por WhatsApp"
        >
          <MessageCircle size={14} fill="currentColor" strokeWidth={0} />
          <span>WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
