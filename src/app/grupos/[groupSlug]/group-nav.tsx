"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Trophy, TrendingUp, Settings, ChevronLeft } from "lucide-react";
import type { Group } from "@/db/schema";

interface GroupNavProps {
  group: Group;
  role: "admin" | "member";
}

export default function GroupNav({ group, role }: GroupNavProps) {
  const pathname = usePathname();
  const base = `/grupos/${group.slug}`;

  const tabs = [
    { href: base, label: "Inicio", icon: Home },
    { href: `${base}/equipos`, label: "Equipos", icon: Users },
    { href: `${base}/historial`, label: "Historial", icon: Trophy },
    { href: `${base}/estadisticas`, label: "Stats", icon: TrendingUp },
    ...(role === "admin" ? [{ href: `${base}/admin`, label: "Admin", icon: Settings }] : []),
  ];

  return (
    <div className="space-y-2">
      {/* Header del grupo */}
      <div className="flex items-center gap-2">
        <Link href="/grupos" className="p-1.5 rounded-full hover:bg-pitch-100 dark:hover:bg-zinc-800 transition-colors">
          <ChevronLeft size={18} className="text-pitch-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-pitch-700 dark:text-zinc-100 truncate text-sm">{group.name}</h2>
          <span className="text-xs text-pitch-900/50 dark:text-zinc-500">{group.format}</span>
        </div>
      </div>

      {/* Tabs de navegación */}
      <nav className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.href === base
              ? pathname === base
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "bg-pitch-600 text-white shadow-sm"
                  : "bg-pitch-50 dark:bg-zinc-800 text-pitch-700 dark:text-zinc-300 hover:bg-pitch-100 dark:hover:bg-zinc-700"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
