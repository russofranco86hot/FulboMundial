"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SuperAdminClient } from "./superadmin-client";
import { useApiData } from "@/lib/client-api";
import type { SuperAdminDashboardData } from "@/lib/superadmin";

function SuperAdminContent() {
  const searchParams = useSearchParams();
  const updated = searchParams.get("updated") ?? undefined;
  const mode = searchParams.get("mode") ?? undefined;
  const deleted = searchParams.get("deleted") ?? undefined;
  const deletedName = searchParams.get("deletedName") ?? undefined;

  const { data, loading } = useApiData<{
    allowed: boolean;
    data?: SuperAdminDashboardData;
  }>("/api/page-data/superadmin");

  useEffect(() => {
    if (data && !data.allowed) {
      window.location.replace("/grupos");
    }
  }, [data]);

  if ((loading && !data) || !data?.allowed || !data.data) {
    return <div className="pt-12 text-center text-sm text-zinc-500">Cargando Panel de Dueño...</div>;
  }

  return (
    <SuperAdminClient
      data={data.data}
      updated={updated}
      mode={mode}
      deleted={deleted}
      deletedName={deletedName}
    />
  );
}

export default function SuperAdminPage() {
  return (
    <Suspense fallback={<div className="pt-12 text-center text-sm text-zinc-500">Cargando...</div>}>
      <SuperAdminContent />
    </Suspense>
  );
}
