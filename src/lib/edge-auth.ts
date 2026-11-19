import type { ContextUser } from "./request-context";

export const SESSION_COOKIE_NAME = "fm_session";
const DEFAULT_MAX_AGE = 30 * 24 * 60 * 60; // 30 días

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getSecretString(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "fulbomundial-dev-fallback-secret-change-in-prod"
  );
}

let cachedKeySecret: string | null = null;
let cachedCryptoKey: CryptoKey | null = null;

async function getHmacKey(): Promise<CryptoKey> {
  const sec = getSecretString();
  if (cachedCryptoKey && cachedKeySecret === sec) {
    return cachedCryptoKey;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(sec),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  cachedCryptoKey = key;
  cachedKeySecret = sec;
  return key;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "==".slice(0, (4 - (str.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

export async function signSessionJwt(
  user: ContextUser,
  expiresInSec = DEFAULT_MAX_AGE
): Promise<string> {
  const headerB64 = toBase64Url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    name: user.name ?? null,
    email: user.email ?? null,
    image: user.image ?? null,
    googleId: user.googleId ?? undefined,
    iat: now,
    exp: now + expiresInSec,
  };
  const payloadB64 = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await getHmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput));
  return `${signingInput}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifySessionJwt(token: string): Promise<ContextUser | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    if (!headerB64 || !payloadB64 || !sigB64) return null;

    const key = await getHmacKey();
    const sigBytes = fromBase64Url(sigB64);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes as BufferSource,
      encoder.encode(`${headerB64}.${payloadB64}`)
    );
    if (!valid) return null;

    const payloadJson = decoder.decode(fromBase64Url(payloadB64));
    const parsed = JSON.parse(payloadJson) as ContextUser & { exp?: number };
    if (typeof parsed.exp === "number" && parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      name: parsed.name ?? null,
      email: parsed.email ?? null,
      image: parsed.image ?? null,
      ...(parsed.googleId ? { googleId: parsed.googleId } : {}),
    };
  } catch {
    return null;
  }
}

export function extractTokenFromRequest(
  req: Request,
  cookiesMap?: Record<string, string>
): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const bearer = authHeader.slice(7).trim();
    if (bearer && bearer !== "null" && bearer !== "undefined") {
      return bearer;
    }
  }
  if (cookiesMap && cookiesMap[SESSION_COOKIE_NAME]) {
    return cookiesMap[SESSION_COOKIE_NAME];
  }
  return null;
}

export function createSessionCookieHeader(
  token: string,
  reqUrl?: string,
  maxAgeSec = DEFAULT_MAX_AGE
): string {
  const isHttps = !reqUrl || reqUrl.startsWith("https://");
  const isProdHost = reqUrl ? reqUrl.includes("fulbomundial.com.ar") : false;
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSec}`,
  ];
  if (isHttps) parts.push("Secure");
  if (isProdHost) parts.push("Domain=.fulbomundial.com.ar");
  return parts.join("; ");
}

export function clearSessionCookieHeader(reqUrl?: string): string {
  const isHttps = !reqUrl || reqUrl.startsWith("https://");
  const isProdHost = reqUrl ? reqUrl.includes("fulbomundial.com.ar") : false;
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (isHttps) parts.push("Secure");
  if (isProdHost) parts.push("Domain=.fulbomundial.com.ar");
  return parts.join("; ");
}
