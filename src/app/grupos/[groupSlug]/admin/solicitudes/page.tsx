import { GroupAdminSolicitudesClient } from "./page-client";

export function generateStaticParams() {
  return [{ groupSlug: "_" }];
}

export default function SolicitudesPage() {
  return <GroupAdminSolicitudesClient />;
}
