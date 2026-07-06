import type { GenerateRequest, GeneratedGamePayload } from '$lib/types';

function colorFromText(text: string, offset = 0): string {
  let hash = offset + 137;
  for (let i = 0; i < text.length; i += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 2654435761) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue} 78% 58%)`;
}

function trimTitle(input: string): string {
  return input.replace(/[\n\r\t]+/g, ' ').trim().slice(0, 28) || '即席ミニゲーム';
}

export function createMockGame(request: GenerateRequest): GeneratedGamePayload {
  const keyword = trimTitle(request.keyword || request.elements[0] || 'ゲーム');
  const elements = request.elements.length ? request.elements.slice(0, 3) : ['星くずクッキー', '雲の迷路', '3秒だけ透明'];
  const title = `${keyword}チャレンジ`;
  const accent = colorFromText(elements.join('|'));
  const enemy = elements[1] ?? 'ミニ台風';
  const treasure = elements[2] ?? '星くず';

  const workerScript = `
const ELEMENTS = ${JSON.stringify(elements)};
const TITLE = ${JSON.stringify(title)};
const ACCENT = ${JSON.stringify(accent)};
const ENEMY_NAME = ${JSON.stringify(enemy)};
const TREASURE_NAME = ${JSON.stringify(treasure)};
let width = 360;
let height = 640;
let durationSec = 60;
let elapsed = 0;
let score = 0;
let combo = 1;
let message = '宝物を集めよう！';
let player = { x: 180, y: 500, r: 18, speed: 260 };
let treasures = [];
let enemies = [];
let started = false;
let seed = 1234567;

function rnd() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function spawnTreasure() {
  treasures.push({
    x: 30 + rnd() * Math.max(60, width - 60),
    y: 90 + rnd() * Math.max(80, height - 180),
    r: 10 + rnd() * 8,
    vx: -35 + rnd() * 70,
    vy: -25 + rnd() * 50
  });
}

function spawnEnemy() {
  enemies.push({
    x: 35 + rnd() * Math.max(70, width - 70),
    y: 110 + rnd() * Math.max(120, height - 240),
    r: 14 + rnd() * 12,
    vx: (rnd() < 0.5 ? -1 : 1) * (45 + rnd() * 80),
    vy: (rnd() < 0.5 ? -1 : 1) * (35 + rnd() * 70)
  });
}

function reset(nextWidth, nextHeight, nextDurationSec) {
  width = nextWidth || width;
  height = nextHeight || height;
  durationSec = nextDurationSec || 60;
  elapsed = 0;
  score = 0;
  combo = 1;
  message = '宝物を集めよう！';
  player = { x: width / 2, y: height * 0.78, r: 18, speed: 260 };
  treasures = [];
  enemies = [];
  seed = Math.floor((width + height + TITLE.length * 997) * 1000) >>> 0;
  for (let i = 0; i < 8; i += 1) spawnTreasure();
  for (let i = 0; i < 4; i += 1) spawnEnemy();
  started = true;
}

function movePlayer(dt, input) {
  const keys = input && Array.isArray(input.keys) ? input.keys : [];
  const pointer = input && input.pointer ? input.pointer : { x: player.x, y: player.y, down: false };
  let dx = 0;
  let dy = 0;
  if (keys.includes('ArrowLeft') || keys.includes('a')) dx -= 1;
  if (keys.includes('ArrowRight') || keys.includes('d')) dx += 1;
  if (keys.includes('ArrowUp') || keys.includes('w')) dy -= 1;
  if (keys.includes('ArrowDown') || keys.includes('s')) dy += 1;

  if (pointer.down) {
    dx += clamp(pointer.x - player.x, -80, 80) / 80;
    dy += clamp(pointer.y - player.y, -80, 80) / 80;
  }

  const len = Math.hypot(dx, dy) || 1;
  player.x = clamp(player.x + (dx / len) * player.speed * dt, player.r, width - player.r);
  player.y = clamp(player.y + (dy / len) * player.speed * dt, 80 + player.r, height - player.r);
}

function updateWorld(dt) {
  for (let i = 0; i < treasures.length; i += 1) {
    const item = treasures[i];
    item.x += item.vx * dt;
    item.y += item.vy * dt;
    if (item.x < item.r || item.x > width - item.r) item.vx *= -1;
    if (item.y < 90 + item.r || item.y > height - item.r) item.vy *= -1;
    if (Math.hypot(item.x - player.x, item.y - player.y) < item.r + player.r) {
      score += 10 * combo;
      combo = Math.min(5, combo + 1);
      message = combo >= 3 ? 'コンボ中！' : 'いいね！';
      treasures.splice(i, 1);
      spawnTreasure();
      i -= 1;
    }
  }

  for (let i = 0; i < enemies.length; i += 1) {
    const item = enemies[i];
    item.x += item.vx * dt;
    item.y += item.vy * dt;
    if (item.x < item.r || item.x > width - item.r) item.vx *= -1;
    if (item.y < 95 + item.r || item.y > height - item.r) item.vy *= -1;
    if (Math.hypot(item.x - player.x, item.y - player.y) < item.r + player.r) {
      score = Math.max(0, score - 8);
      combo = 1;
      message = ENEMY_NAME + 'にぶつかった！';
      item.x = 35 + rnd() * Math.max(70, width - 70);
      item.y = 120 + rnd() * Math.max(120, height - 260);
    }
  }
}

function makeFrame() {
  const timeLeft = Math.max(0, durationSec - elapsed);
  const shapes = [
    { type: 'rect', x: 0, y: 0, w: width, h: height, fill: '#101828' },
    { type: 'rect', x: 14, y: 14, w: width - 28, h: 54, fill: '#1D2939', stroke: '#344054', lineWidth: 2, radius: 14 },
    { type: 'text', text: TITLE, x: 26, y: 37, size: 18, fill: '#F9FAFB', baseline: 'middle' },
    { type: 'text', text: 'Score ' + score + '  Time ' + Math.ceil(timeLeft), x: width - 22, y: 37, size: 15, fill: '#FEEA9A', align: 'right', baseline: 'middle' },
    { type: 'text', text: message, x: width / 2, y: 86, size: 16, fill: '#D0D5DD', align: 'center', baseline: 'middle' }
  ];

  for (let i = 0; i < treasures.length; i += 1) {
    const item = treasures[i];
    shapes.push({ type: 'circle', x: item.x, y: item.y, r: item.r + 4, fill: 'rgba(255,255,255,0.12)' });
    shapes.push({ type: 'circle', x: item.x, y: item.y, r: item.r, fill: '#FEEA9A', stroke: ACCENT, lineWidth: 3 });
  }

  for (let i = 0; i < enemies.length; i += 1) {
    const item = enemies[i];
    shapes.push({ type: 'circle', x: item.x, y: item.y, r: item.r, fill: '#FF9FB2', stroke: '#F04438', lineWidth: 2 });
    shapes.push({ type: 'text', text: '!', x: item.x, y: item.y + 1, size: 18, fill: '#101828', align: 'center', baseline: 'middle' });
  }

  shapes.push({ type: 'circle', x: player.x, y: player.y, r: player.r + 6, fill: 'rgba(128,230,213,0.22)' });
  shapes.push({ type: 'circle', x: player.x, y: player.y, r: player.r, fill: '#80E6D5', stroke: '#F9FAFB', lineWidth: 3 });
  shapes.push({ type: 'text', text: 'ぼく', x: player.x, y: player.y + 1, size: 12, fill: '#101828', align: 'center', baseline: 'middle' });

  if (timeLeft <= 0) {
    shapes.push({ type: 'rect', x: 30, y: height / 2 - 74, w: width - 60, h: 148, fill: 'rgba(16,24,40,0.92)', stroke: '#FEEA9A', lineWidth: 2, radius: 18 });
    shapes.push({ type: 'text', text: score >= 120 ? 'クリア！すごい！' : 'もう一回あそぼう！', x: width / 2, y: height / 2 - 22, size: 24, fill: '#FEEA9A', align: 'center', baseline: 'middle' });
    shapes.push({ type: 'text', text: 'スコア ' + score, x: width / 2, y: height / 2 + 24, size: 20, fill: '#F9FAFB', align: 'center', baseline: 'middle' });
  }

  return { type: 'frame', background: '#101828', shapes, score, timeLeft, message };
}

self.onmessage = function(event) {
  const data = event.data || {};
  if (data.type === 'start') {
    reset(data.width, data.height, data.durationSec);
    self.postMessage(makeFrame());
    return;
  }
  if (data.type === 'tick') {
    if (!started) reset(data.width, data.height, data.durationSec);
    width = data.width || width;
    height = data.height || height;
    const dt = Math.min(0.05, Math.max(0, (data.dt || 16) / 1000));
    if (elapsed < durationSec) {
      elapsed += dt;
      movePlayer(dt, data.input || {});
      updateWorld(dt);
    }
    self.postMessage(makeFrame());
  }
};
`.trim();

  const svelteComponent = `<script lang="ts">
  import WorkerCanvasGame from '$lib/components/WorkerCanvasGame.svelte';
  export let workerScript: string;
</script>

<WorkerCanvasGame title={${JSON.stringify(title)}} {workerScript} controls={${JSON.stringify(['タップ/ドラッグで移動', '矢印キー/WASDで移動', `${treasure}を集める`])}} />`;

  return {
    title,
    summary: `${elements.join('・')}を使った、宝物集めの1分ミニゲームです。`,
    controls: ['タップ/ドラッグで移動', '矢印キー/WASDで移動', `${treasure}を集める`, `${enemy}に当たらない`],
    workerScript,
    svelteComponent
  };
}
