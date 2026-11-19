"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Shield } from "lucide-react";
import { useApiData, useRouteParams } from "@/lib/client-api";

type AdminLayoutData = {
  allowed: boolean;
  group?: { id: number; name: string; slug: string };
  pendingCount?: number;
};

export function GroupAdminLayoutClient({ children }: { children: React.ReactNode }) {
  const { groupSlug } = useRouteParams();
  const { data, loading } = useApiData<AdminLayoutData>(
    groupSlug ? `/api/page-data/group/${encodeURIComponent(groupSlug)}/admin/layout` : null
  );

  useEffect(() => {
    if (data && !data.allowed && groupSlug) {
      window.location.replace(`/grupos/${groupSlug}`);
    }
  }, [data, groupSlug]);

  if (!groupSlug || (loading && !data) || !data?.allowed || !data.group) {
    return <div className="pt-8 text-center text-sm text-zinc-500">Verificando permisos de admin...</div>;
  }

  const { group, pendingCount = 0 } = data;

  const tabs = [
    { href: `/grupos/${groupSlug}/admin`, label: "Inicio" },
    { href: `/grupos/${groupSlug}/admin/partido`, label: "Partido" },
    { href: `/grupos/${groupSlug}/admin/jugadores`, label: "Miembros" },
    { href: `/grupos/${groupSlug}/admin/comentarios`, label: "🎙️ Comentarios" },
    {
      href: `/grupos/${groupSlug}/admin/solicitudes`,
      label: `Solicitudes${pendingCount > 0 ? ` (${pendingCount})` : ""}`,
      highlight: pendingCount > 0,
    },
    { href: `/grupos/${groupSlug}/admin/resultado`, label: "Resultado" },
    { href: `/grupos/${groupSlug}/admin/push`, label: "Push" },
    { href: `/grupos/${groupSlug}/admin/configuracion`, label: "⚙️ Config" },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-pitch-100/50 dark:border-zinc-800 pb-2">
        <h1 className="text-xl font-extrabold text-pitch-700 dark:text-zinc-100 flex items-center gap-2">
          <Shield size={20} className="text-pitch-600" />
          Admin — {group.name}
        </h1>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1 text-sm scrollbar-hide">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`chip rounded-full whitespace-nowrap border text-xs font-semibold transition-colors ${
              t.highlight
                ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300"
                : "border-pitch-100 bg-white text-pitch-700 hover:bg-pitch-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
