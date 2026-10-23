"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentPlayer } from "@/lib/session";
import { db, players, nameChangeRequests } from "@/db";
import { and, eq } from "drizzle-orm";
import { getPendingNameRequestForPlayer } from "@/lib/name-requests";
import { signOut } from "@/auth";

/**
 * Solicita cambiar el nombre de jugador.
 * Queda en estado 'pending' hasta que un admin de sus grupos lo apruebe.
 */
export async function actionRequestNameChange(formData: FormData) {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login?callbackUrl=/perfil");
  }

  const requestedName = String(formData.get("requestedName") || "").trim();
  if (!requestedName || requestedName.length < 2) {
    redirect(`/perfil?error=${encodeURIComponent("El nombre debe tener al menos 2 caracteres")}`);
  }

  if (requestedName.length > 40) {
    redirect(`/perfil?error=${encodeURIComponent("El nombre no puede tener más de 40 caracteres")}`);
  }

  if (requestedName.toLowerCase() === player.name.toLowerCase().trim()) {
    redirect(`/perfil?error=${encodeURIComponent("El nuevo nombre debe ser diferente al actual")}`);
  }

  const existingPending = await getPendingNameRequestForPlayer(player.id);
  if (existingPending) {
    redirect(`/perfil?error=${encodeURIComponent("Ya tenés una solicitud de cambio de nombre pendiente de aprobación")}`);
  }

  await db.insert(nameChangeRequests).values({
    playerId: player.id,
    currentName: player.name,
    requestedName,
    status: "pending",
  });

  revalidatePath("/perfil");
  revalidatePath("/grupos");
  redirect(`/perfil?success=${encodeURIComponent("¡Solicitud enviada! Un administrador revisará tu nuevo nombre.")}`);
}

/**
 * Cancela una solicitud de cambio de nombre pendiente.
 */
export async function actionCancelNameRequest(formData: FormData) {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login?callbackUrl=/perfil");
  }

  const requestId = Number(formData.get("requestId"));

  await db
    .delete(nameChangeRequests)
    .where(
      and(
        eq(nameChangeRequests.id, requestId),
        eq(nameChangeRequests.playerId, player.id),
        eq(nameChangeRequests.status, "pending")
      )
    );

  revalidatePath("/perfil");
  redirect("/perfil");
}

/**
 * Actualiza las preferencias futbolísticas del jugador (posición y pie hábil).
 */
export async function actionUpdatePreferences(formData: FormData) {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login?callbackUrl=/perfil");
  }

  const preferredPosition = String(formData.get("preferredPosition") || "MED");
  const preferredFoot = String(formData.get("preferredFoot") || "R");

  await db
    .update(players)
    .set({ preferredPosition, preferredFoot })
    .where(eq(players.id, player.id));

  revalidatePath("/perfil");
  revalidatePath("/grupos");
  redirect(`/perfil?success=${encodeURIComponent("Preferencias de juego actualizadas correctamente")}`);
}

/**
 * Desloguear / Cerrar sesión
 */
export async function actionSignOut() {
  await signOut({ redirectTo: "/" });
}
