import { formatArt } from "./time";

export type ChronicleStyle = "relator" | "picante" | "periodista";

export type ChroniclePlayerRole = {
  name: string;
  position?: string | null;
  isGoalkeeper?: boolean;
};

export interface ChronicleInput {
  matchDate: Date | string;
  teamAName: string;
  scoreA: number;
  teamBName: string;
  scoreB: number;
  playersA: string[];
  playersB: string[];
  playerRolesA?: ChroniclePlayerRole[];
  playerRolesB?: ChroniclePlayerRole[];
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
      const formatRoleLabel = (p: ChroniclePlayerRole) => {
        if (p.isGoalkeeper || p.position === "GK") return `${p.name} (Arquero)`;
        if (p.position === "DEF") return `${p.name} (Defensor)`;
        if (p.position === "FWD" || p.position === "DEL") return `${p.name} (Delantero)`;
        if (p.position) return `${p.name} (Mediocampista)`;
        return p.name;
      };

      const lineupA =
        input.playerRolesA && input.playerRolesA.length > 0
          ? input.playerRolesA.map(formatRoleLabel).join(", ")
          : input.playersA.join(", ") || "No especificados";
      const lineupB =
        input.playerRolesB && input.playerRolesB.length > 0
          ? input.playerRolesB.map(formatRoleLabel).join(", ")
          : input.playersB.join(", ") || "No especificados";

      const styleInstructions =
        style === "picante"
          ? "MATIZ DE ESTILO (MODO GASTADA DE VESTUARIO): sumá chicana futbolera de vestuario con humor sobre los perdedores, sin perder épica ni mencionar la nota breve y las alineaciones."
          : style === "periodista"
          ? "MATIZ DE ESTILO (PERIODISTA ÉPICO Y LÍRICO): narrá con dramatismo cinematográfico, lectura de la distribución táctica de cada bando y prosa vibrante de gran crónica deportiva."
          : "MATIZ DE ESTILO (RELATOR RADIAL EXALTADO): arrancá como transmisión en vivo ('¡Hola qué tal cómo les va!'), usá ritmo vertiginoso y exclamaciones de cabina ('¡No lo cante, no se abrace!', '¡Cantalo, cantalo, GOOOOL!').";

      const prompt = `
Actuá como un relator de fútbol experimentado, apasionado y dinámico de fútbol latinoamericano/español para el grupo "${input.groupName || "FulboMundial"}".

PROPÓSITO Y OBJETIVOS:
- Crear un resumen breve, épico y divertido del partido basado estrictamente en los datos proporcionados (cómo estaban distribuidos los dos equipos, alineaciones, resultado final y la breve descripción de la dinámica).
- Utilizar metáforas futbolísticas épicas (por ejemplo: "batalla en el coliseo", "guerreros del área", "misil teledirigido"), un estilo narrativo vibrante y mencionar características o particularidades aleatorias de jugadores específicos de ambos equipos.

REGLAS OBLIGATORIAS DE REDACCIÓN:
1. Usá los nombres de ambos equipos, mencioná cómo estaban formados / distribuidos sus jugadores y el resultado exacto.
2. TOMÁ COMO EJE CENTRAL la "Breve descripción / dinámica del partido" escrita abajo: desarrollá y potenciá esa historia sin inventar un marcador distinto.
3. Incluí menciones o detalles coloridos sobre jugadores específicos elegidos al azar de ambos equipos (aunque no aparezcan en la descripción breve), inventando detalles narrativos divertidos y coherentes con su rol en cancha (arquero, defensor, mediocampista o delantero).
4. Mantené un tono apasionado, entusiasta, melodramático, divertido y con lenguaje coloquial futbolístico exagerado para dar efecto épico.

DATOS DEL PARTIDO:
- Fecha: ${fechaStr}
- Equipos y Resultado Final: ${input.teamAName} ${input.scoreA} - ${input.scoreB} ${input.teamBName}
- Alineación y distribución de ${input.teamAName}: ${lineupA}
- Alineación y distribución de ${input.teamBName}: ${lineupB}
- Goleadores ${input.teamAName}: ${scorersA.map((s) => `${s.name} (${s.goals})`).join(", ") || "Ninguno especificado"}
- Goleadores ${input.teamBName}: ${scorersB.map((s) => `${s.name} (${s.goals})`).join(", ") || "Ninguno especificado"}
- Breve descripción / dinámica del partido: ${input.customNotes || "Sin descripción breve previa (construir la épica en base al marcador y los planteles)"}

${styleInstructions}

Respondé ÚNICAMENTE en JSON válido con estas claves:
{
  "title": "Título breve, épico y bien futbolero acorde al resultado",
  "chronicle": "Relato corto en 2 párrafos vibrantes nombrando la distribución de los equipos, reflejando la breve descripción del partido, metáforas épicas y menciones coloridas a jugadores al azar coherentes con su rol",
  "punchline": "Remate final apasionado, melodramático o picante según el estilo",
  "audioScript": "Guion SIN EMOJIS para ser locutado por un relator de fútbol en vivo (4 a 5 oraciones intensas basadas en el relato y la nota del partido)"
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

function pickRandomItem<T>(arr: T[]): T | null {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)] ?? null;
}

function buildRoleQuirk(player: ChroniclePlayerRole): string {
  const pos = (player.position || "").toUpperCase();
  if (player.isGoalkeeper || pos === "GK") {
    return (
      pickRandomItem([
        `${player.name} voló de palo a palo cual felino indomable defendiendo los tres palos`,
        `${player.name} se puso el buzo de muralla bajo el arco descolgando pelotas imposibles`,
        `${player.name} achicó con coraje de león cada mano a mano como último guardián`,
      ]) || `${player.name} defendió el arco con alma y vida`
    );
  }
  if (pos === "DEF") {
    return (
      pickRandomItem([
        `${player.name} mandó en el fondo como un cacique impasable trabando hasta con el alma`,
        `${player.name} se transformó en uno de esos guerreros del área sacando cada pelota al lateral`,
        `${player.name} cerró la persiana en defensa anticipando cada pase filtrado con oficio puro`,
      ]) || `${player.name} sostuvo la última línea a pura garra`
    );
  }
  if (pos === "FWD" || pos === "DEL") {
    return (
      pickRandomItem([
        `${player.name} desenfundó un misil teledirigido que hizo temblar los cimientos del arco`,
        `${player.name} encaró sin piedad por la banda dejando marcas tiradas en el sintético`,
        `${player.name} merodeó el área con olfato depredador pidiendo cada pelota al vacío`,
      ]) || `${player.name} amenazó el área en cada ataque`
    );
  }
  return (
    pickRandomItem([
      `${player.name} manejó los hilos del mediocampo tirando fantasías y pases con guante blanco`,
      `${player.name} corrió con tres pulmones convirtiéndose en motor incansable de la mitad`,
      `${player.name} metió pausa de crack y sacó un misil teledirigido desde tres cuartos de cancha`,
    ]) || `${player.name} dejó el corazón en cada pelota dividida`
  );
}

function formatLineupPreview(names: string[], fallback: string): string {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length === 0) return fallback;
  if (clean.length <= 4) return clean.join(", ");
  return `${clean.slice(0, 4).join(", ")} y compañía`;
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
  const rolesA: ChroniclePlayerRole[] =
    input.playerRolesA && input.playerRolesA.length > 0
      ? input.playerRolesA
      : input.playersA.map((name) => ({ name }));
  const rolesB: ChroniclePlayerRole[] =
    input.playerRolesB && input.playerRolesB.length > 0
      ? input.playerRolesB
      : input.playersB.map((name) => ({ name }));

  const randomA = pickRandomItem(rolesA) ?? { name: "el estandarte de " + input.teamAName };
  const randomB = pickRandomItem(rolesB) ?? { name: "el guerrero de " + input.teamBName };
  const colorA = buildRoleQuirk(randomA);
  const colorB = buildRoleQuirk(randomB);

  const heroName =
    topScorer?.name || winnerPlayers[0] || input.playersA[0] || randomA.name;
  const victimOne =
    loserPlayers[0] || input.playersB[0] || randomB.name;

  const rawBrief = (input.customNotes || "").trim().replace(/\s+/g, " ");
  const hasBrief = rawBrief.length > 0;
  const briefSentence = hasBrief
    ? `El libreto de la noche quedó marcado a fuego por la dinámica real del encuentro: "${rawBrief}".`
    : pickRandomItem([
        "Desde el pitazo inicial se desató una auténtica batalla en el coliseo donde nadie regaló ni medio centímetro de sintético.",
        "Fue un choque de estilos eléctricos bajo los reflectores, con los guerreros del área dejando la piel en cada dividida.",
      ])!;

  const formationsLine = `${input.teamAName} (alistando a ${formatLineupPreview(input.playersA, "sus titulares")}) chocó de frente ante ${input.teamBName} (con ${formatLineupPreview(input.playersB, "su cuadro titular")})`;

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
      title = `🎙️ ¡BATALLA EN EL COLISEO: ${input.teamAName} ${input.scoreA} - ${input.scoreB} ${input.teamBName}!`;
      paragraph1 = `¡Hola qué tal, cómo les va, señoras y señores! ¡Qué batalla en el coliseo acabamos de vivir en ${groupLabel}! Con un planteo mano a mano, ${formationsLine}, y firmaron un empate infartante ${input.scoreA} a ${input.scoreB}. ${briefSentence}`;
      paragraph2 = `En medio de la tormenta futbolera, ${colorA}; mientras que en la vereda de enfrente ${colorB}.${
        topScorer
          ? ` ¡Y atención porque ${topScorer.name} sacudió la red con ${topScorer.goals} gritos sagrados para desatar la locura!`
          : ""
      }`;
      punchline = `¡No lo cante, no se abrace! Reparto épico de puntos entre dos conjuntos de guerreros del área que ya piden revancha.`;
      audioScript = `¡Hola qué tal, cómo les va, amigos del fútbol en ${groupLabel}! ¡Qué batalla en el coliseo nos regalaron ${input.teamAName} y ${input.teamBName}, empatando ${input.scoreA} a ${input.scoreB}! ${
        hasBrief ? `Atención a cómo se jugó: ${rawBrief}. ` : ""
      }¡Gigante lo de ${randomA.name}, y enorme respuesta de ${randomB.name} cuando quemaba la pelota! ¡Aplaudan de pie porque dejaron el alma!`;
    } else {
      title =
        diff >= 3
          ? `🎙️ ¡MISIL TELEDIRIGIDO Y GOLEADA: ${winnerName} ${input.scoreA} - ${input.scoreB} ${loserName}!`
          : `🎙️ ¡NO LO CANTE, NO SE ABRACE: TRIUNFAZO DE ${winnerName} (${input.scoreA}-${input.scoreB})!`;
      paragraph1 = `¡Hola qué tal, cómo les va! ¡Abróchense los cinturones porque ${groupLabel} fue escenario de una vibrante batalla en el coliseo! En la pizarra, ${formationsLine}, pero el marcador final gritó ${input.scoreA} a ${input.scoreB} para ${winnerName} sobre ${loserName}. ${briefSentence}`;
      paragraph2 = `${topScorer ? `¡Ahí está ${topScorer.name}, cantalo, cantalo, GOOOOL! Se anotó con ${topScorer.goals} conquistas para encabezar la carga. ` : ""}Además, la transmisión destacó que ${colorA}, en un duelo picante donde ${colorB}.`;
      punchline = `¡Pitazo final, señores! Lo ganó ${winnerName} con corazón de acero, un par de misiles teledirigidos y gloria eterna en la tabla.`;
      audioScript = `¡Hola qué tal, cómo les va, bienvenidos a la cabina de ${groupLabel}! ¡Partidazo entre ${input.teamAName} y ${input.teamBName} que terminó ${input.scoreA} a ${input.scoreB} para ${winnerName}! ${
        hasBrief ? `Crónica pura del encuentro: ${rawBrief}. ` : ""
      }¡Cantalo, cantalo, cantalo, GOOOOOL! ¡Enorme actuación de ${heroName}, con ${randomB.name} y ${randomA.name} protagonizando una verdadera batalla en el coliseo!`;
    }
  }

  // =========================================================================
  // ESTILO 2: MODO GASTADA (Vestuario Picante / Chicana Futbolera)
  // =========================================================================
  else if (style === "picante") {
    if (isDraw) {
      title = `🔥 ¡HUMO, CHISPOTEO Y TABLAS EN EL COLISEO (${input.scoreA}-${input.scoreB})!`;
      paragraph1 = `¡Atención vestuario de ${groupLabel}! En los papeles ${formationsLine}, prometiendo fútbol champagne y terminaron protagonizando una batalla en el coliseo con resultado ${input.scoreA} a ${input.scoreB}. ${briefSentence}`;
      paragraph2 = `Mientras ${colorA}, del otro lado ${colorB}, dejando a más de un defensor pidiendo oxígeno y brújula antes del pitazo final.${
        topScorer ? ` Al menos ${topScorer.name} salvó los trapos clavando ${topScorer.goals} pepas.` : ""
      }`;
      punchline = `Empate con olor a revancha obligada: en el tercer tiempo nadie empata y las excusas en WhatsApp ya empezaron.`;
      audioScript = `¡Señoras y señores, lo que pasó en ${groupLabel} fue teatro puro entre ${input.teamAName} y ${input.teamBName}, que igualaron ${input.scoreA} a ${input.scoreB}! ${
        hasBrief ? `Mirá lo que fue el partido: ${rawBrief}. ` : ""
      }Entre tantos guerreros del área, ${randomA.name} y ${randomB.name} se robaron todas las cámaras. ¡Preparen el tercer tiempo que la semana que viene hay revancha!`;
    } else {
      title =
        diff >= 3
          ? `🔥 ¡A LLORAR AL VESTUARIO: ${winnerName} DESARMÓ A ${loserName} (${input.scoreA}-${input.scoreB})!`
          : `🔥 ¡BATALLA SIN PIEDAD: ${winnerName} ATENDIÓ A ${loserName} (${input.scoreA}-${input.scoreB})!`;
      paragraph1 = `¡Teléfono para el cuerpo técnico de ${loserName}! En una noche caliente en ${groupLabel}, ${formationsLine}, y el tanteador selló un ${input.scoreA} a ${input.scoreB} inapelable para ${winnerName}. ${briefSentence}`;
      paragraph2 = `${topScorer ? `Con ${topScorer.name} afiladísimo (${topScorer.goals} goles), ` : ""}no hubo piedad frente al arco rival: ${colorA}, mientras que por el lado de enfrente ${colorB} intentando contener el vendaval aunque ${victimOne} quedó mirando el número de la patente.`;
      punchline = `Recomendación de vestuario para ${loserName}: hielo en los tobillos, silencio táctico hasta el domingo y revancha inmediata.`;
      audioScript = `¡Atención, esto es cine futbolero en ${groupLabel}! ${winnerName} venció ${input.scoreA} a ${input.scoreB} a ${loserName} en una batalla en el coliseo sin cuartel. ${
        hasBrief ? `Atención al detalle clave: ${rawBrief}. ` : ""
      }Mientras ${randomA.name} y ${randomB.name} dejaban el alma, un misil teledirigido inclinó la balanza. ¡Muchachos de ${loserName}, a entrenar puntería para la próxima fecha!`;
    }
  }

  // =========================================================================
  // ESTILO 3: PERIODISTA ÉPICO (Crónica Lírica / Líbero / Paso a Paso)
  // =========================================================================
  else {
    if (isDraw) {
      title = `📰 LA ÉPICA DE LOS GUERREROS DEL ÁREA: ${input.teamAName} Y ${input.teamBName} (${input.scoreA}-${input.scoreB})`;
      paragraph1 = `Bajo las luces de ${groupLabel}, se disputó una inolvidable batalla en el coliseo. Desde el reparto inicial —donde ${formationsLine}— el encuentro culminó igualado ${input.scoreA} a ${input.scoreB} tras noventa metros de intensidad pura. ${briefSentence}`;
      paragraph2 = `La historia de la noche tuvo pinceladas de talento y sacrificio: ${colorA}, al tiempo que ${colorB}.${
        topScorer ? ` ${topScorer.name}, con ${topScorer.goals} conquistas, puso la firma goleadora en el acta.` : ""
      }`;
      punchline = `Cuando dos equipos de guerreros del área se entregan sin reservas, el empate se vuelve obra de arte.`;
      audioScript = `Crónica desde el campo de juego de ${groupLabel}. ${input.teamAName} y ${input.teamBName} empataron ${input.scoreA} a ${input.scoreB} en una intensa batalla en el coliseo. ${
        hasBrief ? `Lo que definió el partido: ${rawBrief}. ` : ""
      }Figuras como ${randomA.name} y ${randomB.name} sostuvieron la bandera del fútbol bien jugado hasta el último segundo.`;
    } else {
      title = `📰 MÍSTICA, PIZARRA Y GLORIA: ${winnerName} SE IMPONE (${input.scoreA}-${input.scoreB})`;
      paragraph1 = `Hay noches donde la pizarra cobra vida en ${groupLabel}. En el duelo táctico, ${formationsLine}, terminando con triunfo de ${winnerName} por ${input.scoreA} a ${input.scoreB} sobre un combativo ${loserName}. ${briefSentence}`;
      paragraph2 = `Cada línea escribió su capítulo en esta batalla en el coliseo: ${colorA}, en un trámite electrizante donde ${colorB}${
        topScorer ? `, coronado por los ${topScorer.goals} tantos de ${topScorer.name}` : ""
      }.`;
      punchline = `Un misil teledirigido y la convicción de los guerreros del área explican por qué ${winnerName} se llevó la gloria de la fecha.`;
      audioScript = `Informe especial desde ${groupLabel}. En una noche consagratoria, ${winnerName} derrotó ${input.scoreA} a ${input.scoreB} a ${loserName}. ${
        hasBrief ? `La clave táctica del encuentro: ${rawBrief}. ` : ""
      }Con el despliegue de ${randomA.name}, la entrega de ${randomB.name} y la contundencia de ${heroName}, el marcador dictó sentencia definitiva.`;
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
