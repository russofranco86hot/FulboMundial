import { db } from "@/db";
import { sql } from "drizzle-orm";

let migrationPromise: Promise<void> | null = null;

let schemaUpgradesChecked = false;

/**
 * Asegura que las columnas críticas añadidas recientemente existan en la tabla groups, players y matches.
 * Solo corre si RUN_DB_MIGRATIONS="true" o force=true para evitar 4 consultas DDL en cada cold start del Worker.
 */
export async function ensureAdminNotifyPreferenceColumn(force = false): Promise<void> {
  if (!force && process.env.RUN_DB_MIGRATIONS !== "true") return;
  if (schemaUpgradesChecked) return;
  try {
    await db.execute(sql`
      ALTER TABLE groups 
        ADD COLUMN IF NOT EXISTS admin_notify_preference TEXT NOT NULL DEFAULT 'both',
        ADD COLUMN IF NOT EXISTS championship_name TEXT,
        ADD COLUMN IF NOT EXISTS championship_end_date TEXT,
        ADD COLUMN IF NOT EXISTS championship_started_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS championship_summary TEXT,
        ADD COLUMN IF NOT EXISTS championship_history JSONB,
        ADD COLUMN IF NOT EXISTS pts_win INTEGER NOT NULL DEFAULT 3,
        ADD COLUMN IF NOT EXISTS pts_draw INTEGER NOT NULL DEFAULT 2,
        ADD COLUMN IF NOT EXISTS pts_loss INTEGER NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS team_a_name TEXT NOT NULL DEFAULT 'Claro',
        ADD COLUMN IF NOT EXISTS team_b_name TEXT NOT NULL DEFAULT 'Oscuro',
        ADD COLUMN IF NOT EXISTS is_pro BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS pro_plan TEXT,
        ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
        ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
        ADD COLUMN IF NOT EXISTS mp_preapproval_id TEXT
    `);
    try {
      await db.execute(sql`
        ALTER TABLE players 
          ADD COLUMN IF NOT EXISTS preferred_position TEXT DEFAULT 'MED',
          ADD COLUMN IF NOT EXISTS preferred_foot TEXT DEFAULT 'R'
      `);
    } catch (e) {
      console.warn("Could not ensure players columns:", e);
    }
    try {
      await db.execute(sql`
        ALTER TABLE matches 
          ADD COLUMN IF NOT EXISTS team_a_name TEXT,
          ADD COLUMN IF NOT EXISTS team_b_name TEXT
      `);
    } catch (e) {
      console.warn("Could not ensure matches columns:", e);
    }
    try {
      await db.execute(sql`
        ALTER TABLE signups 
          ADD COLUMN IF NOT EXISTS manual_order INTEGER
      `);
    } catch (e) {
      console.warn("Could not ensure signups manual_order column:", e);
    }
    schemaUpgradesChecked = true;
  } catch (err) {
    console.warn("Could not ensure schema columns:", err);
  }
}

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
    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS championship_name TEXT;`);
    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS championship_end_date TEXT;`);
    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS championship_started_at TIMESTAMPTZ;`);
    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS championship_summary TEXT;`);
    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS championship_history JSONB;`);
  } catch (err) {
    console.error("Error running DB upgrades:", err);
  }
}
