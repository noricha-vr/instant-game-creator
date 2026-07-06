# Cloudflare移行メモ

ローカル試作品で体験が成立したら、Cloudflare Pages / Workers + D1 + R2 へ移行します。

## 1. Adapter変更

```bash
npm i -D @sveltejs/adapter-cloudflare wrangler
```

`svelte.config.js` を変更します。

```js
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter()
  }
};

export default config;
```

## 2. D1設計

```sql
CREATE TABLE games (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  keyword TEXT,
  elements_json TEXT NOT NULL,
  instruction TEXT,
  controls_json TEXT NOT NULL,
  worker_script_key TEXT NOT NULL,
  svelte_component_key TEXT,
  engine TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_games_created_at ON games(created_at DESC);
```

## 3. R2設計

R2には大きくなりやすい生成コードを保存します。

```text
r2://generated-games/{id}/worker.js
r2://generated-games/{id}/component.svelte
r2://generated-games/{id}/thumbnail.png
```

## 4. 環境変数

```bash
wrangler secret put CEREBRAS_API_KEY
wrangler secret put CEREBRAS_MODEL
```

## 5. storage.tsの差し替え

現状の `src/lib/server/storage.ts` はローカルJSON前提です。

Cloudflareでは以下に差し替えます。

- `saveGame`: D1にメタデータ、R2にコード保存
- `listGames`: D1から一覧取得
- `getGame`: D1 + R2から復元

## 6. 注意点

- WorkerでAI生成コードを動かすため、CSPと検証は強める
- 公開ギャラリーに出す前にNGワード・暴力表現の軽いフィルタを入れる
- 生成ゲームのサムネイルを作るなら、ブラウザ側でCanvasをPNG化して保存する
- ログインなし公開にするなら、レート制限が必須
