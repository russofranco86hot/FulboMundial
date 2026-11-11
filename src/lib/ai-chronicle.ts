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
 * Limpia emojis y caracteres especiales para que el locutor de audio lea fluido como relator de cancha.
 */
export function cleanAudioText(raw: string): string {
  return raw
    .replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu,
      ""
    )
    .replace(/[*_~`#>\[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Genera una crónica apasionada de fútbol argentino según el estilo elegido:
 * - "relator": Relator radial exaltado (estilo Mariano Closs / Víctor Hugo Morales).
 * - "picante": Modo gastada de vestuario (chicanas futboleras, sarcasmo y folclore).
 * - "periodista": Periodista épico y lírico (estilo documental / Líbero / Paso a Paso).
 */
export async function generateMatchChronicle(
  input: ChronicleInput
): Promise<ChronicleResult> {
  const matchDateObj =
    typeof input.matchDate === "string" ? new Date(input.matchDate) : input.matchDate;
  const fechaStr = formatArt(matchDateObj, "EEEE dd/MM 'a las' HH:mm");
  const isAWin = input.scoreA > input.scoreB;
  const isBWin = input.scoreB > input.scoreA;
  const isDraw = input.scoreA === input.scoreB;

  const winnerName = isAWin ? input.teamAName : isBWin ? input.teamBName : null;
  const loserName = isAWin ? input.teamBName : isBWin ? input.teamAName : null;
  const winnerPlayers = isAWin ? input.playersA : isBWin ? input.playersB : input.playersA;
  const loserPlayers = isAWin ? input.playersB : isBWin ? input.playersA : input.playersB;
  const winnerScore = isAWin ? input.scoreA : input.scoreB;
  const loserScore = isAWin ? input.scoreB : input.scoreA;
  const diff = Math.abs(input.scoreA - input.scoreB);

  const scorersA = input.scorers.filter((s) => s.team === "A" && s.goals > 0);
  const scorersB = input.scorers.filter((s) => s.team === "B" && s.goals > 0);
  const allScorers = [...input.scorers]
    .filter((s) => s.goals > 0)
    .sort((a, b) => b.goals - a.goals);
  const topScorer = allScorers[0] ?? null;

  const style: ChronicleStyle = input.style || "relator";

  // ─── 1. Intentar llamar a Google Gemini API si hay API Key disponible ───
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (apiKey) {
    try {
      const styleInstructions =
        style === "picante"
          ? "MODO GASTADA DE VESTUARIO (estilo Fantino / Chicana de potrero): descansá con humor a los que perdieron, nombrá a los jugadores perdedores diciendo que devolvieron redonda la pelota pero perdieron la brújula, que pidan turno al traumatólogo por el dolor de cintura y que paguen el tercer tiempo."
          : style === "periodista"
          ? "PERIODISTA ÉPICO Y LÍRICO (estilo Líbero / Paso a Paso / Documental): tono solemne, cinematográfico y táctico, hablando de la mística bajo los reflectores, la pizarra, las sociedades en cancha y la gloria eterna en la tabla."
          : "RELATOR RADIAL EXALTADO (estilo Mariano Closs y Víctor Hugo Morales en vivo): arrancá como transmisión de radio ('¡Hola qué tal cómo les va, prendete a la transmisión!'), usá frases como '¡No lo cante, no se abrace!', '¡Ahí está, cantalo, cantalo, GOOOOL!', con ritmo vertiginoso de relato de cancha.";

      const prompt = `
Sos un relator y periodista de fútbol argentino para el grupo "${input.groupName || "FulboMundial"}".

DATOS DEL PARTIDO:
- Fecha: ${fechaStr}
- Resultado: ${input.teamAName} ${input.scoreA} - ${input.scoreB} ${input.teamBName}
- Formación ${input.teamAName}: ${input.playersA.join(", ") || "No especificados"}
- Formación ${input.teamBName}: ${input.playersB.join(", ") || "No especificados"}
- Goleadores ${input.teamAName}: ${scorersA.map((s) => `${s.name} (${s.goals})`).join(", ") || "Ninguno"}
- Goleadores ${input.teamBName}: ${scorersB.map((s) => `${s.name} (${s.goals})`).join(", ") || "Ninguno"}
- Notas adicionales: ${input.customNotes || "Sin notas"}

ESTILO OBLIGATORIO SELECCIONADO:
${styleInstructions}

Respondé ÚNICAMENTE en JSON válido con estas claves:
{
  "title": "Título bien futbolero acorde al estilo elegido",
  "chronicle": "Crónica de 2 párrafos nombrando a los jugadores y goleadores reales con el tono exacto del estilo elegido",
  "punchline": "Remate final bien picante o épico según el estilo",
  "audioScript": "Guion SIN EMOJIS para ser locutado por un relator de fútbol argentino en vivo (3 a 5 oraciones vibrantes con pausas y exclamaciones)"
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
              temperature: 0.92,
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
              title: parsed.title,
              chronicle: parsed.chronicle,
              audioScript: cleanAudioText(parsed.audioScript || parsed.chronicle),
              whatsappText: waText,
              punchline: parsed.punchline || "",
            };
          }
        }
      }
    } catch (err) {
      console.warn("Fallo llamada a Gemini API, usando motor nativo:", err);
    }
  }

  // ─── 2. Motor Nativo con 3 Personalidades de Relator Bien Diferenciadas ───
  return generateNativeChronicle(input, {
    fechaStr,
    isAWin,
    isBWin,
    isDraw,
    winnerName,
    loserName,
    winnerPlayers,
    loserPlayers,
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
    winnerPlayers: string[];
    loserPlayers: string[];
    winnerScore: number;
    loserScore: number;
    diff: number;
    topScorer: { name: string; goals: number; assists: number; team: "A" | "B" } | null;
    allScorers: { name: string; goals: number; assists: number; team: "A" | "B" }[];
    style: ChronicleStyle;
  }
): ChronicleResult {
  const {
    isDraw,
    winnerName,
    loserName,
    winnerPlayers,
    loserPlayers,
    diff,
    topScorer,
    allScorers,
    style,
  } = ctx;

  const groupLabel = input.groupName || "FulboMundial";
  const heroName =
    topScorer?.name || winnerPlayers[0] || input.playersA[0] || "el diez";
  const partnerName =
    winnerPlayers[1] || input.playersA[1] || "su socio del mediocampo";
  const victimOne =
    loserPlayers[0] || input.playersB[0] || "la defensa rival";
  const victimTwo =
    loserPlayers[1] || input.playersB[1] || "el arquero";

  let title = "";
  let paragraph1 = "";
  let paragraph2 = "";
  let punchline = "";
  let audioScript = "";

  // =========================================================================
  // ESTILO 1: RELATOR EXALTADO (Cabina de Radio / Closs / Víctor Hugo)
  // =========================================================================
  if (style === "relator") {
    if (isDraw) {
      title = `🎙️ ¡FINAL ELECTRIZANTE EN LA CABINA: ${input.teamAName} ${input.scoreA} - ${input.scoreB} ${input.teamBName}!`;
      paragraph1 = `¡Hola qué tal, cómo les va, señoras y señores! ¡Todavía me tiemblan las manos en la cabina de ${groupLabel}! En un partidazo a puro vértigo y pierna fuerte, ${input.teamAName} y ${input.teamBName} clavaron un ${input.scoreA} a ${input.scoreB} descomunal donde no se guardaron absolutamente nada.`;
      paragraph2 = topScorer
        ? `¡Atención que la agarró ${topScorer.name}, enganchó para adentro y sacó un derechazo letal! Con ${topScorer.goals} goles en su cuenta personal, fue una pesadilla constante, aunque del otro lado respondieron golpe por golpe hasta el último suspiro.`
        : `¡Ida y vuelta sin respiro en la mitad de la cancha! Con ${heroName} y ${partnerName} empujando desde el fondo, el partido fue una ruleta rusa emocionante hasta que sonó la chicharra final.`;
      punchline = `¡No hay tiempo para más, señores! Empate con sabor a final del mundo y la revancha ya se está jugando en el grupo.`;
      audioScript = `¡Hola qué tal, cómo les va, amigos del fútbol, bienvenidos a la transmisión oficial de ${groupLabel}! ¡Qué partidazo acabamos de vivir, por favor! Empataron ${input.scoreA} a ${input.scoreB}, ${input.teamAName} contra ${input.teamBName}. ${
        topScorer
          ? `¡Se ilumina la noche cuando la toca ${topScorer.name}, que la mandó a guardar ${topScorer.goals} veces! ¡Cantalo, cantalo, cantalo, GOOOOL!`
          : `¡Nadie regaló un metro de cancha, con ${heroName} dejando la vida en cada pelota dividida!`
      } ¡Señoras y señores, pitazo final, aplaudan de pie porque dejaron el alma en el sintético!`;
    } else {
      title =
        diff >= 3
          ? `🎙️ ¡GRITALO QUE FUE UN GOLAZO DE OTRO PARTIDO: ${winnerName} ${input.scoreA} - ${input.scoreB} ${loserName}!`
          : `🎙️ ¡NO LO CANTE, NO SE ABRACE: TRIUNFAZO DE ${winnerName} ${input.scoreA} A ${input.scoreB}!`;
      paragraph1 = `¡Hola qué tal, cómo les va! ¡Abróchense los cinturones porque ${winnerName} acaba de dar un golpe de autoridad tremendo en ${groupLabel}! Fue victoria por ${input.scoreA} a ${input.scoreB} frente a ${loserName} en una noche donde la pelota rodó a mil por hora.`;
      paragraph2 = topScorer
        ? `¡Ahí está, la tiene ${topScorer.name}, prepara el remate, le pegóóó... GOOOOOL! ¡Un verdadero golazo! Con ${topScorer.goals} conquistas y la complicidad de ${partnerName}, desarmaron a ${victimOne} y cerraron una actuación digna de campeonato.`
        : `¡Qué despliegue colectivo de ${winnerName}! Con ${heroName} manejando los tiempos y ${partnerName} mordiendo en cada rincón, dejaron sin respuestas a ${victimOne} y se abrazaron a tres puntos de oro.`;
      punchline = `¡Señoras y señores, lo ganó ${winnerName} con el corazón en la mano y la tabla de posiciones está que arde!`;
      audioScript = `¡Hola qué tal, cómo les va, bienvenidos a la cabina central de ${groupLabel}! ¡Atención que arranca la jugada, la lleva ${heroName}, toca corto con ${partnerName}, encara a ${victimOne}, le pega al arco... Cantalo, cantalo, cantalo, GOOOOOOL de ${winnerName}! ${
        topScorer
          ? `¡Imparable ${topScorer.name} clavando ${topScorer.goals} pepas para el delirio de toda la tribuna!`
          : `¡Una ráfaga de fútbol total que dejó parado al arquero!`
      } ¡Final del partido, señores! Ganó ${winnerName} ${input.scoreA} a ${input.scoreB} sobre ${loserName}. ¡Un verdadero partidazo!`;
    }
  }

  // =========================================================================
  // ESTILO 2: MODO GASTADA (Vestuario Picante / Chicana Futbolera)
  // =========================================================================
  else if (style === "picante") {
    if (isDraw) {
      title = `🔥 ¡HUMO, CALAMBRES Y CERO PUNTERÍA: EMPATE ${input.scoreA} A ${input.scoreB}!`;
      paragraph1 = `Muchachos, seamos sinceros: vendieron humo toda la semana en el grupo de WhatsApp y terminaron firmando un ${input.scoreA} a ${input.scoreB} lleno de pelotazos a la estratósfera. Entre ${input.teamAName} y ${input.teamBName} armaron un festival de pases al vacío y defensores pidiendo oxígeno a los diez minutos.`;
      paragraph2 = `Si no fuera por ${heroName}${topScorer ? ` que metió ${topScorer.goals} goles` : ""}, todavía estaríamos esperando que alguien le acierte al arco. A ${victimOne} y ${victimTwo} se les acalambraron hasta las pestañas tratando de correr una contra.`;
      punchline = `Menos mal que en el tercer tiempo son titulares indiscutidos, porque adentro de la cancha dejaron más dudas que certezas.`;
      audioScript = `¡Pero por favor, apaguen la luz y vámonos, muchachos! Tanto humo vendieron toda la semana en ${groupLabel} para terminar empatando ${input.scoreA} a ${input.scoreB} entre ${input.teamAName} y ${input.teamBName}. ${heroName} intentó poner un poco de fútbol, pero a ${victimOne} y a ${victimTwo} les pasaron con GPS y todo. ¡Vayan preparando la billetera para el tercer tiempo porque adentro de la cancha no salvaron la ropa!`;
    } else {
      title =
        diff >= 3
          ? `🔥 ¡LLAMEN AL 911: BAILE MORBOSO DE ${winnerName} A ${loserName} (${input.scoreA}-${input.scoreB})!`
          : `🔥 ¡A LLORAR AL CAMPITO: ${winnerName} ATENDIÓ A DOMICILIO A ${loserName} (${input.scoreA}-${input.scoreB})!`;
      paragraph1 = `¡Teléfono para la comisaría porque en la cancha de ${groupLabel} hubo un asalto a mano armada! ${winnerName} sacó a pasear a ${loserName} por ${input.scoreA} a ${input.scoreB} y les dio una clase gratuita de cómo se juega al fútbol con la pelota al piso.`;
      paragraph2 = `Mientras ${heroName} y ${partnerName} tiraban paredes de taco y facturaban${topScorer ? ` con ${topScorer.goals} goles de ${topScorer.name}` : ""}, del lado de ${loserName}, ${victimOne} y ${victimTwo} miraban el partido en primera fila sin pagar entrada. Todavía están buscando la pelota.`;
      punchline = `Recomendación médica para ${loserName}: ibuprofeno cada ocho horas para el dolor de cintura, silenciar el WhatsApp hasta el viernes y pagar la cancha sin chistar.`;
      audioScript = `¡Atención, llamen urgente a emergencias porque en ${groupLabel} hubo un baile táctico escandaloso! ${winnerName} le ganó ${input.scoreA} a ${input.scoreB} a ${loserName} y la paternidad ya es histórica. Mientras ${heroName} y ${partnerName} se divertían tocando de primera, a ${victimOne} y ${victimTwo} todavía les están buscando la cintura por el área. ¡Muchachos de ${loserName}, devuelvan las pecheras y vayan pagando el tercer tiempo sin poner excusas!`;
    }
  }

  // =========================================================================
  // ESTILO 3: PERIODISTA ÉPICO (Crónica Lírica / Líbero / Paso a Paso)
  // =========================================================================
  else {
    if (isDraw) {
      title = `📰 LA ÉPICA DEL BARRO: ${input.teamAName} Y ${input.teamBName} NO SE SACARON VENTAJAS (${input.scoreA}-${input.scoreB})`;
      paragraph1 = `Bajo las luces del estadio de ${groupLabel}, se escribió un capítulo de alta tensión dramática. ${input.teamAName} y ${input.teamBName} protagonizaron una pulseada ajedrecística que culminó ${input.scoreA} a ${input.scoreB}, donde cada balón dividido se disputó como si fuera la última pelota de la historia.`;
      paragraph2 = `La jerarquía individual de ${heroName}${topScorer ? `, autor de ${topScorer.goals} conquistas memorables,` : ""} sostuvo la bandera del fútbol bien jugado, mientras que la resistencia de ${victimOne} equilibró la balanza en un cierre cinematográfico.`;
      punchline = `El campeonato queda al rojo vivo: la historia grande de ${groupLabel} se escribe con sudor, táctica y orgullo.`;
      audioScript = `Crónica central desde el campo de juego de ${groupLabel}. Bajo la luz de los reflectores, ${input.teamAName} y ${input.teamBName} entregaron una obra dramática que terminó igualada ${input.scoreA} a ${input.scoreB}. Con la conducción estelar de ${heroName} y el despliegue incansable de ${partnerName}, ambos equipos dejaron una huella imborrable en la tabla histórica. Esto es fútbol de potrero en estado puro.`;
    } else {
      title = `📰 MÍSTICA, PIZARRA Y GLORIA: ${winnerName} SE CONSAGRA EN LA FECHA (${input.scoreA}-${input.scoreB})`;
      paragraph1 = `Hay noches donde la mística se impone sobre cualquier libreto previo. En una exhibición de carácter y lectura táctica, ${winnerName} derrotó por ${input.scoreA} a ${input.scoreB} a un combativo ${loserName}, reafirmando su candidatura en la tabla histórica de ${groupLabel}.`;
      paragraph2 = `La sociedad letal entre ${heroName} y ${partnerName}${topScorer ? `, coronada por los ${topScorer.goals} tantos de ${topScorer.name},` : ""} quebró la resistencia de ${victimOne} y ${victimTwo}, sellando una victoria que quedará grabada en la memoria del torneo.`;
      punchline = `Cuando el talento se combina con el sacrificio colectivo, el resultado es inevitable: ${winnerName} escribió otra página dorada.`;
      audioScript = `Informe especial de ${groupLabel}. En una noche consagratoria, ${winnerName} derrotó ${input.scoreA} a ${input.scoreB} a ${loserName} con una muestra cabal de jerarquía y temperamento. La figura excluyente de ${heroName}, acompañada por la precisión quirúrgica de ${partnerName}, doblegó el esfuerzo de ${victimOne}. Tres puntos que valen oro para la historia grande de este grupo.`;
    }
  }

  const chronicle = `${paragraph1}\n\n${paragraph2}`;

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
    audioScript: cleanAudioText(audioScript),
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
    `🔥 *CRÓNICA OFICIAL DE LA FECHA* ⚽`,
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
      lines.push(
        `• ${s.name}: ${s.goals} ${s.goals === 1 ? "gol" : "goles"}${
          s.assists > 0 ? ` (+${s.assists} asistencias)` : ""
        }`
      );
    });
    lines.push("");
  }

  if (params.punchline) {
    lines.push(`🥊 *El remate:*`);
    lines.push(`_${params.punchline}_`);
    lines.push("");
  }

  if (params.appUrl) {
    lines.push(`📲 Tabla, estadísticas y audio del relato:`);
    lines.push(params.appUrl);
  }

  return lines.join("\n");
}
