<script lang="ts">
  import { onMount } from 'svelte';
  import type { DrawCommand, WorkerFrame } from '$lib/types';

  type Props = {
    title: string;
    workerScript: string;
    controls?: string[];
  };

  let { title, workerScript, controls = [] }: Props = $props();

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let worker: Worker | null = null;
  let rafId = 0;
  let lastTime = 0;
  let stats = $state<Record<string, number | string>>({});
  let status = $state('起動中...');
  let errorMessage = $state('');
  let isRunning = $state(false);
  const keys = new Set<string>();
  const pointer = { x: 0, y: 0, down: false };
  // 16ms の tick 間に pointerdown→up が完結する短いタップを取りこぼさないためのラッチ
  let pointerTapped = false;

  function numberValue(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  function textValue(value: unknown, fallback: string): string {
    return typeof value === 'string' ? value : fallback;
  }

  function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(320, Math.floor(rect.width));
    canvas.height = Math.max(480, Math.floor(rect.height));
  }

  function drawRoundedRect(x: number, y: number, w: number, h: number, radius: number) {
    if (!ctx) return;
    const r = Math.max(0, Math.min(radius, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawShape(shape: DrawCommand) {
    if (!ctx) return;
    ctx.save();

    if (shape.type === 'rect') {
      const x = numberValue(shape.x, 0);
      const y = numberValue(shape.y, 0);
      const w = numberValue(shape.w, 0);
      const h = numberValue(shape.h, 0);
      const radius = numberValue(shape.radius, 0);
      if (radius > 0) drawRoundedRect(x, y, w, h, radius);
      else ctx.beginPath(), ctx.rect(x, y, w, h);
      if (shape.fill) {
        ctx.fillStyle = shape.fill;
        ctx.fill();
      }
      if (shape.stroke) {
        ctx.strokeStyle = shape.stroke;
        ctx.lineWidth = numberValue(shape.lineWidth, 1);
        ctx.stroke();
      }
    }

    if (shape.type === 'circle') {
      ctx.beginPath();
      ctx.arc(numberValue(shape.x, 0), numberValue(shape.y, 0), Math.max(0, numberValue(shape.r, 0)), 0, Math.PI * 2);
      if (shape.fill) {
        ctx.fillStyle = shape.fill;
        ctx.fill();
      }
      if (shape.stroke) {
        ctx.strokeStyle = shape.stroke;
        ctx.lineWidth = numberValue(shape.lineWidth, 1);
        ctx.stroke();
      }
    }

    if (shape.type === 'line') {
      ctx.beginPath();
      ctx.moveTo(numberValue(shape.x1, 0), numberValue(shape.y1, 0));
      ctx.lineTo(numberValue(shape.x2, 0), numberValue(shape.y2, 0));
      ctx.strokeStyle = shape.stroke ?? '#fff';
      ctx.lineWidth = numberValue(shape.lineWidth, 1);
      ctx.stroke();
    }

    if (shape.type === 'text') {
      const size = Math.max(8, Math.min(72, numberValue(shape.size, 16)));
      ctx.font = `700 ${size}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
      ctx.fillStyle = shape.fill ?? '#fff';
      ctx.textAlign = shape.align ?? 'left';
      ctx.textBaseline = shape.baseline ?? 'alphabetic';
      const text = textValue(shape.text, '');
      const maxWidth = numberValue(shape.maxWidth, 0);
      if (maxWidth > 0) ctx.fillText(text, numberValue(shape.x, 0), numberValue(shape.y, 0), maxWidth);
      else ctx.fillText(text, numberValue(shape.x, 0), numberValue(shape.y, 0));
    }

    ctx.restore();
  }

  function drawFrame(frame: WorkerFrame) {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = frame.background ?? '#101828';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const shape of frame.shapes ?? []) {
      drawShape(shape);
    }

    stats = frame.stats && typeof frame.stats === 'object' ? frame.stats : {};
    status = frame.message ?? '観察中';
  }

  function postStart() {
    if (!worker || !canvas) return;
    worker.postMessage({ type: 'start', width: canvas.width, height: canvas.height });
    lastTime = performance.now();
    isRunning = true;
  }

  function loop(now: number) {
    if (!worker || !isRunning || !canvas) return;
    const dt = Math.min(50, Math.max(0, now - lastTime));
    lastTime = now;
    worker.postMessage({
      type: 'tick',
      dt,
      input: {
        keys: Array.from(keys),
        pointer: { x: pointer.x, y: pointer.y, down: pointer.down || pointerTapped }
      },
      width: canvas.width,
      height: canvas.height
    });
    pointerTapped = false;
    rafId = requestAnimationFrame(loop);
  }

  function stopWorker() {
    isRunning = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    if (worker) worker.terminate();
    worker = null;
  }

  function startWorker() {
    stopWorker();
    errorMessage = '';
    status = '起動中...';
    stats = {};
    try {
      const blob = new Blob([workerScript], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      worker = new Worker(url);
      URL.revokeObjectURL(url);
      worker.onmessage = (event: MessageEvent<WorkerFrame>) => {
        if (event.data?.type === 'frame') drawFrame(event.data);
      };
      worker.onerror = (event) => {
        errorMessage = event.message || 'シミュレーション内でエラーが発生しました';
        stopWorker();
      };
      postStart();
      rafId = requestAnimationFrame(loop);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Workerを起動できませんでした';
    }
  }

  function updatePointer(event: PointerEvent, down: boolean) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * canvas.width;
    pointer.y = ((event.clientY - rect.top) / Math.max(1, rect.height)) * canvas.height;
    if (down) pointerTapped = true;
    pointer.down = down;
  }

  function handlePointerDown(event: PointerEvent) {
    updatePointer(event, true);
  }

  function handleKeyDown(event: KeyboardEvent) {
    // LLM 生成コードは 'Space'/'KeyW' (event.code) と ' '/'w' (event.key) のどちらで判定するか揺れるため両方入れる
    keys.add(event.key);
    keys.add(event.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
  }

  function handleKeyUp(event: KeyboardEvent) {
    keys.delete(event.key);
    keys.delete(event.code);
  }

  onMount(() => {
    ctx = canvas.getContext('2d');
    resizeCanvas();
    const observer = new ResizeObserver(() => {
      resizeCanvas();
      postStart();
    });
    observer.observe(canvas);
    canvas.focus();
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    startWorker();

    return () => {
      observer.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      stopWorker();
    };
  });
</script>

<section class="game-shell" aria-label={title}>
  <div class="hud">
    <div class="stats" aria-label="観察データ">
      {#each Object.entries(stats) as [label, value]}
        <div class="stat">
          <span class="label">{label}</span>
          <strong>{value}</strong>
        </div>
      {/each}
    </div>
    <div class="status">{status}</div>
  </div>

  <canvas
    bind:this={canvas}
    tabindex="0"
    aria-label="シミュレーション画面"
    onpointerdown={handlePointerDown}
    onpointermove={(event) => updatePointer(event, pointer.down)}
    onpointerup={(event) => updatePointer(event, false)}
    onpointercancel={(event) => updatePointer(event, false)}
  ></canvas>

  <div class="footer">
    <div class="controls">
      {#each controls as control}
        <span>{control}</span>
      {/each}
    </div>
    <button type="button" onclick={startWorker}>リセット</button>
  </div>

  {#if errorMessage}
    <div class="error" role="alert">
      <strong>シミュレーションを実行できませんでした</strong>
      <p>{errorMessage}</p>
      <button type="button" onclick={startWorker}>もう一度起動</button>
    </div>
  {/if}
</section>

<style>
  .game-shell {
    position: relative;
    min-height: 0;
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 10px;
    padding: 12px;
    background: #101828;
  }

  .hud,
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: #f9fafb;
  }

  .stats {
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .stat {
    min-width: 74px;
    padding: 8px 10px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .hud strong {
    display: block;
    font-size: 20px;
    line-height: 1;
  }

  .label {
    display: block;
    color: #98a2b3;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
  }

  .status {
    flex: 1;
    min-width: 0;
    text-align: center;
    color: #d0d5dd;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  canvas {
    width: min(100%, 520px);
    height: min(72vh, 760px);
    min-height: 520px;
    justify-self: center;
    display: block;
    border-radius: 26px;
    background: #101828;
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.32);
    border: 1px solid rgba(255, 255, 255, 0.14);
    touch-action: none;
    outline: none;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .controls span {
    padding: 6px 10px;
    border-radius: 999px;
    color: #d0d5dd;
    background: rgba(255, 255, 255, 0.08);
    font-size: 12px;
  }

  button {
    border: 0;
    border-radius: 999px;
    padding: 9px 14px;
    color: #101828;
    background: #feea9a;
    font-weight: 800;
    cursor: pointer;
    white-space: nowrap;
  }

  .error {
    position: absolute;
    inset: 16px;
    display: grid;
    place-content: center;
    gap: 12px;
    padding: 22px;
    text-align: center;
    border-radius: 24px;
    background: rgba(16, 24, 40, 0.94);
    border: 1px solid rgba(255, 255, 255, 0.16);
  }

  .error p {
    margin: 0;
    color: #fecdca;
  }

  @media (max-width: 700px) {
    .game-shell {
      padding: 8px;
      gap: 8px;
    }

    canvas {
      width: 100%;
      height: 70vh;
      min-height: 460px;
      border-radius: 22px;
    }

    .footer {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
