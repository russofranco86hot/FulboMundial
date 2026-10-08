"use client";

import { useTransition } from "react";
import { toggleThirdHalfAction } from "@/app/actions";
import { Beer, Utensils, X } from "lucide-react";

export function TercerTiempoWidget({ 
  responses, 
  myResponse,
  groupId,
  groupSlug,
}: { 
  responses: { name: string, staying: boolean }[];
  myResponse: boolean | null;
  groupId?: number;
  groupSlug?: string;
}) {
  const [isPending, startTransition] = useTransition();

  const stayingCount = responses.filter(r => r.staying).length;
  const notStayingCount = responses.filter(r => !r.staying).length;

  function handleToggle(staying: boolean) {
    if (!groupId || !groupSlug) return;
    startTransition(() => {
      toggleThirdHalfAction(staying, groupId, groupSlug);
    });
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2 border-b border-pitch-100/50 dark:border-zinc-800 pb-2">
        <Beer className="text-amber-500" size={20} />
        <h3 className="font-bold text-pitch-700 dark:text-zinc-200">Tercer Tiempo 🍻</h3>
      </div>
      
      <p className="text-sm text-pitch-900/70 dark:text-zinc-400">
        ¿Te quedás a comer o tomar algo después del partido?
      </p>

      <div className="flex gap-2">
        <button 
          disabled={isPending}
          onClick={() => handleToggle(true)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-sm font-semibold transition-colors border ${
            myResponse === true 
              ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700/50 dark:text-amber-400' 
              : 'bg-pitch-50 border-transparent text-pitch-900/60 hover:bg-pitch-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700/50'
          }`}
        >
          {myResponse === true ? <span className="text-base animate-bounce-in">🍕</span> : <Utensils size={16} />}
          Me quedo
        </button>
        <button 
          disabled={isPending}
          onClick={() => handleToggle(false)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-sm font-semibold transition-colors border ${
            myResponse === false 
              ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400' 
              : 'bg-pitch-50 border-transparent text-pitch-900/60 hover:bg-pitch-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700/50'
          }`}
        >
          <X size={16} /> No puedo
        </button>
      </div>

      {(stayingCount > 0 || notStayingCount > 0) && (
        <div className="pt-2 text-xs text-pitch-900/60 dark:text-zinc-400 space-y-3">
          <div className="flex justify-between px-1">
            <span>Se quedan: <strong className="text-pitch-700 dark:text-zinc-200">{stayingCount}</strong></span>
            <span>No pueden: <strong className="text-pitch-700 dark:text-zinc-200">{notStayingCount}</strong></span>
          </div>
          {stayingCount > 0 && (
            <div className="flex flex-wrap gap-1 px-1">
              {responses.filter(r => r.staying).map(r => (
                <div 
                  key={r.name}
                  className="w-7 h-7 rounded-full bg-pitch-500 dark:bg-pitch-600 text-white flex items-center justify-center text-xs font-bold shadow-sm"
                  title={r.name}
                >
                  {r.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
