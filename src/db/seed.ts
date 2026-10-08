/**
 * Seed inicial. Carga la lista de jugadores con su prioridad.
 * Uso:  npm run db:seed
 *
 * Reglas:
 *  - Los primeros 10 (priority_order <= 10) quedan como HISTÓRICO por defecto (editable por el admin).
 *  - Rodrigo es arquero fijo.
 *  - JuanCe y Lucho comparten el orden 8 (empate permitido).
 */
import { config } from "dotenv";
import { count } from "drizzle-orm";
import { nextMatchDate, signupWindow } from "../lib/time";

// Carga .env.local (preferido) y .env como fallback ANTES de crear el cliente DB.
config({ path: ".env.local" });
config();

type SeedPlayer = { name: string; order: number; gk?: boolean };

const ROSTER: SeedPlayer[] = [
  { name: "Marian", order: 1 },
  { name: "Fran", order: 2 },
  { name: "Brut", order: 3 },
  { name: "Chris", order: 4 },
  { name: "Diego", order: 5 },
  { name: "Mateo", order: 6 },
  { name: "Eze", order: 7 },
  { name: "JuanCe", order: 8 },
  { name: "Lucho", order: 8 },
  { name: "José", order: 9 },
  { name: "Lean", order: 10 },
  { name: "Mauro", order: 11 },
  { name: "Ariel", order: 12 },
  { name: "Tincho", order: 13 },
  { name: "JuanJosé", order: 14 },
  { name: "Lauti", order: 15 },
  { name: "Nano", order: 16 },
  { name: "Pato", order: 17 },
  { name: "Luciano", order: 18 },
  { name: "Rodrigo", order: 19, gk: true },
  { name: "Sergio", order: 20 },
];

async function main() {
  // Import dinámico para que el cliente Neon lea DATABASE_URL ya cargado.
  const { db, players, matches } = await import("./index");

  const [{ value: existing }] = await db
    .select({ value: count() })
    .from(players);

  if (existing > 0) {
    console.log(`Ya hay ${existing} jugadores cargados. No se vuelve a sembrar (borrá la tabla para re-seedear).`);
    return;
  }

  await db.insert(players).values(
    ROSTER.map((p) => ({
      name: p.name,
      priorityOrder: p.order,
      isHistorico: p.order <= 10,
      isGoalkeeper: !!p.gk,
      isGuest: false,
      // estrellas iniciales razonables; el admin las ajusta
      stars: p.order <= 10 ? "3.5" : "3.0",
    }))
  );
  console.log(`✓ ${ROSTER.length} jugadores cargados.`);

  // Crear el primer partido (próximo miércoles 22:00 ART) si no existe ninguno.
  const [{ value: matchCount }] = await db
    .select({ value: count() })
    .from(matches);
  if (matchCount === 0) {
    const matchDate = nextMatchDate();
    const { opensAt, closesAt } = signupWindow(matchDate);
    await db.insert(matches).values({
      matchDate,
      signupOpensAt: opensAt,
      signupClosesAt: closesAt,
      status: "open",
      capacity: 10,
    });
    console.log(`✓ Partido inicial creado para ${matchDate.toISOString()}.`);
  }

  console.log("Seed completo.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
