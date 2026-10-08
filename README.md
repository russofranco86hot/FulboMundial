# ⚽ Fútbol de los Miércoles

App **mobile-first (PWA)** para gestionar el fútbol 5 de los miércoles: anotarse,
selección de titulares/suplentes **por prioridad**, armado de equipos balanceado,
resultados, historial y **notificaciones push**. Toda la interfaz está en
**español rioplatense**.

Stack: **Next.js 15 (App Router) + TypeScript + Tailwind**, **Neon Postgres**
con **Drizzle ORM**, **Auth.js (NextAuth v5)** con Google, **Web Push (VAPID)** y
**Vercel Cron**.

---

## 🚀 Puesta en marcha rápida (local)

```bash
npm install
cp .env.example .env.local      # completá las variables (ver abajo)
npm run icons                   # genera los íconos PWA (ya vienen incluidos)
npm run db:push                 # crea las tablas en Neon (o: npm run db:generate + migrate)
npm run db:seed                 # carga los 21 jugadores + primer partido
npm run dev                     # http://localhost:3000
```

Para producción: `npm run build && npm start`.

---

## 🔑 Variables de entorno

Todas se documentan en [`.env.example`](./.env.example). Cargalas en **Vercel →
Project → Settings → Environment Variables**.

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Connection string de **Neon** (con `?sslmode=require`). |
| `AUTH_SECRET` | Secreto de Auth.js. Generalo con `npx auth secret`. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Credenciales OAuth de Google. |
| `NEXTAUTH_URL` | URL pública de la app (en local `http://localhost:3000`). |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Claves Web Push. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | La clave **pública** VAPID (la usa el navegador). |
| `ADMIN_PASSWORD` | Clave del panel de admin (default **`pelota`**). |
| `CRON_SECRET` | Protege los endpoints de cron. |

---

## 🐘 Neon Postgres

1. Creá un proyecto en [neon.tech](https://neon.tech) y copiá la **connection
   string** (rol → *Pooled connection*).
2. Pegala en `DATABASE_URL`.
3. Creá el esquema: `npm run db:push` (aplica el schema directo) **o**
   `npm run db:generate` para regenerar SQL en `drizzle/` y aplicarlo con tu
   herramienta de migraciones.
4. Sembrá los datos: `npm run db:seed`.

El cliente usa el driver **serverless HTTP** de Neon, ideal para Vercel.

---

## 🔐 Google OAuth (login de jugadores)

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services →
   Credentials → Create OAuth client ID → Web application**.
2. **Authorized JavaScript origins**: `http://localhost:3000` y tu dominio de Vercel.
3. **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://TU-DOMINIO.vercel.app/api/auth/callback/google`
4. Copiá *Client ID* y *Client secret* a `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.

**Vínculo jugador ↔ Google:** el primer login crea una sesión, pero el jugador no
queda asociado hasta que el **admin** carga su **email de Google** en el panel
(*Admin → Jugadores → campo email*). Mientras tanto ve la pantalla
“Esperá a que el admin te vincule”.

---

## 🔔 Web Push (VAPID)

1. Generá el par de claves: `npx web-push generate-vapid-keys --json`.
2. Cargá `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, y repetí la pública en
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. `VAPID_SUBJECT` es un `mailto:`.
3. En la app, tocá **“Activar notificaciones”** para suscribirte.

> **iPhone/iOS:** las notificaciones push **solo** funcionan si la app está
> **instalada** (Compartir → “Agregar a inicio”). La app avisa esto en pantalla.

---

## ⏰ Vercel Cron

Definidos en [`vercel.json`](./vercel.json). Argentina es **UTC−3 fijo** (sin
horario de verano), así que las horas son estables:

| Tarea | Hora ART | Cron (UTC) | Endpoint |
|---|---|---|---|
| Abrir lista + avisar | Miér 23:00 | `0 2 * * 4` | `/api/cron/open-signups` |
| Cerrar lista + lista final | Miér 12:00 | `0 15 * * 3` | `/api/cron/close-signups` |
| Recordatorio del partido | Miér 18:00 | `0 21 * * 3` | `/api/cron/match-reminder` |

Vercel manda el header `Authorization: Bearer $CRON_SECRET`; los endpoints lo
verifican y devuelven **401** si no coincide.

---

## 🧠 Las dos reglas centrales (están centralizadas y comentadas)

- **Selección por prioridad** → [`src/lib/selection.ts`](./src/lib/selection.ts).
  Para jugar hay que anotarse, pero **no importa el orden de anotación**: al
  cerrar la lista juegan los `capacity` (10) anotados de **menor `priority_order`**
  (mayor prioridad). El resto son suplentes por la misma prioridad. Empates de
  orden (p.ej. JuanCe/Lucho, orden 8) se desempatan por hora de anotación.
- **Armado de equipos** → [`src/lib/teams.ts`](./src/lib/teams.ts). Algoritmo
  determinístico balanceado por estrellas, con un arquero por equipo y
  aleatoriedad controlada (genera varias candidatas y elige la más pareja).
  Modular para enchufar un LLM más adelante.

Test rápido de la lógica (sin DB): `npx tsx scripts/test-logic.ts`.

---

## 👑 Panel de admin (clave `pelota`)

`/admin` → ingresás la clave (`ADMIN_PASSWORD`). Se guarda en una cookie firmada
httpOnly. Desde ahí podés modificar **todo**:

- **Jugadores:** crear/editar/eliminar, histórico, arquero, **estrellas (0–5,
  medias)**, marcar invitado, **vincular email de Google**, **reordenar el
  ranking** (▲▼).
- **Partido:** abrir/crear, cerrar/reabrir la lista, anotar/quitar jugadores a
  mano, **generar equipos balanceados**, editar equipos (cambiar de lado /
  quitar), **agregar invitados**, y **publicar equipos** (push).
- **Resultado:** cargar marcador A–B (calcula G/E/P y registra asistencia),
  editable después.
- **Push:** mensaje libre a todos.

---

## 📦 Deploy en Vercel

1. Importá el repo en Vercel.
2. Cargá todas las variables de entorno.
3. Deploy. Vercel detecta los cron de `vercel.json` automáticamente.
4. Post-deploy (una vez): corré las migraciones (`db:push`) y el seed (`db:seed`)
   apuntando a la `DATABASE_URL` de producción.

---

## 🧱 Modelo de datos

`players`, `matches`, `signups`, `teams`, `results`, `push_subscriptions`,
`attendance_log` (ver [`src/db/schema.ts`](./src/db/schema.ts)). Las estadísticas
G/E/P **se derivan por consulta** de `teams` + `results` (no se hardcodean) —
ver `getStandings()` en [`src/lib/queries.ts`](./src/lib/queries.ts).

---

## 📝 Supuestos tomados (one-shot)

- **Histórico inicial = los de `priority_order` ≤ 10** (incluye a ambos del orden
  8). El admin lo edita libremente.
- **JuanCe y Lucho** comparten orden 8; el desempate efectivo es por hora de
  anotación. El admin puede separarlos con ▲▼.
- **Invitados** se guardan como filas de `players` con `is_guest = true`: suman
  para el armado de equipos y el resultado, pero **no** aparecen en el historial
  (la tabla los excluye), salvo que el admin les saque la marca de invitado.
- **Vínculo Google** por **email** que carga el admin (no hay autoservicio para
  evitar suplantaciones; el admin tiene la última palabra).
- El estado del partido pasa a `finished` al cargar el resultado.
