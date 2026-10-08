"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, gt, lt, desc } from "drizzle-orm";
import { db, players, matches, signups, teams, results, attendanceLog } from "@/db";
import {
  checkAdminPassword,
  startAdminSession,
  endAdminSession,
  requireAdmin,
} from "@/lib/admin";
import { getCurrentMatch, getStandings } from "@/lib/queries";
import { openNextMatch, closeSignups, recomputeFinalStatuses } from "@/lib/match-actions";
import { buildBalancedTeams, type TeamPlayer } from "@/lib/teams";
import { pushToAll } from "@/lib/push";
import { computeSelection } from "@/lib/selection";
import { getAdvancedStats } from "@/lib/stats";
import { notifyMatchCompletionAndAchievements } from "@/lib/achievements";

function refresh() {
  revalidatePath("/admin");
  revalidatePath("/admin/jugadores");
  revalidatePath("/admin/partido");
  revalidatePath("/admin/resultado");
  revalidatePath("/");
  revalidatePath("/equipos");
  revalidatePath("/historial");
}

// ─── Sesión admin ──────────────────────────────────────────────────────────
export async function adminLogin(formData: FormData) {
  const pass = String(formData.get("password") || "");
  if (!checkAdminPassword(pass)) {
    redirect("/admin?error=1");
  }
  await startAdminSession();
  redirect("/admin");
}

export async function adminLogout() {
  await endAdminSession();
  redirect("/admin");
}

// ─── Jugadores ───────────────────────────────────────────────────────────────
export async function createPlayer(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  const last = await db.select().from(players).orderBy(desc(players.priorityOrder)).limit(1);
  const order = (last[0]?.priorityOrder ?? 0) + 1;
  await db.insert(players).values({
    name,
    priorityOrder: order,
    isHistorico: formData.get("isHistorico") === "on",
    isGoalkeeper: formData.get("isGoalkeeper") === "on",
    isGuest: false,
    stars: String(formData.get("stars") || "3"),
  });
  refresh();
}

export async function updatePlayer(formData: FormData) {
  await requireAdmin();
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
      isGuest: formData.get("isGuest") === "on",
      email: (String(formData.get("email") || "").trim() || null) as string | null,
    })
    .where(eq(players.id, id));
  refresh();
}

export async function setStars(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const stars = String(formData.get("stars") ?? "0");
  if (!id) return;
  await db.update(players).set({ stars }).where(eq(players.id, id));
  refresh();
}

export async function deletePlayer(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) return;
  await db.delete(players).where(eq(players.id, id));
  refresh();
}

/** Desvincula la cuenta de Google de un jugador (libera el nombre para re-elegir). */
export async function adminUnlinkPlayer(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) return;
  await db.update(players).set({ googleId: null, email: null }).where(eq(players.id, id));
  refresh();
}

/** Ajuste manual del historial de un jugador (G/E/P; pueden ser negativos). */
export async function adminSetAdjustments(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) return;
  const adjWon = Math.trunc(Number(formData.get("adjWon")) || 0);
  const adjDrawn = Math.trunc(Number(formData.get("adjDrawn")) || 0);
  const adjLost = Math.trunc(Number(formData.get("adjLost")) || 0);
  await db.update(players).set({ adjWon, adjDrawn, adjLost }).where(eq(players.id, id));
  refresh();
}

/** Sube o baja un jugador en el ranking (intercambia prioridad con el vecino). */
export async function movePlayer(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const dir = String(formData.get("dir")); // "up" | "down"
  if (!id) return;
  const cur = (await db.select().from(players).where(eq(players.id, id)).limit(1))[0];
  if (!cur) return;

  const neighbor =
    dir === "up"
      ? (
          await db
            .select()
            .from(players)
            .where(lt(players.priorityOrder, cur.priorityOrder))
            .orderBy(desc(players.priorityOrder))
            .limit(1)
        )[0]
      : (
          await db
            .select()
            .from(players)
            .where(gt(players.priorityOrder, cur.priorityOrder))
            .orderBy(asc(players.priorityOrder))
            .limit(1)
        )[0];

  if (!neighbor) return;
  // Intercambiar órdenes.
  await db.update(players).set({ priorityOrder: neighbor.priorityOrder }).where(eq(players.id, cur.id));
  await db.update(players).set({ priorityOrder: cur.priorityOrder }).where(eq(players.id, neighbor.id));
  refresh();
}

// ─── Partido ─────────────────────────────────────────────────────────────────
export async function adminOpenMatch() {
  await requireAdmin();
  await openNextMatch({ notify: false });
  refresh();
}

export async function adminCloseMatch() {
  await requireAdmin();
  const match = await getCurrentMatch();
  if (match && match.status === "open") {
    await closeSignups(match, { notify: true });
  }
  refresh();
}

export async function adminReopenMatch() {
  await requireAdmin();
  const match = await getCurrentMatch();
  if (match) {
    await db.update(matches).set({ status: "open" }).where(eq(matches.id, match.id));
  }
  refresh();
}

/**
 * Anota o da de baja a un jugador manualmente. Funciona en cualquier estado del
 * partido (abierto, cerrado o lleno): el admin puede anotar/sacar a cualquiera
 * del plantel en su nombre. Si la lista ya está cerrada, recalcula titulares y
 * suplentes para que la selección quede al día.
 */
export async function adminToggleSignup(formData: FormData) {
  await requireAdmin();
  const playerId = Number(formData.get("playerId"));
  const action = String(formData.get("action")); // "add" | "remove"
  const match = await getCurrentMatch();
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

  // Si la lista ya no está abierta, mantené el cache de titular/suplente al día.
  if (match.status !== "open") {
    await recomputeFinalStatuses(match);
  }
  refresh();
}

// ─── Equipos ─────────────────────────────────────────────────────────────────
/** Genera un sorteo balanceado a partir de titulares + invitados ya agregados. */
export async function adminGenerateTeams(formData: FormData) {
  await requireAdmin();
  const match = await getCurrentMatch();
  if (!match) return;
  const seed = Number(formData.get("seed")) || Math.floor((Date.now() % 100000) + 1);

  // Titulares por prioridad
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

  // Invitados ya cargados en este partido (filas de teams marcadas isGuest)
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

  // Reemplazar equipos del partido.
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
  refresh();
}

/** Cambia un jugador de equipo (A↔B). */
export async function adminSwapTeam(formData: FormData) {
  await requireAdmin();
  const rowId = Number(formData.get("rowId"));
  if (!rowId) return;
  const row = (await db.select().from(teams).where(eq(teams.id, rowId)).limit(1))[0];
  if (!row) return;
  await db.update(teams).set({ team: row.team === "A" ? "B" : "A" }).where(eq(teams.id, rowId));
  refresh();
}

/** Mueve un jugador a un equipo puntual (para drag & drop). Args planos. */
export async function adminMoveTeam(rowId: number, team: "A" | "B") {
  await requireAdmin();
  if (!rowId) return;
  await db.update(teams).set({ team }).where(eq(teams.id, rowId));
  refresh();
}

/** Quita una fila de equipo (para el editor de drag & drop). */
export async function adminRemoveRow(rowId: number) {
  await requireAdmin();
  if (!rowId) return;
  await db.delete(teams).where(eq(teams.id, rowId));
  refresh();
}

/** Agrega un jugador EXISTENTE del plantel (no invitado) a un equipo. */
export async function adminAddPlayerToTeam(formData: FormData) {
  await requireAdmin();
  const match = await getCurrentMatch();
  if (!match) return;
  const playerId = Number(formData.get("playerId"));
  if (!playerId) return;
  const team = String(formData.get("team")) === "B" ? "B" : "A";

  // Evitar duplicados: si ya está en algún equipo de este partido, no lo repite.
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
  refresh();
}

/** Agrega un invitado (jugador isGuest) a un equipo. */
export async function adminAddGuest(formData: FormData) {
  await requireAdmin();
  const match = await getCurrentMatch();
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
  refresh();
}

export async function adminRemoveTeamMember(formData: FormData) {
  await requireAdmin();
  const rowId = Number(formData.get("rowId"));
  if (!rowId) return;
  await db.delete(teams).where(eq(teams.id, rowId));
  refresh();
}

export async function adminPushTeams() {
  await requireAdmin();
  await pushToAll({
    title: "¡Ya están los equipos! ⚽",
    body: "Mirá la formación del miércoles en la app.",
    url: "/equipos",
    tag: "equipos",
  });
  refresh();
}

// ─── Resultado ─────────────────────────────────────────────────────────────────
export async function adminSaveResult(formData: FormData) {
  await requireAdmin();
  const match = await getCurrentMatch();
  if (!match) return;

  // Capturamos el estado previo para calcular hazañas alcanzadas tras este partido
  const oldStandings = await getStandings();
  const oldStats = await getAdvancedStats();

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

  // Registrar asistencia de los que tienen equipo (no invitados).
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

  // Notificar alerta a todos (partido finalizado con link a la crónica y votación)
  // y notificar hazañas individuales a los jugadores correspondientes
  await notifyMatchCompletionAndAchievements({
    matchId: match.id,
    scoreA,
    scoreB,
    notes,
    oldStandings,
    oldStats,
  });

  refresh();
  redirect("/admin/resultado?saved=1");
}

// ─── Push manual ───────────────────────────────────────────────────────────────
export async function adminManualPush(formData: FormData) {
  await requireAdmin();
  const message = String(formData.get("message") || "").trim();
  if (!message) return;
  await pushToAll({
    title: "Fútbol de los Miércoles",
    body: message,
    url: "/",
    tag: "manual",
  });
  refresh();
}
