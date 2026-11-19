"use client";

import React, { useState } from "react";
import { AIChronicleCard } from "@/components/ai-chronicle-card";
import type { ChronicleInput } from "@/lib/ai-chronicle";

interface NotesWithAIProps {
  initialNotes?: string;
  inputData: ChronicleInput;
}

export function NotesWithAI({ initialNotes = "", inputData }: NotesWithAIProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [briefDescription, setBriefDescription] = useState(
    initialNotes && initialNotes.length <= 240 ? initialNotes : ""
  );

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <label className="text-sm font-bold text-pitch-800 dark:text-zinc-300 ml-1">
            Breve descripción / dinámica del partido (para el relator)
          </label>
          <span className="text-[11px] text-zinc-500">
            El relator combina equipos, marcador y esta nota breve
          </span>
        </div>
        <textarea
          value={briefDescription}
          onChange={(e) => {
            const val = e.target.value;
            setBriefDescription(val);
            if (!notes.trim() || notes === briefDescription) {
              setNotes(val);
            }
          }}
          placeholder="Ej: Partido trabado en el primer tiempo, lo empatamos sobre la hora con golazo de mitad de cancha..."
          className="input bg-amber-50/40 dark:bg-zinc-800/60 border-amber-200/70 dark:border-zinc-700 min-h-[70px]"
          rows={2}
        />
      </div>

      {/* Generador de Crónica y Bot de Audio con IA */}
      <AIChronicleCard
        inputData={{
          ...inputData,
          customNotes: briefDescription.trim() || notes.trim(),
        }}
        initialChronicle={initialNotes}
        onApplyToNotes={(generatedText) => setNotes(generatedText)}
        isAdminView={true}
      />

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-pitch-800 dark:text-zinc-300 ml-1">
            Notas oficiales del partido
          </label>
          <span className="text-[11px] text-zinc-500">
            Se guardan en el historial y alimentan el resumen del campeonato
          </span>
        </div>
        <textarea
          name="notes"
          placeholder="Ej: Triunfazo agónico con aroma a hazaña... o pegá acá el relato generado arriba."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input bg-zinc-50 dark:bg-zinc-800/50 min-h-[90px]"
          rows={3}
        />
      </div>
    </div>
  );
}
