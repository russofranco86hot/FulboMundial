import { GroupAdminPartidoClient } from "./page-client";

export function generateStaticParams() {
  return [{ groupSlug: "_" }];
}

export default function GroupAdminPartido() {
  return <GroupAdminPartidoClient />;
}
