import { GroupMatchDetailPageClient } from "./page-client";

export function generateStaticParams() {
  return [{ groupSlug: "_", id: "_" }];
}

export default function GroupMatchDetailPage() {
  return <GroupMatchDetailPageClient />;
}
