<script lang="ts">
  import WorkerCanvasGame from '$lib/components/WorkerCanvasGame.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{data.game.title} | 今すぐゲームクリエイター</title>
  <meta name="description" content={data.game.summary} />
</svelte:head>

<main class="play-page">
  <div class="topbar">
    <a href="/" class="home">← 新しく作る</a>
    <div class="meta">
      <strong>{data.game.title}</strong>
      <span>{data.game.elements.join(' / ')}</span>
    </div>
  </div>

  <WorkerCanvasGame
    title={data.game.title}
    workerScript={data.game.workerScript}
    controls={data.game.controls}
  />
</main>

<style>
  :global(body) {
    margin: 0;
    background: #101828;
    color: #f9fafb;
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .play-page {
    min-height: 100vh;
    display: grid;
    grid-template-rows: auto 1fr;
  }

  .topbar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 10px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(16, 24, 40, 0.9);
    backdrop-filter: blur(10px);
  }

  .home {
    color: #f9fafb;
    text-decoration: none;
    font-weight: 700;
    white-space: nowrap;
  }

  .meta {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .meta span {
    color: #d0d5dd;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
