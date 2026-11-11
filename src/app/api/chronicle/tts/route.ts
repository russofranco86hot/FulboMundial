import { NextResponse } from "next/server";
import { cleanAudioText } from "@/lib/ai-chronicle";

/**
 * Divide un guion largo en fragmentos de hasta ~200 caracteres respetando signos de puntuación
 * para generar audio neural masculino fluido y sin cortes.
 */
function splitIntoChunks(text: string, maxLen = 200): string[] {
  const cleaned = cleanAudioText(text);
  if (!cleaned) return [];

  const sentences = cleaned.split(/(?<=[.!?¡¿,;])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const s of sentences) {
    if (!s.trim()) continue;
    if ((current + " " + s).trim().length <= maxLen) {
      current = (current + " " + s).trim();
    } else {
      if (current) chunks.push(current);
      if (s.length <= maxLen) {
        current = s;
      } else {
        // Si una oración individual supera maxLen, cortarla por palabras
        const words = s.split(" ");
        let temp = "";
        for (const w of words) {
          if ((temp + " " + w).trim().length <= maxLen) {
            temp = (temp + " " + w).trim();
          } else {
            if (temp) chunks.push(temp);
            temp = w;
          }
        }
        current = temp;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.slice(0, 8);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { text?: string; style?: string };
    const rawText = String(body.text || "").trim();
    if (!rawText) {
      return NextResponse.json({ error: "Texto vacío" }, { status: 400 });
    }

    const chunks = splitIntoChunks(rawText, 190);
    if (chunks.length === 0) {
      return NextResponse.json({ error: "Sin contenido" }, { status: 400 });
    }

    // Voz neuronal masculina de locutor en español ("es_mx_002")
    const voice = "es_mx_002";

    const audioBase64List = await Promise.all(
      chunks.map(async (chunk) => {
        const res = await fetch("https://tiktok-tts.weilnet.workers.dev/api/generation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: chunk, voice }),
        });
        if (!res.ok) {
          throw new Error(`TTS upstream HTTP ${res.status}`);
        }
        const json = (await res.json()) as { success?: boolean; data?: string };
        if (!json.data) {
          throw new Error("TTS upstream sin audio");
        }
        return json.data;
      })
    );

    return NextResponse.json({
      ok: true,
      chunks: audioBase64List,
    });
  } catch (err) {
    console.warn("[api/chronicle/tts] Fallback required:", err);
    return NextResponse.json(
      { ok: false, error: "Fallback to local male voice" },
      { status: 502 }
    );
  }
}
