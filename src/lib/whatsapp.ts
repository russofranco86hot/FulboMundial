import { formatArt } from "./time";

/**
 * Armadores de mensajes para compartir al grupo de WhatsApp.
 * Son funciones puras (texto plano) — se calculan en el server y se pasan al
 * botón cliente <WhatsAppShare/>, que abre WhatsApp para elegir el grupo.
 *
 * Nota: WhatsApp no permite postear automáticamente en un grupo desde una API
 * oficial. Este flujo arma el texto y el admin lo manda al grupo con un toque.
 */

type SelLike = { name: string; status: "playing" | "substitute"; isGoalkeeper?: boolean };

/** "¡Se abrió la lista!" para anotarse. */
export function waOpenMessage(matchDate: Date, appUrl?: string): string {
  const cuando = formatArt(matchDate, "EEEE dd/MM");
  const lines = [
    "⚽ *Fútbol de los Miércoles*",
    `Se abrió la lista para el ${cuando} a las 22:00.`,
    "Anotate así armamos los equipos 👇",
  ];
  if (appUrl) lines.push(appUrl);
  return lines.join("\n");
}

/** Lista actual de anotados: titulares + suplentes. */
export function waListMessage(
  matchDate: Date,
  selection: SelLike[],
  appUrl?: string
): string {
  const cuando = formatArt(matchDate, "EEEE dd/MM HH:mm");
  const playing = selection.filter((s) => s.status === "playing");
  const subs = selection.filter((s) => s.status === "substitute");

  const lines = [`⚽ *Lista — ${cuando}*`, ""];
  lines.push(`*Titulares (${playing.length})*`);
  if (playing.length) {
    playing.forEach((p, i) =>
      lines.push(`${i + 1}. ${p.isGoalkeeper ? "🧤 " : ""}${p.name}`)
    );
  } else {
    lines.push("—");
  }
  if (subs.length) {
    lines.push("", "*Suplentes*");
    subs.forEach((p, i) => lines.push(`S${i + 1}. ${p.name}`));
  }
  if (appUrl) lines.push("", appUrl);
  return lines.join("\n");
}

/** Equipos ya sorteados. */
export function waTeamsMessage(
  matchDate: Date,
  teamA: { name: string; isGoalkeeper?: boolean }[],
  teamB: { name: string; isGoalkeeper?: boolean }[],
  appUrl?: string
): string {
  const cuando = formatArt(matchDate, "EEEE dd/MM HH:mm");
  const fmt = (list: { name: string; isGoalkeeper?: boolean }[]) =>
    list.length
      ? list.map((p) => `• ${p.isGoalkeeper ? "🧤 " : ""}${p.name}`).join("\n")
      : "—";

  const lines = [
    `⚽ *Equipos — ${cuando}*`,
    "",
    "⚪ *Equipo Claro*",
    fmt(teamA),
    "",
    "⚫ *Equipo Oscuro*",
    fmt(teamB),
  ];
  if (appUrl) lines.push("", appUrl);
  return lines.join("\n");
}

/** Recordatorio del día del partido. */
export function waReminderMessage(matchDate: Date): string {
  const cuando = formatArt(matchDate, "EEEE dd/MM HH:mm");
  return [
    "⚽ *Recordatorio*",
    `Hoy jugamos: ${cuando}.`,
    "¡No falten! 🙌",
  ].join("\n");
}
