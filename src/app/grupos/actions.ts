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
  let redirectUrl = "";
  let code = "";

  try {
    const player = await getCurrentPlayer();
    if (!player) {
      redirectUrl = `/login?callbackUrl=${encodeURIComponent("/grupos/unirse")}`;
    } else {
      code = String(formData.get("code") || "").trim().toUpperCase();
      if (!code) {
        redirectUrl = `/grupos/unirse?error=${encodeURIComponent("Ingresá el código de invitación")}`;
      } else {
        const { getGroupByInviteCode } = await import("@/lib/groups");
        const group = await getGroupByInviteCode(code);
        if (!group) {
          redirectUrl = `/grupos/unirse?error=${encodeURIComponent("Código inválido. Revisá que esté bien escrito.")}&code=${encodeURIComponent(code)}`;
        } else {
          // 1. Ya es miembro activo del grupo
          const existingMember = await db
            .select({ id: groupMembers.id, status: groupMembers.status })
            .from(groupMembers)
            .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.playerId, player.id)))
            .limit(1);

          if (existingMember[0]?.status === "active") {
            redirectUrl = `/grupos/${group.slug}`;
          } else {
            // 2. Verificar si ya tiene una solicitud previa en joinRequests
            const existingReq = (
              await db
                .select({ id: joinRequests.id, status: joinRequests.status })
                .from(joinRequests)
                .where(and(eq(joinRequests.groupId, group.id), eq(joinRequests.playerId, player.id)))
                .limit(1)
            )[0];

            const message = String(formData.get("message") || "").trim() || null;

            if (existingReq) {
              if (existingReq.status === "pending") {
                redirectUrl = `/grupos/unirse/pendiente?grupo=${group.slug}&nombre=${encodeURIComponent(group.name)}`;
              } else {
                await db
                  .update(joinRequests)
                  .set({
                    status: "pending",
                    message,
                    requestedAt: new Date(),
                    resolvedAt: null,
                    resolvedBy: null,
                  })
                  .where(eq(joinRequests.id, existingReq.id));
                redirectUrl = `/grupos/unirse/pendiente?grupo=${group.slug}&nombre=${encodeURIComponent(group.name)}`;
              }
            } else {
              await db.insert(joinRequests).values({
                groupId: group.id,
                playerId: player.id,
                message,
                status: "pending",
              });
              redirectUrl = `/grupos/unirse/pendiente?grupo=${group.slug}&nombre=${encodeURIComponent(group.name)}`;
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.error("Error en actionRequestJoin:", err);
    redirectUrl = `/grupos/unirse?error=${encodeURIComponent("No se pudo enviar la solicitud. Verificá el código o intentá nuevamente.")}${code ? `&code=${encodeURIComponent(code)}` : ""}`;
  }

  if (redirectUrl) {
    redirect(redirectUrl);
  }
}

// ─── Aprobar solicitud (como nuevo miembro o vinculado a existente) ──────
export async function actionApproveRequest(formData: FormData) {
  const groupId = Number(formData.get("groupId"));
  const groupSlug = String(formData.get("groupSlug") || "");
  await requireGroupAdmin(groupId);

  const requestId = Number(formData.get("requestId"));
  const requestingPlayerId = Number(formData.get("playerId"));
  const linkToPlayerId = formData.get("linkToPlayerId")
    ? Number(formData.get("linkToPlayerId"))
    : null;

  const resolver = await getCurrentPlayer();

  if (linkToPlayerId && linkToPlayerId !== requestingPlayerId) {
    // ─── VINCULAR A JUGADOR EXISTENTE CON HISTORIAL ───
    const requestingPlayer = (
      await db.select().from(players).where(eq(players.id, requestingPlayerId)).limit(1)
    )[0];

    const targetPlayer = (
      await db.select().from(players).where(eq(players.id, linkToPlayerId)).limit(1)
    )[0];

    if (requestingPlayer && targetPlayer) {
      // 1. Desvincular googleId y email de requestingPlayer para evitar conflicto de clave única
      await db
        .update(players)
        .set({ googleId: null, email: null })
        .where(eq(players.id, requestingPlayerId));

      // 2. Transferir googleId, email y teléfono a targetPlayer
      await db
        .update(players)
        .set({
          googleId: requestingPlayer.googleId ?? targetPlayer.googleId,
          email: requestingPlayer.email ?? targetPlayer.email,
          phone: targetPlayer.phone ?? requestingPlayer.phone,
        })
        .where(eq(players.id, linkToPlayerId));

      // 3. Transferir credenciales y suscripciones push si existieran
      const { playerCredentials, pushSubscriptions, nameChangeRequests } = await import("@/db/schema");
      try {
        await db
          .update(playerCredentials)
          .set({ playerId: linkToPlayerId })
          .where(eq(playerCredentials.playerId, requestingPlayerId));
      } catch {}

      try {
        await db
          .update(pushSubscriptions)
          .set({ playerId: linkToPlayerId })
          .where(eq(pushSubscriptions.playerId, requestingPlayerId));
      } catch {}

      try {
        await db
          .update(nameChangeRequests)
          .set({ playerId: linkToPlayerId })
          .where(eq(nameChangeRequests.playerId, requestingPlayerId));
      } catch {}

      // 4. Asegurar que targetPlayer sea miembro activo del grupo
      const existingMember = (
        await db
          .select()
          .from(groupMembers)
          .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.playerId, linkToPlayerId)))
          .limit(1)
      )[0];

      if (existingMember) {
        await db
          .update(groupMembers)
          .set({ status: "active" })
          .where(eq(groupMembers.id, existingMember.id));
      } else {
        await db.insert(groupMembers).values({
          groupId,
          playerId: linkToPlayerId,
          role: "member",
          status: "active",
        });
      }

      // 5. Marcar solicitud resuelta
      await db
        .update(joinRequests)
        .set({
          status: "approved",
          playerId: linkToPlayerId,
          resolvedAt: new Date(),
          resolvedBy: resolver?.id,
        })
        .where(eq(joinRequests.id, requestId));

      // 6. Limpiar el registro duplicado requestingPlayer
      try {
        await db.delete(groupMembers).where(eq(groupMembers.playerId, requestingPlayerId));
        await db.delete(joinRequests).where(eq(joinRequests.playerId, requestingPlayerId));
        await db.delete(players).where(eq(players.id, requestingPlayerId));
      } catch (e) {
        console.warn("Could not delete temporary requesting player:", e);
      }
    }
  } else {
    // ─── APROBAR COMO NUEVO MIEMBRO (NORMAL) ───
    await db
      .update(joinRequests)
      .set({ status: "approved", resolvedAt: new Date(), resolvedBy: resolver?.id })
      .where(eq(joinRequests.id, requestId));

    const existing = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.playerId, requestingPlayerId)))
      .limit(1);

    if (existing[0]) {
      await db
        .update(groupMembers)
        .set({ status: "active" })
        .where(eq(groupMembers.id, existing[0].id));
    } else {
      await db.insert(groupMembers).values({
        groupId,
        playerId: requestingPlayerId,
        role: "member",
        status: "active",
      });
    }
  }

  if (groupSlug) {
    revalidatePath(`/grupos/${groupSlug}/admin/solicitudes`);
    revalidatePath(`/grupos/${groupSlug}/admin/jugadores`);
    revalidatePath(`/grupos/${groupSlug}`);
  }
  revalidatePath(`/grupos`);
  revalidatePath(`/perfil`);
}

// ─── Rechazar solicitud ───────────────────────────────────────────────────
export async function actionRejectRequest(formData: FormData) {
  const groupId = Number(formData.get("groupId"));
  const groupSlug = String(formData.get("groupSlug") || "");
  await requireGroupAdmin(groupId);

  const requestId = Number(formData.get("requestId"));
  const resolver = await getCurrentPlayer();

  await db
    .update(joinRequests)
    .set({ status: "rejected", resolvedAt: new Date(), resolvedBy: resolver?.id })
    .where(eq(joinRequests.id, requestId));

  if (groupSlug) {
    revalidatePath(`/grupos/${groupSlug}/admin/solicitudes`);
  }
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
  const groupSlug = String(formData.get("groupSlug") || "");
  await requireGroupAdmin(groupId);

  const memberId = Number(formData.get("memberId"));
  await db
    .update(groupMembers)
    .set({ role: "admin" })
    .where(eq(groupMembers.id, memberId));

  if (groupSlug) {
    revalidatePath(`/grupos/${groupSlug}`);
    revalidatePath(`/grupos/${groupSlug}/admin/jugadores`);
  }
  revalidatePath(`/grupos`);
}

// ─── Quitar rol de admin a un miembro ─────────────────────────────────────
export async function actionDemoteAdmin(formData: FormData) {
  const groupId = Number(formData.get("groupId"));
  const groupSlug = String(formData.get("groupSlug") || "");
  await requireGroupAdmin(groupId);

  const memberId = Number(formData.get("memberId"));
  await db
    .update(groupMembers)
    .set({ role: "member" })
    .where(eq(groupMembers.id, memberId));

  if (groupSlug) {
    revalidatePath(`/grupos/${groupSlug}`);
    revalidatePath(`/grupos/${groupSlug}/admin/jugadores`);
  }
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
