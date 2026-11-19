"use client";

import { useEffect } from "react";
import { useRouteParams } from "@/lib/client-api";

export function LegacyHistorialRedirect() {
  const { id } = useRouteParams();
  useEffect(() => {
    if (id) {
      window.location.replace(`/grupos/futbol-miercoles/historial/${id}`);
    }
  }, [id]);
  return <div className="pt-12 text-center text-sm text-zinc-500">Redirigiendo...</div>;
}
