import "server-only";
import { cookies } from "next/headers";
import crypto from "node:crypto";

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
  const c = await cookies();
  c.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endAdminSession() {
  const c = await cookies();
  c.delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  return !!token && verify(token);
}

/** Lanza si no es admin (para usar al inicio de server actions sensibles). */
export async function requireAdmin() {
  if (!(await isAdmin())) {
    throw new Error("No autorizado: se requiere sesión de admin.");
  }
}
