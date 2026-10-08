/**
 * ──────────────────────────────────────────────────────────────────────────
 *  REGLA DE SELECCIÓN (núcleo del sistema) — MANTENER CENTRALIZADA Y COMENTADA
 * ──────────────────────────────────────────────────────────────────────────
 *
 *  Para jugar hay que ANOTARSE. Anotarse es el requisito; el orden o la
 *  velocidad con la que te anotás NO decide si jugás.
 *
 *  Cuando se cierra la lista, juegan los `capacity` (10) anotados de mayor
 *  prioridad  (priority_order más BAJO = más prioridad). El resto quedan de
 *  suplentes, ordenados por la misma prioridad (suplente 1, 2, 3, …).
 *
 *  Desempate: si dos jugadores comparten priority_order (p.ej. JuanCe y Lucho,
 *  orden 8), gana el que se anotó primero (signup_at más temprano). Es solo un
 *  criterio de desempate entre iguales; nunca cambia la prioridad general.
 */

export type SelectionInput = {
  playerId: number;
  priorityOrder: number;
  signupAt: Date | string | number;
};

export type SelectionRow<T extends SelectionInput = SelectionInput> = T & {
  /** "playing" si entra entre los titulares; si no, "substitute". */
  status: "playing" | "substitute";
  /** Posición de suplente (1 = primer suplente). null para titulares. */
  substituteIndex: number | null;
  /** Ranking dentro de los anotados (1 = primero). */
  rank: number;
};

/** Ordena los anotados por prioridad y desempata por hora de anotación. */
export function orderSignups<T extends SelectionInput>(signups: T[]): T[] {
  return [...signups].sort((a, b) => {
    if (a.priorityOrder !== b.priorityOrder) return a.priorityOrder - b.priorityOrder;
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
