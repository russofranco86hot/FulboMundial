"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, groups, subscriptionTransactions } from "@/db";
import { eq } from "drizzle-orm";
import { requireSuperAdmin, deleteGroupCascade } from "@/lib/superadmin";
import { getCurrentPlayer } from "@/lib/session";

export async function actionSuperAdminTogglePro(formData: FormData) {
  await requireSuperAdmin();

  const groupId = Number(formData.get("groupId"));
  const groupSlug = String(formData.get("groupSlug") || "");
  const mode = String(formData.get("mode") || "lifetime"); // 'monthly' | 'annual' | 'lifetime' | 'disable'

  if (!groupId) return;

  const owner = await getCurrentPlayer();

  if (mode === "disable") {
    await db
      .update(groups)
      .set({
        isPro: false,
        proPlan: null,
        proExpiresAt: null,
      })
      .where(eq(groups.id, groupId));
  } else {
    let planId = "pro_lifetime";
    let expiresAt: Date | null = null;

    if (mode === "monthly") {
      planId = "pro_monthly";
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else if (mode === "annual") {
      planId = "pro_annual";
      expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    }

    await db
      .update(groups)
      .set({
        isPro: true,
        proPlan: planId,
        proExpiresAt: expiresAt,
      })
      .where(eq(groups.id, groupId));

    try {
      await db.insert(subscriptionTransactions).values({
        provider: "manual",
        externalEventId: `manual_${groupId}_${planId}_${Date.now()}`,
        paymentId: "manual_owner_override",
        groupId,
        playerId: owner?.id ?? null,
        planId,
        amount: 0,
        currency: "ARS",
        status: "approved",
        rawPayload: { grantedBy: owner?.email || "superadmin", mode },
      });
    } catch (e) {
      console.warn("Could not log manual PRO transaction:", e);
    }
  }

  revalidatePath("/superadmin");
  revalidatePath("/grupos");
  if (groupSlug) {
    revalidatePath(`/grupos/${groupSlug}`);
    revalidatePath(`/grupos/${groupSlug}/estadisticas`);
    revalidatePath(`/grupos/${groupSlug}/historial`);
    revalidatePath(`/grupos/${groupSlug}/pro`);
    revalidatePath(`/grupos/${groupSlug}/admin/configuracion`);
  }

  redirect(`/superadmin?updated=${groupId}&mode=${mode}`);
}

export async function actionSuperAdminDeleteGroup(formData: FormData) {
  await requireSuperAdmin();

  const groupId = Number(formData.get("groupId"));
  const groupSlug = String(formData.get("groupSlug") || "");
  const confirmName = String(formData.get("confirmName") || "").trim();
  const actualName = String(formData.get("actualName") || "").trim();

  if (!groupId) {
    throw new Error("ID de grupo no especificado.");
  }

  if (confirmName && actualName && confirmName.toLowerCase() !== actualName.toLowerCase()) {
    throw new Error("El nombre de confirmación no coincide.");
  }

  const deleted = await deleteGroupCascade(groupId);

  revalidatePath("/superadmin");
  revalidatePath("/grupos");
  if (groupSlug) {
    revalidatePath(`/grupos/${groupSlug}`);
  }

  redirect(`/superadmin?deleted=1&deletedName=${encodeURIComponent(deleted.name)}`);
}
