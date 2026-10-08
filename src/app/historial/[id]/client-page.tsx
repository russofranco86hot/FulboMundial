"use client";

import { useState, useTransition } from "react";
import { addMatchNoteAction, voteMatchAwardAction } from "@/app/actions";
import { MessageSquare, Award, Flame, Goal, Check, Send } from "lucide-react";
import { formatArt } from "@/lib/time";

type Player = { id: number; playerId: number | null; name: string };
type Note = { id: number; note: string; createdAt: Date; authorName: string; authorId: number };
type Vote = { id: number; categoryId: string; voterId: number; candidateId: number };

export function MatchDetailClient({
  matchId,
  teams,
  notes,
  votes,
  currentUserId,
}: {
  matchId: number;
  teams: Player[];
  notes: Note[];
  votes: Vote[];
  currentUserId?: number;
}) {
  const [newNote, setNewNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    startTransition(async () => {
      await addMatchNoteAction(matchId, newNote);
      setNewNote("");
    });
  };

  const handleVote = (categoryId: "mvp" | "tronco" | "gol", candidateId: number) => {
    startTransition(async () => {
      await voteMatchAwardAction(matchId, categoryId, candidateId);
    });
  };

  const players = teams.filter((t) => t.playerId !== null) as { playerId: number; name: string }[];

  const categoryStyles = {
    mvp: {
      bg: "bg-yellow-500",
      text: "text-white",
      border: "border-yellow-500",
      badge: "bg-yellow-600",
    },
    tronco: {
      bg: "bg-red-500",
      text: "text-white",
      border: "border-red-500",
      badge: "bg-red-600",
    },
    gol: {
      bg: "bg-blue-500",
      text: "text-white",
      border: "border-blue-500",
      badge: "bg-blue-600",
    },
  };

  const renderVotes = (category: "mvp" | "tronco" | "gol", title: string, icon: React.ReactNode) => {
    const categoryVotes = votes.filter((v) => v.categoryId === category);
    
    // Contar votos por candidato
    const counts = categoryVotes.reduce((acc, v) => {
      acc[v.candidateId] = (acc[v.candidateId] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    const myVote = categoryVotes.find((v) => v.voterId === currentUserId)?.candidateId;
    const styles = categoryStyles[category];

    return (
      <div className="space-y-3">
        <h3 className="font-bold text-pitch-700 flex items-center gap-2">
          {icon} {title}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {players.map((p) => {
            const isMyVote = p.playerId === myVote;
            const voteCount = counts[p.playerId] || 0;
            return (
              <button
                key={p.playerId}
                onClick={() => handleVote(category, p.playerId)}
                disabled={isPending || !currentUserId}
                className={`text-left p-3 rounded-xl border text-sm transition-all duration-300 flex justify-between items-center relative overflow-hidden ${
                  isMyVote
                    ? `${styles.bg} ${styles.border} ${styles.text} animate-scale-in shadow-md`
                    : "bg-white dark:bg-zinc-800 border-pitch-200 dark:border-zinc-700 hover:border-pitch-400 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  {isMyVote && <Check size={14} className="shrink-0" />}
                  <span className={`truncate font-medium ${isMyVote ? 'text-white' : ''}`}>{p.name}</span>
                </div>
                {voteCount > 0 && (
                  <span className={`ml-2 text-xs font-bold px-2 py-1 rounded-full shrink-0 ${
                    isMyVote ? styles.badge : `${styles.bg} text-white`
                  }`}>
                    {voteCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Votaciones */}
      <div className="card space-y-6">
        <h2 className="font-extrabold text-lg border-b border-pitch-100/50 pb-2">Premios del Partido</h2>
        {!currentUserId && (
          <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
            Iniciá sesión para votar los premios.
          </p>
        )}
        
        {renderVotes("mvp", "MVP (Figura)", <Award className="text-yellow-500" size={20} />)}
        {renderVotes("tronco", "Tronco / Picapiedra", <Flame className="text-red-500" size={20} />)}
        {renderVotes("gol", "Mejor Gol", <Goal className="text-blue-500" size={20} />)}
      </div>

      {/* Notas Colaborativas */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 border-b border-pitch-100/50 pb-2">
          <MessageSquare className="text-pitch-600" size={20} />
          <h2 className="font-extrabold text-lg">Notas y Comentarios</h2>
        </div>

        <div className="space-y-4 pt-2">
          {notes.length === 0 ? (
            <p className="text-sm text-pitch-900/40 text-center py-6">
              Nadie ha escrito notas todavía. ¡Sé el primero!
            </p>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="flex gap-3 items-end">
                <div className="w-8 h-8 rounded-full bg-pitch-200 dark:bg-zinc-700 flex items-center justify-center shrink-0 font-bold text-pitch-700 dark:text-zinc-300 text-sm">
                  {n.authorName.charAt(0).toUpperCase()}
                </div>
                <div className="relative bg-pitch-100/70 dark:bg-zinc-800 p-3 rounded-2xl rounded-bl-none">
                  <div className="absolute -left-2 bottom-0 w-0 h-0 border-t-[10px] border-t-transparent border-r-[10px] border-r-pitch-100/70 dark:border-r-zinc-800 border-b-[0px] border-b-transparent"></div>
                  <div className="flex justify-between items-center text-[11px] text-pitch-900/60 dark:text-zinc-400 mb-1 gap-4">
                    <span className="font-bold text-pitch-700 dark:text-pitch-400">{n.authorName}</span>
                    <span>{formatArt(n.createdAt, "dd/MM HH:mm")}</span>
                  </div>
                  <p className="text-sm text-pitch-900 dark:text-zinc-200">{n.note}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {currentUserId && (
          <div className="pt-4 mt-2 border-t border-pitch-100/50 flex gap-2 items-center">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Escribí un comentario del partido..."
              className="flex-1 input bg-pitch-50 dark:bg-zinc-900 border-pitch-200 rounded-full px-4"
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              disabled={isPending}
            />
            <button
              onClick={handleAddNote}
              disabled={isPending || !newNote.trim()}
              className="btn-primary w-11 h-11 rounded-full flex items-center justify-center p-0 shrink-0"
              title="Enviar"
            >
              <Send size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
