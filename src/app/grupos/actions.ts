"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser, getCurrentPlayer, requireGroupAdmin, getPlayerGroupRole } from "@/lib/session";
import { createGroup } from "@/lib/groups";
import { db, groupMembers, joinRequests, nameChangeRequests, players } from "@/db";
import { and, eq } from "drizzle-orm";

// ─── Crear grupo ──────────────────────────────────────────────────────────
export async function actionCreateGroup(formData: FormData) {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/grupos/nuevo")}`);
  }

  const name = String(formData.get("name") || "").trim();
  if (!name) {
    redirect(`/grupos/nuevo?error=${encodeURIComponent("Ingresá un nombre para el grupo")}`);
  }

  const format = String(formData.get("format") || "F5");
  const defaultCapacity = parseInt(String(formData.get("defaultCapacity") || "10"), 10);
  const defaultDayOfWeek = formData.get("defaultDayOfWeek")
    ? parseInt(String(formData.get("defaultDayOfWeek")), 10)
    : undefined;
  const defaultTime = String(formData.get("defaultTime") || "").trim() || undefined;
  const description = String(formData.get("description") || "").trim() || undefined;

  const group = await createGroup({
    name,
    description,
    format,
    defaultCapacity,
    defaultDayOfWeek,
    defaultTime,
    creatorPlayerId: player.id,
  });

  redirect(`/grupos/${group.slug}`);
}

// ─── Unirse con código ────────────────────────────────────────────────────
export async function actionRequestJoin(formData: FormData) {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/grupos/unirse")}`);
  }

  const code = String(formData.get("code") || "").trim().toUpperCase();
  if (!code) {
    redirect(`/grupos/unirse?error=${encodeURIComponent("Ingresá el código de invitación")}`);
  }

  const { getGroupByInviteCode, hasExistingRequest } = await import("@/lib/groups");
  const group = await getGroupByInviteCode(code);
  if (!group) {
    redirect(`/grupos/unirse?error=${encodeURIComponent("Código inválido. Revisá que esté bien escrito.")}&code=${encodeURIComponent(code)}`);
  }

  // Ya es miembro activo
  const existing = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.playerId, player.id)))
    .limit(1);
  if (existing[0]?.status === "active") {
    redirect(`/grupos/${group.slug}`);
  }

  // Ya tiene solicitud
  const already = await hasExistingRequest(group.id, player.id);
  if (already) {
    redirect(`/grupos/unirse?error=${encodeURIComponent("Ya tenés una solicitud pendiente para este grupo.")}`);
  }

  await db.insert(joinRequests).values({
    groupId: group.id,
    playerId: player.id,
    message: String(formData.get("message") || "").trim() || null,
    status: "pending",
  });

  redirect(`/grupos/unirse/pendiente?grupo=${group.slug}&nombre=${encodeURIComponent(group.name)}`);
}

// ─── Aprobar solicitud ────────────────────────────────────────────────────
export async function actionApproveRequest(formData: FormData) {
  const groupId = Number(formData.get("groupId"));
  await requireGroupAdmin(groupId);

  const requestId = Number(formData.get("requestId"));
  const playerId = Number(formData.get("playerId"));

  // Resolver solicitud
  const resolver = await getCurrentPlayer();
  await db
    .update(joinRequests)
    .set({ status: "approved", resolvedAt: new Date(), resolvedBy: resolver?.id })
    .where(eq(joinRequests.id, requestId));

  // Agregar como miembro activo
  const existing = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.playerId, playerId)))
    .limit(1);

  if (existing[0]) {
    await db
      .update(groupMembers)
      .set({ status: "active" })
      .where(eq(groupMembers.id, existing[0].id));
  } else {
    await db.insert(groupMembers).values({
      groupId,
      playerId,
      role: "member",
      status: "active",
    });
  }

  revalidatePath(`/grupos`);
}

// ─── Rechazar solicitud ───────────────────────────────────────────────────
export async function actionRejectRequest(formData: FormData) {
  const groupId = Number(formData.get("groupId"));
  await requireGroupAdmin(groupId);

  const requestId = Number(formData.get("requestId"));
  const resolver = await getCurrentPlayer();

  await db
    .update(joinRequests)
    .set({ status: "rejected", resolvedAt: new Date(), resolvedBy: resolver?.id })
    .where(eq(joinRequests.id, requestId));

  revalidatePath(`/grupos`);
}

// ─── Aprobar cambio de nombre ─────────────────────────────────────────────
export async function actionApproveNameChange(formData: FormData) {
  const groupId = Number(formData.get("groupId"));
  await requireGroupAdmin(groupId);

  const requestId = Number(formData.get("requestId"));
  const groupSlug = String(formData.get("groupSlug") || "");
  const resolver = await getCurrentPlayer();

  const req = (
    await db
      .select()
      .from(nameChangeRequests)
      .where(eq(nameChangeRequests.id, requestId))
      .limit(1)
  )[0];

  if (req && req.status === "pending") {
    // 1. Actualizar el nombre del jugador en players
    await db
      .update(players)
      .set({ name: req.requestedName })
      .where(eq(players.id, req.playerId));

    // 2. Marcar solicitud como aprobada
    await db
      .update(nameChangeRequests)
      .set({
        status: "approved",
        resolvedAt: new Date(),
        resolvedBy: resolver?.id,
      })
      .where(eq(nameChangeRequests.id, requestId));
  }

  if (groupSlug) {
    revalidatePath(`/grupos/${groupSlug}/admin/solicitudes`);
    revalidatePath(`/grupos/${groupSlug}`);
  }
  revalidatePath(`/grupos`);
  revalidatePath(`/perfil`);
}

// ─── Rechazar cambio de nombre ────────────────────────────────────────────
export async function actionRejectNameChange(formData: FormData) {
  const groupId = Number(formData.get("groupId"));
  await requireGroupAdmin(groupId);

  const requestId = Number(formData.get("requestId"));
  const groupSlug = String(formData.get("groupSlug") || "");
  const resolver = await getCurrentPlayer();

  await db
    .update(nameChangeRequests)
    .set({
      status: "rejected",
      resolvedAt: new Date(),
      resolvedBy: resolver?.id,
    })
    .where(eq(nameChangeRequests.id, requestId));

  if (groupSlug) {
    revalidatePath(`/grupos/${groupSlug}/admin/solicitudes`);
  }
  revalidatePath(`/grupos`);
  revalidatePath(`/perfil`);
}

// ─── Promover miembro a admin ─────────────────────────────────────────────
export async function actionPromoteToAdmin(formData: FormData) {
  const groupId = Number(formData.get("groupId"));
  await requireGroupAdmin(groupId);

  const memberId = Number(formData.get("memberId"));
  await db
    .update(groupMembers)
    .set({ role: "admin" })
    .where(eq(groupMembers.id, memberId));

  revalidatePath(`/grupos`);
}

// ─── Remover miembro ─────────────────────────────────────────────────────
export async function actionRemoveMember(formData: FormData) {
  const groupId = Number(formData.get("groupId"));
  await requireGroupAdmin(groupId);

  const memberId = Number(formData.get("memberId"));
  await db
    .update(groupMembers)
    .set({ status: "banned" })
    .where(eq(groupMembers.id, memberId));

  revalidatePath(`/grupos`);
}

// ─── Notificar transferencia de partido ──────────────────────────────────
export async function actionPlayerNotifyTransfer(formData: FormData) {
  const player = await getCurrentPlayer();
  if (!player) throw new Error("No autenticado");

  const matchId = Number(formData.get("matchId"));
  const groupSlug = String(formData.get("groupSlug") || "");
  if (!matchId) return;

  const { markPlayerTransferDone } = await import("@/lib/payments");
  await markPlayerTransferDone(matchId, player.id);

  if (groupSlug) {
    revalidatePath(`/grupos/${groupSlug}`);
  }
}

// ─── Mover o quitar jugador de equipo ─────────────────────────────────────
export async function actionMoveTeamInGroup(rowId: number, team: "A" | "B", groupSlug?: string) {
  if (!rowId) return;
  const { teams } = await import("@/db/schema");
  await db.update(teams).set({ team }).where(eq(teams.id, rowId));
  if (groupSlug) {
    revalidatePath(`/grupos/${groupSlug}`);
    revalidatePath(`/grupos/${groupSlug}/equipos`);
    revalidatePath(`/grupos/${groupSlug}/admin/partido`);
    revalidatePath(`/grupos/${groupSlug}/admin/resultado`);
  } else {
    revalidatePath("/admin");
    revalidatePath("/equipos");
  }
}

export async function actionRemoveTeamRowInGroup(rowId: number, groupSlug?: string) {
  if (!rowId) return;
  const { teams } = await import("@/db/schema");
  await db.delete(teams).where(eq(teams.id, rowId));
  if (groupSlug) {
    revalidatePath(`/grupos/${groupSlug}`);
    revalidatePath(`/grupos/${groupSlug}/equipos`);
    revalidatePath(`/grupos/${groupSlug}/admin/partido`);
    revalidatePath(`/grupos/${groupSlug}/admin/resultado`);
  } else {
    revalidatePath("/admin");
    revalidatePath("/equipos");
  }
}
