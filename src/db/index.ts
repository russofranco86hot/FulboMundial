import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Cliente Drizzle sobre Neon (HTTP serverless — ideal para Vercel).
// No se conecta hasta que se ejecuta una query, así el build no necesita DB.
const sql = neon(process.env.DATABASE_URL || "postgresql://invalid:invalid@localhost/invalid");

export const db = drizzle(sql, { schema });
export * from "./schema";
