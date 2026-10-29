import { formatArt } from "./time";

export type ChronicleStyle = "relator" | "picante" | "periodista";

export interface ChronicleInput {
  matchDate: Date | string;
  teamAName: string;
  scoreA: number;
  teamBName: string;
  scoreB: number;
  playersA: string[];
  playersB: string[];
  scorers: { name: string; goals: number; assists: number; team: "A" | "B" }[];
  style?: ChronicleStyle;
  customNotes?: string;
  appUrl?: string;
  groupName?: string;
}

export interface ChronicleResult {
  title: string;
  chronicle: string;
  audioScript: string;
  whatsappText: string;
  punchline: string;
}

/**
 * Genera una crónica apasionada de fútbol argentino usando Gemini API si está disponible,
 * o un motor dinámico hiperrealista de periodismo deportivo de potrero.
 */
export async function generateMatchChronicle(input: ChronicleInput): Promise<ChronicleResult> {
  const matchDateObj = typeof input.matchDate === "string" ? new Date(input.matchDate) : input.matchDate;
  const fechaStr = formatArt(matchDateObj, "EEEE dd/MM 'a las' HH:mm");
  const isAWin = input.scoreA > input.scoreB;
  const isBWin = input.scoreB > input.scoreA;
  const isDraw = input.scoreA === input.scoreB;

  const winnerName = isAWin ? input.teamAName : isBWin ? input.teamBName : null;
  const loserName = isAWin ? input.teamBName : isBWin ? input.teamAName : null;
  const winnerScore = isAWin ? input.scoreA : input.scoreB;
  const loserScore = isAWin ? input.scoreB : input.scoreA;
  const diff = Math.abs(input.scoreA - input.scoreB);

  const scorersA = input.scorers.filter((s) => s.team === "A" && s.goals > 0);
  const scorersB = input.scorers.filter((s) => s.team === "B" && s.goals > 0);
  const allScorers = [...input.scorers].filter((s) => s.goals > 0).sort((a, b) => b.goals - a.goals);
  const topScorer = allScorers[0] ?? null;

  const assistsA = input.scorers.filter((s) => s.team === "A" && s.assists > 0);
  const assistsB = input.scorers.filter((s) => s.team === "B" && s.assists > 0);

  const style = input.style || "relator";

  // ─── 1. Intentar llamar a Google Gemini API si hay API Key disponible ───
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (apiKey) {
    try {
      const prompt = `
Sos un relator de fútbol argentino apasionado y periodista deportivo fanático (estilo Víctor Hugo Morales, Mariano Closs y Alejandro Fantino en Showmatch).
Tenés que escribir la crónica y el resumen picante del partido jugado en nuestro torneo amateur "${input.groupName || "FulboMundial"}".

DATOS DEL PARTIDO:
- Fecha: ${fechaStr}
- Resultado: ${input.teamAName} ${input.scoreA} - ${input.scoreB} ${input.teamBName}
- Jugadores de ${input.teamAName}: ${input.playersA.join(", ") || "No especificado"}
- Jugadores de ${input.teamBName}: ${input.playersB.join(", ") || "No especificado"}
- Goleadores de ${input.teamAName}: ${scorersA.map((s) => `${s.name} (${s.goals}g)`).join(", ") || "Ninguno"}
- Goleadores de ${input.teamBName}: ${scorersB.map((s) => `${s.name} (${s.goals}g)`).join(", ") || "Ninguno"}
- Asistidores: ${input.scorers.filter((s) => s.assists > 0).map((s) => `${s.name} (${s.assists} asistencias)`).join(", ") || "Ninguno"}
- Notas previas del admin: ${input.customNotes || "Sin notas adicionales"}
- ESTILO SOLICITADO: ${
        style === "picante"
          ? "Picante, gastada futbolera sana, ironía, folclore del potrero y chicanas hacia los que perdieron o jugaron mal."
          : style === "periodista"
          ? "Periodista partidario fanático, exagerando la épica, drama, gloria, lágrimas y aroma a hazaña heroica."
          : "Relator radial exaltado a los gritos, épica de potrero, metáforas desmedidas y pura pasión."
      }

REGLAS DE SALIDA OBLIGATORIAS:
Respondé ÚNICAMENTE en formato JSON válido con las siguientes claves:
{
  "title": "Un título sensacionalista y épico para la nota deportiva",
  "chronicle": "El texto completo de la crónica (2 a 3 párrafos apasionados con lunfardo futbolero de potrero argentino: 'zapatazo', 'papelón', 'ha-za-ña', 'baile táctico', 'manos de manteca', etc.)",
  "punchline": "Una frase picante de remate para gastar a los rivales o al perdedor en el grupo",
  "audioScript": "El guion para ser leído en voz alta por el bot de audio radial (texto directo, puntuado con pausas y signos de exclamación para sonar eufórico)"
}
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.9,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          if (parsed.chronicle) {
            const waText = formatWhatsAppRecap({
              title: parsed.title,
              dateStr: fechaStr,
              teamAName: input.teamAName,
              scoreA: input.scoreA,
              teamBName: input.teamBName,
              scoreB: input.scoreB,
              chronicle: parsed.chronicle,
              punchline: parsed.punchline,
              scorers: allScorers,
              appUrl: input.appUrl,
            });

            return {
              title: parsed.title || `¡${isDraw ? "Empate con el corazón en la boca" : `${winnerName} se lleva el triunfo épico`}!`,
              chronicle: parsed.chronicle,
              audioScript: parsed.audioScript || parsed.chronicle,
              whatsappText: waText,
              punchline: parsed.punchline || "",
            };
          }
        }
      }
    } catch (err) {
      console.warn("Fallo llamada a Gemini API, usando generador nativo de crónica:", err);
    }
  }

  // ─── 2. Motor Nativo Dinámico de Crónica y Gastada (Fallback de alta fidelidad) ───
  return generateNativeChronicle(input, {
    fechaStr,
    isAWin,
    isBWin,
    isDraw,
    winnerName,
    loserName,
    winnerScore,
    loserScore,
    diff,
    topScorer,
    allScorers,
    style,
  });
}

function generateNativeChronicle(
  input: ChronicleInput,
  ctx: {
    fechaStr: string;
    isAWin: boolean;
    isBWin: boolean;
    isDraw: boolean;
    winnerName: string | null;
    loserName: string | null;
    winnerScore: number;
    loserScore: number;
    diff: number;
    topScorer: { name: string; goals: number; assists: number; team: "A" | "B" } | null;
    allScorers: { name: string; goals: number; assists: number; team: "A" | "B" }[];
    style: ChronicleStyle;
  }
): ChronicleResult {
  const { isDraw, winnerName, loserName, diff, topScorer, allScorers, style } = ctx;

  let title = "";
  let paragraph1 = "";
  let paragraph2 = "";
  let punchline = "";

  if (isDraw) {
    title = `¡BATALLA CAMPAL Y PARIDAD TOTAL: ${input.scoreA} A ${input.scoreB}!`;
    paragraph1 = `¡Señoras y señores, lo que se vivió en la cancha de ${input.groupName || "este grupo"} no tiene explicación médica ni táctica! Un electrizante ${input.scoreA} a ${input.scoreB} entre ${input.teamAName} y ${input.teamBName} donde nadie regaló ni un centímetro de pasto sintético. Hubo piernas fuertes, gargantas afónicas y una entrega conmovedora digna de Copa Libertadores.`;
    paragraph2 = topScorer
      ? `La gran figura que se puso la capa de héroe fue ${topScorer.name}, clavando ${topScorer.goals} pepas y volviendo locos a los centrales rivales que todavía lo están buscando con el GPS del celular.`
      : `El resultado no le dio tregua al corazón: cuando parecía que uno lo liquidaba, el otro sacaba pecho desde el barro y empataba la historia sobre la campana.`;
    punchline = `Punto repartido para los dos, pero avísenle a los defensores que se marca con el cuerpo y no haciendo puchero con el árbitro. ¡Se define en la revancha!`;
  } else if (diff >= 4) {
    title = `¡BAILE HISTÓRICO: ${winnerName} APLASTÓ A ${loserName} POR ${input.scoreA}-${input.scoreB}!`;
    paragraph1 = `¡Para enmarcar en un cuadro y colgarlo en el living! ${winnerName} le dio un auténtico concierto de fútbol, toqueteo y efectividad demoledora a un ${loserName} que entró a la cancha mareado y jamás encontró la brújula táctica. El resultado final de ${input.scoreA} a ${input.scoreB} habla por sí solo: fue un paseo de principio a fin.`;
    paragraph2 = topScorer
      ? `Con un ${topScorer.name} totalmente endemoniado e imparable marcando ${topScorer.goals} goles, la defensa de ${loserName} parecía de cartón mojado ante cada embestida letal.`
      : `Fútbol de alta escuela, paredes milimétricas y una voracidad ofensiva insaciable que dejó al rival pidiendo la hora desde los 15 minutos del primer tiempo.`;
    punchline = `A los muchachos de ${loserName} les recomendamos ibuprofeno 600 para el dolor de cintura y no asomarse al grupo de WhatsApp por las próximas 72 horas. ¡Qué baile, por favor!`;
  } else if (diff === 1) {
    title = `¡TRIUNFAZO AGÓNICO CON AROMA A HA-ZA-ÑA: ${winnerName} ${input.scoreA} - ${input.scoreB} ${loserName}!`;
    paragraph1 = `¡Qué manera de sufrir, por el amor de Dios! Con los dientes apretados, el alma en la punta de los botines y aroma a hazaña épica, ${winnerName} aguantó los últimos embates y se llevó un triunfazo memorable por ${input.scoreA} a ${input.scoreB} frente a un ${loserName} que vendió carísima la derrota.`;
    paragraph2 = topScorer
      ? `El hombre de la noche fue sin dudas ${topScorer.name}, autor de ${topScorer.goals} goles decisivos que hicieron temblar las redes y desataron el delirio desenfrenado de su equipo.`
      : `Un partido no apto para cardíacos donde el ganador tuvo la templanza de los grandes para golpear en los momentos justos y cerrar el cerrojo defensivo sobre el pitazo final.`;
    punchline = `A llorar a la iglesia. Los tres puntos se van para casa y la paternidad en la tabla se agiganta. ¡Qué hermosa noche para ser de ${winnerName}!`;
  } else {
    title = `¡VICTORIA CONTUNDENTE DE ${winnerName}: ${input.scoreA} A ${input.scoreB}!`;
    paragraph1 = `¡Una cátedra de solidez y jerarquía en los momentos calientes! ${winnerName} pegó en los momentos justos, manejó los hilos del mediocampo y se quedó con una victoria inapelable por ${input.scoreA} a ${input.scoreB} contra un ${loserName} que tuvo ráfagas de entusiasmo pero careció de puntería en los metros finales.`;
    paragraph2 = topScorer
      ? `La llave maestra del encuentro la tuvo ${topScorer.name}, que con ${topScorer.goals} anotaciones facturó cada despiste defensivo rival para sentenciar el pleito.`
      : `El equipo ganador demostró por qué los partidos importantes se juegan con la cabeza fría y el corazón caliente, dejando una imagen colectiva de altísimo vuelo.`;
    punchline = `Las estadísticas no mienten: cuando ${winnerName} acelera, no hay pechera ni táctica que los pueda frenar. A pagar las cervezas del tercer tiempo sin chistar.`;
  }

  if (style === "picante") {
    paragraph1 = `🔥 ${paragraph1}`;
    paragraph2 = `🥊 ${paragraph2}`;
  } else if (style === "periodista") {
    title = `📰 ${title}`;
    paragraph1 = `🎙️ [Crónica Central] ${paragraph1}`;
  }

  const chronicle = `${paragraph1}\n\n${paragraph2}`;
  const audioScript = `${title}. ${paragraph1} ${paragraph2} ${punchline}`;

  const whatsappText = formatWhatsAppRecap({
    title,
    dateStr: ctx.fechaStr,
    teamAName: input.teamAName,
    scoreA: input.scoreA,
    teamBName: input.teamBName,
    scoreB: input.scoreB,
    chronicle,
    punchline,
    scorers: allScorers,
    appUrl: input.appUrl,
  });

  return {
    title,
    chronicle,
    audioScript,
    whatsappText,
    punchline,
  };
}

function formatWhatsAppRecap(params: {
  title: string;
  dateStr: string;
  teamAName: string;
  scoreA: number;
  teamBName: string;
  scoreB: number;
  chronicle: string;
  punchline: string;
  scorers: { name: string; goals: number; assists: number; team: "A" | "B" }[];
  appUrl?: string;
}): string {
  const lines: string[] = [
    `🔥 *CRÓNICA PICANTE DE LA FECHA* ⚽`,
    `📅 ${params.dateStr}`,
    "",
    `⚪ *${params.teamAName}* ${params.scoreA} - ${params.scoreB} *${params.teamBName}* ⚫`,
    "",
    `🎙️ _"${params.title}"_`,
    "",
    params.chronicle,
    "",
  ];

  if (params.scorers.length > 0) {
    lines.push("*⚽ Goleadores de la jornada:*");
    params.scorers.slice(0, 5).forEach((s) => {
      lines.push(`• ${s.name}: ${s.goals} ${s.goals === 1 ? "gol" : "goles"}${s.assists > 0 ? ` (+${s.assists} asistencias)` : ""}`);
    });
    lines.push("");
  }

  if (params.punchline) {
    lines.push(`🥊 *El dardo picante:*`);
    lines.push(`_${params.punchline}_`);
    lines.push("");
  }

  if (params.appUrl) {
    lines.push(`📲 Tabla, estadísticas y audio del relato:`);
    lines.push(params.appUrl);
  }

  return lines.join("\n");
}
