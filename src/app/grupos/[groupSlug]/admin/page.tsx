import { GroupAdminHomeClient } from "./page-client";

export function generateStaticParams() {
  return [{ groupSlug: "_" }];
}

export default function GroupAdminHome() {
  return <GroupAdminHomeClient />;
}
