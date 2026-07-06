# Cloudflare移行メモ

ローカル試作品で体験が成立したら、Cloudflare Pages / Workers + D1 + R2 へ移行します。

## 1. Adapter変更

```bash
bun add -d @sveltejs/adapter-cloudflare wrangler
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
CREATE TABLE apps (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  idea TEXT NOT NULL,
  direction_json TEXT,
  instruction TEXT,
  how_to_use_json TEXT NOT NULL,
  html_key TEXT NOT NULL,
  engine TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_apps_created_at ON apps(created_at DESC);
```

## 3. R2設計

R2には大きくなりやすい生成HTMLを保存します。

```text
r2://generated-apps/{id}/index.html
r2://generated-apps/{id}/thumbnail.png
```

## 4. 環境変数

```bash
wrangler secret put CEREBRAS_API_KEY
wrangler secret put CEREBRAS_MODEL
```

## 5. storage.tsの差し替え

現状の `src/lib/server/storage.ts` はローカルJSON前提です。

Cloudflareでは以下に差し替えます。

- `saveApp`: D1にメタデータ、R2にHTML保存
- `listApps`: D1から一覧取得
- `getApp`: D1 + R2から復元

## 6. 注意点

- 生成HTMLは保存前にCSP注入と禁止トークン検査を通す
- 公開ギャラリーに出す前にNGワード・暴力表現の軽いフィルタを入れる
- サムネイルを作るなら、ブラウザ側でiframeを撮影する仕組みを検討する
- ログインなし公開にするなら、レート制限が必須
