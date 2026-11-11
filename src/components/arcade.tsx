"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Trophy, Flame, Share2, RotateCcw, Sparkles } from "lucide-react";

/**
 * FulboMundial Arcade Pro — Ultra liviano (0 dependencias externas, 100% Canvas + WebAudio).
 * Dos modos adictivos:
 *  1) "tirolibre": Tiro Libre con Comba (Barrera que salta, viento, blancos en el ángulo, pelota en llamas y rachas).
 *  2) "jueguito": Jueguito Infinito / Freestyle (No dejes caer la pelota, agarrá estrellas ⭐ y mates 🧉, esquivá patadas).
 */

type GameMode = "tirolibre" | "jueguito";

const CW = 320;
const CH = 380;

// Sintetizador de efectos de sonido liviano con Web Audio API
class SoundFX {
  private ctx: AudioContext | null = null;
  public muted = false;

  private getCtx(): AudioContext | null {
    if (this.muted || typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  kick() {
    const c = this.getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(150, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(42, c.currentTime + 0.11);
    gain.gain.setValueAtTime(0.35, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.11);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.12);
  }

  goal(isAngulo = false) {
    const c = this.getCtx();
    if (!c) return;
    const notes = isAngulo ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25];
    notes.forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, c.currentTime + i * 0.06);
      gain.gain.setValueAtTime(0.2, c.currentTime + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.008, c.currentTime + i * 0.06 + 0.25);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(c.currentTime + i * 0.06);
      osc.stop(c.currentTime + i * 0.06 + 0.26);
    });
  }

  post() {
    const c = this.getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(420, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, c.currentTime + 0.18);
    gain.gain.setValueAtTime(0.25, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.19);
  }

  miss() {
    const c = this.getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, c.currentTime);
    osc.frequency.linearRampToValueAtTime(110, c.currentTime + 0.25);
    gain.gain.setValueAtTime(0.18, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.26);
  }
}

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
};

export function Arcade() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<GameMode>("tirolibre");
  const [muted, setMuted] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [bestFK, setBestFK] = useState(0);
  const [bestJuggle, setBestJuggle] = useState(0);
  const [banner, setBanner] = useState<string>("ARRASTRÁ O TOCÁ PARA PATEAR CON COMBA");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sfxRef = useRef<SoundFX | null>(null);
  const resetTriggerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    sfxRef.current = new SoundFX();
    try {
      const savedFK = Number(localStorage.getItem("fm_arcade_best_fk") || "0");
      const savedJg = Number(localStorage.getItem("fm_arcade_best_jg") || "0");
      if (savedFK > 0) setBestFK(savedFK);
      if (savedJg > 0) setBestJuggle(savedJg);
    } catch {}
  }, []);

  useEffect(() => {
    if (sfxRef.current) sfxRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let frame = 0;
    const particles: Particle[] = [];

    function spawnParticles(x: number, y: number, colors: string[], count = 24) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.2 + Math.random() * 4.5;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          color: colors[i % colors.length],
          size: 2.5 + Math.random() * 3.5,
          life: 0,
          maxLife: 24 + Math.random() * 20,
        });
      }
    }

    // ========================================================================
    // ESTADO MODO 1: TIRO LIBRE CON COMBA
    // ========================================================================
    const fk = {
      score: 0,
      streak: 0,
      lives: 3,
      gameOver: false,
      phase: "aim" as "aim" | "flight" | "result",
      resultTimer: 0,
      shake: 0,
      wind: 0, // -2.5 a +2.5
      // Arco
      goalLeft: 56,
      goalRight: 264,
      goalTop: 54,
      goalBottom: 122,
      // Diana dorada (ángulo)
      targetX: 242,
      targetY: 72,
      targetR: 15,
      targetHit: false,
      // Arquero
      keeperX: 160,
      keeperY: 108,
      keeperVx: 1.4,
      keeperDiveX: 160,
      keeperDiveY: 108,
      keeperDiving: false,
      // Barrera (defensores)
      wallCount: 2,
      wallX: 135,
      wallY: 195,
      wallJump: 0,
      // Pelota (proyección 2.5D: z va de 0 en el punto de tiro a 1 en el arco)
      startX: 160,
      startY: 325,
      ballX: 160,
      ballY: 325,
      ballZ: 0,
      vx: 0,
      vy: 0,
      curve: 0,
      spin: 0,
      trail: [] as { x: number; y: number; r: number }[],
      // Gesto de arrastre (swipe/aim)
      dragging: false,
      dragStartX: 160,
      dragStartY: 325,
      dragCurX: 160,
      dragCurY: 260,
    };

    function setupNextFreeKick(fullReset = false) {
      if (fullReset) {
        fk.score = 0;
        fk.streak = 0;
        fk.lives = 3;
        fk.gameOver = false;
        setScore(0);
        setStreak(0);
        setLives(3);
      }
      fk.phase = "aim";
      fk.startX = 100 + Math.random() * 120;
      fk.startY = 322;
      fk.ballX = fk.startX;
      fk.ballY = fk.startY;
      fk.ballZ = 0;
      fk.trail = [];
      fk.keeperDiving = false;
      fk.keeperX = 160;
      fk.keeperY = 108;
      fk.wallJump = 0;
      fk.targetHit = false;

      // Dificultad progresiva según racha/puntaje
      const level = Math.floor(fk.score / 2);
      fk.wallCount = Math.min(4, 1 + Math.floor(level / 2));
      // Posicionar la barrera entre la pelota y el centro del arco
      fk.wallX = fk.startX + (160 - fk.startX) * 0.45 + (Math.random() * 24 - 12);
      fk.wallY = 205;

      // Viento a partir de 2 goles
      fk.wind = level >= 1 ? Math.round((Math.random() * 4 - 2) * 10) / 10 : 0;

      // Diana en uno de los dos ángulos superiores
      const leftCorner = Math.random() < 0.5;
      fk.targetX = leftCorner ? fk.goalLeft + 22 : fk.goalRight - 22;
      fk.targetY = fk.goalTop + 18;
    }

    // ========================================================================
    // ESTADO MODO 2: JUEGUITO INFINITO (FREESTYLE)
    // ========================================================================
    const jg = {
      score: 0,
      streak: 0,
      ballX: 160,
      ballY: 180,
      vx: 0,
      vy: 0,
      spin: 0,
      angle: 0,
      gravity: 0.28,
      started: false,
      starX: 90,
      starY: 110,
      starActive: true,
      starType: "star" as "star" | "mate",
      bootX: -40,
      bootY: -40,
      bootVx: 0,
      bootVy: 0,
      bootActive: false,
    };

    function resetJueguito() {
      jg.score = 0;
      jg.streak = 0;
      jg.ballX = 160;
      jg.ballY = 190;
      jg.vx = 0;
      jg.vy = 0;
      jg.spin = 0;
      jg.started = false;
      jg.starActive = true;
      jg.starX = 70 + Math.random() * 180;
      jg.starY = 85 + Math.random() * 110;
      jg.bootActive = false;
      setScore(0);
      setStreak(0);
      setLives(1);
      setBanner("TOCÁ LA PELOTA PARA HACER JUEGUITOS");
    }

    if (mode === "tirolibre") {
      setupNextFreeKick(true);
      setBanner("ARRASTRÁ DESDE LA PELOTA O TOCÁ EL ARCO");
    } else {
      resetJueguito();
    }

    resetTriggerRef.current = () => {
      if (mode === "tirolibre") setupNextFreeKick(true);
      else resetJueguito();
    };

    // ========================================================================
    // CONTROLES PUNTERO / TOUCH
    // ========================================================================
    function getCanvasCoords(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * CW,
        y: ((e.clientY - rect.top) / rect.height) * CH,
      };
    }

    function launchFreeKick(targetX: number, targetY: number, curveAmount: number) {
      if (fk.phase !== "aim") return;
      if (fk.gameOver) {
        setupNextFreeKick(true);
        return;
      }
      sfxRef.current?.kick();
      fk.phase = "flight";
      const clampedY = Math.max(38, Math.min(135, targetY));
      const clampedX = Math.max(25, Math.min(CW - 25, targetX));

      const framesToGoal = 34;
      fk.vx = (clampedX - fk.startX) / framesToGoal;
      fk.vy = (clampedY - fk.startY) / framesToGoal;
      fk.curve = curveAmount;
      fk.spin = curveAmount * 12;

      // El arquero reacciona con una pequeña demora y predicción
      const speedBonus = Math.min(1.15, 0.72 + fk.streak * 0.05);
      const predictedX = Math.max(fk.goalLeft + 18, Math.min(fk.goalRight - 18, clampedX + curveAmount * 85));
      // Probabilidad de que el arquero adivine el lado
      const keeperGuessesRight = Math.random() < (0.45 + Math.min(0.3, fk.streak * 0.04));
      fk.keeperDiveX = keeperGuessesRight
        ? predictedX
        : fk.goalLeft + 25 + Math.random() * (fk.goalRight - fk.goalLeft - 50);
      fk.keeperDiveY = Math.max(fk.goalTop + 14, Math.min(fk.goalBottom - 10, clampedY));
      fk.keeperDiving = true;
      fk.keeperVx = speedBonus;
    }

    function onPointerDown(e: PointerEvent) {
      const pt = getCanvasCoords(e);

      if (mode === "tirolibre") {
        if (fk.gameOver) {
          setupNextFreeKick(true);
          return;
        }
        if (fk.phase !== "aim") return;
        fk.dragging = true;
        fk.dragStartX = pt.x;
        fk.dragStartY = pt.y;
        fk.dragCurX = pt.x;
        fk.dragCurY = pt.y;
      } else {
        // MODO JUEGUITO: tocar la pelota o cerca de ella para levantarla
        const dx = pt.x - jg.ballX;
        const dy = pt.y - jg.ballY;
        const dist = Math.hypot(dx, dy);
        if (dist < 58) {
          sfxRef.current?.kick();
          jg.started = true;
          jg.vy = -8.2 - Math.random() * 1.2;
          jg.vx = -dx * 0.16 + (Math.random() - 0.5) * 1.2;
          jg.spin = -dx * 0.015;
          jg.score += 1;
          jg.streak += 1;

          const centered = Math.abs(dx) < 10;
          if (centered && jg.streak >= 3) {
            jg.score += 1;
            setBanner(`🔥 ¡CHICHE PERFECTO! x${jg.streak}`);
            spawnParticles(jg.ballX, jg.ballY + 12, ["#facc15", "#4ade80", "#ffffff"], 14);
          } else {
            setBanner(`⚽ ${jg.score} TOQUES`);
          }

          setScore(jg.score);
          setStreak(jg.streak);
          setBestJuggle((prev) => {
            const next = Math.max(prev, jg.score);
            try {
              localStorage.setItem("fm_arcade_best_jg", String(next));
            } catch {}
            return next;
          });
        }
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (mode !== "tirolibre" || !fk.dragging) return;
      const pt = getCanvasCoords(e);
      fk.dragCurX = pt.x;
      fk.dragCurY = pt.y;
    }

    function onPointerUp(e: PointerEvent) {
      if (mode !== "tirolibre" || !fk.dragging) return;
      fk.dragging = false;
      const pt = getCanvasCoords(e);
      const dx = pt.x - fk.dragStartX;
      const dy = pt.y - fk.dragStartY;
      const dist = Math.hypot(dx, dy);

      if (dist < 14) {
        // Si hizo un tap directo hacia el arco, patea hacia donde tocó con una leve comba
        const tapTargetY = pt.y < 180 ? pt.y : 78;
        const tapTargetX = pt.y < 180 ? pt.x : 85 + Math.random() * 150;
        const autoCurve = (fk.startX - tapTargetX) * 0.0012;
        launchFreeKick(tapTargetX, tapTargetY, autoCurve);
      } else {
        // Arrastró desde abajo hacia arriba: la dirección define el destino y la desviación lateral da comba
        const targetX = fk.startX + dx * 1.35;
        const targetY = Math.max(45, Math.min(125, fk.goalBottom - Math.abs(dy) * 0.55));
        const curve = Math.max(-0.22, Math.min(0.22, (dx / 120) * 0.14));
        launchFreeKick(targetX, targetY, curve);
      }
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    // ========================================================================
    // RENDER & UPDATE LOOP
    // ========================================================================
    function drawStadiumBackground() {
      // Cielo nocturno de estadio
      const sky = ctx!.createLinearGradient(0, 0, 0, 95);
      sky.addColorStop(0, "#051b11");
      sky.addColorStop(1, "#0d3b26");
      ctx!.fillStyle = sky;
      ctx!.fillRect(0, 0, CW, 95);

      // Reflectores del estadio
      ctx!.fillStyle = "rgba(253, 224, 71, 0.12)";
      ctx!.beginPath();
      ctx!.arc(45, 12, 48, 0, Math.PI * 2);
      ctx!.arc(CW - 45, 12, 48, 0, Math.PI * 2);
      ctx!.fill();

      // Tribuna / Hinchada animada
      ctx!.fillStyle = "#111827";
      ctx!.fillRect(0, 68, CW, 28);
      for (let i = 8; i < CW; i += 12) {
        const bounce = Math.sin(frame * 0.15 + i) * (fk.streak >= 2 ? 3 : 1);
        ctx!.fillStyle = i % 24 === 0 ? "#10b981" : i % 36 === 0 ? "#facc15" : "#e5e7eb";
        ctx!.beginPath();
        ctx!.arc(i, 80 + bounce, 3, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Césped con franjas en perspectiva
      for (let i = 0; i < 10; i++) {
        const y0 = 95 + i * 28.5;
        ctx!.fillStyle = i % 2 === 0 ? "#15803d" : "#166534";
        ctx!.fillRect(0, y0, CW, 29);
      }

      // Líneas de área en perspectiva
      ctx!.strokeStyle = "rgba(255,255,255,0.45)";
      ctx!.lineWidth = 2;
      ctx!.beginPath();
      ctx!.moveTo(0, 96);
      ctx!.lineTo(CW, 96);
      ctx!.moveTo(28, 96);
      ctx!.lineTo(6, 210);
      ctx!.lineTo(CW - 6, 210);
      ctx!.lineTo(CW - 28, 96);
      ctx!.stroke();
    }

    function drawGoalAndTarget() {
      const { goalLeft, goalRight, goalTop, goalBottom } = fk;
      const gw = goalRight - goalLeft;
      const gh = goalBottom - goalTop;

      // Sombra del arco
      ctx!.fillStyle = "rgba(0,0,0,0.28)";
      ctx!.fillRect(goalLeft - 4, goalBottom - 3, gw + 8, 6);

      // Red del arco
      ctx!.strokeStyle = "rgba(255,255,255,0.22)";
      ctx!.lineWidth = 1;
      for (let x = goalLeft; x <= goalRight; x += 10) {
        ctx!.beginPath();
        ctx!.moveTo(x, goalTop);
        ctx!.lineTo(x, goalBottom);
        ctx!.stroke();
      }
      for (let y = goalTop; y <= goalBottom; y += 10) {
        ctx!.beginPath();
        ctx!.moveTo(goalLeft, y);
        ctx!.lineTo(goalRight, y);
        ctx!.stroke();
      }

      // Postes y travesaño
      ctx!.strokeStyle = "#ffffff";
      ctx!.lineWidth = 5;
      ctx!.lineJoin = "round";
      ctx!.beginPath();
      ctx!.moveTo(goalLeft, goalBottom);
      ctx!.lineTo(goalLeft, goalTop);
      ctx!.lineTo(goalRight, goalTop);
      ctx!.lineTo(goalRight, goalBottom);
      ctx!.stroke();

      // Diana Dorada ("Al Ángulo +3")
      if (!fk.targetHit) {
        const pulse = 1 + Math.sin(frame * 0.12) * 0.08;
        const r = fk.targetR * pulse;
        ctx!.save();
        ctx!.translate(fk.targetX, fk.targetY);
        ctx!.fillStyle = "rgba(250, 204, 21, 0.28)";
        ctx!.beginPath();
        ctx!.arc(0, 0, r + 4, 0, Math.PI * 2);
        ctx!.fill();

        ctx!.strokeStyle = "#facc15";
        ctx!.lineWidth = 2.5;
        ctx!.beginPath();
        ctx!.arc(0, 0, r, 0, Math.PI * 2);
        ctx!.stroke();

        ctx!.fillStyle = "#ef4444";
        ctx!.beginPath();
        ctx!.arc(0, 0, r * 0.45, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();
      }
    }

    function drawDefenderWall() {
      const spacing = 22;
      const totalW = (fk.wallCount - 1) * spacing;
      const startX = fk.wallX - totalW / 2;

      for (let i = 0; i < fk.wallCount; i++) {
        const x = startX + i * spacing;
        const y = fk.wallY - fk.wallJump;

        // Sombra
        ctx!.fillStyle = "rgba(0,0,0,0.3)";
        ctx!.beginPath();
        ctx!.ellipse(x, fk.wallY + 14, 8, 3.5, 0, 0, Math.PI * 2);
        ctx!.fill();

        // Camiseta rival (azul/celeste)
        ctx!.fillStyle = "#1d4ed8";
        ctx!.fillRect(x - 7, y - 14, 14, 18);
        ctx!.fillStyle = "#93c5fd";
        ctx!.fillRect(x - 3, y - 14, 6, 18);

        // Cabeza
        ctx!.fillStyle = "#fcd34d";
        ctx!.beginPath();
        ctx!.arc(x, y - 20, 5.5, 0, Math.PI * 2);
        ctx!.fill();

        // Short
        ctx!.fillStyle = "#111827";
        ctx!.fillRect(x - 6, y + 4, 12, 6);
      }
    }

    function drawGoalkeeper() {
      const x = fk.keeperX;
      const y = fk.keeperY;

      // Sombra
      ctx!.fillStyle = "rgba(0,0,0,0.32)";
      ctx!.beginPath();
      ctx!.ellipse(x, 120, 12, 4, 0, 0, Math.PI * 2);
      ctx!.fill();

      ctx!.save();
      ctx!.translate(x, y);
      if (fk.keeperDiving) {
        const tilt = fk.keeperDiveX < 160 ? -0.45 : fk.keeperDiveX > 160 ? 0.45 : 0;
        ctx!.rotate(tilt);
      }

      // Guantes extendidos
      ctx!.fillStyle = "#facc15";
      ctx!.beginPath();
      ctx!.arc(-15, -6, 4.5, 0, Math.PI * 2);
      ctx!.arc(15, -6, 4.5, 0, Math.PI * 2);
      ctx!.fill();

      // Buzo de arquero
      ctx!.fillStyle = "#dc2626";
      ctx!.fillRect(-9, -12, 18, 18);

      // Cabeza
      ctx!.fillStyle = "#fde68a";
      ctx!.beginPath();
      ctx!.arc(0, -18, 6, 0, Math.PI * 2);
      ctx!.fill();

      // Pantalón
      ctx!.fillStyle = "#18181b";
      ctx!.fillRect(-8, 6, 16, 6);
      ctx!.restore();
    }

    function drawSoccerBall(x: number, y: number, r: number, onFire: boolean, angle = 0) {
      if (onFire) {
        const grad = ctx!.createRadialGradient(x, y, r * 0.2, x, y, r * 2.1);
        grad.addColorStop(0, "rgba(251, 191, 36, 0.9)");
        grad.addColorStop(0.5, "rgba(239, 68, 68, 0.55)");
        grad.addColorStop(1, "rgba(239, 68, 68, 0)");
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(x, y, r * 2.1, 0, Math.PI * 2);
        ctx!.fill();
      }

      ctx!.save();
      ctx!.translate(x, y);
      ctx!.rotate(angle);

      // Esfera blanca con brillo
      ctx!.fillStyle = "#ffffff";
      ctx!.beginPath();
      ctx!.arc(0, 0, r, 0, Math.PI * 2);
      ctx!.fill();

      ctx!.strokeStyle = "#18181b";
      ctx!.lineWidth = 1.5;
      ctx!.stroke();

      // Gajos clásicos
      ctx!.fillStyle = "#18181b";
      ctx!.beginPath();
      ctx!.arc(0, 0, r * 0.35, 0, Math.PI * 2);
      ctx!.fill();

      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        ctx!.beginPath();
        ctx!.arc(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, r * 0.2, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.restore();
    }

    function loop() {
      frame++;
      ctx!.save();

      if (fk.shake > 0) {
        const sx = (Math.random() - 0.5) * fk.shake;
        const sy = (Math.random() - 0.5) * fk.shake;
        ctx!.translate(sx, sy);
        fk.shake *= 0.85;
        if (fk.shake < 0.4) fk.shake = 0;
      }

      drawStadiumBackground();

      // ====================================================================
      // LOOP MODO 1: TIRO LIBRE CON COMBA
      // ====================================================================
      if (mode === "tirolibre") {
        drawGoalAndTarget();

        // Movimiento del arquero
        if (fk.phase === "aim") {
          fk.keeperX += fk.keeperVx;
          if (fk.keeperX > fk.goalRight - 28) fk.keeperVx = -Math.abs(fk.keeperVx);
          if (fk.keeperX < fk.goalLeft + 28) fk.keeperVx = Math.abs(fk.keeperVx);
        } else if (fk.phase === "flight") {
          fk.keeperX += (fk.keeperDiveX - fk.keeperX) * 0.14 * fk.keeperVx;
          fk.keeperY += (fk.keeperDiveY - fk.keeperY) * 0.14;
          // La barrera salta
          fk.wallJump = Math.min(18, fk.wallJump + 1.4);
        }

        drawGoalkeeper();
        drawDefenderWall();

        // Indicador de Viento si existe
        if (Math.abs(fk.wind) > 0.1) {
          ctx!.fillStyle = "rgba(0,0,0,0.55)";
          ctx!.fillRect(10, 10, 108, 22);
          ctx!.fillStyle = "#38bdf8";
          ctx!.font = "bold 11px sans-serif";
          ctx!.textAlign = "left";
          const dirArrow = fk.wind > 0 ? "💨 Viento ▶" : "◀ Viento 💨";
          ctx!.fillText(`${dirArrow} ${Math.abs(fk.wind).toFixed(1)}`, 16, 25);
        }

        // Física de vuelo de la pelota
        if (fk.phase === "flight") {
          fk.ballZ += 1 / 34;
          fk.vx += fk.curve + fk.wind * 0.018;
          fk.ballX += fk.vx;
          fk.ballY += fk.vy;

          const currentRadius = Math.max(6.5, 13 * (1 - fk.ballZ * 0.48));
          fk.trail.push({ x: fk.ballX, y: fk.ballY, r: currentRadius });
          if (fk.trail.length > 12) fk.trail.shift();

          // 1) Chequeo colisión con la barrera (cuando pasa por la mitad del recorrido)
          if (fk.ballZ > 0.36 && fk.ballZ < 0.46) {
            const spacing = 22;
            const totalW = (fk.wallCount - 1) * spacing;
            const wallLeft = fk.wallX - totalW / 2 - 10;
            const wallRight = fk.wallX + totalW / 2 + 10;
            const wallTop = fk.wallY - fk.wallJump - 24;
            if (fk.ballX >= wallLeft && fk.ballX <= wallRight && fk.ballY >= wallTop) {
              sfxRef.current?.post();
              fk.phase = "result";
              fk.resultTimer = 0;
              fk.streak = 0;
              fk.lives -= 1;
              setStreak(0);
              setLives(fk.lives);
              setBanner(fk.lives <= 0 ? "💀 ¡SIN VIDAS! TOCÁ PARA REINICIAR" : "🧱 ¡DIO EN LA BARRERA!");
              if (fk.lives <= 0) fk.gameOver = true;
              spawnParticles(fk.ballX, fk.ballY, ["#93c5fd", "#ffffff"], 15);
            }
          }

          // 2) Llegada al plano del arco
          if (fk.ballZ >= 1 && fk.phase === "flight") {
            fk.phase = "result";
            fk.resultTimer = 0;

            const inPostsX = fk.ballX > fk.goalLeft + 4 && fk.ballX < fk.goalRight - 4;
            const inPostsY = fk.ballY > fk.goalTop + 4 && fk.ballY < fk.goalBottom;
            const hitsPost =
              (Math.abs(fk.ballX - fk.goalLeft) <= 7 || Math.abs(fk.ballX - fk.goalRight) <= 7) &&
              fk.ballY >= fk.goalTop - 4 &&
              fk.ballY <= fk.goalBottom;
            const hitsCrossbar =
              Math.abs(fk.ballY - fk.goalTop) <= 6 &&
              fk.ballX >= fk.goalLeft - 4 &&
              fk.ballX <= fk.goalRight + 4;

            // ¿Atajó el arquero?
            const keeperDist = Math.hypot(fk.ballX - fk.keeperX, fk.ballY - fk.keeperY);
            const savedByKeeper = keeperDist < 22;

            // ¿Dio en la diana del ángulo?
            const targetDist = Math.hypot(fk.ballX - fk.targetX, fk.ballY - fk.targetY);

            if (savedByKeeper && inPostsX && inPostsY) {
              sfxRef.current?.miss();
              fk.streak = 0;
              fk.lives -= 1;
              setStreak(0);
              setLives(fk.lives);
              setBanner(fk.lives <= 0 ? "💀 ¡FINAL! TOCÁ PARA JUGAR DE NUEVO" : "🧤 ¡ATAJÓ EL ARQUERO!");
              if (fk.lives <= 0) fk.gameOver = true;
              spawnParticles(fk.ballX, fk.ballY, ["#ef4444", "#facc15"], 16);
            } else if (inPostsX && inPostsY) {
              const hitAngulo = targetDist <= fk.targetR + 9;
              const pointsEarned = hitAngulo ? 3 : 1;
              fk.score += pointsEarned;
              fk.streak += 1;
              fk.shake = hitAngulo ? 10 : 5;
              if (hitAngulo) fk.targetHit = true;

              sfxRef.current?.goal(hitAngulo);
              setScore(fk.score);
              setStreak(fk.streak);
              setBestFK((prev) => {
                const next = Math.max(prev, fk.score);
                try {
                  localStorage.setItem("fm_arcade_best_fk", String(next));
                } catch {}
                return next;
              });

              if (hitAngulo) {
                setBanner(`🎯 ¡AL ÁNGULO +3 PTS! (RACHA x${fk.streak})`);
                spawnParticles(fk.ballX, fk.ballY, ["#facc15", "#4ade80", "#ffffff", "#f97316"], 38);
              } else {
                setBanner(`⚽ ¡GOOOL! (RACHA x${fk.streak})`);
                spawnParticles(fk.ballX, fk.ballY, ["#4ade80", "#ffffff", "#facc15"], 26);
              }
            } else if (hitsPost || hitsCrossbar) {
              sfxRef.current?.post();
              fk.shake = 7;
              fk.streak = 0;
              fk.lives -= 1;
              setStreak(0);
              setLives(fk.lives);
              setBanner(fk.lives <= 0 ? "💀 ¡TRAVESAÑO Y AFUERA! TOCÁ PARA REINICIAR" : "💥 ¡PEGÓ EN EL PALO!");
              if (fk.lives <= 0) fk.gameOver = true;
              spawnParticles(fk.ballX, fk.ballY, ["#ffffff", "#facc15"], 20);
            } else {
              sfxRef.current?.miss();
              fk.streak = 0;
              fk.lives -= 1;
              setStreak(0);
              setLives(fk.lives);
              setBanner(fk.lives <= 0 ? "💀 ¡SE FUE A LA TRIBUNA! TOCÁ PARA REINICIAR" : "💨 ¡SE FUE AFUERA!");
              if (fk.lives <= 0) fk.gameOver = true;
            }
          }
        } else if (fk.phase === "result") {
          fk.resultTimer++;
          if (fk.resultTimer > 42 && !fk.gameOver) {
            setupNextFreeKick(false);
          }
        }

        // Guía visual de apuntado cuando arrastra
        if (fk.phase === "aim" && fk.dragging) {
          const dx = fk.dragCurX - fk.dragStartX;
          const dy = fk.dragCurY - fk.dragStartY;
          ctx!.strokeStyle = "rgba(250, 204, 21, 0.8)";
          ctx!.lineWidth = 3;
          ctx!.setLineDash([5, 5]);
          ctx!.beginPath();
          ctx!.moveTo(fk.startX, fk.startY);
          ctx!.quadraticCurveTo(
            fk.startX + dx * 0.9,
            fk.startY - 90,
            fk.startX + dx * 1.35,
            Math.max(55, fk.goalBottom - Math.abs(dy) * 0.55)
          );
          ctx!.stroke();
          ctx!.setLineDash([]);
        }

        // Estela de la pelota
        for (let i = 0; i < fk.trail.length; i++) {
          const t = fk.trail[i];
          const alpha = ((i + 1) / fk.trail.length) * 0.45;
          ctx!.fillStyle = fk.streak >= 2 ? `rgba(251, 146, 60, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
          ctx!.beginPath();
          ctx!.arc(t.x, t.y, t.r * 0.75, 0, Math.PI * 2);
          ctx!.fill();
        }

        // Dibujar pelota
        const r = Math.max(6.5, 13 * (1 - fk.ballZ * 0.48));
        drawSoccerBall(fk.ballX, fk.ballY, r, fk.streak >= 2, frame * fk.spin);
      }

      // ====================================================================
      // LOOP MODO 2: JUEGUITO INFINITO (FREESTYLE)
      // ====================================================================
      else {
        if (jg.started) {
          jg.vy += jg.gravity;
          jg.ballX += jg.vx;
          jg.ballY += jg.vy;
          jg.angle += jg.spin;

          // Rebote en bordes laterales
          if (jg.ballX < 22) {
            jg.ballX = 22;
            jg.vx = Math.abs(jg.vx) * 0.85;
          } else if (jg.ballX > CW - 22) {
            jg.ballX = CW - 22;
            jg.vx = -Math.abs(jg.vx) * 0.85;
          }

          // Agarrar estrella o mate en el aire
          if (jg.starActive) {
            const distStar = Math.hypot(jg.ballX - jg.starX, jg.ballY - jg.starY);
            if (distStar < 28) {
              const bonus = jg.starType === "mate" ? 5 : 3;
              jg.score += bonus;
              sfxRef.current?.goal(true);
              spawnParticles(jg.starX, jg.starY, ["#facc15", "#4ade80", "#ffffff"], 22);
              setBanner(jg.starType === "mate" ? "🧉 ¡MATE POWER +5 TOQUES!" : "⭐ ¡ESTRELLA +3 TOQUES!");
              setScore(jg.score);
              setBestJuggle((prev) => {
                const next = Math.max(prev, jg.score);
                try {
                  localStorage.setItem("fm_arcade_best_jg", String(next));
                } catch {}
                return next;
              });
              jg.starX = 55 + Math.random() * (CW - 110);
              jg.starY = 75 + Math.random() * 130;
              jg.starType = Math.random() < 0.35 ? "mate" : "star";
            }
          }

          // Se cayó al pasto -> reinicio
          if (jg.ballY > CH - 28) {
            sfxRef.current?.miss();
            spawnParticles(jg.ballX, CH - 28, ["#ef4444", "#ffffff"], 18);
            setBanner(`💥 SE CAYÓ A LOS ${jg.score} TOQUES — TOCÁ PARA EMPEZAR`);
            jg.started = false;
            jg.score = 0;
            jg.streak = 0;
            jg.ballX = 160;
            jg.ballY = 195;
            jg.vx = 0;
            jg.vy = 0;
            setScore(0);
            setStreak(0);
          }
        } else {
          // Pelota flotando esperando el primer toque
          jg.ballY = 195 + Math.sin(frame * 0.08) * 6;
        }

        // Dibujar estrella / mate bonus
        if (jg.starActive) {
          ctx!.font = "22px sans-serif";
          ctx!.textAlign = "center";
          ctx!.textBaseline = "middle";
          ctx!.fillText(
            jg.starType === "mate" ? "🧉" : "⭐",
            jg.starX,
            jg.starY + Math.sin(frame * 0.1) * 4
          );
        }

        // Sombra en el piso
        const shadowScale = Math.max(0.3, Math.min(1.2, jg.ballY / 320));
        ctx!.fillStyle = "rgba(0,0,0,0.32)";
        ctx!.beginPath();
        ctx!.ellipse(jg.ballX, CH - 24, 18 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
        ctx!.fill();

        // Pelota de jueguito
        drawSoccerBall(jg.ballX, jg.ballY, 20, jg.streak >= 8, jg.angle);
      }

      // ====================================================================
      // PARTÍCULAS
      // ====================================================================
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.life++;
        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = alpha;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.globalAlpha = 1;
        if (p.life >= p.maxLife) particles.splice(i, 1);
      }

      ctx!.restore();
      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [open, mode]);

  const currentBest = mode === "tirolibre" ? bestFK : bestJuggle;

  function shareScoreWhatsApp() {
    const modeName = mode === "tirolibre" ? "Tiro Libre con Comba" : "Jueguito Freestyle";
    const record = Math.max(score, currentBest);
    const text = `🎮⚽ ¡Acabo de meter *${record} pts* en el modo *${modeName}* del Arcade de FulboMundial!\n\n🔥 ¿Quién me supera en el grupo?\n👉 https://fulbomundial.com.ar`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <>
      {/* Botón Flotante Arcade */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir FulboMundial Arcade"
          className="fixed bottom-24 right-3 z-40 h-13 w-13 rounded-2xl border-2 border-amber-400/80 bg-gradient-to-br from-zinc-950 via-emerald-950 to-zinc-900 text-white shadow-xl active:scale-95 ring-4 ring-emerald-500/20 flex flex-col items-center justify-center p-1.5 hover:scale-105 transition-transform"
        >
          <span className="text-xl leading-none animate-bounce">⚽</span>
          <span className="text-[8px] font-black uppercase tracking-tighter text-amber-300 mt-0.5">
            ARCADE
          </span>
        </button>
      )}

      {/* Modal del Arcade */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-xs p-3"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-3xl border-2 border-emerald-500/50 bg-gradient-to-b from-zinc-950 via-emerald-950 to-zinc-950 p-3.5 text-white shadow-2xl space-y-2.5 animate-scale-in">
            {/* Barra Superior */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-zinc-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={11} /> POTRERO ARCADE
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  className="h-7 w-7 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-200"
                  title={muted ? "Activar sonido" : "Silenciar"}
                >
                  {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <button
                  type="button"
                  onClick={() => resetTriggerRef.current?.()}
                  className="h-7 w-7 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-200"
                  title="Reiniciar partida"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar"
                  className="h-7 w-7 rounded-xl bg-red-600 hover:bg-red-500 font-black text-xs text-white flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Selector de los 2 Juegos */}
            <div className="grid grid-cols-2 gap-1.5 bg-black/40 p-1 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setMode("tirolibre")}
                className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all ${
                  mode === "tirolibre"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                🎯 Tiro Libre con Comba
              </button>
              <button
                type="button"
                onClick={() => setMode("jueguito")}
                className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all ${
                  mode === "jueguito"
                    ? "bg-gradient-to-r from-amber-400 to-yellow-300 text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                🔥 Jueguito Freestyle
              </button>
            </div>

            {/* Marcador / Vidas / Récord */}
            <div className="grid grid-cols-3 items-center bg-black/50 rounded-2xl px-3 py-2 border border-white/10 text-xs">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Puntos</span>
                <span className="text-lg font-black text-white leading-none">{score}</span>
                {streak >= 2 && (
                  <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-black text-orange-400">
                    <Flame size={11} /> x{streak}
                  </span>
                )}
              </div>

              <div className="text-center">
                {mode === "tirolibre" ? (
                  <>
                    <span className="text-[10px] text-zinc-400 uppercase font-bold block">Vidas</span>
                    <span className="text-sm tracking-widest">
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <span key={idx} className={idx < lives ? "opacity-100" : "opacity-25"}>
                          ❤️
                        </span>
                      ))}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-zinc-400 uppercase font-bold block">Combo</span>
                    <span className="text-sm font-black text-amber-300">
                      {streak >= 3 ? `🔥 x${streak}` : "Activo"}
                    </span>
                  </>
                )}
              </div>

              <div className="text-right">
                <span className="text-[10px] text-amber-300/80 uppercase font-bold flex items-center justify-end gap-1">
                  <Trophy size={10} /> Récord
                </span>
                <span className="text-lg font-black text-amber-300 leading-none">
                  {currentBest}
                </span>
              </div>
            </div>

            {/* Pantalla del Juego */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-black shadow-inner">
              <canvas
                ref={canvasRef}
                width={CW}
                height={CH}
                className="block w-full select-none"
                style={{ touchAction: "none" }}
              />
              {/* Banner flotante de estado */}
              <div className="pointer-events-none absolute bottom-2 inset-x-2 text-center">
                <span className="inline-block px-3 py-1 rounded-full bg-black/75 border border-white/15 text-[11px] font-black text-amber-300 tracking-wide shadow-md">
                  {banner}
                </span>
              </div>
            </div>

            {/* Pie con botón para desafiar por WhatsApp */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <p className="text-[11px] text-zinc-400 leading-tight">
                {mode === "tirolibre"
                  ? "💡 Arrastrá con curva para esquivar la barrera y clavar el ángulo 🎯 (+3)."
                  : "💡 Tocá la pelota sin dejarla caer y agarrá ⭐ (+3) y 🧉 (+5)."}
              </p>
              <button
                type="button"
                onClick={shareScoreWhatsApp}
                className="shrink-0 py-2 px-3 rounded-xl bg-[#25D366] hover:bg-[#1ebe5a] text-white font-black text-[11px] inline-flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Share2 size={13} /> Desafiar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
