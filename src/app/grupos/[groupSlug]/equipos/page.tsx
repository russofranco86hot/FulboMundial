import { GroupEquiposClient } from "./page-client";

export function generateStaticParams() {
  return [{ groupSlug: "_" }];
}

export default function GroupEquiposPage() {
  return <GroupEquiposClient />;
}
