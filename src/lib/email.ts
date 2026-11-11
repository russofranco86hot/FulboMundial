import "server-only";

export type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

/**
 * Servicio unificado de envío de correos transaccionales.
 * Soporta de forma nativa:
 * 1. Resend API (HTTP standard `RESEND_API_KEY` - 3.000 emails/mes gratis, ideal para Cloudflare Workers / Serverless).
 * 2. Brevo API (HTTP standard `BREVO_API_KEY` / Sendinblue).
 * 3. Mailgun / Generic HTTP API.
 * 4. Fallback a log seguro en servidor si no hay API key configurada todavía.
 */
export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
  const validRecipients = recipients
    .map((e) => e?.trim().toLowerCase())
    .filter((e): e is string => Boolean(e && e.includes("@")));

  if (validRecipients.length === 0) {
    return { ok: false, error: "No hay destinatarios de correo válidos." };
  }

  const fromEmail = process.env.EMAIL_FROM || process.env.RESEND_FROM || "FulboMundial <notificaciones@fulbomundial.com.ar>";

  // 1. Integración directa con Resend (la más simple y recomendada para Cloudflare / Edge)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: validRecipients,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { id?: string };
        return { ok: true, messageId: data.id };
      } else {
        const errText = await res.text();
        console.warn(`[sendEmail:Resend] Error HTTP ${res.status}:`, errText);
      }
    } catch (err) {
      console.error("[sendEmail:Resend] Error de conexión:", err);
    }
  }

  // 2. Integración con Brevo (Sendinblue)
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey) {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "FulboMundial", email: process.env.BREVO_SENDER_EMAIL || "no-reply@fulbomundial.com.ar" },
          to: validRecipients.map((email) => ({ email })),
          subject: payload.subject,
          htmlContent: payload.html,
          textContent: payload.text,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { messageId?: string };
        return { ok: true, messageId: data.messageId };
      }
    } catch (err) {
      console.error("[sendEmail:Brevo] Error de conexión:", err);
    }
  }

  // 3. Fallback / Desarrollo: no rompe la ejecución si el usuario aún no cargó la API KEY de correos
  console.log(`[sendEmail] Simulación de correo (configurá RESEND_API_KEY en Cloudflare/Vercel):`);
  console.log(` -> Para: ${validRecipients.join(", ")}`);
  console.log(` -> Asunto: ${payload.subject}`);

  return { ok: true, messageId: `mock-${Date.now()}` };
}

// ─── Plantillas Épicas / Futboleras en HTML con Estilo ───────────────────────

export function renderJoinRequestAdminEmail(params: {
  groupName: string;
  groupSlug: string;
  adminName: string;
  playerName: string;
  playerEmail: string;
  message?: string | null;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const adminUrl = `${params.appUrl}/grupos/${params.groupSlug}/admin/solicitudes`;

  const subject = `⚽ ¡Nuevo fichaje pidiendo cancha en ${params.groupName}!`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1510; color: #f4f4f5; margin: 0; padding: 24px; }
    .card { max-width: 540px; margin: 0 auto; background: linear-gradient(145deg, #122419, #08110b); border: 1px solid #1f472d; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #0b7746, #054628); padding: 28px 24px; text-align: center; border-bottom: 2px solid #23a05f; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; color: #a7f3d0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    .content { padding: 28px 24px; }
    .player-box { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; padding: 18px; margin: 20px 0; }
    .player-name { font-size: 18px; font-weight: 800; color: #34d399; margin: 0 0 4px; }
    .player-email { font-size: 13px; color: #9ca3af; margin: 0; }
    .player-msg { font-style: italic; font-size: 14px; color: #e5e7eb; margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(255,255,255,0.15); }
    .btn { display: inline-block; width: 100%; box-sizing: border-box; text-align: center; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff !important; font-weight: 800; text-decoration: none; padding: 14px 20px; border-radius: 12px; font-size: 15px; margin-top: 8px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35); }
    .footer { text-align: center; padding: 20px; font-size: 11px; color: #6b7280; border-top: 1px solid rgba(255, 255, 255, 0.05); }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="font-size: 38px; margin-bottom: 8px;">📋⚽</div>
      <h1>¡Alguien quiere calzarse la camiseta!</h1>
      <p>${params.groupName}</p>
    </div>
    <div class="content">
      <p style="font-size: 15px; line-height: 1.5; margin-top: 0;">
        Hola <strong>${params.adminName}</strong>, hay un jugador esperando en el túnel de vestuarios para sumarse a tu grupo.
      </p>

      <div class="player-box">
        <p class="player-name">🏃 ${params.playerName}</p>
        <p class="player-email">✉️ ${params.playerEmail}</p>
        ${params.message ? `<div class="player-msg">"${params.message}"</div>` : ""}
      </div>

      <p style="font-size: 13px; color: #9ca3af; line-height: 1.5;">
        Como DT y administrador, vos decidís si entra a la cancha como nuevo refuerzo o si se vincula con algún jugador histórico de tu plantel.
      </p>

      <a href="${adminUrl}" class="btn">
        Revisar y Definir en el Panel DT ➔
      </a>
    </div>
    <div class="footer">
      FulboMundial • La pasión de jugar entre amigos.<br>
      Este aviso fue enviado automáticamente porque sos administrador de este grupo.
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
¡Nuevo fichaje pidiendo cancha en ${params.groupName}!

Hola ${params.adminName}, ${params.playerName} (${params.playerEmail}) ingresó el código de invitación para sumarse a tu grupo.
${params.message ? `Mensaje: "${params.message}"\n` : ""}
Entrá al panel de administración para aceptar o rechazar la solicitud:
${adminUrl}
  `.trim();

  return { subject, html, text };
}

export function renderJoinApprovedEmail(params: {
  groupName: string;
  groupSlug: string;
  playerName: string;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const groupUrl = `${params.appUrl}/grupos/${params.groupSlug}`;

  const subject = `🟢 ¡Fichaje confirmado! Ya tenés la camiseta puesta en ${params.groupName} ⚽`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1510; color: #f4f4f5; margin: 0; padding: 24px; }
    .card { max-width: 540px; margin: 0 auto; background: linear-gradient(145deg, #122419, #08110b); border: 1px solid #1f472d; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #0b7746, #054628); padding: 32px 24px; text-align: center; border-bottom: 2px solid #23a05f; }
    .header h1 { margin: 0; font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; color: #a7f3d0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .content { padding: 32px 24px; }
    .quote-box { background: rgba(52, 211, 153, 0.08); border-left: 4px solid #10b981; border-radius: 0 14px 14px 0; padding: 18px; margin: 20px 0; font-style: italic; color: #d1fae5; font-size: 14px; line-height: 1.6; }
    .btn { display: inline-block; width: 100%; box-sizing: border-box; text-align: center; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff !important; font-weight: 900; text-decoration: none; padding: 15px 20px; border-radius: 12px; font-size: 16px; margin-top: 10px; box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4); }
    .footer { text-align: center; padding: 20px; font-size: 11px; color: #6b7280; border-top: 1px solid rgba(255, 255, 255, 0.05); }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="font-size: 44px; margin-bottom: 8px;">🏟️🏆</div>
      <h1>¡Entrás al campo de juego!</h1>
      <p>${params.groupName}</p>
    </div>
    <div class="content">
      <p style="font-size: 16px; line-height: 1.5; margin-top: 0;">
        ¡Hola <strong>${params.playerName}</strong>!
      </p>

      <div class="quote-box">
        "El DT miró el banco, te señaló con la cabeza y te dijo: <em>'Atate los botines que entrás a romperla'</em>. El vestuario te da la bienvenida oficial al plantel."
      </div>

      <p style="font-size: 14px; color: #d1d5db; line-height: 1.6;">
        Tu solicitud para unirte a <strong>${params.groupName}</strong> fue <strong>aprobada por el administrador</strong>. A partir de este momento podés:
      </p>

      <ul style="color: #9ca3af; font-size: 13px; line-height: 1.8; padding-left: 20px;">
        <li>Anotarte a los próximos partidos y asegurar tu lugar de titular.</li>
        <li>Ver las formaciones de los equipos y las tácticas.</li>
        <li>Participar de las votaciones a la figura de la fecha y ver las tablas históricas.</li>
      </ul>

      <a href="${groupUrl}" class="btn">
        Ir al Grupo y Calzarse los Botines ➔
      </a>
    </div>
    <div class="footer">
      FulboMundial • ${params.groupName}<br>
      ¡Nos vemos en el tercer tiempo! 🍻
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
¡Fichaje confirmado en ${params.groupName}!

¡Hola ${params.playerName}!
El DT te dio el visto bueno: tu solicitud para unirte a ${params.groupName} fue aprobada.
Ya podés anotarte al próximo partido y ver las estadísticas entrando acá:
${groupUrl}

¡A dejar todo en la cancha!
  `.trim();

  return { subject, html, text };
}

export function renderJoinRejectedEmail(params: {
  groupName: string;
  playerName: string;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `⚠️ Solicitud de ingreso a ${params.groupName}`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1510; color: #f4f4f5; margin: 0; padding: 24px; }
    .card { max-width: 540px; margin: 0 auto; background: linear-gradient(145deg, #181c19, #0f1210); border: 1px solid #374151; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #374151, #1f2937); padding: 28px 24px; text-align: center; border-bottom: 2px solid #4b5563; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 900; color: #ffffff; }
    .header p { margin: 6px 0 0; color: #9ca3af; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    .content { padding: 28px 24px; }
    .quote-box { background: rgba(255, 255, 255, 0.04); border-left: 4px solid #6b7280; border-radius: 0 14px 14px 0; padding: 18px; margin: 20px 0; font-style: italic; color: #d1d5db; font-size: 14px; line-height: 1.6; }
    .btn { display: inline-block; width: 100%; box-sizing: border-box; text-align: center; background: #374151; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 13px 20px; border-radius: 12px; font-size: 14px; margin-top: 10px; }
    .footer { text-align: center; padding: 20px; font-size: 11px; color: #6b7280; border-top: 1px solid rgba(255, 255, 255, 0.05); }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="font-size: 38px; margin-bottom: 8px;">⏱️📋</div>
      <h1>Decisión técnica sobre tu solicitud</h1>
      <p>${params.groupName}</p>
    </div>
    <div class="content">
      <p style="font-size: 15px; line-height: 1.5; margin-top: 0;">
        Hola <strong>${params.playerName}</strong>,
      </p>

      <div class="quote-box">
        "En esta fecha el cuerpo técnico no pudo darte lugar en la planilla de este grupo. A veces el cupo está colmado o hubo una confusión con el código de invitación."
      </div>

      <p style="font-size: 13px; color: #9ca3af; line-height: 1.5;">
        Tu solicitud para sumarte a <strong>${params.groupName}</strong> no fue aprobada por la administración en esta ocasión.
      </p>

      <p style="font-size: 13px; color: #9ca3af; line-height: 1.5;">
        Si creés que se trata de un error o sos parte habitual de los partidos, contactá directamente al organizador del partido para que verifique tu código.
      </p>

      <a href="${params.appUrl}/grupos" class="btn">
        Ver otros grupos en FulboMundial ➔
      </a>
    </div>
    <div class="footer">
      FulboMundial • La app de fútbol entre amigos
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Solicitud a ${params.groupName}

Hola ${params.playerName},
Tu solicitud de ingreso al grupo ${params.groupName} no fue aprobada por el administrador en esta ocasión.
Si considerás que fue un error, por favor comunicate directamente con el organizador de tu partido.

Podés ingresar a FulboMundial para ver tus otros grupos:
${params.appUrl}/grupos
  `.trim();

  return { subject, html, text };
}
