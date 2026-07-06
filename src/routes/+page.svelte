<script lang="ts">
  import { onMount } from 'svelte';
  import WorkerCanvasGame from '$lib/components/WorkerCanvasGame.svelte';
  import type { GalleryGame, GameElement, GameRecord } from '$lib/types';

  let keyword = '';
  let candidates: GameElement[] = [];
  let selected: GameElement[] = [];
  let gallery: GalleryGame[] = [];
  let generatedGame: GameRecord | null = null;
  let isLoadingElements = false;
  let isGenerating = false;
  let errorMessage = '';
  let generationNote = '';

  const examples = ['メダカ', '宇宙', 'おばけ', 'お菓子', '忍者', '雨の日'];

  async function loadElements() {
    isLoadingElements = true;
    errorMessage = '';
    try {
      const response = await fetch(`/api/elements?keyword=${encodeURIComponent(keyword)}&count=12`);
      const data = await response.json();
      candidates = data.elements ?? [];
      selected = candidates.slice(0, 3);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : '候補の読み込みに失敗しました';
    } finally {
      isLoadingElements = false;
    }
  }

  async function loadGallery() {
    try {
      const response = await fetch('/api/games?limit=12');
      const data = await response.json();
      gallery = data.games ?? [];
    } catch {
      gallery = [];
    }
  }

  function chooseExample(value: string) {
    keyword = value;
    loadElements();
  }

  function toggleElement(element: GameElement) {
    const exists = selected.some((item) => item.id === element.id);
    if (exists) {
      selected = selected.filter((item) => item.id !== element.id);
      return;
    }
    if (selected.length < 3) {
      selected = [...selected, element];
      return;
    }
    selected = [selected[1], selected[2], element];
  }

  async function generateGame() {
    if (selected.length !== 3) {
      errorMessage = '3つの要素を選んでください';
      return;
    }
    isGenerating = true;
    errorMessage = '';
    generationNote = '仕様とコードをまとめて生成中...';
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword,
          elements: selected.map((item) => item.label)
        })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || '生成に失敗しました');
      }
      generatedGame = data.game;
      generationNote = data.meta?.usedMock
        ? 'APIキー未設定のためモック生成で起動しました。'
        : `生成完了: ${data.meta?.elapsedMs ?? '-'}ms / ${data.meta?.attempts ?? 1}回`;
      await loadGallery();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : '生成に失敗しました';
      generationNote = '';
    } finally {
      isGenerating = false;
    }
  }

  async function shareCurrentGame() {
    if (!generatedGame) return;
    const url = new URL(generatedGame.sharePath, location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      generationNote = '共有URLをコピーしました。';
    } catch {
      generationNote = url;
    }
  }

  function resetBuilder() {
    generatedGame = null;
    generationNote = '';
  }

  onMount(() => {
    loadElements();
    loadGallery();
  });
</script>

<svelte:head>
  <title>今すぐゲームクリエイター</title>
  <meta name="description" content="キーワードと3つの要素から、すぐ遊べる子ども向けミニゲームを生成するローカル試作品。" />
</svelte:head>

{#if generatedGame}
  <main class="generated-view">
    <div class="generated-topbar">
      <button type="button" class="ghost" on:click={resetBuilder}>← もう一度作る</button>
      <div>
        <strong>{generatedGame.title}</strong>
        <span>{generatedGame.summary}</span>
      </div>
      <button type="button" on:click={shareCurrentGame}>共有URLコピー</button>
    </div>
    <WorkerCanvasGame
      title={generatedGame.title}
      workerScript={generatedGame.workerScript}
      controls={generatedGame.controls}
    />
    {#if generationNote}
      <p class="floating-note">{generationNote}</p>
    {/if}
  </main>
{:else}
  <main class="page">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Local prototype / Cerebras ready</p>
        <h1>今すぐゲームクリエイター</h1>
        <p class="lead">キーワードを入れて、3つの要素を選ぶだけ。すぐに30秒遊べるミニゲームを生成します。</p>
        <div class="example-row" aria-label="キーワード例">
          {#each examples as example}
            <button type="button" class="chip" on:click={() => chooseExample(example)}>{example}</button>
          {/each}
        </div>
      </div>

      <form class="creator" on:submit|preventDefault={generateGame}>
        <div class="section-title">
          <button type="button" class="link-button" on:click={loadElements} disabled={isLoadingElements}>
            {isLoadingElements ? '更新中...' : '別候補に変更'}
          </button>
        </div>

        <div class="candidate-grid" aria-label="候補一覧">
          {#each candidates as element}
            <button
              type="button"
              class:selected={selected.some((item) => item.id === element.id)}
              class="candidate-card"
              on:click={() => toggleElement(element)}
            >
              <span>{element.kind}</span>
              <strong>{element.label}</strong>
            </button>
          {/each}
        </div>

        {#if errorMessage}
          <p class="error">{errorMessage}</p>
        {/if}
        {#if generationNote}
          <p class="note">{generationNote}</p>
        {/if}

        <button type="submit" class="primary" disabled={isGenerating || selected.length !== 3}>
          {isGenerating ? 'ゲーム生成中...' : 'この3要素でゲーム生成'}
        </button>
      </form>
    </section>

    <section class="gallery-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Gallery</p>
          <h2>生成された作品</h2>
        </div>
        <button type="button" class="link-button" on:click={loadGallery}>更新</button>
      </div>

      {#if gallery.length === 0}
        <div class="empty-gallery">まだ保存されたゲームはありません。まず1つ作ってみてください。</div>
      {:else}
        <div class="gallery-grid">
          {#each gallery as game}
            <a href={game.sharePath} class="gallery-card">
              <strong>{game.title}</strong>
              <span>{game.summary}</span>
              <small>{game.elements.join(' / ')}</small>
            </a>
          {/each}
        </div>
      {/if}
    </section>
  </main>
{/if}

<style>
  :global(body) {
    margin: 0;
    background:
      radial-gradient(circle at 10% 0%, rgba(128, 230, 213, 0.2), transparent 32rem),
      radial-gradient(circle at 90% 10%, rgba(254, 234, 154, 0.22), transparent 34rem),
      #101828;
    color: #f9fafb;
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  button {
    font: inherit;
  }

  button {
    cursor: pointer;
  }

  .page {
    width: min(1180px, calc(100% - 32px));
    margin: 0 auto;
    padding: 34px 0 56px;
  }

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 0.85fr) minmax(380px, 1.15fr);
    gap: 24px;
    align-items: start;
  }

  .hero-copy {
    position: sticky;
    top: 24px;
    padding: 30px;
    border-radius: 32px;
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 20px 70px rgba(0, 0, 0, 0.2);
  }

  .eyebrow {
    margin: 0 0 10px;
    color: #80e6d5;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-size: 12px;
  }

  h1,
  h2 {
    margin: 0;
    line-height: 1.05;
  }

  h1 {
    font-size: clamp(42px, 7vw, 82px);
    letter-spacing: -0.06em;
  }

  h2 {
    font-size: 30px;
    letter-spacing: -0.04em;
  }

  .lead {
    color: #d0d5dd;
    font-size: 18px;
    line-height: 1.8;
  }

  .example-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .chip,
  .link-button,
  .ghost {
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(255, 255, 255, 0.08);
    color: #f9fafb;
    border-radius: 999px;
    padding: 9px 13px;
    font-weight: 800;
  }

  .creator {
    display: grid;
    gap: 18px;
    padding: 22px;
    border-radius: 32px;
    background: rgba(255, 255, 255, 0.92);
    color: #101828;
    box-shadow: 0 22px 90px rgba(0, 0, 0, 0.28);
  }

  .section-heading,
  .generated-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  /* 見出しラベルは削除済みのためボタンだけを右寄せする */
  .section-title {
    display: flex;
    justify-content: flex-end;
  }

  .creator .link-button {
    color: #101828;
    border-color: #d0d5dd;
    background: #f2f4f7;
  }

  .candidate-card {
    border: 1px solid #d0d5dd;
    border-radius: 18px;
    background: #fff;
    color: #101828;
    text-align: left;
  }

  .candidate-card strong,
  .gallery-card strong {
    display: block;
  }

  .candidate-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .candidate-card {
    min-height: 68px;
    padding: 13px;
    transition:
      transform 0.15s ease,
      border-color 0.15s ease,
      background 0.15s ease;
  }

  .candidate-card:hover {
    transform: translateY(-2px);
  }

  .candidate-card.selected {
    border-color: #12b76a;
    background: #ecfdf3;
  }

  .candidate-card span {
    display: inline-flex;
    margin-bottom: 8px;
    padding: 4px 8px;
    border-radius: 999px;
    background: #f2f4f7;
    color: #667085;
    font-size: 11px;
    font-weight: 900;
  }

  .primary {
    border: 0;
    border-radius: 20px;
    padding: 16px 18px;
    background: #101828;
    color: #f9fafb;
    font-weight: 900;
    font-size: 17px;
  }

  .primary:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .error,
  .note {
    margin: 0;
    border-radius: 16px;
    padding: 12px 14px;
    font-weight: 800;
  }

  .error {
    background: #fef3f2;
    color: #b42318;
  }

  .note {
    background: #eff8ff;
    color: #175cd3;
  }

  .gallery-section {
    margin-top: 34px;
    padding: 22px;
    border-radius: 32px;
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-top: 16px;
  }

  .gallery-card,
  .empty-gallery {
    border-radius: 22px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .gallery-card {
    color: #f9fafb;
    text-decoration: none;
  }

  .gallery-card span,
  .gallery-card small {
    display: block;
    margin-top: 8px;
    color: #d0d5dd;
    line-height: 1.5;
  }

  .gallery-card small {
    color: #98a2b3;
  }

  .empty-gallery {
    margin-top: 16px;
    color: #d0d5dd;
  }

  .generated-view {
    min-height: 100vh;
    display: grid;
    grid-template-rows: auto 1fr;
    background: #101828;
  }

  .generated-topbar {
    padding: 10px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  }

  .generated-topbar div {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .generated-topbar span {
    color: #d0d5dd;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
  }

  .generated-topbar button:not(.ghost) {
    border: 0;
    border-radius: 999px;
    padding: 9px 14px;
    color: #101828;
    background: #feea9a;
    font-weight: 900;
  }

  .floating-note {
    position: fixed;
    left: 50%;
    bottom: 18px;
    transform: translateX(-50%);
    margin: 0;
    max-width: calc(100% - 28px);
    padding: 10px 14px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.92);
    color: #101828;
    font-weight: 900;
    box-shadow: 0 12px 42px rgba(0, 0, 0, 0.24);
  }

  @media (max-width: 980px) {
    .hero {
      grid-template-columns: 1fr;
    }

    .hero-copy {
      position: static;
    }
  }

  @media (max-width: 700px) {
    .page {
      width: min(100% - 20px, 1180px);
      padding: 16px 0 32px;
    }

    .hero-copy,
    .creator,
    .gallery-section {
      border-radius: 24px;
      padding: 16px;
    }

    .candidate-grid,
    .gallery-grid {
      grid-template-columns: 1fr;
    }

    .generated-topbar {
      align-items: stretch;
      flex-direction: column;
    }
  }
</style>
