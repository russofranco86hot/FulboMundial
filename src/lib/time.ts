import { fromZonedTime, toZonedTime, format as formatTz } from "date-fns-tz";
import { es } from "date-fns/locale";

// Argentina no tiene horario de verano: UTC−3 fijo.
export const ART_TZ = "America/Argentina/Buenos_Aires";

/** Construye un instante UTC a partir de una hora "de pared" en Argentina. */
export function artWallTimeToUtc(
  year: number,
  month1to12: number,
  day: number,
  hour: number,
  minute = 0
): Date {
  const mm = String(month1to12).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const hh = String(hour).padStart(2, "0");
  const mi = String(minute).padStart(2, "0");
  return fromZonedTime(`${year}-${mm}-${dd} ${hh}:${mi}:00`, ART_TZ);
}

/** Devuelve los componentes de fecha (en ART) de un instante. */
function artParts(date: Date) {
  const z = toZonedTime(date, ART_TZ);
  return {
    year: z.getFullYear(),
    month: z.getMonth() + 1,
    day: z.getDate(),
    weekday: z.getDay(), // 0 dom ... 3 miércoles
    hour: z.getHours(),
    minute: z.getMinutes(),
  };
}

/**
 * Dado un instante "ahora", calcula el próximo partido (miércoles 22:00 ART).
 * Si hoy es miércoles y todavía no son las 22:00, devuelve el de hoy.
 */
export function nextMatchDate(now: Date = new Date()): Date {
  const p = artParts(now);
  // días hasta el próximo miércoles (3)
  let daysUntilWed = (3 - p.weekday + 7) % 7;
  // si es miércoles pero ya pasaron las 22:00, vamos al siguiente
  if (daysUntilWed === 0 && (p.hour > 22 || (p.hour === 22 && p.minute > 0))) {
    daysUntilWed = 7;
  }
  // base de medianoche ART de hoy + offset de días, materializado a las 22:00
  const base = artWallTimeToUtc(p.year, p.month, p.day, 22, 0);
  const target = new Date(base.getTime() + daysUntilWed * 24 * 60 * 60 * 1000);
  // recalcular a 22:00 exactas de ese día (por las dudas de DST inexistente, queda igual)
  const tp = artParts(target);
  return artWallTimeToUtc(tp.year, tp.month, tp.day, 22, 0);
}

/**
 * Calcula la fecha y hora del próximo partido según el día de la semana y hora habitual del grupo.
 * dayOfWeek: 0 (domingo) .. 6 (sábado).
 * timeStr: "HH:mm" (ej: "21:00", "22:00").
 */
export function nextGroupMatchDate(
  dayOfWeek = 3,
  timeStr = "21:00",
  now: Date = new Date()
): Date {
  const parts = (timeStr || "21:00").split(":");
  const targetHour = parseInt(parts[0] || "21", 10);
  const targetMinute = parseInt(parts[1] || "0", 10);

  const p = artParts(now);
  let daysUntil = (dayOfWeek - p.weekday + 7) % 7;
  // Si hoy es el mismo día pero ya pasó la hora del partido, programar para la próxima semana
  if (
    daysUntil === 0 &&
    (p.hour > targetHour || (p.hour === targetHour && p.minute >= targetMinute))
  ) {
    daysUntil = 7;
  }

  const base = artWallTimeToUtc(p.year, p.month, p.day, targetHour, targetMinute);
  const target = new Date(base.getTime() + daysUntil * 24 * 60 * 60 * 1000);
  const tp = artParts(target);
  return artWallTimeToUtc(tp.year, tp.month, tp.day, targetHour, targetMinute);
}

/** Ventana de inscripción para un partido dado. */
export function signupWindow(matchDate: Date): { opensAt: Date; closesAt: Date } {
  const p = artParts(matchDate);
  // Cierra el mismo miércoles 12:00 ART
  const closesAt = artWallTimeToUtc(p.year, p.month, p.day, 12, 0);
  // Abre el miércoles anterior 23:00 ART (matchDate − 7 días)
  const prev = new Date(matchDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const pp = artParts(prev);
  const opensAt = artWallTimeToUtc(pp.year, pp.month, pp.day, 23, 0);
  return { opensAt, closesAt };
}

/** Formatea un instante en hora argentina, p.ej. "miércoles 25/06 22:00". */
export function formatArt(date: Date, pattern = "EEEE dd/MM HH:mm"): string {
  return formatTz(toZonedTime(date, ART_TZ), pattern, { timeZone: ART_TZ, locale: es });
}
