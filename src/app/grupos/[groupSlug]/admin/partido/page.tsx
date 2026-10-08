import { getGroupBySlug } from "@/lib/groups";
import { getCurrentMatch, getSelection, getMatchTeams, getGroupPlayers } from "@/lib/queries";
import { formatArt, nextGroupMatchDate } from "@/lib/time";
import { waListMessage, waTeamsMessage } from "@/lib/whatsapp";
import {
  adminOpenGroupMatch,
  adminGroupToggleSignup,
  adminGroupGenerateTeams,
  adminGroupAddGuest,
  adminGroupAddPlayerToTeam,
  adminGroupPushTeams,
} from "../actions";
import { TeamEditor, type TeamRow } from "@/components/team-editor";
import { WhatsAppShare } from "@/components/whatsapp-share";
import { MessageCircle, Shuffle, Users } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function GroupAdminPartido({
  params,
}: {
  params: Promise<{ groupSlug: string }>;
}) {
  const { groupSlug } = await params;
  const group = await getGroupBySlug(groupSlug);
  if (!group) return notFound();

  const match = await getCurrentMatch(group.id);

  if (!match) {
    const nextDate = nextGroupMatchDate(group.defaultDayOfWeek ?? 3, group.defaultTime ?? "21:00");
    const defaultDateStr = formatArt(nextDate, "yyyy-MM-dd'T'HH:mm");

    return (
      <div className="card space-y-4 text-center py-8 animate-fade-in">
        <div className="w-16 h-16 bg-pitch-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-2">
          <span className="text-2xl">📅</span>
        </div>
        <p className="text-pitch-900/60 dark:text-zinc-400 font-medium">No hay partido activo en {group.name}.</p>
        <form action={adminOpenGroupMatch} className="space-y-3 max-w-sm mx-auto text-left">
          <input type="hidden" name="groupId" value={group.id} />
          <input type="hidden" name="groupSlug" value={group.slug} />

          <div>
            <label className="block text-xs font-semibold mb-1 text-pitch-900/70 dark:text-zinc-300">
              Fecha y hora
            </label>
            <input
              type="datetime-local"
              name="matchDate"
              defaultValue={defaultDateStr}
              className="input w-full"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold mb-1 text-pitch-900/70 dark:text-zinc-300">
                Formato
              </label>
              <select name="format" className="input w-full" defaultValue={group.format}>
                <option value="F5">Fútbol 5</option>
                <option value="F6">Fútbol 6</option>
                <option value="F7">Fútbol 7</option>
                <option value="F8">Fútbol 8</option>
                <option value="F11">Fútbol 11</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-pitch-900/70 dark:text-zinc-300">
                Capacidad
              </label>
              <input
                type="number"
                name="capacity"
                defaultValue={group.defaultCapacity}
                min={4}
                max={30}
                className="input w-full"
              />
            </div>
          </div>

          <button className="btn-primary w-full shadow-glow-green">Abrir nuevo partido</button>
        </form>
      </div>
    );
  }

  const appUrl = process.env.NEXTAUTH_URL || undefined;
  const selection = await getSelection(match);
  const teamRows = await getMatchTeams(match.id);
  const players = (await getGroupPlayers(group.id)).filter((p) => !p.isGuest);
  const signedIds = new Set(selection.map((s) => s.playerId));
  const inTeamsIds = new Set(teamRows.map((r) => r.playerId).filter(Boolean) as number[]);
  const editorRows: TeamRow[] = teamRows.map((r) => ({
    id: r.id,
    name: r.name,
    stars: r.stars,
    isGoalkeeper: r.isGoalkeeper,
    isGuest: r.isGuest,
    team: r.team as "A" | "B",
  }));
  const teamsSig = editorRows.map((r) => `${r.id}:${r.team}`).join(",");

  const listMsg = waListMessage(match.matchDate, selection, appUrl);
  const teamAList = editorRows.filter((r) => r.team === "A");
  const teamBList = editorRows.filter((r) => r.team === "B");
  const teamsMsg = waTeamsMessage(match.matchDate, teamAList, teamBList, appUrl);

  const titularesCount = selection.filter((s) => s.status === "playing").length;
  const suplentesCount = selection.filter((s) => s.status === "substitute").length;

  return (
    <div className="space-y-5 animate-fade-in">
      {match.status === "finished" && (
        <div className="card space-y-3 bg-amber-500/10 border border-amber-500/20 shadow-none">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            ⚠️ El partido del {formatArt(match.matchDate, "dd/MM")} ya se encuentra finalizado.
          </p>
          <form action={adminOpenGroupMatch} className="space-y-3">
            <input type="hidden" name="groupId" value={group.id} />
            <input type="hidden" name="groupSlug" value={group.slug} />
            <div className="grid grid-cols-2 gap-2 text-left">
              <div>
                <label className="block text-xs font-semibold mb-1">Fecha y hora</label>
                <input type="datetime-local" name="matchDate" className="input w-full" required />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Formato</label>
                <select name="format" className="input w-full" defaultValue={group.format}>
                  <option value="F5">F5</option>
                  <option value="F6">F6</option>
                  <option value="F7">F7</option>
                  <option value="F8">F8</option>
                  <option value="F11">F11</option>
                </select>
              </div>
            </div>
            <button className="btn-primary w-full text-sm">
              ➕ Abrir inscripción para el próximo partido
            </button>
          </form>
        </div>
      )}

      {/* Summary Header */}
      <div className="card bg-gradient-to-br from-pitch-600 to-pitch-800 text-white shadow-glow-green border-none">
        <p className="capitalize font-extrabold text-lg flex items-center gap-2">
          {formatArt(match.matchDate, "EEEE dd/MM HH:mm")}
        </p>
        <div className="flex gap-2 mt-3 text-sm flex-wrap">
          <span className="bg-white/20 px-3 py-1 rounded-full font-medium shadow-sm backdrop-blur-sm">
            Estado: {match.status}
          </span>
          <span className="bg-white/20 px-3 py-1 rounded-full font-medium shadow-sm backdrop-blur-sm">
            {match.format} ({match.capacity} cupo)
          </span>
          <span className="bg-white/20 px-3 py-1 rounded-full font-medium shadow-sm flex items-center gap-1 backdrop-blur-sm">
            <Users size={14} /> {titularesCount} titulares
          </span>
        </div>
      </div>

      {/* Lista */}
      <div className="card">
        <h3 className="mb-4 font-bold text-pitch-800 dark:text-pitch-100 flex items-center gap-2">
          Lista ({selection.length} anotados)
        </h3>
        
        <ul className="space-y-1.5 text-sm">
          {selection.map((s, i) => {
            const isFirstSuplente = s.status === "substitute" && i > 0 && selection[i - 1].status === "playing";
            
            return (
              <li key={s.playerId}>
                {isFirstSuplente && (
                  <div className="flex items-center gap-4 my-4">
                    <div className="h-px bg-pitch-200 dark:bg-zinc-700 flex-1"></div>
                    <span className="text-xs font-bold text-pitch-400 uppercase tracking-wider">
                      Suplentes ({suplentesCount})
                    </span>
                    <div className="h-px bg-pitch-200 dark:bg-zinc-700 flex-1"></div>
                  </div>
                )}
                
                <div className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${
                  s.status === "playing" ? "bg-pitch-50/50 dark:bg-zinc-800/50" : "bg-amber-50/50 dark:bg-amber-900/10"
                } hover:bg-pitch-100 dark:hover:bg-zinc-800`}>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shadow-sm ${
                      s.status === "playing"
                        ? "bg-gradient-to-br from-pitch-500 to-pitch-700 text-white"
                        : "bg-gradient-to-br from-amber-400 to-amber-600 text-white"
                    }`}
                  >
                    {s.status === "playing" ? i + 1 : `S${s.substituteIndex}`}
                  </span>
                  
                  <span className="flex-1 font-medium text-zinc-800 dark:text-zinc-200">{s.name}</span>
                  
                  {s.phone && (
                    <a
                      href={`https://wa.me/${s.phone}?text=${encodeURIComponent(
                        `¡Hola ${s.name}! Estás anotado para el partido de ${group.name}. Tu estado actual es: ${
                          s.status === "playing" ? "Titular" : "Suplente"
                        }.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#25D366] hover:bg-[#25D366]/10 p-1.5 rounded-full transition-colors flex items-center justify-center bg-white dark:bg-zinc-700 shadow-sm"
                      title="Notificar por WhatsApp"
                    >
                      <MessageCircle size={18} fill="currentColor" strokeWidth={0} />
                    </a>
                  )}
                  
                  <form action={adminGroupToggleSignup}>
                    <input type="hidden" name="groupId" value={group.id} />
                    <input type="hidden" name="groupSlug" value={group.slug} />
                    <input type="hidden" name="playerId" value={s.playerId} />
                    <input type="hidden" name="action" value="remove" />
                    <button className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-2 py-1.5 rounded-md transition-colors">
                      Quitar
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
          {selection.length === 0 && (
            <li className="text-pitch-900/40 text-center py-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
              Nadie anotado.
            </li>
          )}
        </ul>
        
        <div className="mt-4 border-t border-pitch-100 dark:border-zinc-800 pt-4">
          <WhatsAppShare text={listMsg} label="Enviar lista al grupo" />
        </div>
      </div>

      {/* Anotar manualmente */}
      <details className="card">
        <summary className="cursor-pointer font-bold text-pitch-800 dark:text-pitch-100">
          ➕ Anotar miembro manualmente
        </summary>
        <p className="mt-2 text-xs text-pitch-900/50 dark:text-zinc-400 bg-pitch-50 dark:bg-zinc-800 p-2 rounded-lg">
          Anotá a cualquiera del grupo en su nombre. Funciona aunque la lista esté cerrada.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm max-h-[300px] overflow-y-auto pr-1">
          {players
            .filter((p) => !signedIds.has(p.id))
            .map((p) => (
              <form action={adminGroupToggleSignup} key={p.id}>
                <input type="hidden" name="groupId" value={group.id} />
                <input type="hidden" name="groupSlug" value={group.slug} />
                <input type="hidden" name="playerId" value={p.id} />
                <input type="hidden" name="action" value="add" />
                <button className="btn-ghost w-full px-2 py-2 text-sm text-left truncate hover:border-pitch-400 hover:text-pitch-700 dark:hover:text-pitch-400">
                  + {p.name}
                </button>
              </form>
            ))}
        </div>
      </details>

      {/* Equipos */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-pitch-800 dark:text-pitch-100">Equipos</h3>
          <form action={adminGroupGenerateTeams}>
            <input type="hidden" name="groupId" value={group.id} />
            <input type="hidden" name="groupSlug" value={group.slug} />
            <button className="btn-primary px-4 py-2 text-sm flex items-center gap-2 shadow-glow-green">
              <Shuffle size={16} /> Generar equipos
            </button>
          </form>
        </div>

        <TeamEditor key={teamsSig} rows={editorRows} />

        <details className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700 p-4">
          <summary className="cursor-pointer text-sm font-bold text-zinc-700 dark:text-zinc-300">
            ➕ Sumar del grupo a un equipo
          </summary>
          <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1 mt-3">
            {players.filter((p) => !inTeamsIds.has(p.id)).length === 0 && (
              <p className="text-xs text-pitch-900/40 text-center py-2">Todos ya están en un equipo.</p>
            )}
            {players
              .filter((p) => !inTeamsIds.has(p.id))
              .map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 px-3 py-2 text-sm shadow-sm hover:border-pitch-200 transition-colors"
                >
                  <span className="flex-1 truncate font-medium">
                    {p.isGoalkeeper && "🧤 "}
                    {p.name}
                  </span>
                  <div className="flex gap-1">
                    <form action={adminGroupAddPlayerToTeam}>
                      <input type="hidden" name="groupId" value={group.id} />
                      <input type="hidden" name="groupSlug" value={group.slug} />
                      <input type="hidden" name="playerId" value={p.id} />
                      <input type="hidden" name="team" value="A" />
                      <button className="rounded-lg bg-pitch-50 hover:bg-pitch-100 dark:bg-pitch-900/20 dark:hover:bg-pitch-900/40 border border-pitch-200 dark:border-pitch-800 px-2.5 py-1.5 text-xs font-bold text-pitch-700 dark:text-pitch-400 transition-colors">
                        → Claro
                      </button>
                    </form>
                    <form action={adminGroupAddPlayerToTeam}>
                      <input type="hidden" name="groupId" value={group.id} />
                      <input type="hidden" name="groupSlug" value={group.slug} />
                      <input type="hidden" name="playerId" value={p.id} />
                      <input type="hidden" name="team" value="B" />
                      <button className="rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800 px-2.5 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 transition-colors">
                        → Oscuro
                      </button>
                    </form>
                  </div>
                </div>
              ))}
          </div>
        </details>

        <form action={adminGroupAddGuest} className="space-y-3 rounded-2xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-900/30 p-4">
          <input type="hidden" name="groupId" value={group.id} />
          <input type="hidden" name="groupSlug" value={group.slug} />
          <p className="text-sm font-bold text-amber-800 dark:text-amber-400">👤 Agregar invitado manual</p>
          <div className="flex gap-2">
            <input name="name" placeholder="Nombre del invitado" className="input flex-1 py-2" required />
            <div className="relative w-20 shrink-0">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs">⭐</span>
              <input type="number" name="stars" step="0.5" min="0" max="5" defaultValue="3" className="input w-full pl-6 py-2 text-center" />
            </div>
            <select name="team" className="input w-24 py-2 shrink-0 bg-white dark:bg-zinc-800 font-medium text-sm">
              <option value="A">Claro</option>
              <option value="B">Oscuro</option>
            </select>
          </div>
          <button className="btn-ghost w-full py-2 text-sm bg-white hover:bg-amber-50 border-amber-200 text-amber-700 dark:bg-zinc-800 dark:border-amber-900/50 dark:text-amber-400">
            Agregar invitado
          </button>
        </form>

        <form action={adminGroupPushTeams}>
          <input type="hidden" name="groupId" value={group.id} />
          <input type="hidden" name="groupSlug" value={group.slug} />
          <button className="btn-primary w-full py-3 text-sm font-bold shadow-glow-green">
            📣 Publicar equipos (push a todos)
          </button>
        </form>

        <div className="border-t border-pitch-100 dark:border-zinc-800 pt-4 mt-2">
          <WhatsAppShare text={teamsMsg} label="Enviar equipos al grupo" />
        </div>
      </div>
    </div>
  );
}
