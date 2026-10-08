"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { claimPlayer } from "@/app/actions";
import { Loader2 } from "lucide-react";

type Opcion = {
  id: number;
  name: string;
  priorityOrder: number;
  isGoalkeeper: boolean;
};

/** Selector de nombre para la auto-vinculación en el primer login. */
export function PlayerPicker({ players }: { players: Opcion[] }) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<number | null>(null);
  const router = useRouter();

  function pick(p: Opcion) {
    if (pending) return;
    if (!confirm(`¿Sos ${p.name}? Vas a quedar vinculado a este nombre.`)) return;
    setSelected(p.id);
    startTransition(async () => {
      const res = await claimPlayer(p.id);
      if (!res.ok && res.error) {
        alert(res.error);
        setSelected(null);
      }
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {players.map((p) => (
        <button
          key={p.id}
          onClick={() => pick(p)}
          disabled={pending}
          className="flex items-center justify-between p-3 rounded-xl border border-pitch-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:shadow-sm disabled:hover:translate-y-0 text-left"
        >
          <span className="truncate font-medium text-sm text-pitch-900 dark:text-zinc-100">
            {p.isGoalkeeper && <span className="mr-1">🧤</span>}
            {p.name}
          </span>
          {selected === p.id && pending ? (
            <Loader2 className="w-4 h-4 animate-spin text-pitch-500" />
          ) : (
            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-pitch-100 dark:bg-zinc-700 text-[10px] font-bold text-pitch-600 dark:text-zinc-300">
              {p.priorityOrder}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
