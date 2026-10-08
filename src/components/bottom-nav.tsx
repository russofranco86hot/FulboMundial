"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Users, Trophy, TrendingUp, Settings, PlusCircle, LogIn, Layers } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  // Detectar si estamos dentro de un grupo específico: /grupos/[groupSlug]...
  const groupMatch = pathname.match(/^\/grupos\/([^/]+)/);
  const potentialSlug = groupMatch ? groupMatch[1] : null;
  const isInsideGroup =
    potentialSlug !== null &&
    potentialSlug !== "nuevo" &&
    potentialSlug !== "unirse";

  const groupSlug = isInsideGroup ? potentialSlug : null;

  const items = isInsideGroup && groupSlug
    ? [
        { href: `/grupos/${groupSlug}`, exact: true, label: "Partido", icon: Home },
        { href: `/grupos/${groupSlug}/equipos`, label: "Equipos", icon: Users },
        { href: `/grupos/${groupSlug}/historial`, label: "Historial", icon: Trophy },
        { href: `/grupos/${groupSlug}/estadisticas`, label: "Stats", icon: TrendingUp },
        { href: `/grupos/${groupSlug}/admin`, label: "Admin", icon: Settings },
      ]
    : [
        { href: "/grupos", exact: true, label: "Mis Grupos", icon: Layers },
        { href: "/grupos/nuevo", label: "Crear", icon: PlusCircle },
        { href: "/grupos/unirse", label: "Unirse", icon: LogIn },
      ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-pitch-100 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((it) => {
          const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
          const Icon = it.icon;

          return (
            <Link
              key={it.href}
              href={it.href}
              className={`relative flex flex-1 flex-col items-center gap-1 py-3 text-[10px] sm:text-xs transition-colors ${
                active ? "text-pitch-600 dark:text-pitch-400 font-bold" : "text-slate-400 dark:text-zinc-500 font-medium"
              }`}
            >
              <Icon size={20} className={`transition-all ${active ? "scale-110" : ""}`} />
              <span>{it.label}</span>
              {active && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute bottom-1 w-1 h-1 rounded-full bg-pitch-600 dark:bg-pitch-400"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
