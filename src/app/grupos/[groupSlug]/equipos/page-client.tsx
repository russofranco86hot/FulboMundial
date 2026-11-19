"use client";

import { Users, CalendarX, Clock } from "lucide-react";
import { formatArt } from "@/lib/time";
import { EquiposClientView } from "./client-view";
import { useApiData, useRouteParams } from "@/lib/client-api";

type EquiposData = {
  blocked?: boolean;
  group: { name: string; teamAName: string | null; teamBName: string | null };
  match: { matchDate: string | Date; teamAName?: string | null; teamBName?: string | null } | null;
  allTeams: {
    id: number;
    playerId: number | null;
    name: string;
    team: string;
    stars: number;
    isGoalkeeper: boolean;
    isGuest: boolean;
    preferredPosition?: string | null;
    preferredFoot?: string | null;
  }[];
};

function Wrap({ children, groupName }: { children: React.ReactNode; groupName: string }) {
  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-extrabold text-pitch-700 dark:text-pitch-400 flex items-center gap-2">
        <Users className="text-pitch-600 dark:text-pitch-500" />
        Equipos — {groupName}
      </h1>
      {children}
    </div>
  );
}

export function GroupEquiposClient() {
  const { groupSlug } = useRouteParams();
  const { data, loading } = useApiData<EquiposData>(
    groupSlug ? `/api/page-data/group/${encodeURIComponent(groupSlug)}/equipos` : null
  );

  if (!groupSlug || (loading && !data)) {
    return <div className="pt-8 text-center text-sm text-zinc-500">Cargando equipos...</div>;
  }
  if (!data || data.blocked || !data.group) return null;

  const { group, match, allTeams } = data;

  if (!match) {
    return (
      <Wrap groupName={group.name}>
        <div className="card flex flex-col items-center justify-center p-8 gap-4 text-center text-pitch-900/60 dark:text-zinc-400">
          <CalendarX size={48} className="text-pitch-400 opacity-50" />
          <p className="text-lg font-medium">No hay partido cargado.</p>
          <p className="text-sm">Vuelve más tarde cuando el admin abra el próximo partido.</p>
        </div>
      </Wrap>
    );
  }

  const teamA = allTeams.filter((t) => t.team === "A");
  const teamB = allTeams.filter((t) => t.team === "B");

  if (allTeams.length === 0) {
    return (
      <Wrap groupName={group.name}>
        <p className="text-center text-sm capitalize text-pitch-900/60 dark:text-zinc-400">
          {formatArt(match.matchDate, "EEEE dd/MM")}
        </p>
        <div className="card flex flex-col items-center justify-center p-8 gap-4 text-center text-pitch-900/60 dark:text-zinc-400">
          <Clock size={48} className="text-pitch-400 opacity-50" />
          <p className="text-lg font-medium">Los equipos todavía no están armados.</p>
          <p className="text-sm">El admin los va a armar y publicar cuando cierre la lista.</p>
        </div>
      </Wrap>
    );
  }

  const teamAName = match.teamAName || group.teamAName || "Equipo Claro";
  const teamBName = match.teamBName || group.teamBName || "Equipo Oscuro";

  return (
    <Wrap groupName={group.name}>
      <EquiposClientView
        dateText={formatArt(match.matchDate, "EEEE dd/MM 'a las' HH:mm")}
        teamA={teamA}
        teamB={teamB}
        teamAName={teamAName}
        teamBName={teamBName}
      />
    </Wrap>
  );
}
