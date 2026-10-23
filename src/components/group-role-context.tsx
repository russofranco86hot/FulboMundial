"use client";

import { useEffect, useState } from "react";

// Cache en memoria en el cliente de slug -> role ("admin" | "member" | null)
const groupRolesCache: Record<string, "admin" | "member" | null> = {};
const listeners = new Set<() => void>();

export function setCachedGroupRole(slug: string, role: "admin" | "member" | null) {
  if (groupRolesCache[slug] !== role) {
    groupRolesCache[slug] = role;
    listeners.forEach((fn) => fn());
  }
}

export function useGroupRole(slug: string | null, initialIsAdmin?: boolean): boolean {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (!slug) return false;
    if (groupRolesCache[slug] !== undefined) {
      return groupRolesCache[slug] === "admin";
    }
    return Boolean(initialIsAdmin);
  });

  useEffect(() => {
    if (!slug) {
      setIsAdmin(false);
      return;
    }

    const handleUpdate = () => {
      if (groupRolesCache[slug] !== undefined) {
        setIsAdmin(groupRolesCache[slug] === "admin");
      } else if (initialIsAdmin !== undefined) {
        setIsAdmin(initialIsAdmin);
      }
    };

    handleUpdate();
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, [slug, initialIsAdmin]);

  return isAdmin;
}

/**
 * Componente montado en GroupLayout para sincronizar el rol activo del usuario
 * con BottomNav y el resto de la interfaz en el cliente.
 */
export function GroupRoleSync({
  slug,
  role,
}: {
  slug: string;
  role: "admin" | "member" | null;
}) {
  useEffect(() => {
    setCachedGroupRole(slug, role);
  }, [slug, role]);

  return null;
}
