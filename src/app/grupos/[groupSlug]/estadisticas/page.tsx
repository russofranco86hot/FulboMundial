import { GroupEstadisticasClient } from "./page-client";

export function generateStaticParams() {
  return [{ groupSlug: "_" }];
}

export default function GroupEstadisticasPage() {
  return <GroupEstadisticasClient />;
}
