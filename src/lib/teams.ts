/**
 * ──────────────────────────────────────────────────────────────────────────
 *  ARMADO DE EQUIPOS BALANCEADO ("con IA", determinístico) — CENTRALIZADO
 * ──────────────────────────────────────────────────────────────────────────
 *
 *  Toma los titulares (+ invitados que sume el admin) y los reparte en dos
 *  equipos (A y B) lo más parejos posible por suma de estrellas.
 *
 *  - Arqueros: si hay 2 fijos, uno por equipo. Si hay 1, se reparte y se
 *    balancea el resto. Si hay 0, no se fuerza.
 *  - Balance por nivel: minimiza la diferencia de estrellas totales.
 *  - Aleatoriedad controlada: genera varias particiones candidatas con algo de
 *    azar y se queda con la más pareja (no siempre da igual).
 *
 *  El módulo es puro y determinístico salvo por `seed`. Pensado para poder
 *  enchufar un LLM más adelante sin tocar el resto del sistema.
 */

export type TeamPlayer = {
  playerId: number | null; // null para invitados sin cuenta
  name: string;
  stars: number;
  isGoalkeeper: boolean;
  isGuest: boolean;
  preferredPosition?: string | null; // 'GK' | 'DEF' | 'MED' | 'DEL'
  preferredFoot?: string | null; // 'R' | 'L' | 'BOTH'
};

export type TeamSplit = {
  teamA: TeamPlayer[];
  teamB: TeamPlayer[];
  starsA: number;
  starsB: number;
  avgA: number;
  avgB: number;
  /** Diferencia de PROMEDIO de estrellas (lo que se minimiza). */
  diff: number;
};

function avg(list: TeamPlayer[]): number {
  return list.length ? sumStars(list) / list.length : 0;
}

/**
 * Mejora local: intercambia jugadores entre equipos (arquero↔arquero,
 * campo↔campo, así no rompe el "un arquero por lado" ni los tamaños) mientras
 * eso achique la diferencia de PROMEDIO de estrellas. Hill-climbing simple.
 */
function improveBySwaps(A: TeamPlayer[], B: TeamPlayer[]) {
  let guard = 0;
  for (;;) {
    if (guard++ > 100) break;
    const curDiff = Math.abs(avg(A) - avg(B));
    const totalA = sumStars(A);
    const totalB = sumStars(B);
    let bestGain = 1e-9;
    let bi = -1;
    let bj = -1;
    for (let i = 0; i < A.length; i++) {
      for (let j = 0; j < B.length; j++) {
        if (A[i]!.isGoalkeeper !== B[j]!.isGoalkeeper) continue;
        const sa = Number(A[i]!.stars) || 0;
        const sb = Number(B[j]!.stars) || 0;
        const newDiff = Math.abs((totalA - sa + sb) / A.length - (totalB - sb + sa) / B.length);
        const gain = curDiff - newDiff;
        if (gain > bestGain) {
          bestGain = gain;
          bi = i;
          bj = j;
        }
      }
    }
    if (bi < 0) break;
    const tmp = A[bi]!;
    A[bi] = B[bj]!;
    B[bj] = tmp;
  }
}

// PRNG determinístico (mulberry32) para no depender de Math.random global.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

function sumStars(list: TeamPlayer[]): number {
  return list.reduce((acc, p) => acc + (Number(p.stars) || 0), 0);
}

/** Genera una partición candidata respetando arqueros y tamaños parejos. */
function candidate(players: TeamPlayer[], rnd: () => number): TeamSplit {
  const keepers = players.filter((p) => p.isGoalkeeper);
  const field = players.filter((p) => !p.isGoalkeeper);

  const teamA: TeamPlayer[] = [];
  const teamB: TeamPlayer[] = [];

  // 1) Repartir arqueros: hasta uno por equipo.
  const shuffledKeepers = shuffle(keepers, rnd);
  if (shuffledKeepers[0]) teamA.push(shuffledKeepers[0]);
  if (shuffledKeepers[1]) teamB.push(shuffledKeepers[1]);
  // Arqueros extra (3+) van al campo como uno más.
  const extraKeepers = shuffledKeepers.slice(2);

  // 2) Repartir el resto por estrellas (greedy) sobre un orden algo aleatorio.
  const pool = [...extraKeepers, ...field];
  // Orden principal: estrellas desc, con un pequeño ruido para variar.
  const ordered = shuffle(pool, rnd).sort(
    (p, q) => Number(q.stars) - Number(p.stars)
  );

  const targetSize = Math.ceil(players.length / 2);
  for (const p of ordered) {
    const aFull = teamA.length >= targetSize;
    const bFull = teamB.length >= targetSize;
    if (aFull && !bFull) {
      teamB.push(p);
    } else if (bFull && !aFull) {
      teamA.push(p);
    } else {
      // Greedy por PROMEDIO: probar el jugador en cada equipo y quedarse con
      // la opción que deja los promedios de estrellas más parejos.
      const s = Number(p.stars) || 0;
      const avgIfA = (sumStars(teamA) + s) / (teamA.length + 1);
      const avgIfB = (sumStars(teamB) + s) / (teamB.length + 1);
      const diffIfA = Math.abs(avgIfA - avg(teamB));
      const diffIfB = Math.abs(avg(teamA) - avgIfB);
      if (diffIfA <= diffIfB) teamA.push(p);
      else teamB.push(p);
    }
  }

  // Pulido final: intercambios que acerquen los promedios.
  improveBySwaps(teamA, teamB);

  const starsA = sumStars(teamA);
  const starsB = sumStars(teamB);
  const avgA = avg(teamA);
  const avgB = avg(teamB);
  return { teamA, teamB, starsA, starsB, avgA, avgB, diff: Math.abs(avgA - avgB) };
}

function positionalImbalance(teamA: TeamPlayer[], teamB: TeamPlayer[]): number {
  let defA = 0, defB = 0, fwdA = 0, fwdB = 0;
  for (const p of teamA) {
    const pos = (p.preferredPosition || "").toUpperCase();
    if (pos === "DEF") defA++;
    else if (pos === "FWD" || pos === "DEL") fwdA++;
  }
  for (const p of teamB) {
    const pos = (p.preferredPosition || "").toUpperCase();
    if (pos === "DEF") defB++;
    else if (pos === "FWD" || pos === "DEL") fwdB++;
  }
  return (Math.abs(defA - defB) + Math.abs(fwdA - fwdB)) * 0.12;
}

/**
 * Arma los equipos probando varias candidatas y quedándose con la más pareja.
 * `seed` permite reproducir un sorteo o variarlo al regenerar.
 */
export function buildBalancedTeams(
  players: TeamPlayer[],
  seed = 1,
  candidates = 200
): TeamSplit {
  if (players.length === 0) {
    return { teamA: [], teamB: [], starsA: 0, starsB: 0, avgA: 0, avgB: 0, diff: 0 };
  }
  let best: TeamSplit | null = null;
  let bestScore = Infinity;

  for (let i = 0; i < candidates; i++) {
    const rnd = mulberry32(seed + i * 2654435761);
    const c = candidate(players, rnd);
    const posPenalty = positionalImbalance(c.teamA, c.teamB);
    const score = c.diff + posPenalty;

    if (!best || score < bestScore - 1e-9 || (Math.abs(score - bestScore) < 1e-9 && Math.abs(c.starsA - c.starsB) < Math.abs(best.starsA - best.starsB))) {
      best = c;
      bestScore = score;
    }
    if (bestScore < 1e-9 && Math.abs(best.starsA - best.starsB) < 1e-9) break;
  }
  return best!;
}
