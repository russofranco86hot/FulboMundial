import { GroupHistorialClient } from "./page-client";

export function generateStaticParams() {
  return [{ groupSlug: "_" }];
}

export default function GroupHistorialPage() {
  return <GroupHistorialClient />;
}
