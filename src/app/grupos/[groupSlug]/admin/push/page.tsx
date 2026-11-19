import { GroupAdminPushClient } from "./page-client";

export function generateStaticParams() {
  return [{ groupSlug: "_" }];
}

export default function GroupAdminPush() {
  return <GroupAdminPushClient />;
}
