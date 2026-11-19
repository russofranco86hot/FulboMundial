import { LegacyHistorialRedirect } from "./redirect-client";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function LegacyMatchDetailPage() {
  return <LegacyHistorialRedirect />;
}
