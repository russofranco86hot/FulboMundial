import "server-only";
import { db } from "@/db";
import { sql } from "drizzle-orm";

let migrationsRun = false;

export async function ensureDbUpgrades() {
  if (migrationsRun) return;

  try {
    // 1. Columnas de perfil futbolístico en players
    try {
      await db.execute(sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS preferred_position TEXT DEFAULT 'MED';`);
      await db.execute(sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS preferred_foot TEXT DEFAULT 'R';`);
    } catch (e) {
      console.warn("Migration notice (player columns):", e);
    }

    // 2. Tabla de configuración de pagos del partido
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS match_payments (
          id SERIAL PRIMARY KEY,
          match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE UNIQUE,
          total_price INTEGER NOT NULL DEFAULT 0,
          payment_alias TEXT,
          notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
    } catch (e) {
      console.warn("Migration notice (match_payments):", e);
    }

    // 3. Tabla de estado de pago por jugador
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS player_payments (
          id SERIAL PRIMARY KEY,
          match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
          player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
          paid BOOLEAN NOT NULL DEFAULT FALSE,
          notified BOOLEAN NOT NULL DEFAULT FALSE,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT player_payments_uniq UNIQUE (match_id, player_id)
        );
      `);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS player_payments_match_idx ON player_payments(match_id);`);
    } catch (e) {
      console.warn("Migration notice (player_payments):", e);
    }

    // 4. Tabla de goles y asistencias por partido
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS match_goals (
          id SERIAL PRIMARY KEY,
          match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
          player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
          goals INTEGER NOT NULL DEFAULT 1,
          assists INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT match_goals_player_match_uniq UNIQUE (match_id, player_id)
        );
      `);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS match_goals_match_idx ON match_goals(match_id);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS match_goals_player_idx ON match_goals(player_id);`);
    } catch (e) {
      console.warn("Migration notice (match_goals):", e);
    }

    migrationsRun = true;
  } catch (err) {
    console.error("Error running DB upgrades:", err);
  }
}
