import type { GenerateRequest, GeneratedGamePayload, SelectedElement } from '$lib/types';

function colorFromText(text: string, offset = 0): string {
  let hash = offset + 137;
  for (let i = 0; i < text.length; i += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 2654435761) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue} 78% 58%)`;
}

function trimTitle(input: string): string {
  return input.replace(/[\n\r\t]+/g, ' ').trim().slice(0, 28) || '即席シミュレーション';
}

function labelFor(elements: SelectedElement[], kind: SelectedElement['kind'], fallback: string): string {
  return elements.find((element) => element.kind === kind)?.label ?? fallback;
}

export function createMockGame(request: GenerateRequest): GeneratedGamePayload {
  const keyword = trimTitle(request.keyword || labelFor(request.elements, 'subject', 'メダカ'));
  const subject = labelFor(request.elements, 'subject', keyword);
  const dynamics = labelFor(request.elements, 'dynamics', 'むれる');
  const touch = labelFor(request.elements, 'touch', 'タップでふえる');
  const title = `${keyword}の群れ`;
  const accent = colorFromText(`${subject}|${dynamics}|${touch}`);
  const accentAlt = colorFromText(`${touch}|${subject}`, 73);

  const workerScript = `
const TITLE = ${JSON.stringify(title)};
const SUBJECT = ${JSON.stringify(subject)};
const DYNAMICS = ${JSON.stringify(dynamics)};
const TOUCH = ${JSON.stringify(touch)};
const ACCENT = ${JSON.stringify(accent)};
const ACCENT_ALT = ${JSON.stringify(accentAlt)};
let width = 360;
let height = 640;
let elapsed = 0;
let boids = [];
let ripples = [];
let seed = 1234567;
let started = false;

function rnd() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

function wrap(value, max) {
  if (value < 0) return value + max;
  if (value > max) return value - max;
  return value;
}

function spawnBoid(x, y) {
  const angle = rnd() * Math.PI * 2;
  boids.push({
    x,
    y,
    vx: Math.cos(angle) * (32 + rnd() * 42),
    vy: Math.sin(angle) * (32 + rnd() * 42),
    r: 4 + rnd() * 4,
    phase: rnd() * Math.PI * 2
  });
  while (boids.length > 150) boids.shift();
}

function reset(nextWidth, nextHeight) {
  width = nextWidth || width;
  height = nextHeight || height;
  elapsed = 0;
  boids = [];
  ripples = [];
  seed = Math.floor((width + height + TITLE.length * 997) * 1000) >>> 0;
  for (let i = 0; i < 30; i += 1) {
    spawnBoid(rnd() * width, 80 + rnd() * Math.max(120, height - 160));
  }
  started = true;
}

function applyTouch(pointer) {
  if (!pointer || !pointer.down) return;
  const x = Math.max(0, Math.min(width, pointer.x || width / 2));
  const y = Math.max(0, Math.min(height, pointer.y || height / 2));
  for (let i = 0; i < 3; i += 1) spawnBoid(x + (rnd() - 0.5) * 24, y + (rnd() - 0.5) * 24);
  ripples.push({ x, y, age: 0, life: 0.75, strength: 1 });
}

function updateBoids(dt) {
  const next = [];
  for (let i = 0; i < boids.length; i += 1) {
    const b = boids[i];
    let sepX = 0;
    let sepY = 0;
    let alignX = 0;
    let alignY = 0;
    let cohX = 0;
    let cohY = 0;
    let count = 0;
    for (let j = 0; j < boids.length; j += 1) {
      if (i === j) continue;
      const o = boids[j];
      let dx = o.x - b.x;
      let dy = o.y - b.y;
      if (dx > width / 2) dx -= width;
      if (dx < -width / 2) dx += width;
      if (dy > height / 2) dy -= height;
      if (dy < -height / 2) dy += height;
      const d = Math.hypot(dx, dy);
      if (d > 0 && d < 72) {
        alignX += o.vx;
        alignY += o.vy;
        cohX += b.x + dx;
        cohY += b.y + dy;
        count += 1;
        if (d < 22) {
          sepX -= dx / d;
          sepY -= dy / d;
        }
      }
    }
    if (count > 0) {
      alignX = alignX / count - b.vx;
      alignY = alignY / count - b.vy;
      cohX = cohX / count - b.x;
      cohY = cohY / count - b.y;
    }
    for (let k = 0; k < ripples.length; k += 1) {
      const r = ripples[k];
      const dx = b.x - r.x;
      const dy = b.y - r.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 120) {
        sepX += (dx / d) * (1.9 - r.age);
        sepY += (dy / d) * (1.9 - r.age);
      }
    }
    b.vx += (sepX * 88 + alignX * 0.035 + cohX * 0.045) * dt;
    b.vy += (sepY * 88 + alignY * 0.035 + cohY * 0.045) * dt;
    const speed = Math.hypot(b.vx, b.vy) || 1;
    const target = 58 + Math.sin(elapsed + b.phase) * 12;
    b.vx = (b.vx / speed) * Math.max(26, Math.min(118, target + speed * 0.45));
    b.vy = (b.vy / speed) * Math.max(26, Math.min(118, target + speed * 0.45));
    b.x = wrap(b.x + b.vx * dt, width);
    b.y = wrap(b.y + b.vy * dt, height);
    next.push(b);
  }
  boids = next;
}

function updateRipples(dt) {
  for (let i = 0; i < ripples.length; i += 1) {
    ripples[i].age += dt;
    if (ripples[i].age > ripples[i].life) {
      ripples.splice(i, 1);
      i -= 1;
    }
  }
}

function makeFrame() {
  const shapes = [
    { type: 'rect', x: 0, y: 0, w: width, h: height, fill: '#0B1620' },
    { type: 'circle', x: width * 0.16, y: height * 0.12, r: 72, fill: 'rgba(38, 198, 218, 0.12)' },
    { type: 'circle', x: width * 0.84, y: height * 0.82, r: 96, fill: 'rgba(255, 214, 102, 0.10)' },
    { type: 'text', text: TITLE, x: 18, y: 28, size: 17, fill: '#EAF7FF', baseline: 'middle' }
  ];

  for (let i = 0; i < ripples.length; i += 1) {
    const r = ripples[i];
    const t = r.age / r.life;
    shapes.push({ type: 'circle', x: r.x, y: r.y, r: 18 + t * 90, stroke: ACCENT_ALT, lineWidth: Math.max(1, 5 * (1 - t)) });
  }

  for (let i = 0; i < boids.length; i += 1) {
    const b = boids[i];
    const angle = Math.atan2(b.vy, b.vx);
    const noseX = b.x + Math.cos(angle) * (b.r + 5);
    const noseY = b.y + Math.sin(angle) * (b.r + 5);
    shapes.push({ type: 'line', x1: b.x - Math.cos(angle) * 7, y1: b.y - Math.sin(angle) * 7, x2: noseX, y2: noseY, stroke: 'rgba(234,247,255,0.34)', lineWidth: 2 });
    shapes.push({ type: 'circle', x: b.x, y: b.y, r: b.r + 3, fill: 'rgba(255,255,255,0.10)' });
    shapes.push({ type: 'circle', x: b.x, y: b.y, r: b.r, fill: ACCENT, stroke: '#EAF7FF', lineWidth: 1 });
  }

  if (elapsed < 3) {
    shapes.push({ type: 'rect', x: 24, y: height / 2 - 58, w: width - 48, h: 116, fill: 'rgba(11,22,32,0.82)', stroke: 'rgba(234,247,255,0.24)', lineWidth: 1, radius: 18 });
    shapes.push({ type: 'text', text: SUBJECT + 'が' + DYNAMICS, x: width / 2, y: height / 2 - 22, size: 21, fill: '#EAF7FF', align: 'center', baseline: 'middle', maxWidth: width - 40 });
    shapes.push({ type: 'text', text: TOUCH, x: width / 2, y: height / 2 + 18, size: 18, fill: '#FFD666', align: 'center', baseline: 'middle', maxWidth: width - 40 });
  }

  return { type: 'frame', background: '#0B1620', shapes, stats: { 'なかま': boids.length }, message: '観察中' };
}

self.onmessage = function(event) {
  const data = event.data || {};
  if (data.type === 'start') {
    reset(data.width, data.height);
    self.postMessage(makeFrame());
    return;
  }
  if (data.type === 'tick') {
    if (!started) reset(data.width, data.height);
    width = data.width || width;
    height = data.height || height;
    const dt = Math.min(0.05, Math.max(0, (data.dt || 16) / 1000));
    elapsed += dt;
    applyTouch(data.input && data.input.pointer);
    updateBoids(dt);
    updateRipples(dt);
    self.postMessage(makeFrame());
  }
};
`.trim();

  const controls = [touch, 'リセットで最初から観察'];
  const svelteComponent = `<script lang="ts">
  import WorkerCanvasGame from '$lib/components/WorkerCanvasGame.svelte';
  export let workerScript: string;
</script>

<WorkerCanvasGame title={${JSON.stringify(title)}} {workerScript} controls={${JSON.stringify(controls)}} />`;

  return {
    title,
    summary: `${subject}が${dynamics}様子を、${touch}で変化させながら眺めます。`,
    controls,
    workerScript,
    svelteComponent
  };
}
