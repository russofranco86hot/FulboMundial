import { redirect } from "next/navigation";

export default async function LegacyHistorialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/grupos/futbol-miercoles/historial/${id}`);
}
