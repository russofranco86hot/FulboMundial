import { notFound, redirect } from "next/navigation";
import { getGroupBySlug } from "@/lib/groups";
import { getCurrentPlayer, getPlayerGroupRole } from "@/lib/session";
import { getSessionUser } from "@/lib/session";
import GroupNav from "./group-nav";

export const dynamic = "force-dynamic";

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ groupSlug: string }>;
}) {
  const { groupSlug } = await params;
  const user = await getSessionUser();

  if (!user) redirect("/");

  const group = await getGroupBySlug(groupSlug);
  if (!group) return notFound();

  const player = await getCurrentPlayer();
  const role = player ? await getPlayerGroupRole(group.id) : null;

  // Solo miembros activos pueden ver el grupo
  if (!role) {
    // Verificar si tiene solicitud pendiente
    if (player) {
      const { hasExistingRequest } = await import("@/lib/groups");
      const hasPending = await hasExistingRequest(group.id, player.id);
      if (hasPending) {
        return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-center animate-fade-in">
            <div className="text-5xl">⏳</div>
            <h1 className="text-xl font-bold text-pitch-700 dark:text-zinc-100">Solicitud pendiente</h1>
            <p className="text-pitch-900/60 dark:text-zinc-400 max-w-xs text-sm">
              Tu solicitud para unirte a <strong>{group.name}</strong> todavía está siendo revisada por el admin.
            </p>
          </div>
        );
      }
    }

    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-center animate-fade-in">
        <div className="text-5xl">🔒</div>
        <h1 className="text-xl font-bold text-pitch-700 dark:text-zinc-100">Acceso restringido</h1>
        <p className="text-pitch-900/60 dark:text-zinc-400 max-w-xs text-sm">
          Necesitás ser miembro de <strong>{group.name}</strong> para ver esta página. Pedile al admin el código de invitación.
        </p>
        <a href="/grupos/unirse" className="btn-primary">
          Tengo un código
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <GroupNav group={group} role={role} />
      {children}
    </div>
  );
}
