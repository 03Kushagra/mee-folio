import { useEffect, useRef } from "react";
import { RoleBoard, toRoleCards } from "../../components/RoleBoard/RoleBoard";
import { startCanvasLoop, toneColors } from "../../lib/canvasLoop";
import "./RoleShapesHero.css";

// This archived hero draws a picture per role, so it keeps its own fixed list of roles.
const roles = toRoleCards([
  { label: "AI Code Evaluator", tone: "purple" },
  { label: "Frontend Engineer", tone: "blue" },
  { label: "Full-stack Developer", tone: "orange" },
  { label: "Creative Technologist", tone: "teal" },
  { label: "Product-minded Engineer", tone: "yellow" },
]);

type Tone = 0 | 1 | 2; // base, danger, success

type Particle = {
  delay: number; // seconds after a role change before this particle heads to its new spot
  holdX: number;
  holdY: number;
  lane: number; // fixed per-particle offset used by the moving formations
  phase: number; // 0..1 position along a path, for moving formations
  stiffness: number;
  tone: Tone;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

type Mode = "targets" | "network" | "curve";

type Shape = {
  draw: (context: CanvasRenderingContext2D, width: number, height: number) => void;
  mode: Mode;
};

const SANS = "Inter, ui-sans-serif, system-ui, sans-serif";
// Shapes are drawn in these marker colours; sampling reads them back as particle tones.
const DANGER_INK = "#ff0000";
const SUCCESS_INK = "#00ff00";
const BASE_INK = "#000000";
const TONE_COLORS = ["", "#e11d48", "#16a34a"] as const;

const ink = (context: CanvasRenderingContext2D, color: string) => {
  context.fillStyle = color;
  context.strokeStyle = color;
};
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const pill = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = height / 2,
) => {
  context.beginPath();
  context.roundRect(x, y, Math.max(0, width), Math.max(0, height), radius);
};

// Loop that the "requests" travel along in the full-stack formation (fractions of the section).
const networkLoop = [
  [0.14, 0.3],
  [0.5, 0.17],
  [0.86, 0.3],
  [0.86, 0.8],
  [0.5, 0.88],
  [0.14, 0.8],
  [0.14, 0.3],
] as const;

const shapes: Record<string, Shape> = {
  "ai-code-evaluator": {
    // Code with syntax-like token groups, a rejected line, an approved line,
    // a review comment and a score.
    draw(context, width, height) {
      const lines: Array<{ indent: number; tokens: number[] }> = [
        { indent: 0, tokens: [0.06, 0.16, 0.08] },
        { indent: 1, tokens: [0.05, 0.12, 0.04, 0.1] },
        { indent: 1, tokens: [0.04, 0.2] },
        { indent: 2, tokens: [0.03, 0.09, 0.14, 0.05] },
        { indent: 2, tokens: [0.1, 0.06] },
        { indent: 1, tokens: [0.05] },
        { indent: 1, tokens: [0.06, 0.08, 0.12] },
        { indent: 2, tokens: [0.07, 0.18, 0.06] },
        { indent: 2, tokens: [0.05, 0.11] },
        { indent: 1, tokens: [0.04] },
        { indent: 0, tokens: [0.03] },
        { indent: 0, tokens: [0.07, 0.1, 0.15] },
        { indent: 1, tokens: [0.06, 0.2, 0.05] },
        { indent: 0, tokens: [0.03] },
      ];
      const left = width * 0.07;
      const top = height * 0.18;
      const step = (height * 0.74) / lines.length;
      const barHeight = Math.max(6, step * 0.42);
      const rejected = 7;
      const approved = 12;

      context.font = `600 ${Math.round(step * 0.5)}px ${MONO}`;
      context.textBaseline = "middle";

      lines.forEach((line, index) => {
        const y = top + index * step;
        context.fillText(String(index + 1).padStart(2, " "), left - width * 0.035, y + barHeight / 2);
        let x = left + line.indent * width * 0.03;

        for (const token of line.tokens) {
          pill(context, x, y, width * token, barHeight);
          context.fill();
          x += width * token + width * 0.008;
        }

        if (index === rejected) {
          ink(context, DANGER_INK);
          context.lineWidth = 4;
          context.beginPath();
          context.moveTo(left - 8, y + barHeight / 2);
          context.lineTo(x + 4, y + barHeight / 2);
          context.stroke();
          const cx = x + 36;
          const cy = y + barHeight / 2;
          context.lineWidth = 6;
          context.beginPath();
          context.moveTo(cx - 12, cy - 12);
          context.lineTo(cx + 12, cy + 12);
          context.moveTo(cx + 12, cy - 12);
          context.lineTo(cx - 12, cy + 12);
          context.stroke();
          ink(context, BASE_INK);
        }

        if (index === approved) {
          ink(context, SUCCESS_INK);
          const cx = x + 40;
          const cy = y + barHeight / 2;
          context.lineWidth = 7;
          context.beginPath();
          context.moveTo(cx - 18, cy);
          context.lineTo(cx - 5, cy + 14);
          context.lineTo(cx + 22, cy - 18);
          context.stroke();
          ink(context, BASE_INK);
        }
      });

      // Review comment bubble, top right.
      const bubbleX = width * 0.72;
      const bubbleY = height * 0.12;
      const bubbleW = width * 0.23;
      const bubbleH = height * 0.2;
      context.lineWidth = 3;
      pill(context, bubbleX, bubbleY, bubbleW, bubbleH, 16);
      context.stroke();
      context.beginPath();
      context.moveTo(bubbleX + 30, bubbleY + bubbleH);
      context.lineTo(bubbleX + 18, bubbleY + bubbleH + 24);
      context.lineTo(bubbleX + 52, bubbleY + bubbleH);
      context.stroke();
      context.beginPath();
      context.arc(bubbleX + 30, bubbleY + 30, 12, 0, Math.PI * 2);
      context.fill();
      [0.62, 0.8, 0.5].forEach((fraction, index) => {
        pill(context, bubbleX + 54, bubbleY + 22 + index * 22, (bubbleW - 76) * fraction, 9);
        context.fill();
      });

      // Score, bottom right.
      const scoreX = width * 0.72;
      const scoreY = height * 0.8;
      context.font = `800 ${Math.round(height * 0.07)}px ${SANS}`;
      context.textBaseline = "alphabetic";
      ink(context, DANGER_INK);
      context.fillText("2/5", scoreX, scoreY);
      for (let point = 0; point < 5; point += 1) {
        pill(context, scoreX + point * 46, scoreY + 18, 38, 12);
        if (point < 2) context.fill();
        else context.stroke();
      }
      ink(context, BASE_INK);
    },
    mode: "targets",
  },
  "creative-technologist": {
    // A slowly turning spirograph; particles travel along it (see the "curve" mode).
    draw() {},
    mode: "curve",
  },
  "frontend-engineer": {
    // A wireframe of a web page, with real-ish content inside each block.
    draw(context, width, height) {
      const x = width * 0.05;
      const y = height * 0.08;
      const w = width * 0.9;
      const h = height * 0.84;
      context.lineWidth = 3;
      pill(context, x, y, w, h, 20);
      context.stroke();
      context.beginPath();
      context.moveTo(x, y + h * 0.09);
      context.lineTo(x + w, y + h * 0.09);
      context.stroke();

      for (let index = 0; index < 3; index += 1) {
        context.beginPath();
        context.arc(x + 26 + index * 22, y + h * 0.045, 6, 0, Math.PI * 2);
        context.fill();
      }
      pill(context, x + w * 0.3, y + h * 0.025, w * 0.4, h * 0.04);
      context.stroke();
      for (let index = 0; index < 4; index += 1) {
        pill(context, x + w - 90 - index * 84, y + h * 0.13, 62, 10);
        context.fill();
      }
      pill(context, x + w * 0.03, y + h * 0.12, 120, 16, 4);
      context.fill();

      // Hero copy and buttons.
      context.font = `800 ${Math.round(h * 0.085)}px ${SANS}`;
      context.textBaseline = "top";
      context.fillText("Hello, world.", x + w * 0.04, y + h * 0.2);
      [0.3, 0.25].forEach((fraction, index) => {
        pill(context, x + w * 0.04, y + h * (0.33 + index * 0.05), w * fraction, 10);
        context.fill();
      });
      pill(context, x + w * 0.04, y + h * 0.45, 130, 38);
      context.fill();
      pill(context, x + w * 0.04 + 146, y + h * 0.45, 130, 38);
      context.stroke();

      // Image block.
      const imageX = x + w * 0.62;
      const imageY = y + h * 0.16;
      const imageW = w * 0.34;
      const imageH = h * 0.36;
      pill(context, imageX, imageY, imageW, imageH, 14);
      context.stroke();
      context.beginPath();
      context.arc(imageX + imageW * 0.75, imageY + imageH * 0.3, imageH * 0.1, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(imageX + 10, imageY + imageH - 10);
      context.lineTo(imageX + imageW * 0.35, imageY + imageH * 0.45);
      context.lineTo(imageX + imageW * 0.6, imageY + imageH * 0.72);
      context.lineTo(imageX + imageW * 0.75, imageY + imageH * 0.58);
      context.lineTo(imageX + imageW - 10, imageY + imageH - 10);
      context.stroke();

      // Card row.
      for (let index = 0; index < 3; index += 1) {
        const cardX = x + w * (0.04 + index * 0.315);
        const cardY = y + h * 0.6;
        const cardW = w * 0.29;
        const cardH = h * 0.34;
        pill(context, cardX, cardY, cardW, cardH, 14);
        context.stroke();
        pill(context, cardX + 14, cardY + 14, cardW - 28, cardH * 0.42, 8);
        context.stroke();
        pill(context, cardX + 14, cardY + cardH * 0.6, cardW * 0.6, 12);
        context.fill();
        pill(context, cardX + 14, cardY + cardH * 0.6 + 22, cardW * 0.8, 8);
        context.fill();
        pill(context, cardX + 14, cardY + cardH * 0.6 + 38, cardW * 0.5, 8);
        context.fill();
      }
    },
    mode: "targets",
  },
  "full-stack-developer": {
    // Client → API → database, with labels and requests travelling round the loop.
    draw(context, width, height) {
      const point = (index: number) => [networkLoop[index][0] * width, networkLoop[index][1] * height];
      context.lineWidth = 2;
      context.setLineDash([6, 10]);
      context.beginPath();
      networkLoop.forEach((_, index) => {
        const [px, py] = point(index);
        if (index === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      });
      context.stroke();
      context.setLineDash([]);
      context.lineWidth = 3;
      context.font = `700 ${Math.round(Math.min(width, height) * 0.03)}px ${MONO}`;
      context.textAlign = "center";
      context.textBaseline = "top";

      const [bx, by] = point(0);
      pill(context, bx - 80, by - 56, 160, 112, 12);
      context.stroke();
      context.beginPath();
      context.moveTo(bx - 80, by - 32);
      context.lineTo(bx + 80, by - 32);
      context.stroke();
      for (let index = 0; index < 3; index += 1) {
        context.beginPath();
        context.arc(bx - 64 + index * 12, by - 44, 3.5, 0, Math.PI * 2);
        context.fill();
      }
      pill(context, bx - 62, by - 16, 124, 16, 4);
      context.stroke();
      pill(context, bx - 62, by + 10, 124, 16, 4);
      context.stroke();
      pill(context, bx - 62, by + 34, 60, 14);
      context.fill();
      context.fillText("client", bx, by + 66);

      const [sx, sy] = point(1);
      for (let index = 0; index < 3; index += 1) {
        pill(context, sx - 64, sy - 50 + index * 34, 128, 26, 6);
        context.stroke();
        context.beginPath();
        context.arc(sx + 46, sy - 37 + index * 34, 4, 0, Math.PI * 2);
        context.fill();
        pill(context, sx - 52, sy - 40 + index * 34, 50, 6);
        context.fill();
      }
      context.fillText("api", sx, sy + 56);

      const [dx, dy] = point(2);
      context.beginPath();
      context.ellipse(dx, dy - 42, 60, 17, 0, 0, Math.PI * 2);
      context.moveTo(dx - 60, dy - 42);
      context.lineTo(dx - 60, dy + 42);
      context.ellipse(dx, dy + 42, 60, 17, 0, Math.PI, 0, true);
      context.lineTo(dx + 60, dy - 42);
      context.moveTo(dx - 60, dy);
      context.ellipse(dx, dy, 60, 17, 0, Math.PI, 0, true);
      context.stroke();
      context.fillText("db", dx, dy + 70);

      context.font = `600 ${Math.round(Math.min(width, height) * 0.022)}px ${MONO}`;
      context.fillText("GET /api/projects", width * 0.32, height * 0.17);
      ink(context, SUCCESS_INK);
      context.fillText("200 OK · 38ms", width * 0.5, height * 0.91);
      ink(context, BASE_INK);
      context.textAlign = "start";
    },
    mode: "network",
  },
  "product-minded-engineer": {
    // A growth chart: axes with ticks, bars, a trend line with markers and the headline number.
    draw(context, width, height) {
      const left = width * 0.08;
      const bottom = height * 0.86;
      const chartW = width * 0.84;
      const chartH = height * 0.66;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(left, bottom - chartH);
      context.lineTo(left, bottom);
      context.lineTo(left + chartW, bottom);
      context.stroke();

      for (let tick = 0; tick <= 4; tick += 1) {
        const y = bottom - (chartH / 4) * tick;
        context.beginPath();
        context.moveTo(left - 10, y);
        context.lineTo(left, y);
        context.stroke();
        context.setLineDash([3, 9]);
        context.lineWidth = 1.5;
        context.beginPath();
        context.moveTo(left, y);
        context.lineTo(left + chartW, y);
        context.stroke();
        context.setLineDash([]);
        context.lineWidth = 3;
      }

      const values = [0.16, 0.24, 0.22, 0.36, 0.44, 0.58, 0.7, 0.86];
      const slot = chartW / values.length;
      const barW = slot * 0.46;
      values.forEach((value, index) => {
        const barX = left + (index + 0.5) * slot - barW / 2;
        pill(context, barX, bottom - chartH * value * 0.78, barW, chartH * value * 0.78 - 4, 6);
        context.stroke();
        pill(context, barX + 8, bottom - chartH * value * 0.78 + 8, barW - 16, 8);
        context.fill();
        pill(context, barX + barW * 0.2, bottom + 14, barW * 0.6, 8);
        context.fill();
      });

      context.lineWidth = 7;
      context.beginPath();
      const points = values.map((value, index) => [
        left + (index + 0.5) * slot,
        bottom - chartH * value - 22,
      ]);
      points.forEach(([px, py], index) => {
        if (index === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      });
      context.stroke();
      for (const [px, py] of points) {
        context.beginPath();
        context.arc(px, py, 9, 0, Math.PI * 2);
        context.fill();
      }
      const [endX, endY] = points[points.length - 1];
      ink(context, SUCCESS_INK);
      context.beginPath();
      context.moveTo(endX + 6, endY - 30);
      context.lineTo(endX + 34, endY - 34);
      context.lineTo(endX + 28, endY - 6);
      context.stroke();

      context.font = `800 ${Math.round(height * 0.08)}px ${SANS}`;
      context.textAlign = "right";
      context.textBaseline = "alphabetic";
      context.fillText("+128%", left + chartW, bottom - chartH - 8);
      context.textAlign = "start";
      ink(context, BASE_INK);
    },
    mode: "targets",
  },
};

function sampleShape(roleId: string, width: number, height: number, count: number) {
  const scale = 0.5;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return [];
  }

  context.scale(scale, scale);
  ink(context, BASE_INK);
  context.lineCap = "round";
  context.lineJoin = "round";
  shapes[roleId].draw(context, width, height);

  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  const points: Array<[number, number, Tone]> = [];

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const offset = (y * canvas.width + x) * 4;
      if (data[offset + 3] > 120) {
        const red = data[offset];
        const green = data[offset + 1];
        const tone: Tone = red > 140 && green < 110 ? 1 : green > 140 && red < 110 ? 2 : 0;
        points.push([x / scale, y / scale, tone]);
      }
    }
  }

  for (let index = points.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [points[index], points[swap]] = [points[swap], points[index]];
  }

  if (points.length === 0) {
    return [];
  }

  return Array.from({ length: count }, (_, index) => {
    const [px, py, tone] = points[index % points.length];
    const jitter = index >= points.length ? 2 : 0.6;
    return [px + (Math.random() - 0.5) * jitter, py + (Math.random() - 0.5) * jitter, tone] as [
      number,
      number,
      Tone,
    ];
  });
}

function pointOnLoop(position: number, width: number, height: number) {
  const segments = networkLoop.length - 1;
  const scaled = (((position % 1) + 1) % 1) * segments;
  const index = Math.floor(scaled);
  const t = scaled - index;
  const [ax, ay] = networkLoop[index];
  const [bx, by] = networkLoop[index + 1];
  return [(ax + (bx - ax) * t) * width, (ay + (by - ay) * t) * height] as const;
}

/** Hypotrochoid (R=5, r=3, d=5): closes after t = 6π. */
function pointOnSpirograph(t: number, rotation: number, width: number, height: number) {
  const x = 2 * Math.cos(t) + 5 * Math.cos((2 * t) / 3);
  const y = 2 * Math.sin(t) - 5 * Math.sin((2 * t) / 3);
  const scale = (Math.min(width, height) * 0.46) / 7;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return [
    width * 0.5 + (x * cos - y * sin) * scale,
    height * 0.52 + (x * sin + y * cos) * scale,
  ] as const;
}

function hexToRgb(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

const roleTone = Object.fromEntries(roles.map((role) => [role.id, toneColors[role.tone]]));

/**
 * ARCHIVED hero concept (not used on the site right now).
 * Thousands of dots rearrange into a picture of whichever "I am a …" role card is in front.
 * To use it: render <RoleShapesHero /> inside the hero section in App.tsx.
 */
export function RoleShapesHero() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const setRoleRef = useRef<((roleId: string) => void) | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;

    if (!section || !canvas) {
      return;
    }

    const count = window.innerWidth < 720 ? 2600 : 7000;
    const particles: Particle[] = Array.from({ length: count }, () => ({
      delay: 0,
      holdX: 0,
      holdY: 0,
      lane: (Math.random() - 0.5) * 2,
      phase: Math.random(),
      stiffness: 12 + Math.random() * 14,
      tone: 0 as Tone,
      tx: 0,
      ty: 0,
      vx: 0,
      vy: 0,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
    }));
    const targetCache = new Map<string, Array<[number, number, Tone]>>();
    let currentRole = roles[0].id;
    let switchedAt = Number.NEGATIVE_INFINITY;
    let width = 0;
    let height = 0;
    let clock = 0;
    let color = hexToRgb(roleTone[currentRole]);
    let targetColor = color;

    const applyTargets = () => {
      if (width === 0) {
        return;
      }

      if (shapes[currentRole].mode === "curve") {
        for (const particle of particles) particle.tone = 0;
        return;
      }

      const key = `${currentRole}:${Math.round(width)}x${Math.round(height)}`;
      let targets = targetCache.get(key);

      if (!targets) {
        targets = sampleShape(currentRole, width, height, count);
        targetCache.set(key, targets);
      }

      particles.forEach((particle, index) => {
        const target = targets?.[index];
        if (target) {
          particle.tx = target[0];
          particle.ty = target[1];
          particle.tone = target[2];
        }
      });
    };

    setRoleRef.current = (roleId) => {
      if (!shapes[roleId] || roleId === currentRole) return;
      currentRole = roleId;
      targetColor = hexToRgb(roleTone[roleId]);
      // Each dot waits where it is, then leaves in a left-to-right sweep, so the
      // old picture dissolves into the new one instead of exploding.
      switchedAt = clock;
      for (const particle of particles) {
        particle.holdX = particle.x;
        particle.holdY = particle.y;
      }
      applyTargets();
      for (const particle of particles) {
        const destinationX = shapes[roleId].mode === "curve" ? particle.x : particle.tx;
        particle.delay =
          Math.min(1, Math.max(0, destinationX / Math.max(1, width))) * 0.9 + Math.random() * 0.25;
      }
    };

    const stop = startCanvasLoop({
      canvas,
      onFrame(loop, delta) {
        const { context, pointer } = loop;
        clock += delta;
        const mode = shapes[currentRole].mode;
        const damping = Math.exp(-4.4 * delta);
        const ease = 1 - Math.exp(-delta * 3);
        color = color.map((channel, index) => channel + (targetColor[index] - channel) * ease);
        const rotation = clock * 0.06;

        for (let index = 0; index < particles.length; index += 1) {
          const particle = particles[index];
          let tx = particle.tx;
          let ty = particle.ty;
          const waiting = clock - switchedAt < particle.delay;

          if (waiting) {
            tx = particle.holdX;
            ty = particle.holdY;
          } else if (mode === "curve") {
            const t = (particle.phase + clock * 0.012) * Math.PI * 6;
            [tx, ty] = pointOnSpirograph(t, rotation, width, height);
            tx += particle.lane * 5;
            ty += Math.sin(particle.phase * 900) * 5;
          } else if (mode === "network" && index % 6 === 0) {
            const group = Math.floor(particle.phase * 10) / 10;
            [tx, ty] = pointOnLoop(group + clock * 0.05, width, height);
            tx += particle.lane * 9;
            ty += Math.sin(particle.phase * 700) * 9;
          }

          // A tiny shimmer so a settled picture still feels alive.
          tx += Math.sin(clock * 1.7 + particle.phase * 60) * 0.5;
          ty += Math.cos(clock * 1.3 + particle.phase * 80) * 0.5;

          let ax = (tx - particle.x) * particle.stiffness;
          let ay = (ty - particle.y) * particle.stiffness;

          if (pointer.active) {
            const dx = particle.x - pointer.x;
            const dy = particle.y - pointer.y;
            const distanceSquared = dx * dx + dy * dy;
            if (distanceSquared < 100 * 100 && distanceSquared > 1) {
              const distance = Math.sqrt(distanceSquared);
              const force = (1 - distance / 100) * 5600;
              ax += (dx / distance) * force;
              ay += (dy / distance) * force;
            }
          }

          particle.vx = (particle.vx + ax * delta) * damping;
          particle.vy = (particle.vy + ay * delta) * damping;
          particle.x += particle.vx * delta;
          particle.y += particle.vy * delta;
        }

        context.clearRect(0, 0, width, height);
        const [r, g, b] = color.map(Math.round);
        const gradient = context.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, `rgb(${r} ${g} ${b} / 90%)`);
        gradient.addColorStop(
          1,
          `rgb(${Math.round(r * 0.55 + 255 * 0.45)} ${Math.round(g * 0.55 + 51 * 0.45)} ${Math.round(b * 0.55 + 87 * 0.45)} / 90%)`,
        );
        const layers = [new Path2D(), new Path2D(), new Path2D()];

        for (const particle of particles) {
          // Highlight colours only show once a dot has arrived in its new picture.
          const tone = clock - switchedAt < particle.delay ? 0 : particle.tone;
          const size = tone === 0 ? 1.8 : 2.1;
          layers[tone].rect(particle.x - size / 2, particle.y - size / 2, size, size);
        }

        context.fillStyle = gradient;
        context.fill(layers[0]);
        context.fillStyle = TONE_COLORS[1];
        context.fill(layers[1]);
        context.fillStyle = TONE_COLORS[2];
        context.fill(layers[2]);
      },
      onResize(loop) {
        width = loop.width;
        height = loop.height;
        applyTargets();
      },
      section,
    });

    return () => {
      stop();
      setRoleRef.current = null;
    };
  }, []);

  return (
    <div className="role-shapes-hero" ref={sectionRef}>
      <div aria-hidden="true" className="role-shapes-hero__background">
        <canvas ref={canvasRef} />
      </div>
      <RoleBoard
        interactive={false}
        roles={roles}
        onFrontRoleChange={(roleId) => setRoleRef.current?.(roleId)}
      />
    </div>
  );
}
