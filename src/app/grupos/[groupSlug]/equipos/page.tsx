import { getGroupBySlug } from "@/lib/groups";
import { getCurrentMatch, getMatchTeams } from "@/lib/queries";
import { formatArt } from "@/lib/time";
import { Users, CalendarX, Clock } from "lucide-react";
import { notFound } from "next/navigation";
import { EquiposClientView } from "./client-view";

export const dynamic = "force-dynamic";

export default async function GroupEquiposPage({
  params,
}: {
  params: Promise<{ groupSlug: string }>;
}) {
  const { groupSlug } = await params;
  const group = await getGroupBySlug(groupSlug);
  if (!group) return notFound();

  const match = await getCurrentMatch(group.id);
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

  const all = await getMatchTeams(match.id);
  const teamA = all.filter((t) => t.team === "A");
  const teamB = all.filter((t) => t.team === "B");

  if (all.length === 0) {
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

  return (
    <Wrap groupName={group.name}>
      <EquiposClientView 
        dateText={formatArt(match.matchDate, "EEEE dd/MM 'a las' HH:mm")}
        teamA={teamA}
        teamB={teamB}
      />
    </Wrap>
  );
}

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
