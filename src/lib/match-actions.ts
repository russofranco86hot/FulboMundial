import "server-only";
import { db, matches, signups, type Match } from "@/db";
import { and, eq } from "drizzle-orm";
import { artWallTimeToUtc, ART_TZ, formatArt } from "./time";
import { toZonedTime } from "date-fns-tz";
import { getActiveSignups } from "./queries";
import { computeSelection } from "./selection";
import { pushToAll, pushToPlayer } from "./push";

/**
 * Calcula la ventana de inscripción para un partido.
 */
export function signupWindow(matchDate: Date): { opensAt: Date; closesAt: Date } {
  const z = toZonedTime(matchDate, ART_TZ);
  const y = z.getFullYear();
  const mo = z.getMonth() + 1;
  const d = z.getDate();
  const closesAt = artWallTimeToUtc(y, mo, d, 12, 0);
  const prev = new Date(matchDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const pz = toZonedTime(prev, ART_TZ);
  const opensAt = artWallTimeToUtc(pz.getFullYear(), pz.getMonth() + 1, pz.getDate(), 23, 0);
  return { opensAt, closesAt };
}

/**
 * Crea (si no existe) el próximo partido del grupo y abre la inscripción.
 * Acepta fecha/hora custom para soporte multi-grupo.
 */
export async function openNextMatch(opts: {
  groupId?: number;
  matchDate?: Date;
  capacity?: number;
  format?: string;
  notify?: boolean;
} = {}): Promise<Match> {
  let targetGroupId = opts.groupId;
  if (!targetGroupId) {
    const { groups } = await import("@/db/schema");
    const g = (await db.select({ id: groups.id }).from(groups).where(eq(groups.slug, "futbol-miercoles")).limit(1))[0]
      || (await db.select({ id: groups.id }).from(groups).limit(1))[0];
    if (g) targetGroupId = g.id;
  }

  const matchDate = opts.matchDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const capacity = opts.capacity ?? 10;
  const format = opts.format ?? "F5";
  const { opensAt, closesAt } = signupWindow(matchDate);

  const conds = [eq(matches.matchDate, matchDate)];
  if (targetGroupId) conds.push(eq(matches.groupId, targetGroupId));

  const existing = await db
    .select()
    .from(matches)
    .where(and(...conds))
    .limit(1);

  let match: Match;
  if (existing[0]) {
    const updated = await db
      .update(matches)
      .set({
        status: "open",
        signupOpensAt: opensAt,
        signupClosesAt: closesAt,
        capacity,
        format,
      })
      .where(eq(matches.id, existing[0].id))
      .returning();
    match = updated[0]!;
  } else {
    const inserted = await db
      .insert(matches)
      .values({
        groupId: opts.groupId,
        matchDate: opts.matchDate,
        signupOpensAt: opensAt,
        signupClosesAt: closesAt,
        status: "open",
        capacity: opts.capacity,
        format: opts.format ?? "F5",
      })
      .returning();
    match = inserted[0]!;
  }

  if (opts.notify !== false) {
    const dateStr = formatArt(opts.matchDate, "EEEE dd/MM 'a las' HH:mm");
    await pushToAll({
      title: "¡Se abrió la lista! ⚽",
      body: `Anotate para el ${dateStr}.`,
      url: "/",
      tag: "lista-abierta",
    });
  }
  return match;
}

/**
 * Recalcula titulares/suplentes (final_status) de un partido.
 */
export async function recomputeFinalStatuses(match: Match) {
  const active = await getActiveSignups(match.id);
  const selection = computeSelection(active, match.capacity);
  for (const row of selection) {
    await db
      .update(signups)
      .set({ finalStatus: row.status })
      .where(and(eq(signups.matchId, match.id), eq(signups.playerId, row.playerId)));
  }
  return selection;
}

/**
 * Cierra la lista: fija titulares + suplentes, marca como `closed` y notifica.
 */
export async function closeSignups(match: Match, opts: { notify?: boolean } = {}) {
  const selection = await recomputeFinalStatuses(match);
  await db.update(matches).set({ status: "closed" }).where(eq(matches.id, match.id));

  const playing = selection.filter((s) => s.status === "playing");
  const subs = selection.filter((s) => s.status === "substitute");

  if (opts.notify !== false) {
    const titulares = playing.map((p) => p.name).join(", ") || "—";
    const suplentes = subs.map((p, i) => `${i + 1}. ${p.name}`).join(" · ") || "ninguno";
    await pushToAll({
      title: "Lista cerrada — estos juegan ⚽",
      body: `Titulares: ${titulares}. Suplentes: ${suplentes}.`,
      url: "/",
      tag: "lista-cerrada",
    });
  }
  return selection;
}

/**
 * Tras una baja con la lista ya cerrada: promueve al primer suplente y le avisa.
 */
export async function handlePostCloseWithdrawal(match: Match, beforePlayingIds: number[]) {
  const selection = await recomputeFinalStatuses(match);
  const nowPlaying = selection.filter((s) => s.status === "playing").map((s) => s.playerId);
  const promoted = nowPlaying.filter((id) => !beforePlayingIds.includes(id));

  for (const id of promoted) {
    await pushToPlayer(id, {
      title: "¡Subiste a titular! ⚽",
      body: `Se liberó un lugar y entrás. ¡Nos vemos!`,
      url: "/",
      tag: "promovido",
    });
  }
  return { selection, promoted };
}
