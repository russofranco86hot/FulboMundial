import { GroupAdminConfigClient } from "./page-client";

export function generateStaticParams() {
  return [{ groupSlug: "_" }];
}

export default function GroupAdminConfigPage() {
  return <GroupAdminConfigClient />;
}
