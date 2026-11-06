# Publicar FulboMundial en Google Play (TWA / AAB)

Dominio: `https://fulbomundial.com.ar`

## 0. Antes de empezar
1. En Vercel → Settings → Environment Variables (Production) definí:
   - `NEXTAUTH_URL=https://fulbomundial.com.ar` (y `AUTH_URL` si la usás)
   - `NEXT_PUBLIC_MP_PRO_LINK` = link de pago/suscripción de Mercado Pago
   - `NEXT_PUBLIC_PRO_WHATSAPP` = tu número (ej. `5491122334455`)
   - `NEXT_PUBLIC_PRO_PRICE` = ej. `$4.000 / mes`
2. En Google Cloud Console → Credenciales OAuth, agregá `https://fulbomundial.com.ar` como origen autorizado y
   `https://fulbomundial.com.ar/api/auth/callback/google` como redirect URI.
3. Cuenta de desarrollador de Google Play (pago único USD 25).

## 1. Generar el .aab (opción fácil: PWABuilder)
1. https://www.pwabuilder.com → pegá `https://fulbomundial.com.ar` → Start.
2. Package for stores → Android → Google Play.
3. Package ID: `ar.com.fulbomundial.app` (no se puede cambiar después).
4. Name: FulboMundial · Launcher name: FulboMundial · Version 1 / 1.0.0.
5. Signing key: "Create new" y **guardá el .keystore y las contraseñas** (si los perdés no podés actualizar la app).
6. Descargá el ZIP: trae el `.aab` (para subir a Play) y `assetlinks.json`.

## 2. Verificar el dominio (quita la barra del navegador)
1. En Play Console, al subir el .aab, activá **Play App Signing**.
2. Play Console → Release → Setup → App signing → copiá el **SHA-256 del certificado de firma de la app**.
3. Editá `public/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "ar.com.fulbomundial.app",
      "sha256_cert_fingerprints": [
        "SHA256_DE_PLAY_APP_SIGNING",
        "SHA256_DE_TU_KEYSTORE_DE_PWABUILDER"
      ]
    }
  }
]
```
4. Deploy y verificá que abra: `https://fulbomundial.com.ar/.well-known/assetlinks.json`.

## 3. Ficha en Play Console
- Ícono 512×512 (ya está en `public/icons/icon-512.png`), gráfico de funciones 1024×500, mín. 2 capturas de celular.
- Descripción corta (80 car.): "Organizá tu fútbol: anotate, equipos parejos, stats y relatos con IA."
- Política de privacidad (URL pública, obligatoria): creá `/privacidad` o usá una página externa.
- Formulario "Seguridad de los datos": email y nombre (login), notificaciones push.
- Clasificación de contenido: apta para todos.
- Países: Argentina (y los que quieras).
- Cuentas nuevas personales: Google exige **prueba cerrada con 12 testers durante 14 días** antes de producción.

## 4. Pagos
Los pagos del plan PRO son por Mercado Pago fuera de la app (servicio entre usuarios/organizadores). Evitá
mostrar el botón de pago dentro de la TWA si Google lo considera "bienes digitales": si te observan, ocultá la
tarjeta PRO cuando `document.referrer` empiece con `android-app://` o dirigí el pago a la web.

## 5. Actualizaciones
La app es una web: cada deploy en Vercel se refleja sin republicar. Solo republicás el .aab si cambiás
ícono, nombre, package o colores del manifest (subí `versionCode` +1).
