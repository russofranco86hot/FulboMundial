# Guía de Producción: Dominio Personalizado, DNS y Pasarelas de Pago (FulboMundial / Fulboy)

Esta guía documenta paso a paso la puesta en producción de **FulboMundial (`fulbomundial.com.ar`)**, la configuración de registros DNS desde **NIC.ar / Cloudflare / Porkbun**, la migración de base de datos en **Neon** y la conexión de Webhooks de **Mercado Pago** y **Stripe**.

---

## 1. Configuración de Dominio Personalizado y DNS

### Paso 1.1: Delegación en NIC.ar (para dominios `.com.ar`)
1. Ingresá a **[Trámites a Distancia (TAD) - NIC Argentina](https://nic.ar)**.
2. Seleccioná tu dominio `fulbomundial.com.ar` ➔ **Delegar**.
3. Agregá los **Nameservers (NS)** que te asignó tu cuenta de **Cloudflare** (por ejemplo: `xxxx.ns.cloudflare.com` y `yyyy.ns.cloudflare.com`) y guardá.

---

### Paso 1.2: Registros DNS Exactos (`A` y `CNAME`)

Dependiendo de la plataforma donde esté corriendo el tráfico de producción:

#### Opción A — Despliegue en **Cloudflare Workers (OpenNext)** *(Configuración activa actual)*
En **[dash.cloudflare.com](https://dash.cloudflare.com)** ➔ **`fulbomundial.com.ar`** ➔ **DNS ➔ Records**:

| Tipo | Nombre (Host) | Valor / Destino | Proxy Status (Nube) | TTL |
| :--- | :--- | :--- | :--- | :--- |
| **`A`** | `@` (`fulbomundial.com.ar`) | `192.0.2.1` *(o IP existente)* | **Proxied (Nube Naranja ☁️)** | Auto |
| **`CNAME`** | `www` | `fulbomundial.com.ar` | **Proxied (Nube Naranja ☁️)** | Auto |

> **Importante:** Al tener **Proxy Status = Proxied (Nube Naranja)**, las rutas configuradas en `wrangler.jsonc` (`fulbomundial.com.ar/*` y `www.fulbomundial.com.ar/*`) interceptan las peticiones en el borde de Cloudflare y las resuelven directamente en el Worker sin pasar por servidores externos.

---

#### Opción B — Despliegue en **Vercel** (Desde Cloudflare, Porkbun o cualquier registrador)
Si apuntás el dominio hacia los servidores de **Vercel**:

1. En tu proyecto de Vercel, entrá a **Settings ➔ Domains** y agregá `fulbomundial.com.ar` y `www.fulbomundial.com.ar`.
2. En el panel DNS de tu proveedor (**Cloudflare / Porkbun / GoDaddy**), cargá exactamente estos 2 registros:

| Tipo | Nombre (Host) | Valor / Destino | Proxy Status (si usás Cloudflare) | TTL |
| :--- | :--- | :--- | :--- | :--- |
| **`A`** | `@` (raíz) | `76.76.21.21` | DNS Only (Nube Gris) | Auto / 600 |
| **`CNAME`** | `www` | `cname.vercel-dns.com` | DNS Only (Nube Gris) | Auto / 600 |

3. En Cloudflare ➔ **SSL/TLS ➔ Overview**, seleccioná el modo **Full (strict)** para evitar bucles de redirección (`ERR_TOO_MANY_REDIRECTS`).

---

## 2. Migración de Base de Datos (Esquema Freemium PRO)

La aplicación ejecuta estas migraciones **automáticamente** en su primer arranque mediante `ensureDbUpgrades()` (`src/lib/db-migrations.ts`). Si deseás aplicarlas manualmente desde el **SQL Editor de Neon**:

```sql
-- 1. Columnas de estado PRO en la tabla de grupos
ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_pro BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS pro_plan TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS mp_preapproval_id TEXT;

-- 2. Tabla de auditoría e idempotencia de pagos (Webhooks)
CREATE TABLE IF NOT EXISTS subscription_transactions (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  external_event_id TEXT NOT NULL UNIQUE,
  payment_id TEXT,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
  plan_id TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ARS',
  status TEXT NOT NULL,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscription_tx_event_uniq ON subscription_transactions(external_event_id);
CREATE INDEX IF NOT EXISTS subscription_tx_group_idx ON subscription_transactions(group_id);
```

---

## 3. Configuración de Pasarelas de Pago y Webhooks

### 3.1 Mercado Pago (Cobros locales en ARS)
1. Entrá a **[Mercado Pago Developers](https://www.mercadopago.com.ar/developers/panel/app)** y creá una aplicación de **Checkout Pro**.
2. En **Credenciales de producción**, copiá:
   * **Public Key** ➔ `NEXT_PUBLIC_MP_PUBLIC_KEY`
   * **Access Token** ➔ `MP_ACCESS_TOKEN`
3. En el menú lateral de tu app de Mercado Pago, entrá a **Webhooks ➔ Configurar notificaciones**:
   * **URL de producción:** `https://fulbomundial.com.ar/api/webhooks/mercadopago`
   * **Eventos a escuchar:** Seleccioná **Pagos (`payment`)**.
   * Al guardar, Mercado Pago te mostrará una **Clave secreta (Secret signature)**: copiala en la variable `MP_WEBHOOK_SECRET`.

### 3.2 Stripe (Cobros internacionales en USD)
1. Entrá a **[Stripe Dashboard ➔ Developers ➔ API keys](https://dashboard.stripe.com/apikeys)**.
2. Copiá:
   * **Publishable key** ➔ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   * **Secret key** ➔ `STRIPE_SECRET_KEY`
3. Andá a **Developers ➔ Webhooks ➔ Add endpoint**:
   * **Endpoint URL:** `https://fulbomundial.com.ar/api/webhooks/stripe`
   * **Events to listen:**
     * `checkout.session.completed`
     * `invoice.payment_succeeded`
     * `customer.subscription.deleted`
   * Copiá el **Signing secret (`whsec_...`)** en la variable `STRIPE_WEBHOOK_SECRET`.

---

## 4. Comandos de Despliegue

### Despliegue en Cloudflare Workers:
```powershell
# Compilar y desplegar en Cloudflare Workers
npm.cmd run cf:build
npx.cmd wrangler deploy

# Cargar claves de pasarelas de pago en Cloudflare
npx.cmd wrangler secret put MP_ACCESS_TOKEN
npx.cmd wrangler secret put MP_WEBHOOK_SECRET
npx.cmd wrangler secret put STRIPE_SECRET_KEY
npx.cmd wrangler secret put STRIPE_WEBHOOK_SECRET
```

### Despliegue en Vercel:
```powershell
npx.cmd vercel --prod
```
