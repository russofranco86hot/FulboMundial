import { GroupHomeClient } from "./group-home-client";

export function generateStaticParams() {
  return [{ groupSlug: "_" }];
}

export default function GroupHomePage() {
  return <GroupHomeClient />;
}
