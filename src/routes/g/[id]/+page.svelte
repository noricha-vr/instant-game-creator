<script lang="ts">
  import HtmlAppFrame from '$lib/components/HtmlAppFrame.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{data.app.title} | 今すぐアプリクリエイター</title>
  <meta name="description" content={data.app.summary} />
</svelte:head>

<main class="play-page">
  <div class="topbar">
    <a href="/" class="home">新しく作る</a>
    <div class="meta">
      <strong>{data.app.title}</strong>
      <span>{data.app.idea}</span>
    </div>
  </div>

  <HtmlAppFrame title={data.app.title} html={data.app.html} howToUse={data.app.howToUse} />
</main>

<style>
  :global(body) {
    margin: 0;
    background: #f6f4ef;
    color: #1d2939;
    font-family: ui-sans-serif, "Hiragino Sans", "Yu Gothic", sans-serif;
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
    border-bottom: 1px solid #ded8cb;
    background: rgba(255, 250, 240, 0.94);
    backdrop-filter: blur(10px);
  }

  .home {
    color: #1d2939;
    text-decoration: none;
    font-weight: 800;
    white-space: nowrap;
  }

  .meta {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .meta span {
    color: #667085;
    font-size: 0.875rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
