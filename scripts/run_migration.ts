import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import * as fs from "fs";

async function main() {
  const sqlContent = fs.readFileSync("drizzle/0001_daily_loki.sql", "utf-8");
  const sql = neon(process.env.DATABASE_URL!);
  
  // Drizzle migration files use --> statement-breakpoint as separator
  const statements = sqlContent.split("--> statement-breakpoint").map(s => s.trim()).filter(s => s.length > 0);
  
  for (const stmt of statements) {
    console.log("Executing:", stmt.substring(0, 50) + "...");
    try {
      await sql(stmt);
    } catch (e: any) {
      console.error("Error executing statement:", e.message);
    }
  }
  console.log("Done");
}

main();
