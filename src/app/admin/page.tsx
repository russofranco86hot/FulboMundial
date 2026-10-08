import { redirect } from "next/navigation";

export default function LegacyAdminPage() {
  redirect("/grupos/futbol-miercoles/admin");
}
