/**
 * ──────────────────────────────────────────────────────────────────────────
 *  REGLA DE SELECCIÓN (núcleo del sistema) — MANTENER CENTRALIZADA Y COMENTADA
 * ──────────────────────────────────────────────────────────────────────────
 *
 *  1. ORDEN MANUAL DEL PARTIDO (prioridad máxima):
 *     Si el admin reordenó los anotados en el partido (o pasó un titular a suplente / viceversa),
 *     se respeta estrictamente `manualOrder` (1, 2, 3... N).
 *
 *  2. PRIORIDAD ESPECIAL DE JUGADOR (< 900):
 *     Si el admin configuró a un jugador con prioridad VIP explícita en Miembros (menor número = más prioridad,
 *     ej. 1, 2, 3), tiene prioridad para ser titular sobre los que tienen prioridad estándar (999).
 *
 *  3. AUTOMÁTICO (POR ORDEN DE LLEGADA / INSCRIPCIÓN):
 *     Los jugadores se ordenan automáticamente según la fecha y hora en que se anotaron (`signupAt` cronológico).
 *     Los primeros `capacity` son Titulares; los siguientes son Suplente 1, Suplente 2, etc.
 */

export type SelectionInput = {
  playerId: number;
  priorityOrder?: number;
  signupAt: Date | string | number;
  manualOrder?: number | null;
};

export type SelectionRow<T extends SelectionInput = SelectionInput> = T & {
  /** "playing" si entra entre los titulares; si no, "substitute". */
  status: "playing" | "substitute";
  /** Posición de suplente (1 = primer suplente). null para titulares. */
  substituteIndex: number | null;
  /** Ranking dentro de los anotados (1 = primero). */
  rank: number;
};

/** Ordena los anotados según la regla unificada. */
export function orderSignups<T extends SelectionInput>(signups: T[]): T[] {
  return [...signups].sort((a, b) => {
    // 1. Si tienen orden manual asignado por el admin para el partido:
    const aManual = a.manualOrder ?? null;
    const bManual = b.manualOrder ?? null;
    if (aManual !== null && bManual !== null) {
      if (aManual !== bManual) return aManual - bManual;
    } else if (aManual !== null) {
      return -1;
    } else if (bManual !== null) {
      return 1;
    }

    // 2. Si el admin asignó una prioridad especial (< 900) a algún jugador:
    const aPrio = a.priorityOrder ?? 999;
    const bPrio = b.priorityOrder ?? 999;
    if (aPrio !== bPrio && (aPrio < 900 || bPrio < 900)) {
      return aPrio - bPrio;
    }

    // 3. Automático: orden de llegada (hora en que se anotó)
    return new Date(a.signupAt).getTime() - new Date(b.signupAt).getTime();
  });
}

/**
 * Calcula titulares y suplentes a partir de los anotados vigentes (no dados de baja).
 * `capacity` = cantidad que juega (por defecto 10).
 */
export function computeSelection<T extends SelectionInput>(
  signups: T[],
  capacity = 10
): SelectionRow<T>[] {
  const ordered = orderSignups(signups);
  return ordered.map((s, i) => {
    const playing = i < capacity;
    return {
      ...s,
      status: playing ? "playing" : "substitute",
      substituteIndex: playing ? null : i - capacity + 1,
      rank: i + 1,
    } as SelectionRow<T>;
  });
}

/** Devuelve el estado de un jugador puntual dentro de la lista. */
export function statusForPlayer<T extends SelectionInput>(
  signups: T[],
  playerId: number,
  capacity = 10
): SelectionRow<T> | null {
  return computeSelection(signups, capacity).find((r) => r.playerId === playerId) ?? null;
}
