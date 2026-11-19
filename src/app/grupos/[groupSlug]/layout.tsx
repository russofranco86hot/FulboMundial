import { GroupLayoutClient } from "./group-layout-client";

export function generateStaticParams() {
  return [{ groupSlug: "_" }];
}

export default function GroupLayout({ children }: { children: React.ReactNode }) {
  return <GroupLayoutClient>{children}</GroupLayoutClient>;
}
