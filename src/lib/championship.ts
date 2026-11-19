import { and, asc, desc, eq } from "drizzle-orm";
import { db, groups, matches, matchNotes, matchVotes, players, results } from "@/db";
import { ensureAdminNotifyPreferenceColumn } from "./db-migrations";
import { getGroupTopScorers } from "./goals";
import { getStandings } from "./queries";
import { artWallTimeToUtc, ART_TZ, formatArt } from "./time";
import { toZonedTime } from "date-fns-tz";

export type ChampionshipInfo = {
  endDate: string;
  endDateFormatted: string;
  firstMatchDate: Date | string | null;
  firstMatchFormatted: string | null;
  playedMatchesCount: number;
  remainingMatchesCount: number;
  isFinishedChampionship: boolean;
  isLastMatchActive: boolean;
  summary: string | null;
};

function parseYmd(ymd: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function addDaysYmd(ymd: string, days: number): string {
  const p = parseYmd(ymd);
  if (!p) return ymd;
  const base = artWallTimeToUtc(p.year, p.month, p.day, 12, 0);
  const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return formatArt(next, "yyyy-MM-dd");
}

function capitalizeWords(s: string): string {
  return s.replace(/\b([a-záéíóúñü])/gi, (match, ch, offset) => {
    const word = s.slice(offset).split(/\s+/)[0]?.toLowerCase() ?? "";
    if (offset > 0 && word === "de") return match.toLowerCase();
    return ch.toUpperCase();
  });
}

/** Formatea "2026-12-30" como "Miércoles 30 de Diciembre". */
export function formatChampionshipDate(dateStr: string): string {
  const p = parseYmd(dateStr);
  if (!p) return dateStr;
  const utc = artWallTimeToUtc(p.year, p.month, p.day, 12, 0);
  return capitalizeWords(formatArt(utc, "EEEE d 'de' MMMM"));
}

/**
 * Determina si una fecha de partido corresponde a la última fecha del campeonato:
 * el partido cae en o antes de `championshipEndDate`, y una semana después (+7 días)
 * ya supera `championshipEndDate`.
 */
export function isLastChampionshipMatch(
  matchDate: Date | string,
  championshipEndDate: string | null | undefined,
  _defaultDayOfWeek?: number | null
): boolean {
  if (!championshipEndDate) return false;
  const endP = parseYmd(championshipEndDate);
  if (!endP) return false;
  const matchYmd = formatArt(matchDate, "yyyy-MM-dd");
  if (matchYmd > championshipEndDate) return false;
  if (matchYmd === championshipEndDate) return true;
  const plus7Ymd = addDaysYmd(matchYmd, 7);
  return plus7Ymd > championshipEndDate;
}

export async function getChampionshipInfo(
  groupId: number,
  group: {
    championshipEndDate?: string | null;
    championshipSummary?: string | null;
    defaultDayOfWeek?: number | null;
    defaultTime?: string | null;
  }
): Promise<ChampionshipInfo | null> {
  if (!group.championshipEndDate) return null;
  const endDate = group.championshipEndDate;
  const endParsed = parseYmd(endDate);
  if (!endParsed) return null;

  const rows = await db
    .select({
      id: matches.id,
      matchDate: matches.matchDate,
      status: matches.status,
      resultId: results.id,
    })
    .from(matches)
    .leftJoin(results, eq(matches.id, results.matchId))
    .where(eq(matches.groupId, groupId))
    .orderBy(asc(matches.matchDate));

  const finishedWithResult = rows.filter(
    (r) =>
      r.status === "finished" &&
      r.resultId !== null &&
      formatArt(r.matchDate, "yyyy-MM-dd") <= endDate
  );

  const firstFinished = finishedWithResult[0] ?? null;
  const playedMatchesCount = finishedWithResult.length;
  const finishedDates = new Set(
    finishedWithResult.map((r) => formatArt(r.matchDate, "yyyy-MM-dd"))
  );

  const now = new Date();
  const todayYmd = formatArt(now, "yyyy-MM-dd");
  const endMidday = artWallTimeToUtc(endParsed.year, endParsed.month, endParsed.day, 12, 0);
  const endWeekday = toZonedTime(endMidday, ART_TZ).getDay();
  const targetWeekday =
    group.defaultDayOfWeek !== null && group.defaultDayOfWeek !== undefined
      ? group.defaultDayOfWeek
      : endWeekday;

  const [hhStr, mmStr] = (group.defaultTime || "22:00").split(":");
  const targetHour = parseInt(hhStr || "22", 10);
  const targetMinute = parseInt(mmStr || "0", 10);

  const nowZoned = toZonedTime(now, ART_TZ);
  const nowWeekday = nowZoned.getDay();
  let daysUntilNext = (targetWeekday - nowWeekday + 7) % 7;

  const hasOpenToday = rows.some(
    (r) => r.status !== "finished" && formatArt(r.matchDate, "yyyy-MM-dd") === todayYmd
  );

  if (
    daysUntilNext === 0 &&
    !hasOpenToday &&
    (finishedDates.has(todayYmd) ||
      nowZoned.getHours() > targetHour ||
      (nowZoned.getHours() === targetHour && nowZoned.getMinutes() >= targetMinute))
  ) {
    daysUntilNext = 7;
  }

  const countedDates = new Set<string>();
  let cursorYmd = addDaysYmd(todayYmd, daysUntilNext);
  let safety = 0;
  while (cursorYmd <= endDate && safety < 200) {
    if (!finishedDates.has(cursorYmd)) {
      countedDates.add(cursorYmd);
    }
    cursorYmd = addDaysYmd(cursorYmd, 7);
    safety++;
  }

  // Contar también partidos ya creados (open/closed) cuya fecha sea <= endDate aunque caigan otro día
  for (const r of rows) {
    if (r.status !== "finished") {
      const mYmd = formatArt(r.matchDate, "yyyy-MM-dd");
      if (mYmd <= endDate && mYmd >= todayYmd) {
        countedDates.add(mYmd);
      }
    }
  }

  const remainingMatchesCount = countedDates.size;
  const activeMatches = rows.filter((r) => r.status !== "finished");
  const isLastMatchActive = activeMatches.some((m) =>
    isLastChampionshipMatch(m.matchDate, endDate, group.defaultDayOfWeek)
  );
  const isFinishedChampionship =
    (todayYmd > endDate || remainingMatchesCount === 0) &&
    activeMatches.length === 0 &&
    playedMatchesCount > 0;

  return {
    endDate,
    endDateFormatted: formatChampionshipDate(endDate),
    firstMatchDate: firstFinished?.matchDate ?? null,
    firstMatchFormatted: firstFinished
      ? capitalizeWords(formatArt(firstFinished.matchDate, "EEEE d 'de' MMMM 'de' yyyy"))
      : null,
    playedMatchesCount,
    remainingMatchesCount,
    isFinishedChampionship,
    isLastMatchActive,
    summary: group.championshipSummary ?? null,
  };
}

type TallyWinner = { playerId: number; name: string; votes: number } | null;

function pickVoteWinner(
  votes: { categoryId: string; candidateId: number; candidateName: string }[],
  category: "mvp" | "tronco" | "gol"
): TallyWinner {
  const counts = new Map<number, { name: string; votes: number }>();
  for (const v of votes) {
    if (v.categoryId !== category) continue;
    const prev = counts.get(v.candidateId);
    if (prev) prev.votes++;
    else counts.set(v.candidateId, { name: v.candidateName, votes: 1 });
  }
  let best: TallyWinner = null;
  for (const [playerId, entry] of counts.entries()) {
    if (!best || entry.votes > best.votes) {
      best = { playerId, name: entry.name, votes: entry.votes };
    }
  }
  return best;
}

/**
 * Genera y guarda un breve resumen oficial del campeonato en base a todas
 * las notas guardadas, la tabla de posiciones, goleadores y las votaciones.
 */
export async function generateChampionshipSummary(groupId: number): Promise<string> {
  const [groupRows, standings, topScorers, matchResults, notesRows, voteRows] =
    await Promise.all([
      db.select().from(groups).where(eq(groups.id, groupId)).limit(1),
      getStandings(groupId),
      getGroupTopScorers(groupId, 5),
      db
        .select({
          matchId: matches.id,
          matchDate: matches.matchDate,
          scoreA: results.scoreA,
          scoreB: results.scoreB,
          notes: results.notes,
        })
        .from(matches)
        .innerJoin(results, eq(matches.id, results.matchId))
        .where(and(eq(matches.groupId, groupId), eq(matches.status, "finished")))
        .orderBy(asc(matches.matchDate)),
      db
        .select({
          matchDate: matches.matchDate,
          note: matchNotes.note,
          authorName: players.name,
        })
        .from(matchNotes)
        .innerJoin(matches, eq(matches.id, matchNotes.matchId))
        .innerJoin(players, eq(players.id, matchNotes.playerId))
        .where(eq(matches.groupId, groupId))
        .orderBy(desc(matchNotes.createdAt))
        .limit(30),
      db
        .select({
          categoryId: matchVotes.categoryId,
          candidateId: matchVotes.candidateId,
          candidateName: players.name,
        })
        .from(matchVotes)
        .innerJoin(matches, eq(matches.id, matchVotes.matchId))
        .innerJoin(players, eq(players.id, matchVotes.candidateId))
        .where(eq(matches.groupId, groupId)),
    ]);

  const group = groupRows[0];
  const groupName = group?.name || "el campeonato";
  const endDateLabel = group?.championshipEndDate
    ? formatChampionshipDate(group.championshipEndDate)
    : "Cierre de temporada";

  const filteredMatches = group?.championshipEndDate
    ? matchResults.filter(
        (m) => formatArt(m.matchDate, "yyyy-MM-dd") <= group.championshipEndDate!
      )
    : matchResults;

  const firstMatchLabel = filteredMatches[0]
    ? formatArt(filteredMatches[0].matchDate, "dd/MM/yyyy")
    : "inicio de temporada";

  const champion = standings[0] ?? null;
  const podium = standings.slice(0, 3);
  const pichichi = topScorers[0] ?? null;

  const mvpWinner = pickVoteWinner(voteRows, "mvp");
  const troncoWinner = pickVoteWinner(voteRows, "tronco");
  const golWinner = pickVoteWinner(voteRows, "gol");

  const collectedNotes: string[] = [];
  for (const m of filteredMatches) {
    if (m.notes && m.notes.trim()) {
      collectedNotes.push(`[${formatArt(m.matchDate, "dd/MM")}]: ${m.notes.trim()}`);
    }
  }
  for (const n of notesRows) {
    if (n.note && n.note.trim()) {
      collectedNotes.push(`${n.authorName} (${formatArt(n.matchDate, "dd/MM")}): "${n.note.trim()}"`);
    }
  }

  let summary = "";
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

  if (apiKey) {
    try {
      const prompt = `Sos un relator y cronista de fútbol argentino apasionado. Escribí un RESUMEN BREVE (2 párrafos cortos y dinámicos + un cierre de premios) del campeonato del grupo "${groupName}".

DATOS DEL TORNEO:
- Primer partido: ${firstMatchLabel} | Fecha de cierre: ${endDateLabel} | Partidos jugados: ${filteredMatches.length}
- Podio de la tabla: ${podium.map((p, i) => `${i + 1}° ${p.name} (${p.pts} pts, ${p.won}G-${p.drawn}E-${p.lost}P)`).join(" | ") || "Sin datos"}
- Goleador (Pichichi): ${pichichi ? `${pichichi.name} (${pichichi.totalGoals} goles)` : "Sin registro"}
- Premios por votaciones del plantel:
  * MVP del torneo: ${mvpWinner ? `${mvpWinner.name} (${mvpWinner.votes} votos)` : "Sin votos"}
  * Tronco del torneo: ${troncoWinner ? `${troncoWinner.name} (${troncoWinner.votes} votos)` : "Sin votos"}
  * Mejor Gol: ${golWinner ? `${golWinner.name} (${golWinner.votes} votos)` : "Sin votos"}
- Notas y crónicas guardadas durante el torneo:
${collectedNotes.slice(0, 15).join("\n") || "Sin notas registradas"}

Reglas:
- Resumí la historia del campeonato apoyándote en las notas reales guardadas y el desempeño en las votaciones.
- Tono emotivo, divertido y futbolero en español rioplatense.
- Texto plano (sin markdown complejo), máximo 180 palabras.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.85 },
          }),
        }
      );
      if (res.ok) {
        const json = await res.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) summary = text;
      }
    } catch (err) {
      console.warn("[championship] Error llamando a Gemini para resumen:", err);
    }
  }

  if (!summary) {
    const parts: string[] = [];
    parts.push(
      `🏆 Se bajó el telón del campeonato de ${groupName} (${firstMatchLabel} → ${endDateLabel}) tras ${filteredMatches.length} ${filteredMatches.length === 1 ? "fecha disputada" : "fechas disputadas"}.`
    );

    if (champion) {
      const podiumStr = podium
        .map((p, i) => `${i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} ${p.name} (${p.pts} pts)`)
        .join(" · ");
      parts.push(`La tabla coronó a ${champion.name} como campeón con ${champion.pts} puntos (${podiumStr}).`);
    }

    const awards: string[] = [];
    if (mvpWinner) awards.push(`⭐ MVP del torneo: ${mvpWinner.name} (${mvpWinner.votes} votos)`);
    if (golWinner) awards.push(`🚀 Mejor Gol: ${golWinner.name} (${golWinner.votes} votos)`);
    if (troncoWinner) awards.push(`🪵 Tronco honorífico: ${troncoWinner.name} (${troncoWinner.votes} votos)`);
    if (pichichi) awards.push(`⚽ Goleador: ${pichichi.name} (${pichichi.totalGoals} goles)`);
    if (awards.length > 0) {
      parts.push(awards.join(" | ") + ".");
    }

    const officialHighlights = filteredMatches
      .filter((m) => m.notes && m.notes.trim())
      .slice(-3)
      .map((m) => `${formatArt(m.matchDate, "dd/MM")}: "${m.notes!.trim().slice(0, 120)}${m.notes!.trim().length > 120 ? "..." : ""}"`);

    const chatHighlights = notesRows
      .slice(0, 3)
      .map((n) => `${n.authorName}: "${n.note.trim().slice(0, 100)}"`);

    const highlights = [...officialHighlights, ...chatHighlights].slice(0, 4);
    if (highlights.length > 0) {
      parts.push(`📝 Lo que dejaron las notas de la temporada: ${highlights.join(" · ")}.`);
    }

    summary = parts.join("\n\n");
  }

  try {
    await db
      .update(groups)
      .set({ championshipSummary: summary })
      .where(eq(groups.id, groupId));
  } catch (err) {
    console.warn("[championship] Retrying update after schema ensure:", err);
    await ensureAdminNotifyPreferenceColumn(true);
    await db
      .update(groups)
      .set({ championshipSummary: summary })
      .where(eq(groups.id, groupId));
  }

  return summary;
}
