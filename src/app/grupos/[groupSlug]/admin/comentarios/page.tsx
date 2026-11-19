import { GroupAdminComentariosClient } from "./page-client";

export function generateStaticParams() {
  return [{ groupSlug: "_" }];
}

export default function GroupAdminComentariosPage() {
  return <GroupAdminComentariosClient />;
}
