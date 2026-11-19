import { PublicPartidoClient } from "./client";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function PublicViralMatchPage() {
  return <PublicPartidoClient />;
}
