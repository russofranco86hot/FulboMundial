import { GroupAdminJugadoresClient } from "./page-client";

export function generateStaticParams() {
  return [{ groupSlug: "_" }];
}

export default function GroupAdminJugadores() {
  return <GroupAdminJugadoresClient />;
}
