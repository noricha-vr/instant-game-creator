<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import type { DirectionCard, GalleryApp } from '$lib/types';

  type CreatorState = 'idle' | 'directions-loading' | 'directions' | 'generating' | 'error';

  let idea = '';
  let instruction = '';
  let directions: DirectionCard[] = [];
  let gallery: GalleryApp[] = [];
  let state: CreatorState = 'idle';
  let errorMessage = '';
  let note = '';

  const examples = ['ポモドーロタイマー', '性格診断', '献立ルーレット', '読書メモ', '集中用の画面', '家計ミニ計算機'];

  $: trimmedIdea = idea.trim();
  $: canSubmit = trimmedIdea.length > 0 && state !== 'directions-loading' && state !== 'generating';

  function setExample(value: string) {
    idea = value;
    directions = [];
    state = 'idle';
    errorMessage = '';
    note = '';
  }

  async function loadGallery() {
    try {
      const response = await fetch('/api/games?limit=12');
      const data = await response.json();
      gallery = data.apps ?? [];
    } catch {
      gallery = [];
    }
  }

  async function loadDirections() {
    if (!canSubmit) return;
    state = 'directions-loading';
    errorMessage = '';
    note = '';
    try {
      const response = await fetch('/api/directions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: trimmedIdea })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'ふくらませ方を作れませんでした');
      }
      directions = data.directions ?? [];
      state = directions.length > 0 ? 'directions' : 'idle';
      note = data.usedMock ? 'モックの方向カードを表示しています。' : '';
    } catch (error) {
      state = 'error';
      errorMessage = error instanceof Error ? error.message : 'ふくらませ方を作れませんでした';
      note = 'カードなしでもそのまま作れます。';
    }
  }

  async function generateApp(direction?: Pick<DirectionCard, 'label' | 'description'>) {
    if (!canSubmit) return;
    state = 'generating';
    errorMessage = '';
    note = direction ? `${direction.label}で実装中...` : 'そのまま実装中...';
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea: trimmedIdea,
          direction,
          instruction: instruction.trim()
        })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || '生成に失敗しました');
      }
      await goto(data.app.sharePath);
    } catch (error) {
      state = 'error';
      errorMessage = error instanceof Error ? error.message : '生成に失敗しました';
      note = '';
    }
  }

  onMount(() => {
    loadGallery();
  });
</script>

<svelte:head>
  <title>今すぐアプリクリエイター</title>
  <meta name="description" content="作りたいものを入力すると、LLMが単一HTMLアプリとして即実装するローカル試作品。" />
</svelte:head>

<main class="page">
  <section class="hero">
    <div class="hero-copy">
      <p class="eyebrow">Single HTML app factory</p>
      <h1>今すぐアプリクリエイター</h1>
      <p class="lead">作りたいものを一文で書くと、LLMがその場で使える小さなHTMLアプリに仕上げます。</p>
      <div class="example-row" aria-label="入力例">
        {#each examples as example}
          <button type="button" class="chip" on:click={() => setExample(example)}>{example}</button>
        {/each}
      </div>
    </div>

    <form class="creator" on:submit|preventDefault={() => generateApp()}>
      <label>
        <span>作りたいもの</span>
        <textarea
          bind:value={idea}
          maxlength="200"
          rows="5"
          placeholder="例: 休憩時間に使う呼吸ガイド"
          disabled={state === 'generating'}
        ></textarea>
      </label>
      <div class="counter">{trimmedIdea.length}/200</div>

      <label>
        <span>追加のこだわり</span>
        <input
          bind:value={instruction}
          maxlength="160"
          placeholder="任意: 落ち着いた色、子ども向け、記録欄つき など"
          disabled={state === 'generating'}
        />
      </label>

      <div class="actions">
        <button type="button" class="secondary" disabled={!canSubmit} on:click={loadDirections}>
          {state === 'directions-loading' ? '考え中...' : 'ふくらませる'}
        </button>
        <button type="submit" class="primary" disabled={!canSubmit}>
          {state === 'generating' ? '実装中...' : 'そのまま作る'}
        </button>
      </div>

      {#if state === 'directions'}
        <section class="directions" aria-label="ふくらませ方">
          <div class="section-heading">
            <h2>ふくらませ方を選ぶ</h2>
            <button type="button" class="link-button" on:click={() => generateApp()}>
              スキップして作る
            </button>
          </div>
          <div class="direction-grid">
            {#each directions as direction}
              <button type="button" class="direction-card" on:click={() => generateApp(direction)}>
                <strong>{direction.label}</strong>
                <span>{direction.description}</span>
              </button>
            {/each}
          </div>
        </section>
      {/if}

      {#if errorMessage}
        <div class="error" role="alert">
          <strong>処理できませんでした</strong>
          <p>{errorMessage}</p>
          <button type="button" class="link-button" on:click={() => generateApp()}>そのまま作る</button>
        </div>
      {/if}
      {#if note}
        <p class="note">{note}</p>
      {/if}
    </form>
  </section>

  <section class="gallery-section">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Gallery</p>
        <h2>最近作ったアプリ</h2>
      </div>
      <button type="button" class="link-button" on:click={loadGallery}>更新</button>
    </div>

    {#if gallery.length === 0}
      <div class="empty-gallery">まだ保存されたアプリはありません。まず1つ作ってみてください。</div>
    {:else}
      <div class="gallery-grid">
        {#each gallery as app}
          <a href={app.sharePath} class="gallery-card">
            <strong>{app.title}</strong>
            <span>{app.summary}</span>
            <small>{app.idea}</small>
          </a>
        {/each}
      </div>
    {/if}
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    background:
      linear-gradient(120deg, rgba(191, 219, 254, 0.55), transparent 34rem),
      linear-gradient(300deg, rgba(254, 215, 170, 0.55), transparent 32rem),
      #f6f4ef;
    color: #1d2939;
    font-family: ui-sans-serif, "Hiragino Sans", "Yu Gothic", sans-serif;
  }

  button,
  textarea,
  input {
    font: inherit;
  }

  button {
    cursor: pointer;
  }

  button:disabled,
  textarea:disabled,
  input:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .page {
    width: min(1120px, calc(100% - 32px));
    margin: 0 auto;
    padding: 34px 0 56px;
  }

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(420px, 1.1fr);
    gap: 24px;
    align-items: start;
  }

  .hero-copy,
  .creator,
  .gallery-section {
    border: 1px solid #ded8cb;
    border-radius: 8px;
    background: rgba(255, 250, 240, 0.9);
    box-shadow: 0 18px 60px rgba(29, 41, 57, 0.12);
  }

  .hero-copy {
    position: sticky;
    top: 24px;
    padding: 30px;
  }

  .creator {
    display: grid;
    gap: 16px;
    padding: 22px;
  }

  .eyebrow {
    margin: 0 0 10px;
    color: #b45309;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-size: 0.875rem;
  }

  h1,
  h2 {
    margin: 0;
    line-height: 1.08;
  }

  h1 {
    font-size: clamp(40px, 7vw, 76px);
  }

  h2 {
    font-size: 26px;
  }

  .lead {
    color: #475467;
    font-size: 18px;
    line-height: 1.8;
  }

  .example-row,
  .actions,
  .section-heading {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }

  .section-heading {
    justify-content: space-between;
  }

  .chip,
  .secondary,
  .link-button {
    border: 1px solid #c9c1b2;
    background: #fffaf0;
    color: #1d2939;
    border-radius: 999px;
    padding: 10px 14px;
    font-weight: 800;
  }

  label {
    display: grid;
    gap: 8px;
    font-weight: 900;
  }

  textarea,
  input {
    width: 100%;
    border: 1px solid #c9c1b2;
    border-radius: 8px;
    padding: 13px 14px;
    background: #fffdf8;
    color: #1d2939;
    line-height: 1.6;
  }

  textarea:focus,
  input:focus,
  button:focus-visible {
    outline: 4px solid rgba(180, 83, 9, 0.22);
    outline-offset: 2px;
  }

  .counter {
    margin-top: -10px;
    color: #667085;
    text-align: right;
    font-weight: 800;
  }

  .primary {
    flex: 1;
    min-width: 180px;
    border: 0;
    border-radius: 999px;
    padding: 13px 18px;
    background: #1d2939;
    color: #fffaf0;
    font-weight: 900;
  }

  .secondary {
    flex: 1;
    min-width: 160px;
  }

  .directions {
    display: grid;
    gap: 14px;
    padding-top: 8px;
  }

  .direction-grid,
  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .direction-card,
  .gallery-card,
  .empty-gallery,
  .error,
  .note {
    border: 1px solid #ded8cb;
    border-radius: 8px;
    padding: 15px;
    background: #fffdf8;
  }

  .direction-card {
    text-align: left;
    color: #1d2939;
  }

  .direction-card strong,
  .direction-card span,
  .gallery-card strong,
  .gallery-card span,
  .gallery-card small {
    display: block;
  }

  .direction-card span,
  .gallery-card span,
  .gallery-card small {
    margin-top: 8px;
    color: #667085;
    line-height: 1.5;
  }

  .error {
    background: #fef3f2;
    color: #b42318;
  }

  .error p,
  .note {
    margin: 0;
  }

  .note {
    background: #eff8ff;
    color: #175cd3;
    font-weight: 800;
  }

  .gallery-section {
    margin-top: 28px;
    padding: 22px;
  }

  .gallery-card {
    color: #1d2939;
    text-decoration: none;
  }

  .empty-gallery {
    margin-top: 16px;
    color: #667085;
  }

  @media (max-width: 900px) {
    .hero {
      grid-template-columns: 1fr;
    }

    .hero-copy {
      position: static;
    }
  }

  @media (max-width: 640px) {
    .page {
      width: min(100% - 20px, 1120px);
      padding: 16px 0 32px;
    }

    .hero-copy,
    .creator,
    .gallery-section {
      padding: 16px;
    }

    .direction-grid,
    .gallery-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
