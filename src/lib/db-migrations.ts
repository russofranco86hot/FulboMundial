import "server-only";
import { db } from "@/db";
import { sql } from "drizzle-orm";

let migrationPromise: Promise<void> | null = null;

/**
 * En producción (Cloudflare Workers / Vercel), todas las tablas y columnas ya están creadas en Neon.
 * Evitamos ejecutar ~20 consultas DDL (`ALTER TABLE` / `CREATE TABLE`) en cada arranque en frío
 * para no consumir el límite de 50 subrequests por invocación de Cloudflare Workers.
 * Si se necesita correr migraciones explícitamente, definir `RUN_DB_MIGRATIONS="true"`.
 */
export async function ensureDbUpgrades(): Promise<void> {
  if (process.env.RUN_DB_MIGRATIONS !== "true") {
    return;
  }

  if (!migrationPromise) {
    migrationPromise = runMigrationsOnce();
  }
  return migrationPromise;
}

async function runMigrationsOnce(): Promise<void> {
  try {
    await db.execute(sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS preferred_position TEXT DEFAULT 'MED';`);
    await db.execute(sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS preferred_foot TEXT DEFAULT 'R';`);
    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS pts_win INTEGER NOT NULL DEFAULT 3;`);
    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS pts_draw INTEGER NOT NULL DEFAULT 2;`);
    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS pts_loss INTEGER NOT NULL DEFAULT 1;`);
    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS team_a_name TEXT NOT NULL DEFAULT 'Claro';`);
    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS team_b_name TEXT NOT NULL DEFAULT 'Oscuro';`);
    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_pro BOOLEAN NOT NULL DEFAULT FALSE;`);
    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS pro_plan TEXT;`);
    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ;`);
    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;`);
    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;`);
    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS mp_preapproval_id TEXT;`);
    await db.execute(sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_a_name TEXT;`);
    await db.execute(sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_b_name TEXT;`);
    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS admin_notify_preference TEXT NOT NULL DEFAULT 'both';`);
  } catch (err) {
    console.error("Error running DB upgrades:", err);
  }
}
