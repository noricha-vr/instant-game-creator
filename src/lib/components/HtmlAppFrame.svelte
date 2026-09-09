<script lang="ts">
  type Props = {
    title: string;
    html: string;
    howToUse?: string[];
  };

  let { title, html, howToUse = [] }: Props = $props();
</script>

<section class="app-frame-shell" aria-label={title}>
  {#if howToUse.length > 0}
    <details class="how-to">
      <summary>使い方</summary>
      <ol>
        {#each howToUse as item}
          <li>{item}</li>
        {/each}
      </ol>
    </details>
  {/if}

  <iframe title={title} sandbox="allow-scripts" srcdoc={html}></iframe>
</section>

<style>
  .app-frame-shell {
    min-height: 0;
    display: grid;
    grid-template-rows: auto 1fr;
    background: #f6f4ef;
  }

  .how-to {
    margin: 10px;
    padding: 10px 12px;
    border: 1px solid #ded8cb;
    border-radius: 8px;
    background: #fffaf0;
    color: #1d2939;
  }

  .how-to summary {
    cursor: pointer;
    font-weight: 800;
  }

  .how-to ol {
    margin: 10px 0 0;
    padding-left: 22px;
    line-height: 1.7;
  }

  iframe {
    width: 100%;
    height: 100%;
    min-height: 640px;
    display: block;
    border: 0;
    background: #fff;
  }

  @media (max-width: 700px) {
    iframe {
      min-height: 74vh;
    }
  }
</style>
