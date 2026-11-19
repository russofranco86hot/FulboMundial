import { GroupAdminResultadoClient } from "./page-client";

export function generateStaticParams() {
  return [{ groupSlug: "_" }];
}

export default function GroupAdminResultado() {
  return <GroupAdminResultadoClient />;
}
