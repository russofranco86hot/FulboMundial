"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { addMatchNoteAction, voteMatchAwardAction } from "@/app/actions";
import { MessageSquare, Award, Flame, Goal, Check, Send, AtSign, Bell } from "lucide-react";
import { formatArt } from "@/lib/time";

type Player = { id: number; playerId: number | null; name: string };
type MemberOption = { playerId: number; name: string };
type Note = { id: number; note: string; createdAt: Date; authorName: string; authorId: number };
type Vote = { id: number; categoryId: string; voterId: number; candidateId: number };

function normalizeForMatch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function renderNoteWithMentions(text: string, candidates: MemberOption[]) {
  if (!text.includes("@")) return text;
  const sortedNames = [...candidates]
    .map((c) => c.name.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  if (sortedNames.length === 0) return text;

  const pattern = sortedNames
    .map((n) => `@${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`)
    .join("|");
  const splitRegex = new RegExp(`(${pattern})`, "gi");
  const checkRegex = new RegExp(`^(?:${pattern})$`, "i");
  const parts = text.split(splitRegex);

  return parts.map((part, idx) =>
    checkRegex.test(part) ? (
      <span
        key={idx}
        className="font-bold text-pitch-700 dark:text-emerald-400 bg-pitch-200/60 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md"
      >
        {part}
      </span>
    ) : (
      <span key={idx}>{part}</span>
    )
  );
}

export function MatchDetailClient({
  matchId,
  groupSlug,
  teams,
  members,
  notes,
  votes,
  currentUserId,
}: {
  matchId: number;
  groupSlug: string;
  teams: Player[];
  members?: MemberOption[];
  notes: Note[];
  votes: Vote[];
  currentUserId?: number;
}) {
  const [newNote, setNewNote] = useState("");
  const [mentionedIds, setMentionedIds] = useState<number[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const mentionCandidates = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of members ?? []) {
      if (m.playerId && m.name) map.set(m.playerId, m.name);
    }
    for (const t of teams) {
      if (t.playerId !== null && t.name) map.set(t.playerId, t.name);
    }
    return Array.from(map.entries())
      .map(([playerId, name]) => ({ playerId, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [members, teams]);

  const filteredCandidates = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = normalizeForMatch(mentionQuery);
    if (!q) return mentionCandidates;
    return mentionCandidates.filter((c) => normalizeForMatch(c.name).includes(q));
  }, [mentionQuery, mentionCandidates]);

  const activeMentionTargets = useMemo(() => {
    const normNote = normalizeForMatch(newNote);
    const chosen = new Map<number, MemberOption>();
    for (const id of mentionedIds) {
      const cand = mentionCandidates.find((c) => c.playerId === id);
      if (cand && normNote.includes(`@${normalizeForMatch(cand.name)}`)) {
        chosen.set(cand.playerId, cand);
      }
    }
    for (const cand of mentionCandidates) {
      const token = `@${normalizeForMatch(cand.name)}`;
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`(?:^|\\s)${escaped}(?=$|[\\s.,;:!?])`).test(normNote)) {
        chosen.set(cand.playerId, cand);
      }
    }
    return Array.from(chosen.values());
  }, [newNote, mentionedIds, mentionCandidates]);

  const handleNoteInputChange = (val: string, cursorPos?: number | null) => {
    setNewNote(val);
    const pos = cursorPos ?? val.length;
    const beforeCursor = val.slice(0, pos);
    const match = /(?:^|\s)@([^\s@]*)$/.exec(beforeCursor);
    if (match) {
      const atIdx = beforeCursor.lastIndexOf("@");
      setMentionQuery(match[1]);
      setMentionStartIndex(atIdx);
    } else {
      setMentionQuery(null);
      setMentionStartIndex(-1);
    }
  };

  const handleSelectMention = (cand: MemberOption) => {
    const start = mentionStartIndex >= 0 ? mentionStartIndex : newNote.length;
    const pos = inputRef.current?.selectionStart ?? newNote.length;
    const prefix =
      start > 0 && !/\s/.test(newNote[start - 1] || "")
        ? `${newNote.slice(0, start)} `
        : newNote.slice(0, start);
    const suffix = newNote.slice(Math.max(pos, start));
    const inserted = `@${cand.name} `;
    const updated = `${prefix}${inserted}${suffix.replace(/^\s*/, "")}`;
    setNewNote(updated);
    setMentionedIds((prev) => (prev.includes(cand.playerId) ? prev : [...prev, cand.playerId]));
    setMentionQuery(null);
    setMentionStartIndex(-1);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleOpenMentionPicker = () => {
    if (mentionQuery !== null) {
      setMentionQuery(null);
      setMentionStartIndex(-1);
      return;
    }
    const base = newNote;
    const needsSpace = base.length > 0 && !/\s$/.test(base);
    const updated = `${base}${needsSpace ? " " : ""}@`;
    setNewNote(updated);
    setMentionStartIndex(updated.length - 1);
    setMentionQuery("");
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const targetIds = activeMentionTargets.map((t) => t.playerId);
    const noteToSend = newNote;
    startTransition(async () => {
      const res = await addMatchNoteAction(matchId, noteToSend, groupSlug, targetIds);
      if (res.ok) {
        setNewNote("");
        setMentionedIds([]);
        setMentionQuery(null);
        setMentionStartIndex(-1);
        setFeedbackMsg(
          targetIds.length > 0
            ? `Comentario publicado. Se notificó por push a ${activeMentionTargets.map((t) => t.name).join(", ")}.`
            : "Comentario publicado."
        );
        setTimeout(() => setFeedbackMsg(null), 4000);
      }
    });
  };

  const handleVote = (categoryId: "mvp" | "tronco" | "gol", candidateId: number) => {
    const candidateName = players.find((p) => p.playerId === candidateId)?.name;
    startTransition(async () => {
      const res = await voteMatchAwardAction(matchId, categoryId, candidateId, groupSlug);
      if (res.ok && candidateName) {
        setFeedbackMsg(`Voto registrado para ${candidateName} (notificación push enviada).`);
        setTimeout(() => setFeedbackMsg(null), 3500);
      }
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
    
    const counts = categoryVotes.reduce((acc, v) => {
      acc[v.candidateId] = (acc[v.candidateId] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    const myVote = categoryVotes.find((v) => v.voterId === currentUserId)?.candidateId;
    const styles = categoryStyles[category];

    return (
      <div className="space-y-3">
        <h3 className="font-bold text-pitch-700 dark:text-zinc-200 flex items-center gap-2">
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
                  <span className={`truncate font-medium ${isMyVote ? 'text-white' : 'dark:text-zinc-200'}`}>{p.name}</span>
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
        <h2 className="font-extrabold text-lg border-b border-pitch-100/50 dark:border-zinc-800 pb-2 dark:text-zinc-100">Premios del Partido</h2>
        {!currentUserId && (
          <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/30 p-2 rounded">
            Iniciá sesión para votar los premios.
          </p>
        )}
        
        {renderVotes("mvp", "MVP (Figura)", <Award className="text-yellow-500" size={20} />)}
        {renderVotes("tronco", "Tronco / Picapiedra", <Flame className="text-red-500" size={20} />)}
        {renderVotes("gol", "Mejor Gol", <Goal className="text-blue-500" size={20} />)}
      </div>

      {/* Notas Colaborativas */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 border-b border-pitch-100/50 dark:border-zinc-800 pb-2">
          <MessageSquare className="text-pitch-600" size={20} />
          <h2 className="font-extrabold text-lg dark:text-zinc-100">Notas y Comentarios</h2>
        </div>

        <div className="space-y-4 pt-2">
          {notes.length === 0 ? (
            <p className="text-sm text-pitch-900/40 dark:text-zinc-500 text-center py-6">
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
                  <p className="text-sm text-pitch-900 dark:text-zinc-200">
                    {renderNoteWithMentions(n.note, mentionCandidates)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {feedbackMsg && (
          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3 py-2 rounded-xl flex items-center gap-1.5">
            <Bell size={13} className="shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {currentUserId && (
          <div className="pt-4 mt-2 border-t border-pitch-100/50 dark:border-zinc-800 space-y-2 relative">
            {mentionQuery !== null && (
              <div className="absolute left-0 right-0 bottom-full mb-2 z-30 rounded-2xl border border-pitch-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl max-h-48 overflow-y-auto p-1.5 space-y-0.5">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                  <span>Mencionar y notificar por push</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMentionQuery(null);
                      setMentionStartIndex(-1);
                    }}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    Cerrar
                  </button>
                </div>
                {filteredCandidates.length === 0 ? (
                  <p className="px-2.5 py-2 text-xs text-zinc-400">
                    No se encontraron miembros con ese nombre.
                  </p>
                ) : (
                  filteredCandidates.map((cand) => (
                    <button
                      key={cand.playerId}
                      type="button"
                      onClick={() => handleSelectMention(cand)}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl text-sm font-semibold hover:bg-pitch-50 dark:hover:bg-zinc-800 text-pitch-900 dark:text-zinc-100 flex items-center justify-between gap-2 transition-colors"
                    >
                      <span className="truncate">@{cand.name}</span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        Notificar
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="flex gap-2 items-center">
              <button
                type="button"
                onClick={handleOpenMentionPicker}
                disabled={isPending || mentionCandidates.length === 0}
                className="w-10 h-10 rounded-full border border-pitch-200 dark:border-zinc-700 bg-pitch-50 dark:bg-zinc-800 hover:bg-pitch-100 dark:hover:bg-zinc-700 text-pitch-700 dark:text-pitch-400 flex items-center justify-center shrink-0 transition-colors"
                title="Mencionar a un miembro (@)"
              >
                <AtSign size={17} />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={newNote}
                onChange={(e) => handleNoteInputChange(e.target.value, e.target.selectionStart)}
                placeholder="Escribí un comentario del partido... Usá @ para etiquetar"
                className="flex-1 input bg-pitch-50 dark:bg-zinc-900 border-pitch-200 rounded-full px-4"
                onKeyDown={(e) => {
                  if (e.key === "Escape" && mentionQuery !== null) {
                    setMentionQuery(null);
                    setMentionStartIndex(-1);
                    return;
                  }
                  if (e.key === "Enter") {
                    if (mentionQuery !== null && filteredCandidates.length > 0) {
                      e.preventDefault();
                      handleSelectMention(filteredCandidates[0]);
                    } else {
                      handleAddNote();
                    }
                  }
                }}
                disabled={isPending}
              />
              <button
                type="button"
                onClick={handleAddNote}
                disabled={isPending || !newNote.trim()}
                className="btn-primary w-11 h-11 rounded-full flex items-center justify-center p-0 shrink-0"
                title="Enviar"
              >
                <Send size={18} />
              </button>
            </div>

            {activeMentionTargets.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pl-12 text-[11px] text-zinc-500 dark:text-zinc-400">
                <Bell size={11} className="text-emerald-600 dark:text-emerald-400" />
                <span>Le llegará notificación push a:</span>
                {activeMentionTargets.map((t) => (
                  <span
                    key={t.playerId}
                    className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold"
                  >
                    @{t.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
