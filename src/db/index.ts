import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

let cachedUrl: string | undefined;
let cachedDb: NeonHttpDatabase | undefined;

function getDb(): NeonHttpDatabase {
  const url =
    process.env.DATABASE_URL || "postgresql://invalid:invalid@localhost/invalid";
  if (!cachedDb || cachedUrl !== url) {
    const sql = neon(url);
    cachedDb = drizzle(sql);
    cachedUrl = url;
  }
  return cachedDb;
}

// Proxy perezoso para que en Cloudflare Workers / Edge `process.env.DATABASE_URL`
// se lea dentro del contexto de cada request y no en el top-level global.
export const db = new Proxy({} as NeonHttpDatabase, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export * from "./schema";
