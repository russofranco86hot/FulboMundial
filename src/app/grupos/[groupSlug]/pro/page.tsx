import { GroupProClient } from "./page-client";

export function generateStaticParams() {
  return [{ groupSlug: "_" }];
}

export default function GroupProPage() {
  return <GroupProClient />;
}
