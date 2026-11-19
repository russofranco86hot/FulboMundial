import { GroupAdminLayoutClient } from "./admin-layout-client";

export function generateStaticParams() {
  return [{ groupSlug: "_" }];
}

export default function GroupAdminLayout({ children }: { children: React.ReactNode }) {
  return <GroupAdminLayoutClient>{children}</GroupAdminLayoutClient>;
}
