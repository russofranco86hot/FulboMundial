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

  return (
    <div className="space-y-4 pt-2">
      {/* Generador de Crónica y Bot de Audio con IA */}
      <AIChronicleCard
        inputData={{
          ...inputData,
          customNotes: notes,
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
            Se guardan en el historial y son leídas por el bot
          </span>
        </div>
        <textarea
          name="notes"
          placeholder="Ej: Triunfazo agónico con aroma a hazaña... Gran partido, golazo de mitad de cancha..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input bg-zinc-50 dark:bg-zinc-800/50 min-h-[90px]"
          rows={3}
        />
      </div>
    </div>
  );
}
