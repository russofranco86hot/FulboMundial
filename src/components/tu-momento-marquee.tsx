"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface TuMomentoItem {
  groupId: number;
  groupName: string;
  groupSlug: string;
  comment: string;
}

export function TuMomentoMarquee({ items }: { items: TuMomentoItem[] }) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (items.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [items.length, isPaused]);

  if (!items || items.length === 0) return null;

  const current = items[index] ?? items[0];

  return (
    <div
      className="card bg-gradient-to-br from-pitch-900 via-pitch-800 to-zinc-950 text-white border-pitch-600/40 p-3.5 shadow-md rounded-2xl animate-slide-down transition-all"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5 text-pitch-300 text-[11px] font-black uppercase tracking-wider">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="shrink-0 animate-pulse">🎙️</span>
          <span className="shrink-0">Tu momento en</span>
          <Link
            href={`/grupos/${current.groupSlug}`}
            className="text-white hover:text-pitch-200 underline truncate font-black"
          >
            {current.groupName}
          </Link>
        </div>

        {items.length > 1 && (
          <div className="flex items-center gap-1 shrink-0 bg-white/10 rounded-full px-2 py-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => setIndex((prev) => (prev - 1 + items.length) % items.length)}
              className="p-0.5 hover:text-white text-pitch-300 transition-colors"
              aria-label="Comentario anterior"
            >
              <ChevronLeft size={12} />
            </button>
            <span className="font-mono text-zinc-300">
              {index + 1}/{items.length}
            </span>
            <button
              type="button"
              onClick={() => setIndex((prev) => (prev + 1) % items.length)}
              className="p-0.5 hover:text-white text-pitch-300 transition-colors"
              aria-label="Siguiente comentario"
            >
              <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>

      <div className="relative overflow-hidden min-h-[44px] flex items-center">
        <p
          key={`${current.groupId}-${index}`}
          className="text-xs sm:text-sm text-pitch-100 font-medium italic bg-white/5 p-2.5 rounded-xl border border-white/10 w-full animate-fade-in line-clamp-3 sm:line-clamp-2"
        >
          "{current.comment}"
        </p>
      </div>

      {items.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {items.map((it, i) => (
            <button
              key={it.groupId}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-pitch-400" : "w-1.5 bg-white/30 hover:bg-white/60"
              }`}
              aria-label={`Ver momento en ${it.groupName}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
