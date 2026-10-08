// Test rápido de la lógica núcleo (sin DB). Uso: npx tsx scripts/test-logic.ts
import { computeSelection } from "../src/lib/selection";
import { buildBalancedTeams, type TeamPlayer } from "../src/lib/teams";
import { nextMatchDate, signupWindow, formatArt } from "../src/lib/time";
import { suggestRating } from "../src/lib/rating";

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) console.log("  ✓", msg);
  else {
    console.error("  ✗ FALLA:", msg);
    failures++;
  }
}

console.log("\n[1] Selección por prioridad");
{
  // 12 anotados; los de prioridad más baja (número menor) deben jugar.
  const base = new Date("2026-06-20T12:00:00Z").getTime();
  const signups = Array.from({ length: 12 }, (_, i) => ({
    playerId: i + 1,
    priorityOrder: i + 1, // 1..12
    signupAt: new Date(base + (12 - i) * 1000), // los de mayor prioridad se anotaron último a propósito
  }));
  const sel = computeSelection(signups, 10);
  const playing = sel.filter((s) => s.status === "playing").map((s) => s.playerId);
  assert(playing.length === 10, "juegan exactamente 10");
  assert(
    JSON.stringify(playing) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    "juegan los de prioridad 1..10 sin importar el orden de anotación"
  );
  const subs = sel.filter((s) => s.status === "substitute");
  assert(subs.length === 2 && subs[0].substituteIndex === 1, "2 suplentes, el primero es S1 (prioridad 11)");
  assert(subs[0].playerId === 11, "suplente 1 = jugador de prioridad 11");
}

console.log("\n[2] Desempate por hora de anotación (orden 8 compartido)");
{
  const t0 = new Date("2026-06-20T10:00:00Z");
  const t1 = new Date("2026-06-20T11:00:00Z");
  const sel = computeSelection(
    [
      { playerId: 100, priorityOrder: 8, signupAt: t1 }, // se anotó después
      { playerId: 101, priorityOrder: 8, signupAt: t0 }, // se anotó antes
    ],
    1
  );
  assert(sel[0].playerId === 101, "con misma prioridad, juega el que se anotó primero");
}

console.log("\n[3] Armado de equipos balanceado");
{
  const players: TeamPlayer[] = [
    { playerId: 1, name: "A", stars: 5, isGoalkeeper: false, isGuest: false },
    { playerId: 2, name: "B", stars: 4.5, isGoalkeeper: false, isGuest: false },
    { playerId: 3, name: "C", stars: 4, isGoalkeeper: false, isGuest: false },
    { playerId: 4, name: "D", stars: 3.5, isGoalkeeper: false, isGuest: false },
    { playerId: 5, name: "E", stars: 3, isGoalkeeper: false, isGuest: false },
    { playerId: 6, name: "F", stars: 2.5, isGoalkeeper: false, isGuest: false },
    { playerId: 7, name: "Gk1", stars: 2, isGoalkeeper: true, isGuest: false },
    { playerId: 8, name: "Gk2", stars: 2, isGoalkeeper: true, isGuest: false },
    { playerId: 9, name: "H", stars: 4, isGoalkeeper: false, isGuest: false },
    { playerId: 10, name: "I", stars: 3, isGoalkeeper: false, isGuest: false },
  ];
  const split = buildBalancedTeams(players, 42);
  assert(split.teamA.length === 5 && split.teamB.length === 5, "5 vs 5");
  const gkA = split.teamA.filter((p) => p.isGoalkeeper).length;
  const gkB = split.teamB.filter((p) => p.isGoalkeeper).length;
  assert(gkA === 1 && gkB === 1, "un arquero por equipo");
  assert(split.diff <= 0.4, `promedios de estrellas casi iguales (Δprom=${split.diff.toFixed(2)})`);
  console.log(`     A=${split.starsA}⭐ (prom ${split.avgA.toFixed(2)})  B=${split.starsB}⭐ (prom ${split.avgB.toFixed(2)})`);
}

console.log("\n[3b] Equipos con tamaños impares (parejo por promedio)");
{
  // 11 jugadores -> 6 vs 5; el total no puede ser igual, pero el PROMEDIO sí debe acercarse
  const players: TeamPlayer[] = Array.from({ length: 11 }, (_, i) => ({
    playerId: i + 1,
    name: `P${i}`,
    stars: 3 + ((i % 5) - 2) * 0.5, // 2..4
    isGoalkeeper: i < 2, // 2 arqueros
    isGuest: false,
  }));
  const split = buildBalancedTeams(players, 7);
  const sizes = [split.teamA.length, split.teamB.length].sort();
  assert(sizes[0] === 5 && sizes[1] === 6, "reparte 6 vs 5");
  assert(split.diff <= 0.3, `promedios parejos pese a tamaños distintos (Δprom=${split.diff.toFixed(2)})`);
}

console.log("\n[5] Sugerencia de rating");
{
  // Pocos partidos -> sin sugerencia
  assert(suggestRating({ won: 2, drawn: 0, lost: 1 }, 3) === null, "con <4 PJ no sugiere nada");
  // Domina -> sube
  const up = suggestRating({ won: 9, drawn: 1, lost: 2 }, 3);
  assert(up !== null && up.direction === "up" && up.delta >= 0.5, `gana mucho más → sube (${up?.suggested}★)`);
  // Pierde mucho -> baja
  const down = suggestRating({ won: 1, drawn: 1, lost: 8 }, 4);
  assert(down !== null && down.direction === "down" && down.delta <= -0.5, `pierde mucho → baja (${down?.suggested}★)`);
  // Equilibrado -> sin sugerencia
  assert(suggestRating({ won: 5, drawn: 2, lost: 5 }, 3) === null, "récord parejo → no sugiere");
  // Tope: no pasa de 5
  const cap = suggestRating({ won: 20, drawn: 0, lost: 0 }, 5);
  assert(cap === null, "ya en 5★ y gana todo → no puede subir más");
}

console.log("\n[4] Fechas ART (miércoles 22:00, cierre 12:00, apertura miér. previo 23:00)");
{
  const md = nextMatchDate(new Date("2026-06-21T15:00:00Z")); // dom 21/06 12:00 ART
  const parts = formatArt(md, "EEEE HH:mm");
  assert(parts.toLowerCase().includes("22:00"), `partido a las 22:00 ART (${parts})`);
  const { opensAt, closesAt } = signupWindow(md);
  assert(formatArt(closesAt, "HH:mm") === "12:00", `cierra 12:00 ART (${formatArt(closesAt, "EEEE HH:mm")})`);
  assert(formatArt(opensAt, "HH:mm") === "23:00", `abre 23:00 ART (${formatArt(opensAt, "EEEE HH:mm")})`);
  assert(closesAt.getTime() < md.getTime(), "cierre antes del partido");
  assert(opensAt.getTime() < closesAt.getTime(), "apertura antes del cierre");
}

console.log(failures === 0 ? "\n✅ TODO OK\n" : `\n❌ ${failures} fallas\n`);
process.exit(failures === 0 ? 0 : 1);
