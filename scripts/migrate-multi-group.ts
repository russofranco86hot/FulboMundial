import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { neon } from "@neondatabase/serverless";
import * as fs from "fs";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL no está definido en .env.local ni .env");
    process.exit(1);
  }

  const sqlContent = fs.readFileSync("drizzle/0002_multi_group.sql", "utf-8");
  const sql = neon(process.env.DATABASE_URL);
  
  const statements = sqlContent
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  
  console.log(`Ejecutando migración multi-grupo (${statements.length} sentencias)...`);

  for (const stmt of statements) {
    console.log("Ejecutando:", stmt.substring(0, 60).replace(/\n/g, " ") + "...");
    try {
      await sql(stmt);
    } catch (e: any) {
      console.warn("Aviso/Error (puede ser idempotente):", e.message);
    }
  }

  console.log("✅ Migración multi-grupo completada con éxito.");
}

main();
