import { Hono } from "hono";
import { verifyCredentials, registerOrSetPassword } from "@/lib/auth-credentials";
import {
  clearSessionCookieHeader,
  createSessionCookieHeader,
  signSessionJwt,
} from "@/lib/edge-auth";
import { getRequestContext, runWithRequestContext, type ContextUser } from "@/lib/request-context";
import { getCurrentPlayer, getSessionUser } from "@/lib/session";
import { isSuperAdmin } from "@/lib/superadmin";

export const authApp = new Hono();

function safeOriginForOAuth(reqUrl: string): string {
  const url = new URL(reqUrl);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    return url.origin;
  }
  return process.env.APP_URL || "https://fulbomundial.com.ar";
}

function safeCallbackUrl(raw: string | null | undefined, fallback = "/grupos"): string {
  if (!raw) return fallback;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return fallback;
}

authApp.get("/session", async (c) => {
  const user = await getSessionUser();
  if (!user) {
    return c.json({ user: null, player: null, superAdmin: false });
  }
  const [player, superAdmin] = await Promise.all([
    getCurrentPlayer(),
    isSuperAdmin(),
  ]);
  return c.json({ user, player, superAdmin });
});

authApp.post("/login", async (c) => {
  try {
    const body = (await c.req.json()) as { email?: string; password?: string };
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return c.json({ ok: false, error: "Por favor ingresá tu correo y contraseña." }, 400);
    }

    const player = await verifyCredentials(email, password);
    if (!player) {
      return c.json({ ok: false, error: "Correo o contraseña incorrectos." }, 401);
    }

    const sessionUser: ContextUser = {
      name: player.name,
      email: player.email,
      googleId: player.googleId || undefined,
    };

    const token = await signSessionJwt(sessionUser);
    const ctx = getRequestContext();
    if (ctx) {
      ctx.setCookies.push(createSessionCookieHeader(token, c.req.url));
    }

    return c.json({ ok: true, token, user: sessionUser });
  } catch (err) {
    console.error("[POST /api/auth/login] Error:", err);
    return c.json({ ok: false, error: "Error al iniciar sesión." }, 500);
  }
});

authApp.post("/register", async (c) => {
  try {
    const body = (await c.req.json()) as {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    };
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const confirmPassword = String(body.confirmPassword || "");

    if (!name || !email || !password) {
      return c.json({ ok: false, error: "Por favor completá todos los campos obligatorios." }, 400);
    }
    if (password !== confirmPassword) {
      return c.json({ ok: false, error: "Las contraseñas no coinciden." }, 400);
    }
    if (password.length < 6) {
      return c.json({ ok: false, error: "La contraseña debe tener al menos 6 caracteres." }, 400);
    }

    const res = await registerOrSetPassword({ name, email, password });
    if (!res.ok) {
      return c.json({ ok: false, error: res.error }, 400);
    }

    const sessionUser: ContextUser = { name, email };
    const token = await signSessionJwt(sessionUser);
    const ctx = getRequestContext();
    if (ctx) {
      ctx.setCookies.push(createSessionCookieHeader(token, c.req.url));
    }

    return c.json({ ok: true, token, user: sessionUser });
  } catch (err) {
    console.error("[POST /api/auth/register] Error:", err);
    return c.json({ ok: false, error: "Error registrando la cuenta." }, 500);
  }
});

authApp.post("/logout", async (c) => {
  const ctx = getRequestContext();
  if (ctx) {
    ctx.setCookies.push(clearSessionCookieHeader(c.req.url));
  }
  return c.json({ ok: true });
});

authApp.get("/logout", async (c) => {
  const cb = safeCallbackUrl(c.req.query("callbackUrl"), "/");
  c.header("Set-Cookie", clearSessionCookieHeader(c.req.url));
  return c.redirect(cb);
});

authApp.get("/google", async (c) => {
  const clientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return c.json({ error: "Google OAuth no configurado (AUTH_GOOGLE_ID)." }, 500);
  }
  const cb = safeCallbackUrl(c.req.query("callbackUrl"), "/grupos");
  const origin = safeOriginForOAuth(c.req.url);
  const redirectUri = `${origin}/api/auth/callback/google`;

  const stateObj = { callbackUrl: cb, nonce: crypto.randomUUID() };
  const state = btoa(JSON.stringify(stateObj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("prompt", "select_account");
  googleAuthUrl.searchParams.set("state", state);

  return c.redirect(googleAuthUrl.toString());
});

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/") + "==".slice(0, (4 - (parts[1].length % 4)) % 4);
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

authApp.get("/callback/google", async (c) => {
  const code = c.req.query("code");
  const stateParam = c.req.query("state");
  const errParam = c.req.query("error");

  let cb = "/grupos";
  if (stateParam) {
    try {
      const b64 = stateParam.replace(/-/g, "+").replace(/_/g, "/") + "==".slice(0, (4 - (stateParam.length % 4)) % 4);
      const parsed = JSON.parse(atob(b64)) as { callbackUrl?: string };
      cb = safeCallbackUrl(parsed.callbackUrl, "/grupos");
    } catch {}
  }

  const origin = safeOriginForOAuth(c.req.url);

  if (errParam || !code) {
    return c.redirect(`${origin}/login?error=${encodeURIComponent(errParam || "oauth_failed")}`);
  }

  const clientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return c.redirect(`${origin}/login?error=oauth_misconfigured`);
  }

  const redirectUri = `${origin}/api/auth/callback/google`;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error("[Google OAuth] token error:", tokenRes.status, text);
      return c.redirect(`${origin}/login?error=google_token_error`);
    }

    const tokenJson = (await tokenRes.json()) as {
      id_token?: string;
      access_token?: string;
    };

    let profile = tokenJson.id_token ? decodeJwtPayload(tokenJson.id_token) : null;
    if (!profile && tokenJson.access_token) {
      const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      });
      if (userRes.ok) {
        profile = (await userRes.json()) as Record<string, unknown>;
      }
    }

    if (!profile || (!profile.email && !profile.sub)) {
      return c.redirect(`${origin}/login?error=google_profile_missing`);
    }

    const sessionUser: ContextUser = {
      name: typeof profile.name === "string" ? profile.name : null,
      email: typeof profile.email === "string" ? profile.email.toLowerCase().trim() : null,
      image: typeof profile.picture === "string" ? profile.picture : null,
      googleId: typeof profile.sub === "string" ? profile.sub : undefined,
    };

    // Asegura creación o vinculación inmediata del Player en Neon
    await runWithRequestContext(
      { user: sessionUser, reqUrl: c.req.url, cookies: {} },
      async () => {
        await getCurrentPlayer();
      }
    );

    const jwt = await signSessionJwt(sessionUser);
    c.header("Set-Cookie", createSessionCookieHeader(jwt, c.req.url));

    return c.redirect(`${origin}${cb}`);
  } catch (err) {
    console.error("[Google OAuth callback] Exception:", err);
    return c.redirect(`${origin}/login?error=google_callback_exception`);
  }
});
