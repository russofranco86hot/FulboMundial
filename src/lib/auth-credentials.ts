import "server-only";
import crypto from "crypto";
import { db, players } from "@/db";
import { eq, sql } from "drizzle-orm";

let credentialsTableChecked = false;

export async function ensureCredentialsTable() {
  if (credentialsTableChecked) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS player_credentials (
        id SERIAL PRIMARY KEY,
        player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT player_credentials_email_uniq UNIQUE (email)
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS player_credentials_player_idx ON player_credentials(player_id)
    `);
    credentialsTableChecked = true;
  } catch (err) {
    console.error("Error creating player_credentials table:", err);
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const derived = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(key, "hex");
    if (derived.length !== keyBuffer.length) return false;
    return crypto.timingSafeEqual(derived, keyBuffer);
  } catch {
    return false;
  }
}

/**
 * Valida email y contraseña contra la base de datos.
 * Retorna el objeto Player si es correcto, o null si falla.
 */
export async function verifyCredentials(emailInput: string, passwordInput: string) {
  await ensureCredentialsTable();
  const normalizedEmail = emailInput.toLowerCase().trim();

  let credRow: { player_id: number; password_hash: string } | undefined;
  try {
    const res = await db.execute(sql`
      SELECT player_id, password_hash
      FROM player_credentials
      WHERE lower(email) = ${normalizedEmail}
      LIMIT 1
    `);
    credRow = res.rows[0] as { player_id: number; password_hash: string } | undefined;
  } catch (err) {
    console.warn("Could not query player_credentials:", err);
    return null;
  }

  if (!credRow) return null;

  const valid = verifyPassword(passwordInput, credRow.password_hash);
  if (!valid) return null;

  // Obtener el jugador
  const player = (
    await db
      .select()
      .from(players)
      .where(eq(players.id, credRow.player_id))
      .limit(1)
  )[0];

  return player ?? null;
}

/**
 * Registra o establece una contraseña para un email.
 * Si ya existía un jugador con este email en la tabla players (agregado por un admin),
 * se le asocia la contraseña sin duplicar el jugador.
 */
export async function registerOrSetPassword(params: {
  name: string;
  email: string;
  password: string;
}) {
  await ensureCredentialsTable();
  const normalizedEmail = params.email.toLowerCase().trim();
  const name = params.name.trim();

  if (params.password.length < 6) {
    return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };
  }

  // Verificar si ya tiene contraseña registrada
  try {
    const existingCred = await db.execute(sql`
      SELECT id FROM player_credentials
      WHERE lower(email) = ${normalizedEmail}
      LIMIT 1
    `);
    if (existingCred.rows.length > 0) {
      return {
        ok: false,
        error: "Este correo ya tiene una contraseña registrada. Podés iniciar sesión directamente.",
      };
    }
  } catch (err) {
    console.warn("Error checking existing creds:", err);
  }

  // Buscar si ya existe el jugador en la tabla players
  const existingPlayer = (
    await db
      .select()
      .from(players)
      .where(sql`lower(${players.email}) = ${normalizedEmail}`)
      .limit(1)
  )[0];

  let targetPlayerId: number;

  if (existingPlayer) {
    targetPlayerId = existingPlayer.id;
    // Si no tenía nombre o era genérico y se proporcionó uno nuevo, actualizar
    if (name && (!existingPlayer.name || existingPlayer.name === "Jugador")) {
      await db.update(players).set({ name }).where(eq(players.id, targetPlayerId));
    }
  } else {
    // Crear el jugador nuevo
    const inserted = await db
      .insert(players)
      .values({
        name: name || "Jugador",
        email: normalizedEmail,
        isGuest: false,
        isHistorico: false,
        priorityOrder: 99,
        stars: "3",
      })
      .returning();
    targetPlayerId = inserted[0].id;
  }

  // Guardar credenciales
  const passHash = hashPassword(params.password);
  await db.execute(sql`
    INSERT INTO player_credentials (player_id, email, password_hash, created_at)
    VALUES (${targetPlayerId}, ${normalizedEmail}, ${passHash}, NOW())
    ON CONFLICT (email) DO UPDATE
    SET password_hash = ${passHash}, player_id = ${targetPlayerId}
  `);

  return { ok: true, playerId: targetPlayerId };
}
