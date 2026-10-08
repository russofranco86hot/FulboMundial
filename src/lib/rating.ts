/**
 * ──────────────────────────────────────────────────────────────────────────
 *  SUGERENCIA INTELIGENTE DE RATING (estrellas) — pura y testeable
 * ──────────────────────────────────────────────────────────────────────────
 *
 *  Idea: si un jugador gana mucho más de lo que pierde, probablemente su nivel
 *  (estrellas) está subvaluado, y conviene subirlo (y viceversa). Pero con
 *  pocos partidos no hay que reaccionar a la suerte.
 *
 *  Algoritmo:
 *   1) rendimiento = (G + 0.5·E) / PJ   → 0..1 (el empate vale medio triunfo).
 *   2) Suavizado bayesiano hacia 0.5 (jugador promedio) con fuerza K: a menos
 *      partidos, más se acerca la estimación a 0.5 (evita falsos positivos).
 *         ajustado = (puntos + 0.5·K) / (PJ + K)
 *   3) señal = ajustado − 0.5   (positiva = gana de más; negativa = pierde de más).
 *   4) Δestrellas = señal · ESCALA, redondeado a medias estrellas, recortado.
 *   5) Solo se sugiere si el cambio efectivo es ≥ 0.5 y hay PJ mínimos.
 */

export type RatingStats = {
  won: number;
  drawn: number;
  lost: number;
};

export type RatingSuggestion = {
  current: number;
  suggested: number;
  delta: number; // efectivo (suggested - current), múltiplo de 0.5
  direction: "up" | "down";
  performance: number; // 0..1
  gp: number;
  reason: string;
};

const MIN_GAMES = 4; // mínimo de partidos para opinar
const K = 4; // fuerza del prior (partidos "fantasma" en 0.5)
const SCALE = 5; // cuántas estrellas por unidad de señal

const round05 = (n: number) => Math.round(n * 2) / 2;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Devuelve una sugerencia de rating, o null si no corresponde cambiar nada
 * (pocos datos o el cambio redondeado es 0).
 */
export function suggestRating(stats: RatingStats, currentStars: number): RatingSuggestion | null {
  const won = Math.max(0, stats.won);
  const drawn = Math.max(0, stats.drawn);
  const lost = Math.max(0, stats.lost);
  const gp = won + drawn + lost;
  if (gp < MIN_GAMES) return null;

  const points = won + 0.5 * drawn;
  const performance = points / gp;
  const adjusted = (points + 0.5 * K) / (gp + K);
  const signal = adjusted - 0.5;

  const rawDelta = round05(signal * SCALE);
  const current = round05(clamp(currentStars, 0, 5));
  const suggested = round05(clamp(current + rawDelta, 0.5, 5));
  const delta = round05(suggested - current);

  if (delta === 0) return null;

  const pct = Math.round(performance * 100);
  const direction: "up" | "down" = delta > 0 ? "up" : "down";
  const verb = direction === "up" ? "subir" : "bajar";
  const reason =
    `${won}G-${drawn}E-${lost}P (${pct}% rendimiento en ${gp} PJ): ` +
    (direction === "up"
      ? `gana bastante más de lo que pierde → ${verb} a ${suggested}★`
      : `pierde bastante más de lo que gana → ${verb} a ${suggested}★`);

  return { current, suggested, delta, direction, performance, gp, reason };
}
