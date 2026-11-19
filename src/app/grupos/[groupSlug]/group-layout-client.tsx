"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import GroupNav from "./group-nav";
import { GroupRoleSync } from "@/components/group-role-context";
import { useApiData, useRouteParams } from "@/lib/client-api";

type LayoutData =
  | { authRequired: true }
  | { notFound: true }
  | { access: "pending" | "denied"; group: { id: number; name: string; slug: string } }
  | {
      access: "granted";
      group: { id: number; name: string; slug: string; format: string };
      role: "admin" | "member" | null;
      isSuperAdmin: boolean;
      isReadOnlySuperAdmin: boolean;
    };

export function GroupLayoutClient({ children }: { children: React.ReactNode }) {
  const { groupSlug } = useRouteParams();
  const { data, loading } = useApiData<LayoutData>(
    groupSlug ? `/api/page-data/group/${encodeURIComponent(groupSlug)}/layout` : null
  );

  useEffect(() => {
    if (data && "authRequired" in data && data.authRequired && groupSlug) {
      window.location.replace(`/login?callbackUrl=${encodeURIComponent(`/grupos/${groupSlug}`)}`);
    }
  }, [data, groupSlug]);

  if (!groupSlug || (loading && !data) || (data && "authRequired" in data)) {
    return <div className="pt-12 text-center text-sm text-zinc-500">Cargando grupo...</div>;
  }

  if (!data || ("notFound" in data && data.notFound)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-center animate-fade-in">
        <div className="text-5xl">⚽</div>
        <h1 className="text-xl font-bold text-pitch-700 dark:text-zinc-100">Grupo no encontrado</h1>
        <Link href="/grupos" className="btn-primary text-sm">Volver a Mis Grupos</Link>
      </div>
    );
  }

  if ("access" in data && data.access === "pending") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-center animate-fade-in">
        <div className="text-5xl">⏳</div>
        <h1 className="text-xl font-bold text-pitch-700 dark:text-zinc-100">Solicitud pendiente</h1>
        <p className="text-pitch-900/60 dark:text-zinc-400 max-w-xs text-sm">
          Tu solicitud para unirte a <strong>{data.group.name}</strong> todavía está siendo revisada por el admin.
        </p>
      </div>
    );
  }

  if ("access" in data && data.access === "denied") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-center animate-fade-in">
        <div className="text-5xl">🔒</div>
        <h1 className="text-xl font-bold text-pitch-700 dark:text-zinc-100">Acceso restringido</h1>
        <p className="text-pitch-900/60 dark:text-zinc-400 max-w-xs text-sm">
          Necesitás ser miembro de <strong>{data.group.name}</strong> para ver esta página. Pedile al admin el código de invitación.
        </p>
        <Link href="/grupos/unirse" className="btn-primary">
          Tengo un código
        </Link>
      </div>
    );
  }

  if (!("access" in data) || data.access !== "granted") return null;

  return (
    <div className="space-y-4">
      {data.isReadOnlySuperAdmin && (
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
      <GroupRoleSync slug={data.group.slug} role={data.role} />
      <GroupNav group={data.group} role={data.role ?? "member"} isSuperAdmin={data.isSuperAdmin} />
      {children}
    </div>
  );
}
