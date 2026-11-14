import { notFound, redirect } from "next/navigation";
import { getGroupBySlug } from "@/lib/groups";
import { getCurrentPlayer, getPlayerGroupRole } from "@/lib/session";
import { getSessionUser } from "@/lib/session";
import { isSuperAdmin } from "@/lib/superadmin";
import GroupNav from "./group-nav";
import { GroupRoleSync } from "@/components/group-role-context";
import Link from "next/link";
import { Eye } from "lucide-react";

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

  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/grupos/${groupSlug}`)}`);

  const group = await getGroupBySlug(groupSlug);
  if (!group) return notFound();

  const [player, superAdmin] = await Promise.all([
    getCurrentPlayer(),
    isSuperAdmin(),
  ]);
  const role = player ? await getPlayerGroupRole(group.id) : null;
  const isReadOnlySuperAdmin = !role && superAdmin;

  // Solo miembros activos pueden ver el grupo (excepto superAdmin en modo lectura)
  if (!role && !superAdmin) {
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
      {isReadOnlySuperAdmin && (
        <div className="rounded-2xl bg-amber-500/15 border border-amber-500/40 p-3 text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-xs animate-slide-down">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Modo Lectura (SuperAdmin):</strong> No sos miembro de este grupo pero estás accediendo en modo auditoría/lectura de dueño.
            </span>
          </div>
          <Link
            href="/superadmin"
            className="btn-ghost text-[11px] py-1 px-2.5 rounded-lg border border-amber-500/40 text-amber-900 dark:text-amber-200 shrink-0 font-extrabold hover:bg-amber-500/20"
          >
            Panel Dueño
          </Link>
        </div>
      )}
      <GroupRoleSync slug={group.slug} role={role} />
      <GroupNav group={group} role={role ?? "member"} isSuperAdmin={superAdmin} />
      {children}
    </div>
  );
}
