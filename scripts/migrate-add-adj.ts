// Migración puntual: agrega columnas de ajuste manual de historial (idempotente).
// Uso: npx tsx scripts/migrate-add-adj.ts
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS adj_won integer NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS adj_drawn integer NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS adj_lost integer NOT NULL DEFAULT 0`;
  console.log("✓ columnas adj_won / adj_drawn / adj_lost listas");
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
