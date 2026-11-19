/**
 * ──────────────────────────────────────────────────────────────────────────
 *  REGLA DE SELECCIÓN (núcleo del sistema) — MANTENER CENTRALIZADA Y COMENTADA
 * ──────────────────────────────────────────────────────────────────────────
 *
 *  1. AJUSTE MANUAL DEL PARTIDO (`manualOrder`, prioridad máxima):
 *     Si el admin reordenó los anotados en el partido (o pasó un titular a
 *     suplente / viceversa), se respeta estrictamente `manualOrder` (1..N).
 *
 *  2. VENTANA HASTA EL CIERRE DE LISTA (24 hs antes):
 *     Los jugadores que se anotaron antes del cierre (24 hs antes del partido)
 *     tienen prioridad sobre quienes se anoten luego del cierre.
 *
 *  3. ORDEN CONFIGURABLE DE CRITERIOS (cascada modificable por el admin):
 *     Por defecto:
 *       1) "historicos" -> Históricos (en base a la prioridad)
 *       2) "presencia"  -> Mayor presencia en los últimos partidos
 *       3) "tabla"      -> Según la tabla de posiciones
 *       4) "llegada"    -> Orden en que se fueron anotando en la app
 *     Ante empate en el 1er criterio se evalúa el 2do, luego el 3ro, etc.
 */

export type SignupCriterion = "historicos" | "presencia" | "tabla" | "llegada";

export const DEFAULT_SIGNUP_PRIORITY_ORDER: SignupCriterion[] = [
  "historicos",
  "presencia",
  "tabla",
  "llegada",
];

export const SIGNUP_CRITERIA_META: Record<
  SignupCriterion,
  { shortLabel: string; title: string; description: string }
> = {
  historicos: {
    shortLabel: "Históricos",
    title: "Históricos (En base a la prioridad)",
    description:
      "Prioriza a jugadores marcados como Históricos y por su número de prioridad (menor número = mayor prioridad).",
  },
  presencia: {
    shortLabel: "Mayor presencia",
    title: "Mayor presencia en los últimos partidos",
    description:
      "Prioriza a quienes más asistieron en los últimos 5 partidos finalizados del grupo (desempate por partidos totales).",
  },
  tabla: {
    shortLabel: "Tabla de posiciones",
    title: "Según la tabla de posiciones",
    description:
      "Prioriza a los mejor ubicados en la tabla de posiciones vigente (puntos, victorias y % de triunfo).",
  },
  llegada: {
    shortLabel: "Orden de llegada (hasta 24hs antes)",
    title: "Orden en que se fueron anotando en la app (hasta 24 hs antes)",
    description:
      "Prioriza según el orden cronológico de inscripción dentro de la ventana previa al cierre (24 hs antes del partido).",
  },
};

const VALID_CRITERIA = new Set<SignupCriterion>(DEFAULT_SIGNUP_PRIORITY_ORDER);

export function parseSignupPriorityOrder(
  raw?: string | SignupCriterion[] | null
): SignupCriterion[] {
  const tokens = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
    ? raw.split(",").map((s) => s.trim())
    : [];

  const result: SignupCriterion[] = [];
  for (const t of tokens) {
    if (VALID_CRITERIA.has(t as SignupCriterion) && !result.includes(t as SignupCriterion)) {
      result.push(t as SignupCriterion);
    }
  }
  return result.length > 0 ? result : [...DEFAULT_SIGNUP_PRIORITY_ORDER];
}

export type SelectionInput = {
  playerId: number;
  priorityOrder?: number;
  isHistorico?: boolean;
  signupAt: Date | string | number;
  manualOrder?: number | null;
  recentAttendance?: number;
  totalAttendance?: number;
  standingsPts?: number;
  standingsWon?: number;
  standingsWinPct?: number;
};

export type SelectionOptions = {
  criteriaOrder?: SignupCriterion[] | string | null;
  cutoffAt?: Date | string | number | null;
};

export type SelectionRow<T extends SelectionInput = SelectionInput> = T & {
  /** "playing" si entra entre los titulares; si no, "substitute". */
  status: "playing" | "substitute";
  /** Posición de suplente (1 = primer suplente). null para titulares. */
  substituteIndex: number | null;
  /** Ranking dentro de los anotados (1 = primero). */
  rank: number;
};

function compareCriterion(
  a: SelectionInput,
  b: SelectionInput,
  criterion: SignupCriterion
): number {
  if (criterion === "historicos") {
    const aHist = Boolean(a.isHistorico);
    const bHist = Boolean(b.isHistorico);
    if (aHist !== bHist) return aHist ? -1 : 1;

    const aPrio = a.priorityOrder ?? 999;
    const bPrio = b.priorityOrder ?? 999;
    if (aPrio !== bPrio) return aPrio - bPrio;
    return 0;
  }

  if (criterion === "presencia") {
    const aRecent = a.recentAttendance ?? 0;
    const bRecent = b.recentAttendance ?? 0;
    if (aRecent !== bRecent) return bRecent - aRecent;

    const aTotal = a.totalAttendance ?? 0;
    const bTotal = b.totalAttendance ?? 0;
    if (aTotal !== bTotal) return bTotal - aTotal;
    return 0;
  }

  if (criterion === "tabla") {
    const aPts = a.standingsPts ?? 0;
    const bPts = b.standingsPts ?? 0;
    if (aPts !== bPts) return bPts - aPts;

    const aWon = a.standingsWon ?? 0;
    const bWon = b.standingsWon ?? 0;
    if (aWon !== bWon) return bWon - aWon;

    const aPct = a.standingsWinPct ?? 0;
    const bPct = b.standingsWinPct ?? 0;
    if (aPct !== bPct) return bPct - aPct;
    return 0;
  }

  // "llegada"
  const aTime = new Date(a.signupAt).getTime();
  const bTime = new Date(b.signupAt).getTime();
  return aTime - bTime;
}

/** Ordena los anotados según ajuste manual, cierre 24hs y criterios configurados. */
export function orderSignups<T extends SelectionInput>(
  signups: T[],
  options?: SelectionOptions
): T[] {
  const criteria = parseSignupPriorityOrder(options?.criteriaOrder);
  const cutoffMs =
    options?.cutoffAt !== null && options?.cutoffAt !== undefined
      ? new Date(options.cutoffAt).getTime()
      : null;

  return [...signups].sort((a, b) => {
    // 1. Ajuste manual en el partido (prioridad máxima)
    const aManual = a.manualOrder ?? null;
    const bManual = b.manualOrder ?? null;
    if (aManual !== null && bManual !== null) {
      if (aManual !== bManual) return aManual - bManual;
    } else if (aManual !== null) {
      return -1;
    } else if (bManual !== null) {
      return 1;
    }

    const aTime = new Date(a.signupAt).getTime();
    const bTime = new Date(b.signupAt).getTime();

    // 2. Ventana de lista abierta (hasta 24 hs antes del partido)
    if (cutoffMs !== null && !Number.isNaN(cutoffMs)) {
      const aLate = aTime > cutoffMs;
      const bLate = bTime > cutoffMs;
      if (aLate !== bLate) return aLate ? 1 : -1;
    }

    // 3. Evaluación en cascada según orden configurado por el admin
    for (const c of criteria) {
      const diff = compareCriterion(a, b, c);
      if (diff !== 0) return diff;
    }

    // 4. Desempate determinista final
    if (aTime !== bTime) return aTime - bTime;
    return a.playerId - b.playerId;
  });
}

/**
 * Calcula titulares y suplentes a partir de los anotados vigentes (no dados de baja).
 * `capacity` = cantidad que juega (por defecto 10).
 */
export function computeSelection<T extends SelectionInput>(
  signups: T[],
  capacity = 10,
  options?: SelectionOptions
): SelectionRow<T>[] {
  const ordered = orderSignups(signups, options);
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
  capacity = 10,
  options?: SelectionOptions
): SelectionRow<T> | null {
  return computeSelection(signups, capacity, options).find((r) => r.playerId === playerId) ?? null;
}
