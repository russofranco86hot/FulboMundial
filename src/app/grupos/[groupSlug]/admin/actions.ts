"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db, players, matches, signups, teams, results, attendanceLog } from "@/db";
import { requireGroupAdmin } from "@/lib/session";
import { getCurrentMatch, getStandings } from "@/lib/queries";
import { openNextMatch, closeSignups, recomputeFinalStatuses } from "@/lib/match-actions";
import { buildBalancedTeams, type TeamPlayer } from "@/lib/teams";
import { pushToAll } from "@/lib/push";
import { computeSelection } from "@/lib/selection";
import { getAdvancedStats } from "@/lib/stats";
import { notifyMatchCompletionAndAchievements } from "@/lib/achievements";
import { artWallTimeToUtc } from "@/lib/time";

function refreshGroup(groupSlug: string) {
  revalidatePath(`/grupos/${groupSlug}`);
  revalidatePath(`/grupos/${groupSlug}/equipos`);
  revalidatePath(`/grupos/${groupSlug}/historial`);
  revalidatePath(`/grupos/${groupSlug}/estadisticas`);
  revalidatePath(`/grupos/${groupSlug}/admin`);
  revalidatePath(`/grupos/${groupSlug}/admin/partido`);
  revalidatePath(`/grupos/${groupSlug}/admin/jugadores`);
  revalidatePath(`/grupos/${groupSlug}/admin/resultado`);
  revalidatePath(`/grupos/${groupSlug}/admin/push`);
  revalidatePath(`/grupos`);
}

// ─── Partido ─────────────────────────────────────────────────────────────
export async function adminOpenGroupMatch(formData: FormData) {
  const groupId = Number(formData.get("groupId"));
  const groupSlug = String(formData.get("groupSlug"));
  await requireGroupAdmin(groupId);

  const dateRaw = String(formData.get("matchDate") || "").trim();
  let matchDate: Date;
  if (dateRaw) {
    matchDate = new Date(dateRaw);
  } else {
    const { groups } = await import("@/db/schema");
    const { nextGroupMatchDate } = await import("@/lib/time");
    const grp = (await db.select().from(groups).where(eq(groups.id, groupId)).limit(1))[0];
    matchDate = nextGroupMatchDate(grp?.defaultDayOfWeek ?? 3, grp?.defaultTime ?? "21:00");
  }

  const capacity = Number(formData.get("capacity")) || 10;
  const format = String(formData.get("format") || "F5");

  await openNextMatch({
    groupId,
    matchDate,
    capacity,
    format,
    notify: true,
  });

  refreshGroup(groupSlug);
}

export async function adminCloseGroupMatch(formData: FormData) {
  const groupId = Number(formData.get("groupId"));
  const groupSlug = String(formData.get("groupSlug"));
  await requireGroupAdmin(groupId);

  const match = await getCurrentMatch(groupId);
  if (match && match.status === "open") {
    await closeSignups(match, { notify: true });
  }
  refreshGroup(groupSlug);
}

export async function adminReopenGroupMatch(formData: FormData) {
  const groupId = Number(formData.get("groupId"));
  const groupSlug = String(formData.get("groupSlug"));
  await requireGroupAdmin(groupId);

  const match = await getCurrentMatch(groupId);
  if (match) {
    await db.update(matches).set({ status: "open" }).where(eq(matches.id, match.id));
  }
  refreshGroup(groupSlug);
}

export async function adminGroupToggleSignup(formData: FormData) {
  const groupId = Number(formData.get("groupId"));
  const groupSlug = String(formData.get("groupSlug"));
  await requireGroupAdmin(groupId);

  const playerId = Number(formData.get("playerId"));
  const action = String(formData.get("action")); // "add" | "remove"
  const match = await getCurrentMatch(groupId);
  if (!match || !playerId) return;

  const existing = (
    await db
      .select()
      .from(signups)
      .where(and(eq(signups.matchId, match.id), eq(signups.playerId, playerId)))
      .limit(1)
  )[0];

  if (action === "add") {
    if (existing) {
      await db
        .update(signups)
        .set({ withdrawn: false, withdrawnAt: null })
        .where(eq(signups.id, existing.id));
    } else {
      await db.insert(signups).values({ matchId: match.id, playerId });
    }
  } else {
    if (existing) {
      await db
        .update(signups)
        .set({ withdrawn: true, withdrawnAt: new Date() })
        .where(eq(signups.id, existing.id));
    }
  }

  if (match.status !== "open") {
    await recomputeFinalStatuses(match);
  }
  refreshGroup(groupSlug);
}

// ─── Equipos ─────────────────────────────────────────────────────────────
export async function adminGroupGenerateTeams(formData: FormData) {
  const groupId = Number(formData.get("groupId"));
  const groupSlug = String(formData.get("groupSlug"));
  await requireGroupAdmin(groupId);

  const match = await getCurrentMatch(groupId);
  if (!match) return;
  const seed = Number(formData.get("seed")) || Math.floor((Date.now() % 100000) + 1);

  const active = await db
    .select({
      playerId: signups.playerId,
      priorityOrder: players.priorityOrder,
      signupAt: signups.signupAt,
      name: players.name,
      stars: players.stars,
      isGoalkeeper: players.isGoalkeeper,
    })
    .from(signups)
    .innerJoin(players, eq(players.id, signups.playerId))
    .where(and(eq(signups.matchId, match.id), eq(signups.withdrawn, false)));

  const selection = computeSelection(
    active.map((a) => ({ ...a, signupAt: a.signupAt })),
    match.capacity
  ).filter((s) => s.status === "playing");

  const guestRows = await db
    .select({ playerId: teams.playerId, name: players.name, stars: players.stars, isGoalkeeper: players.isGoalkeeper })
    .from(teams)
    .innerJoin(players, eq(players.id, teams.playerId))
    .where(and(eq(teams.matchId, match.id), eq(teams.isGuest, true)));

  const pool: TeamPlayer[] = [
    ...selection.map((s) => ({
      playerId: s.playerId,
      name: s.name,
      stars: Number(s.stars) || 0,
      isGoalkeeper: s.isGoalkeeper,
      isGuest: false,
    })),
    ...guestRows.map((g) => ({
      playerId: g.playerId,
      name: g.name,
      stars: Number(g.stars) || 0,
      isGoalkeeper: g.isGoalkeeper,
      isGuest: true,
    })),
  ];

  const split = buildBalancedTeams(pool, seed);

  await db.delete(teams).where(eq(teams.matchId, match.id));
  const rows = [
    ...split.teamA.map((p) => ({
      matchId: match.id,
      team: "A" as const,
      playerId: p.playerId,
      isGuest: p.isGuest,
    })),
    ...split.teamB.map((p) => ({
      matchId: match.id,
      team: "B" as const,
      playerId: p.playerId,
      isGuest: p.isGuest,
    })),
  ];
  if (rows.length) await db.insert(teams).values(rows);
  refreshGroup(groupSlug);
}

export async function adminGroupMoveTeam(rowId: number, team: "A" | "B", groupSlug: string) {
  if (!rowId) return;
  await db.update(teams).set({ team }).where(eq(teams.id, rowId));
  refreshGroup(groupSlug);
}

export async function adminGroupRemoveRow(rowId: number, groupSlug: string) {
  if (!rowId) return;
  await db.delete(teams).where(eq(teams.id, rowId));
  refreshGroup(groupSlug);
}

export async function adminGroupAddPlayerToTeam(formData: FormData) {
  const groupId = Number(formData.get("groupId"));
  const groupSlug = String(formData.get("groupSlug"));
  await requireGroupAdmin(groupId);

  const match = await getCurrentMatch(groupId);
  if (!match) return;
  const playerId = Number(formData.get("playerId"));
  if (!playerId) return;
  const team = String(formData.get("team")) === "B" ? "B" : "A";

  const already = (
    await db
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.matchId, match.id), eq(teams.playerId, playerId)))
      .limit(1)
  )[0];

  if (already) {
    await db.update(teams).set({ team }).where(eq(teams.id, already.id));
  } else {
    await db.insert(teams).values({
      matchId: match.id,
      team,
      playerId,
      isGuest: false,
    });
  }
  refreshGroup(groupSlug);
}

export async function adminGroupAddGuest(formData: FormData) {
  const groupId = Number(formData.get("groupId"));
  const groupSlug = String(formData.get("groupSlug"));
  await requireGroupAdmin(groupId);

  const match = await getCurrentMatch(groupId);
  if (!match) return;
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  const team = String(formData.get("team")) === "B" ? "B" : "A";
  const stars = String(formData.get("stars") || "3");

  const inserted = await db
    .insert(players)
    .values({ name, stars, isGuest: true, isHistorico: false, priorityOrder: 999 })
    .returning();
  await db.insert(teams).values({
    matchId: match.id,
    team,
    playerId: inserted[0].id,
    isGuest: true,
  });
  refreshGroup(groupSlug);
}

export async function adminGroupPushTeams(formData: FormData) {
  const groupId = Number(formData.get("groupId"));
  const groupSlug = String(formData.get("groupSlug"));
  await requireGroupAdmin(groupId);

  await pushToAll({
    title: "¡Ya están los equipos! ⚽",
    body: "Mirá la formación en la app.",
    url: `/grupos/${groupSlug}/equipos`,
    tag: `equipos-${groupSlug}`,
  });
  refreshGroup(groupSlug);
}

// ─── Resultado ────────────────────────────────────────────────────────────
export async function adminGroupSaveResult(formData: FormData) {
  const groupId = Number(formData.get("groupId"));
  const groupSlug = String(formData.get("groupSlug"));
  await requireGroupAdmin(groupId);

  const match = await getCurrentMatch(groupId);
  if (!match) return;

  const oldStandings = await getStandings(groupId);
  const oldStats = await getAdvancedStats(groupId);

  const scoreA = Number(formData.get("scoreA") || 0);
  const scoreB = Number(formData.get("scoreB") || 0);
  const notes = String(formData.get("notes") || "").trim() || null;
  const result = scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : "draw";

  const existing = (
    await db.select().from(results).where(eq(results.matchId, match.id)).limit(1)
  )[0];

  if (existing) {
    await db
      .update(results)
      .set({ scoreA, scoreB, result, notes })
      .where(eq(results.id, existing.id));
  } else {
    await db.insert(results).values({ matchId: match.id, scoreA, scoreB, result, notes });
  }

  const teamRows = await db
    .select()
    .from(teams)
    .where(and(eq(teams.matchId, match.id), eq(teams.isGuest, false)));
  await db.delete(attendanceLog).where(eq(attendanceLog.matchId, match.id));
  const att = teamRows
    .filter((t) => t.playerId)
    .map((t) => ({ playerId: t.playerId as number, matchId: match.id, attended: true }));
  if (att.length) await db.insert(attendanceLog).values(att);

  await db.update(matches).set({ status: "finished" }).where(eq(matches.id, match.id));

  await notifyMatchCompletionAndAchievements({
    matchId: match.id,
    scoreA,
    scoreB,
    notes,
    oldStandings,
    oldStats,
  });

  refreshGroup(groupSlug);
  redirect(`/grupos/${groupSlug}/admin/resultado?saved=1`);
}

// ─── Push manual ──────────────────────────────────────────────────────────
export async function adminGroupManualPush(formData: FormData) {
  const groupId = Number(formData.get("groupId"));
  const groupSlug = String(formData.get("groupSlug"));
  await requireGroupAdmin(groupId);

  const message = String(formData.get("message") || "").trim();
  if (!message) return;
  await pushToAll({
    title: "Aviso de administración ⚽",
    body: message,
    url: `/grupos/${groupSlug}`,
    tag: `manual-${groupSlug}`,
  });
  refreshGroup(groupSlug);
}

// ─── Jugadores del grupo ──────────────────────────────────────────────────
export async function adminGroupUpdatePlayer(formData: FormData) {
  const groupId = Number(formData.get("groupId"));
  const groupSlug = String(formData.get("groupSlug"));
  await requireGroupAdmin(groupId);

  const id = Number(formData.get("id"));
  if (!id) return;
  const stars = String(formData.get("stars") ?? "0");
  await db
    .update(players)
    .set({
      name: String(formData.get("name") || "").trim(),
      stars,
      isHistorico: formData.get("isHistorico") === "on",
      isGoalkeeper: formData.get("isGoalkeeper") === "on",
      email: (String(formData.get("email") || "").trim() || null) as string | null,
    })
    .where(eq(players.id, id));
  refreshGroup(groupSlug);
}

export async function adminGroupSetStars(formData: FormData) {
  const groupId = Number(formData.get("groupId"));
  const groupSlug = String(formData.get("groupSlug"));
  await requireGroupAdmin(groupId);

  const id = Number(formData.get("id"));
  const stars = String(formData.get("stars") ?? "0");
  if (!id) return;
  await db.update(players).set({ stars }).where(eq(players.id, id));
  refreshGroup(groupSlug);
}

export async function adminGroupCreateAndAddMember(formData: FormData) {
  const groupId = Number(formData.get("groupId"));
  const groupSlug = String(formData.get("groupSlug"));
  await requireGroupAdmin(groupId);

  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  const rawEmail = String(formData.get("email") || "").trim();
  const email = rawEmail ? rawEmail.toLowerCase() : null;
  const stars = String(formData.get("stars") || "3");
  const isGoalkeeper = formData.get("isGoalkeeper") === "on";

  const { groupMembers } = await import("@/db/schema");

  let targetPlayerId: number | null = null;

  // Si se ingresó correo, buscar si ya existe un jugador registrado con ese correo
  if (email) {
    const existing = (
      await db
        .select({ id: players.id })
        .from(players)
        .where(sql`lower(${players.email}) = ${email}`)
        .limit(1)
    )[0];
    if (existing) {
      targetPlayerId = existing.id;
    }
  }

  if (targetPlayerId) {
    // Ya existe: vincular como miembro activo de este grupo sin duplicar registro
    await db
      .insert(groupMembers)
      .values({
        groupId,
        playerId: targetPlayerId,
        role: "member",
        status: "active",
      })
      .onConflictDoUpdate({
        target: [groupMembers.groupId, groupMembers.playerId],
        set: { status: "active" },
      });
  } else {
    // No existe: crear jugador con nombre y correo, y sumarlo al grupo
    const inserted = await db
      .insert(players)
      .values({
        name,
        stars,
        isGoalkeeper,
        isGuest: false,
        isHistorico: false,
        priorityOrder: 99,
        email,
      })
      .returning();

    await db.insert(groupMembers).values({
      groupId,
      playerId: inserted[0].id,
      role: "member",
      status: "active",
    });
  }

  refreshGroup(groupSlug);
}
