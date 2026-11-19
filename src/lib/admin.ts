import crypto from "node:crypto";
import { getRequestContext } from "./request-context";

const COOKIE = "fm_admin";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 días

function secret() {
  return process.env.AUTH_SECRET || "dev-insecure-secret-change-me";
}

function sign(payload: string): string {
  const h = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${h}`;
}

function verify(token: string): boolean {
  const idx = token.lastIndexOf(".");
  if (idx < 0) return false;
  const payload = token.slice(0, idx);
  const expected = sign(payload);
  // comparación en tiempo constante
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;
  const exp = Number(payload.split(":")[1]);
  return Number.isFinite(exp) && exp > Date.now();
}

/** Compara la clave ingresada contra ADMIN_PASSWORD (default "pelota"). */
export function checkAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || "pelota";
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function startAdminSession() {
  const exp = Date.now() + MAX_AGE * 1000;
  const token = sign(`admin:${exp}`);
  const ctx = getRequestContext();
  if (ctx) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    ctx.setCookies.push(
      `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`
    );
  }
}

export async function endAdminSession() {
  const ctx = getRequestContext();
  if (ctx) {
    ctx.setCookies.push(`${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  }
}

export async function isAdmin(): Promise<boolean> {
  const ctx = getRequestContext();
  const token = ctx?.cookies[COOKIE];
  return !!token && verify(token);
}

/** Lanza si no es admin (para usar al inicio de acciones sensibles). */
export async function requireAdmin() {
  if (!(await isAdmin())) {
    throw new Error("No autorizado: se requiere sesión de admin.");
  }
}
