"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Mini-arcade 8-bit de fútbol. Botón flotante (pelota pixelada) que abre un
 * overlay interactivo y cerrable con dos modos:
 *   - "penales": juego de penales jugable (tocá izquierda/centro/derecha).
 *   - "picadito": animación automática 8-bit para mirar.
 * Todo client-side, sin backend. Render pixelado en <canvas> a baja resolución.
 */

type Zone = "left" | "center" | "right";
type Mode = "penales" | "picadito";

const W = 160;
const H = 144;

// Paleta tipo Game Boy / NES
const C = {
  grassA: "#2f8f3e",
  grassB: "#268234",
  line: "#eaf3e2",
  net: "#bfcbb2",
  post: "#ffffff",
  ball: "#f7f9f0",
  ballDark: "#16181a",
  kBody: "#e23b3b",
  kBody2: "#b81f1f",
  skin: "#f0c08a",
  pBody: "#2563eb",
  pBody2: "#1d3fb8",
  shadow: "rgba(0,0,0,0.18)",
  flash: "#ffd23f",
};

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawField(ctx: CanvasRenderingContext2D, t: number) {
  for (let i = 0; i < H; i += 8) {
    px(ctx, 0, i, W, 8, (i / 8) % 2 === 0 ? C.grassA : C.grassB);
  }
  // Líneas del área
  px(ctx, 0, 48, W, 2, C.line);
  px(ctx, 28, 12, 2, 38, C.line);
  px(ctx, 130, 12, 2, 38, C.line);
  px(ctx, 28, 48, 104, 2, C.line);
  // pelotita decorativa de fondo girando (semicírculo del área)
  void t;
}

function drawGoal(ctx: CanvasRenderingContext2D, netShake: number) {
  // Red
  for (let x = 42; x < 120; x += 6) px(ctx, x + netShake, 14, 1, 24, C.net);
  for (let y = 16; y < 38; y += 6) px(ctx, 42 + netShake, y, 78, 1, C.net);
  // Postes + travesaño
  px(ctx, 38, 12, 4, 30, C.post);
  px(ctx, 120, 12, 4, 30, C.post);
  px(ctx, 38, 12, 86, 4, C.post);
}

function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  px(ctx, x - r, y - r + 1, r * 2, r * 2 - 2, C.ball);
  px(ctx, x - r + 1, y - r, r * 2 - 2, r * 2, C.ball);
  // pentágonos
  px(ctx, x - 1, y - 1, 2, 2, C.ballDark);
  px(ctx, x - r + 1, y + r - 3, 2, 2, C.ballDark);
  px(ctx, x + r - 3, y + r - 3, 2, 2, C.ballDark);
}

function drawKeeper(ctx: CanvasRenderingContext2D, x: number, dive: number) {
  // dive: -1 izq, 0 centro, 1 der  -> inclina y estira brazos
  const y = 30;
  px(ctx, x - 5, y, 10, 12, C.kBody); // torso
  px(ctx, x - 5, y, 10, 4, C.kBody2);
  px(ctx, x - 3, y - 6, 6, 6, C.skin); // cabeza
  // brazos
  if (dive < 0) {
    px(ctx, x - 12, y - 2, 8, 3, C.skin);
    px(ctx, x + 4, y + 3, 5, 3, C.kBody2);
  } else if (dive > 0) {
    px(ctx, x + 4, y - 2, 8, 3, C.skin);
    px(ctx, x - 9, y + 3, 5, 3, C.kBody2);
  } else {
    px(ctx, x - 11, y + 1, 6, 3, C.skin);
    px(ctx, x + 5, y + 1, 6, 3, C.skin);
  }
  // piernas
  px(ctx, x - 4, y + 12, 3, 7, C.ballDark);
  px(ctx, x + 1, y + 12, 3, 7, C.ballDark);
}

function drawKicker(ctx: CanvasRenderingContext2D, x: number, y: number, kick: boolean) {
  px(ctx, x - 4, y, 8, 10, C.pBody);
  px(ctx, x - 4, y, 8, 3, C.pBody2);
  px(ctx, x - 3, y - 6, 6, 6, C.skin); // cabeza
  px(ctx, x - 4, y + 10, 3, 6, C.ballDark);
  // pierna que patea
  if (kick) px(ctx, x + 2, y + 8, 8, 3, C.skin);
  else px(ctx, x + 1, y + 10, 3, 6, C.ballDark);
}

function zoneX(z: Zone) {
  return z === "left" ? 56 : z === "right" ? 106 : 81;
}

export function Arcade() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("penales");
  const [hud, setHud] = useState({ goles: 0, tiros: 0, msg: "" });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const apiRef = useRef<{ shoot: (z: Zone) => void } | null>(null);

  // Bucle del juego
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let raf = 0;
    let frame = 0;

    // estado mutable
    const g = {
      phase: "aim" as "aim" | "shoot" | "result",
      chosen: "center" as Zone,
      dive: 0 as -1 | 0 | 1,
      diveZone: "center" as Zone,
      ballX: 81,
      ballY: 118,
      ballR: 6,
      t: 0,
      goles: 0,
      tiros: 0,
      keeperX: 81,
      keeperIdleDir: 1,
      netShake: 0,
      resultMsg: "",
      saved: false,
      // picadito
      pT: 0,
    };

    function shoot(z: Zone) {
      if (g.phase !== "aim") return;
      g.chosen = z;
      const dz: Zone[] = ["left", "center", "right"];
      g.diveZone = dz[Math.floor(((frame * 9301 + 49297) % 233280) / 233280 * 3) % 3];
      // un poco de azar real adicional combinando con el frame
      const r = (Math.sin(frame * 12.9898) * 43758.5453) % 1;
      if (Math.abs(r) > 0.5) g.diveZone = dz[(dz.indexOf(g.diveZone) + 1) % 3];
      g.dive = g.diveZone === "left" ? -1 : g.diveZone === "right" ? 1 : 0;
      g.phase = "shoot";
      g.t = 0;
    }
    apiRef.current = { shoot };

    function resetAim() {
      g.phase = "aim";
      g.ballX = 81;
      g.ballY = 118;
      g.ballR = 6;
      g.keeperX = 81;
      g.netShake = 0;
      g.resultMsg = "";
    }

    function loop() {
      frame++;
      // ---- PENALES ----
      if (mode === "penales") {
        drawField(ctx!, frame);
        // arquero idle se mueve un poco
        if (g.phase === "aim") {
          g.keeperX += g.keeperIdleDir * 0.4;
          if (g.keeperX > 96) g.keeperIdleDir = -1;
          if (g.keeperX < 66) g.keeperIdleDir = 1;
        }
        drawGoal(ctx!, g.netShake);

        if (g.phase === "shoot") {
          g.t += 1;
          const dur = 26;
          const p = Math.min(1, g.t / dur);
          const tx = zoneX(g.chosen);
          g.ballX = 81 + (tx - 81) * p;
          g.ballY = 118 + (30 - 118) * p;
          g.ballR = 6 - 2 * p;
          // arquero se tira
          const kx = zoneX(g.diveZone);
          g.keeperX = 81 + (kx - 81) * Math.min(1, p * 1.2);
          if (p >= 1) {
            g.saved = g.chosen === g.diveZone;
            g.tiros++;
            if (!g.saved) {
              g.goles++;
              g.netShake = 3;
              g.resultMsg = "¡GOOOL!";
            } else {
              g.resultMsg = "¡ATAJÓ!";
            }
            setHud({ goles: g.goles, tiros: g.tiros, msg: g.resultMsg });
            g.phase = "result";
            g.t = 0;
          }
        }

        if (g.phase === "result") {
          g.t += 1;
          if (g.netShake !== 0) g.netShake = g.t % 4 < 2 ? 2 : -2;
          if (g.t > 48) {
            setHud((h) => ({ ...h, msg: "" }));
            resetAim();
          }
        }

        // sombra + pelota + jugadores
        px(ctx!, g.ballX - 6, 132, 12, 3, C.shadow);
        drawKeeper(ctx!, g.keeperX, g.phase === "aim" ? 0 : g.dive);
        drawKicker(ctx!, 81, 124, g.phase === "shoot" && g.t < 8);
        drawBall(ctx!, g.ballX, g.ballY, g.ballR);

        // cartel de resultado
        if (g.resultMsg) {
          const blink = frame % 12 < 8;
          if (blink) {
            ctx!.fillStyle = g.saved ? C.post : C.flash;
            ctx!.font = "bold 16px monospace";
            ctx!.textAlign = "center";
            ctx!.fillText(g.resultMsg, W / 2, 70);
          }
        }
      }

      // ---- PICADITO (automático) ----
      else {
        drawField(ctx!, frame);
        drawGoal(ctx!, 0);
        g.pT += 0.03;
        const phase = Math.sin(g.pT);
        // pelota va y viene entre dos jugadores con parábola
        const bx = 80 + phase * 48;
        const arc = Math.abs(Math.cos(g.pT));
        const by = 116 - arc * 34;
        const nearLeft = phase < -0.7;
        const nearRight = phase > 0.7;
        px(ctx!, bx - 6, 132, 12, 3, C.shadow);
        drawKicker(ctx!, 30, 124, nearLeft);
        // segundo jugador (espejado en color)
        px(ctx!, 130 - 4, 124, 8, 10, C.kBody);
        px(ctx!, 130 - 4, 124, 8, 3, C.kBody2);
        px(ctx!, 130 - 3, 124 - 6, 6, 6, C.skin);
        px(ctx!, 130 - 4, 124 + 10, 3, 6, C.ballDark);
        if (nearRight) px(ctx!, 130 - 10, 124 + 8, 8, 3, C.skin);
        else px(ctx!, 130 + 1, 124 + 10, 3, 6, C.ballDark);
        drawBall(ctx!, bx, by, 6);

        if (frame % 16 < 9) {
          ctx!.fillStyle = C.flash;
          ctx!.font = "bold 9px monospace";
          ctx!.textAlign = "center";
          ctx!.fillText("¡PICADITO!", W / 2, 64);
        }
      }

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    // tap sobre el canvas (penales)
    function onTap(e: PointerEvent) {
      if (mode !== "penales") return;
      const rect = canvas!.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * W;
      const z: Zone = x < W * 0.4 ? "left" : x < W * 0.66 ? "center" : "right";
      shoot(z);
    }
    canvas.addEventListener("pointerdown", onTap);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onTap);
      apiRef.current = null;
    };
  }, [open, mode]);

  return (
    <>
      {/* Botón flotante (pelota 8-bit) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir jueguito 8-bit"
          className="fixed bottom-24 right-3 z-40 h-12 w-12 rounded-md border-2 border-pitch-900/30 bg-white shadow-lg active:scale-95 ring-4 ring-pitch-400/20 animate-pulse"
          style={{ imageRendering: "pixelated" }}
        >
          <span className="text-2xl leading-none">🎮</span>
        </button>
      )}

      {/* Overlay del arcade */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border-4 border-pitch-900 bg-pitch-900 p-3 shadow-2xl animate-scale-in">
            {/* Cabecera */}
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-pitch-50">
                ⚽ Arcade 8-bit
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="flex h-7 w-7 items-center justify-center rounded-md bg-red-600 font-bold text-white active:scale-95"
              >
                ✕
              </button>
            </div>

            {/* Pantalla */}
            <div className="overflow-hidden rounded-lg p-1 bg-gradient-to-b from-pitch-600 to-pitch-800 shadow-inner">
              <div className="overflow-hidden bg-black rounded-sm border border-black">
                <canvas
                  ref={canvasRef}
                  width={W}
                  height={H}
                  className="block w-full"
                  style={{ imageRendering: "pixelated", touchAction: "manipulation" }}
                />
              </div>
            </div>

            {/* HUD */}
            <div className="mt-2 flex items-center justify-between font-mono text-xs font-bold text-pitch-50">
              {mode === "penales" ? (
                <>
                  <span>GOLES: {hud.goles}</span>
                  <span style={{ color: "#ffd23f" }}>{hud.msg || " "}</span>
                  <span>TIROS: {hud.tiros}</span>
                </>
              ) : (
                <span className="mx-auto">▶ Modo automático — relajate y mirá</span>
              )}
            </div>

            {/* Controles */}
            {mode === "penales" && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                <ArcadeBtn onClick={() => apiRef.current?.shoot("left")}>◀ Izq</ArcadeBtn>
                <ArcadeBtn onClick={() => apiRef.current?.shoot("center")}>▲ Centro</ArcadeBtn>
                <ArcadeBtn onClick={() => apiRef.current?.shoot("right")}>Der ▶</ArcadeBtn>
              </div>
            )}

            {/* Cambiar de modo */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode("penales")}
                className={`rounded-lg py-2 font-mono text-xs font-bold ${
                  mode === "penales" ? "bg-pitch-500 text-white" : "bg-pitch-700 text-pitch-100"
                }`}
              >
                ⚽ Penales
              </button>
              <button
                onClick={() => setMode("picadito")}
                className={`rounded-lg py-2 font-mono text-xs font-bold ${
                  mode === "picadito" ? "bg-pitch-500 text-white" : "bg-pitch-700 text-pitch-100"
                }`}
              >
                👾 Picadito
              </button>
            </div>

            <p className="mt-2 text-center font-mono text-[10px] text-pitch-100/60">
              Tocá la pantalla o los botones para patear. Tocá afuera para cerrar.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function ArcadeBtn({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border-b-4 border-pitch-900 bg-pitch-500 py-3 font-mono text-sm font-bold text-white active:translate-y-0.5 active:border-b-2"
    >
      {children}
    </button>
  );
}
