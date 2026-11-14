import { redirect } from "next/navigation";
import { isSuperAdmin, getSuperAdminDashboardData } from "@/lib/superadmin";
import { SuperAdminClient } from "./superadmin-client";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    updated?: string;
    mode?: string;
    deleted?: string;
    deletedName?: string;
  }>;
}) {
  const allowed = await isSuperAdmin();
  if (!allowed) {
    redirect("/grupos");
  }

  const { updated, mode, deleted, deletedName } = await searchParams;
  const data = await getSuperAdminDashboardData();

  return (
    <SuperAdminClient
      data={data}
      updated={updated}
      mode={mode}
      deleted={deleted}
      deletedName={deletedName}
    />
  );
}
