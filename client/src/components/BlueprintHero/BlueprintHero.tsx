import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { rectInSection, startCanvasLoop } from "../../lib/canvasLoop";
import { useProfile } from "../../content/ProfileContext";
import { RoleBoard, toRoleCards } from "../RoleBoard/RoleBoard";
import "./BlueprintHero.css";

const LENS_RADIUS = 190;
const RULER = 22;
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const CONTENT_MAX = 1120;
const COLUMNS = 12;
const GUTTER = 24;

type Box = {
  alpha: number;
  height: number;
  kind: "card" | "other";
  label: string;
  padding: [number, number, number, number];
  text: string;
  width: number;
  x: number;
  y: number;
};

type StyleLine = { changed: boolean; property: string; value: string };

function describe(element: HTMLElement) {
  const tag = element.tagName.toLowerCase();
  const className = [...element.classList].find((name) => !name.includes("--")) ?? "";
  return className ? `${tag}.${className}` : tag;
}

function cardsByDepth(section: HTMLElement) {
  return [...section.querySelectorAll<HTMLElement>(".role-card")].sort(
    (a, b) => (Number(b.style.zIndex) || 0) - (Number(a.style.zIndex) || 0),
  );
}

/** Top card fully visible, the one below it at 50%, everything underneath hidden. */
function readBoxes(section: HTMLElement): Box[] {
  const toBox = (element: HTMLElement, alpha: number, kind: Box["kind"]): Box => {
    const rect = rectInSection(element.getBoundingClientRect(), section);
    const style = window.getComputedStyle(element);
    return {
      ...rect,
      alpha,
      kind,
      label: describe(element),
      padding: [
        Number.parseFloat(style.paddingTop) || 0,
        Number.parseFloat(style.paddingRight) || 0,
        Number.parseFloat(style.paddingBottom) || 0,
        Number.parseFloat(style.paddingLeft) || 0,
      ],
      text: (element.textContent ?? "").trim().slice(0, 40),
    };
  };

  const others = [...section.querySelectorAll<HTMLElement>(
      ".role-board__anchor, .lens-panel, .lens-badge",
    )].map(
    (element) => toBox(element, 1, "other"),
  );
  const [top, second] = cardsByDepth(section);
  const cards = [second && toBox(second, 0.5, "card"), top && toBox(top, 1, "card")].filter(
    Boolean,
  ) as Box[];

  return [...others, ...cards];
}

function rotationOf(transform: string) {
  const match = /matrix\(([^)]+)\)/.exec(transform);
  if (!match) return 0;
  const [a, b] = match[1].split(",").map(Number);
  return Math.round(((Math.atan2(b, a) * 180) / Math.PI) * 10) / 10;
}

function readTopCardStyles(section: HTMLElement): Array<[string, string]> {
  const [card] = cardsByDepth(section);
  if (!card) return [];
  const style = window.getComputedStyle(card);
  const rect = card.getBoundingClientRect();
  const shadow = style.boxShadow.replace(/rgba?\([^)]+\)\s*/g, "").trim();
  return [
    ["selector", `button.${[...card.classList].slice(0, 2).join(".")}`],
    ["border-left", `${style.borderLeftWidth} solid ${style.borderLeftColor}`],
    ["box-shadow", shadow.split(",")[0] ?? shadow],
    ["transform", `rotate(${rotationOf(style.transform)}deg)`],
    ["z-index", style.zIndex],
    ["position", `${Math.round(rect.left)}, ${Math.round(rect.top)}`],
  ];
}

function useTopCardStyles(sectionRef: RefObject<HTMLElement | null>) {
  const [lines, setLines] = useState<StyleLine[]>([]);
  const previousRef = useRef(new Map<string, { at: number; value: string }>());

  useEffect(() => {
    const timer = window.setInterval(() => {
      const section = sectionRef.current;
      if (!section) return;
      const now = performance.now();
      const previous = previousRef.current;
      const next = readTopCardStyles(section).map(([property, value]) => {
        const last = previous.get(property);
        const changedAt = last && last.value !== value ? now : (last?.at ?? 0);
        previous.set(property, { at: changedAt, value });
        return { changed: now - changedAt < 900, property, value };
      });
      setLines((current) =>
        JSON.stringify(current) === JSON.stringify(next) ? current : next,
      );
    }, 150);

    return () => window.clearInterval(timer);
  }, [sectionRef]);

  return lines;
}

type Note = { text: string; u: number; v: number; du: number; dv: number };

// Hidden annotations that only show up through the lens.
const NOTES: Note[] = [
  { du: 0.04, dv: -0.06, text: "toolbar · 52px · hides on scroll ↓", u: 0.07, v: 0.3 },
  { du: 0.06, dv: -0.07, text: "anchor → role cards, swaps every 5s", u: 0.09, v: 0.66 },
  { du: 0.05, dv: 0.06, text: "easing: cubic-bezier(.22, 1, .36, 1)", u: 0.43, v: 0.24 },
  { du: -0.05, dv: -0.06, text: "card shadow: 0 12px 28px / 13%", u: 0.6, v: 0.72 },
  { du: 0.04, dv: 0.05, text: "React 19 · TypeScript · Vite", u: 0.78, v: 0.16 },
  { du: 0.05, dv: -0.05, text: "// found the blueprint? say hi → #contact", u: 0.3, v: 0.86 },
];

function drawArrowHead(context: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x - Math.cos(angle - 0.4) * 9, y - Math.sin(angle - 0.4) * 9);
  context.moveTo(x, y);
  context.lineTo(x - Math.cos(angle + 0.4) * 9, y - Math.sin(angle + 0.4) * 9);
  context.stroke();
}

function drawDimension(
  context: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label: string,
) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
  drawArrowHead(context, x2, y2, angle);
  drawArrowHead(context, x1, y1, angle + Math.PI);
  context.save();
  context.translate((x1 + x2) / 2, (y1 + y2) / 2);
  context.rotate(Math.abs(angle) > Math.PI / 4 ? -Math.PI / 2 : 0);
  const textWidth = context.measureText(label).width;
  context.fillStyle = "#0b2f86";
  context.fillRect(-textWidth / 2 - 6, -8, textWidth + 12, 16);
  context.fillStyle = "rgb(255 255 255 / 85%)";
  context.fillText(label, -textWidth / 2, -5);
  context.restore();
}

/** The technical drawing behind the page: construction lines, dimensions, notes and a title block. */
function drawBlueprintScene(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  boxes: Box[],
  clock: number,
) {
  const line = "rgb(200 220 255 / 55%)";
  const faint = "rgb(200 220 255 / 22%)";
  context.lineWidth = 1;
  context.font = `11px ${MONO}`;
  context.textBaseline = "top";

  // Layout columns with their numbers.
  const contentWidth = Math.min(CONTENT_MAX, width - 32);
  const contentLeft = (width - contentWidth) / 2;
  const columnWidth = (contentWidth - GUTTER * (COLUMNS - 1)) / COLUMNS;
  context.strokeStyle = faint;
  context.fillStyle = faint;
  context.setLineDash([2, 5]);
  context.beginPath();
  for (let column = 0; column < COLUMNS; column += 1) {
    const x = contentLeft + column * (columnWidth + GUTTER);
    context.moveTo(x + 0.5, 0);
    context.lineTo(x + 0.5, height);
    context.moveTo(x + columnWidth + 0.5, 0);
    context.lineTo(x + columnWidth + 0.5, height);
  }
  context.stroke();
  context.setLineDash([]);
  for (let column = 0; column < COLUMNS; column += 1) {
    context.fillText(String(column + 1).padStart(2, "0"), contentLeft + column * (columnWidth + GUTTER) + 4, 34);
  }

  // Composition guides: diagonals and thirds.
  context.strokeStyle = faint;
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(width, height);
  context.moveTo(width, 0);
  context.lineTo(0, height);
  for (const fraction of [1 / 3, 2 / 3]) {
    context.moveTo(width * fraction, 0);
    context.lineTo(width * fraction, height);
    context.moveTo(0, height * fraction);
    context.lineTo(width, height * fraction);
  }
  context.stroke();
  context.fillText("⅓", width / 3 + 6, height / 3 + 6);
  context.fillText("⅔", (width * 2) / 3 + 6, (height * 2) / 3 + 6);

  // Construction circles around the top card, slowly turning tick marks.
  const top = boxes.find((box) => box.kind === "card" && box.alpha === 1);
  if (top) {
    const cx = top.x + top.width / 2;
    const cy = top.y + top.height / 2;
    context.setLineDash([6, 6]);
    context.strokeStyle = faint;
    for (const radius of [top.width * 0.62, top.width * 0.9, top.width * 1.2]) {
      context.beginPath();
      context.arc(cx, cy, radius, 0, Math.PI * 2);
      context.stroke();
    }
    context.setLineDash([]);
    context.strokeStyle = line;
    context.beginPath();
    for (let tick = 0; tick < 72; tick += 1) {
      const angle = (tick / 72) * Math.PI * 2 + clock * 0.05;
      const inner = top.width * 0.62 - (tick % 6 === 0 ? 10 : 4);
      context.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      context.lineTo(cx + Math.cos(angle) * top.width * 0.62, cy + Math.sin(angle) * top.width * 0.62);
    }
    context.stroke();
    context.beginPath();
    context.moveTo(cx - 14, cy);
    context.lineTo(cx + 14, cy);
    context.moveTo(cx, cy - 14);
    context.lineTo(cx, cy + 14);
    context.stroke();
  }

  // Hatching inside the real elements.
  context.strokeStyle = "rgb(255 255 255 / 10%)";
  for (const box of boxes) {
    if (box.alpha < 1) continue;
    context.save();
    context.beginPath();
    context.rect(box.x, box.y, box.width, box.height);
    context.clip();
    context.beginPath();
    for (let offset = -box.height; offset < box.width; offset += 9) {
      context.moveTo(box.x + offset, box.y + box.height);
      context.lineTo(box.x + offset + box.height, box.y);
    }
    context.stroke();
    context.restore();
  }

  // Overall dimensions.
  context.strokeStyle = line;
  drawDimension(context, contentLeft, height - 64, contentLeft + contentWidth, height - 64, `${Math.round(contentWidth)}px content`);
  drawDimension(context, width - 64, 40, width - 64, height - 40, `${Math.round(height)}px viewport`);

  // Hidden notes with leader lines.
  for (const note of NOTES) {
    const x = note.u * width;
    const y = note.v * height;
    const tx = x + note.du * width;
    const ty = y + note.dv * height;
    context.strokeStyle = line;
    context.beginPath();
    context.arc(x, y, 3.5, 0, Math.PI * 2);
    context.moveTo(x, y);
    context.lineTo(tx, ty);
    context.lineTo(tx + (note.du > 0 ? 16 : -16), ty);
    context.stroke();
    context.fillStyle = "#facc15";
    const textWidth = context.measureText(note.text).width;
    const labelX = note.du > 0 ? tx + 20 : tx - 20 - textWidth;
    context.fillText(note.text, labelX, ty - 6);
  }

  // Title block, bottom right — like an architect's drawing sheet.
  const blockWidth = 300;
  const blockHeight = 104;
  const bx = width - blockWidth - 90;
  const by = height - blockHeight - 90;
  context.strokeStyle = "rgb(255 255 255 / 70%)";
  context.lineWidth = 1.5;
  context.strokeRect(bx, by, blockWidth, blockHeight);
  context.lineWidth = 1;
  context.beginPath();
  for (const row of [30, 52, 74]) {
    context.moveTo(bx, by + row);
    context.lineTo(bx + blockWidth, by + row);
  }
  context.moveTo(bx + 150, by + 30);
  context.lineTo(bx + 150, by + blockHeight);
  context.stroke();
  context.fillStyle = "rgb(255 255 255 / 92%)";
  context.font = `700 13px ${MONO}`;
  context.fillText("MEE-FOLIO · HERO", bx + 10, by + 9);
  context.font = `10px ${MONO}`;
  context.fillStyle = "rgb(200 220 255 / 85%)";
  context.fillText("SHEET 01 / 04", bx + 10, by + 37);
  context.fillText("SCALE 1:1 · px", bx + 160, by + 37);
  context.fillText("DRAWN: KUSHAGRA", bx + 10, by + 59);
  context.fillText("REV 2.4", bx + 160, by + 59);
  context.fillText("STATUS: OPEN TO WORK", bx + 10, by + 81);
  context.fillText(new Date().toISOString().slice(0, 10), bx + 160, by + 81);
}

/**
 * The hero: "I am a …" role cards on a design-tool canvas (rulers, layout grid,
 * smart guides, live CSS panel). The cursor is a lens that reveals a hidden
 * blueprint of the page underneath.
 */
export function BlueprintHero() {
  const { heroRoles } = useProfile();
  const roles = useMemo(() => toRoleCards(heroRoles), [heroRoles]);
  const rolesKey = roles.map((role) => `${role.id}:${role.tone}`).join("|");
  const sectionRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [stats, setStats] = useState({ fps: 60, height: 0, width: 0 });
  const styleLines = useTopCardStyles(sectionRef);

  // Background: layout grid, dot grid and smart guides that follow the top card.
  useEffect(() => {
    const section = sectionRef.current;
    const canvas = backgroundRef.current;
    if (!section || !canvas) return;

    return startCanvasLoop({
      canvas,
      onFrame(loop) {
        const { context, height, width } = loop;
        context.clearRect(0, 0, width, height);

        // 12-column layout grid, like a design tool's layout overlay.
        const contentWidth = Math.min(CONTENT_MAX, width - 32);
        const contentLeft = (width - contentWidth) / 2;
        const columnWidth = (contentWidth - GUTTER * (COLUMNS - 1)) / COLUMNS;
        context.fillStyle = "rgb(255 77 125 / 5%)";
        for (let column = 0; column < COLUMNS; column += 1) {
          context.fillRect(contentLeft + column * (columnWidth + GUTTER), 0, columnWidth, height);
        }
        context.strokeStyle = "rgb(255 77 125 / 22%)";
        context.setLineDash([2, 6]);
        context.beginPath();
        context.moveTo(contentLeft + 0.5, 0);
        context.lineTo(contentLeft + 0.5, height);
        context.moveTo(contentLeft + contentWidth - 0.5, 0);
        context.lineTo(contentLeft + contentWidth - 0.5, height);
        context.stroke();
        context.setLineDash([]);

        // 8px dot grid.
        context.fillStyle = "rgb(23 32 51 / 10%)";
        context.beginPath();
        for (let y = 8; y < height; y += 16) {
          for (let x = 8; x < width; x += 16) {
            context.rect(x, y, 1, 1);
          }
        }
        context.fill();

        // Smart guides from the top card and the anchor, extended across the page.
        const [top] = cardsByDepth(section);
        const anchor = section.querySelector<HTMLElement>(".role-board__anchor");
        context.font = `10px ${MONO}`;
        context.textBaseline = "bottom";

        const guides = (element: HTMLElement | null | undefined, color: string, label: string) => {
          if (!element) return;
          const rect = rectInSection(element.getBoundingClientRect(), section);
          context.strokeStyle = color;
          context.fillStyle = color;
          context.setLineDash([4, 4]);
          context.beginPath();
          for (const y of [rect.y, rect.y + rect.height]) {
            context.moveTo(0, Math.round(y) + 0.5);
            context.lineTo(width, Math.round(y) + 0.5);
          }
          for (const x of [rect.x, rect.x + rect.width]) {
            context.moveTo(Math.round(x) + 0.5, 0);
            context.lineTo(Math.round(x) + 0.5, height);
          }
          context.stroke();
          context.setLineDash([]);
          context.fillText(`${label} y=${Math.round(rect.y)}`, width - 150, rect.y - 3);
          context.fillText(`x=${Math.round(rect.x)}`, rect.x + 4, height - 30);
        };

        guides(anchor, "rgb(20 184 166 / 45%)", "anchor");
        guides(top, "rgb(217 70 239 / 50%)", "top card");
      },
      section,
    });
  }, []);

  // Overlay: rulers along the edges and the lens itself.
  useEffect(() => {
    const section = sectionRef.current;
    const canvas = overlayRef.current;
    if (!section || !canvas) return;

    const lens = { presence: 0, x: 0, y: 0 };
    let clock = 0;
    let wasActive = false;
    let frames = 0;
    let fpsClock = 0;

    return startCanvasLoop({
      canvas,
      onFrame(loop, delta, time) {
        const { context, height, pointer, width } = loop;
        context.clearRect(0, 0, width, height);

        frames += 1;
        fpsClock += delta;
        if (fpsClock > 0.5) {
          const fps = Math.round(frames / fpsClock);
          setStats((current) =>
            current.fps === fps && current.width === Math.round(width) && current.height === Math.round(height)
              ? current
              : { fps, height: Math.round(height), width: Math.round(width) },
          );
          frames = 0;
          fpsClock = 0;
        }

        clock += delta;
        const boxes = readBoxes(section);

        // Lens behaviour:
        // - follows the cursor;
        // - when the cursor leaves, it shrinks away where it is and stays hidden;
        // - when the cursor comes back while the lens is hidden, it appears right under it.
        let targetX = lens.x;
        let targetY = lens.y;
        let targetPresence = 0;
        const followRate = 18;

        if (pointer.active) {
          if (!wasActive && lens.presence < 0.4) {
            lens.x = pointer.x;
            lens.y = pointer.y;
          }
          targetX = pointer.x;
          targetY = pointer.y;
          targetPresence = 1;
        }
        wasActive = pointer.active;

        const ease = 1 - Math.exp(-delta * followRate);
        lens.x += (targetX - lens.x) * ease;
        lens.y += (targetY - lens.y) * ease;
        lens.presence += (targetPresence - lens.presence) * (1 - Math.exp(-delta * 7));

        // Rulers.
        context.fillStyle = "rgb(255 255 255 / 92%)";
        context.fillRect(0, 0, width, RULER);
        context.fillRect(0, 0, RULER, height);
        context.strokeStyle = "rgb(23 32 51 / 35%)";
        context.fillStyle = "rgb(23 32 51 / 55%)";
        context.font = `9px ${MONO}`;
        context.textBaseline = "top";
        context.beginPath();
        for (let x = 0; x < width; x += 10) {
          const size = x % 100 === 0 ? RULER : x % 50 === 0 ? 10 : 5;
          context.moveTo(x + 0.5, RULER - size);
          context.lineTo(x + 0.5, RULER);
          if (x % 100 === 0 && x > 0) context.fillText(String(x), x + 3, 2);
        }
        for (let y = 0; y < height; y += 10) {
          const size = y % 100 === 0 ? RULER : y % 50 === 0 ? 10 : 5;
          context.moveTo(RULER - size, y + 0.5);
          context.lineTo(RULER, y + 0.5);
        }
        context.moveTo(0, RULER + 0.5);
        context.lineTo(width, RULER + 0.5);
        context.moveTo(RULER + 0.5, 0);
        context.lineTo(RULER + 0.5, height);
        context.stroke();
        for (let y = 100; y < height; y += 100) {
          context.save();
          context.translate(2, y + 3);
          context.rotate(Math.PI / 2);
          context.fillText(String(y), 0, -9);
          context.restore();
        }
        context.fillStyle = "#2056d8";
        context.fillRect(lens.x - 1, 0, 2, RULER);
        context.fillRect(0, lens.y - 1, RULER, 2);

        const radius = Math.min(LENS_RADIUS, width * 0.3) * lens.presence;
        if (radius < 2) return;

        context.save();
        context.beginPath();
        context.arc(lens.x, lens.y, radius, 0, Math.PI * 2);
        context.clip();

        context.fillStyle = "#0b2f86";
        context.fillRect(lens.x - radius, lens.y - radius, radius * 2, radius * 2);
        context.lineWidth = 1;
        for (const [step, alpha] of [[8, 0.08], [40, 0.2]] as const) {
          context.strokeStyle = `rgb(160 190 255 / ${alpha})`;
          context.beginPath();
          const startX = Math.floor((lens.x - radius) / step) * step;
          const startY = Math.floor((lens.y - radius) / step) * step;
          for (let x = startX; x < lens.x + radius; x += step) {
            context.moveTo(x + 0.5, lens.y - radius);
            context.lineTo(x + 0.5, lens.y + radius);
          }
          for (let y = startY; y < lens.y + radius; y += step) {
            context.moveTo(lens.x - radius, y + 0.5);
            context.lineTo(lens.x + radius, y + 0.5);
          }
          context.stroke();
        }

        drawBlueprintScene(context, width, height, boxes, clock);
        context.font = `11px ${MONO}`;

        for (const box of boxes) {
          context.globalAlpha = box.alpha;
          const [pt, pr, pb, pl] = box.padding;
          context.fillStyle = "rgb(110 231 183 / 18%)";
          context.fillRect(box.x, box.y, box.width, pt);
          context.fillRect(box.x, box.y + box.height - pb, box.width, pb);
          context.fillRect(box.x, box.y + pt, pl, box.height - pt - pb);
          context.fillRect(box.x + box.width - pr, box.y + pt, pr, box.height - pt - pb);
          context.fillStyle = "rgb(96 165 250 / 14%)";
          context.fillRect(box.x + pl, box.y + pt, box.width - pl - pr, box.height - pt - pb);

          context.setLineDash([5, 4]);
          context.strokeStyle = "rgb(255 255 255 / 80%)";
          context.strokeRect(box.x + 0.5, box.y + 0.5, box.width - 1, box.height - 1);
          context.setLineDash([]);

          const tag = `${box.label}  ${Math.round(box.width)}×${Math.round(box.height)}`;
          const tagWidth = context.measureText(tag).width + 10;
          const tagY = box.kind === "card" && box.alpha < 1 ? box.y + box.height + 1 : box.y - 17;
          context.fillStyle = "#facc15";
          context.fillRect(box.x, tagY, tagWidth, 16);
          context.fillStyle = "#0b2f86";
          context.fillText(tag, box.x + 5, tagY + 3);

          if (box.text && box.alpha === 1) {
            context.fillStyle = "rgb(255 255 255 / 85%)";
            context.fillText(`"${box.text}"`, box.x + pl + 4, box.y + box.height / 2 - 6);
          }
        }
        context.globalAlpha = 1;

        const anchor = boxes.find((box) => box.label.includes("anchor"));
        const front = boxes.find((box) => box.kind === "card" && box.alpha === 1);
        if (anchor && front && front.x > anchor.x + anchor.width) {
          const y = anchor.y + anchor.height / 2;
          const gap = Math.round(front.x - (anchor.x + anchor.width));
          context.strokeStyle = "#fb7185";
          context.fillStyle = "#fb7185";
          context.beginPath();
          context.moveTo(anchor.x + anchor.width, y);
          context.lineTo(front.x, y);
          context.moveTo(anchor.x + anchor.width, y - 6);
          context.lineTo(anchor.x + anchor.width, y + 6);
          context.moveTo(front.x, y - 6);
          context.lineTo(front.x, y + 6);
          context.stroke();
          context.fillText(`${gap}px`, anchor.x + anchor.width + gap / 2 - 12, y + 6);
        }

        context.strokeStyle = "rgb(255 255 255 / 35%)";
        context.beginPath();
        context.moveTo(lens.x - radius, lens.y + 0.5);
        context.lineTo(lens.x + radius, lens.y + 0.5);
        context.moveTo(lens.x + 0.5, lens.y - radius);
        context.lineTo(lens.x + 0.5, lens.y + radius);
        context.stroke();
        context.fillStyle = "rgb(255 255 255 / 75%)";
        context.fillText(`x ${Math.round(lens.x)}  y ${Math.round(lens.y)}`, lens.x + 8, lens.y + 6);
        context.restore();

        context.lineWidth = 2;
        context.strokeStyle = "#0b2f86";
        context.beginPath();
        context.arc(lens.x, lens.y, radius, 0, Math.PI * 2);
        context.stroke();
        context.lineWidth = 1;
        context.strokeStyle = `rgb(11 47 134 / ${0.25 + Math.sin(time * 3) * 0.1})`;
        context.beginPath();
        context.arc(lens.x, lens.y, radius + 7, 0, Math.PI * 2);
        context.stroke();
      },
      section,
    });
  }, []);

  const breakpoint = stats.width >= 1280 ? "desktop" : stats.width >= 700 ? "tablet" : "mobile";

  return (
    <div className="blueprint-hero" ref={sectionRef}>
      <div aria-hidden="true" className="blueprint-hero__background">
        <canvas ref={backgroundRef} />
      </div>

      <RoleBoard interactive={false} key={rolesKey} roles={roles} />

      <div aria-hidden="true" className="blueprint-hero__overlay">
        <canvas ref={overlayRef} />
      </div>

      <div aria-hidden="true" className="lens-badge">
        <span>
          {stats.width} × {stats.height}
        </span>
        <span>{breakpoint}</span>
        <span>{stats.fps} fps</span>
      </div>

      <div aria-hidden="true" className="lens-panel">
        <div className="lens-panel__tabs">
          <span className="lens-panel__tab--active">Styles</span>
          <span>Computed</span>
          <span>Layout</span>
        </div>
        <div className="lens-panel__body">
          <p className="lens-panel__selector">
            {styleLines.find((line) => line.property === "selector")?.value ?? ""} {"{"}
          </p>
          {styleLines
            .filter((line) => line.property !== "selector")
            .map((line) => (
              <p
                className={
                  line.changed ? "lens-panel__line lens-panel__line--changed" : "lens-panel__line"
                }
                key={line.property}
              >
                <span className="lens-panel__property">{line.property}</span>:{" "}
                <span className="lens-panel__value">{line.value}</span>;
              </p>
            ))}
          <p className="lens-panel__selector">{"}"}</p>
        </div>
      </div>
    </div>
  );
}
