# 今すぐシミュレーションクリエイター / Instant Simulation Creator

キーワードと3カテゴリの要素を選ぶだけで、子ども向けの眺めて楽しいシミュレーションを即生成して観察できるローカル試作品です。

![トップページ](docs/images/screenshot-top.png)

## できること

- キーワード例チップから選択
- 主役・うごき・さわるとの3カテゴリから1つずつ選択
- Cerebras API で「仕様 + コード」を一発生成
- APIキー未設定時はモック生成で即動作確認
- 生成コードを Web Worker + Canvas で実行（開始時に説明を約3秒表示）
- タップ / クリックで粒子追加や風などの介入
- リセットボタンで Worker を再起動
- ローカル JSON に保存、`/g/:slug` の共有URL、ギャラリー表示
- 生成失敗時の自動1回リトライ

## 技術構成

- SvelteKit / Svelte 5
- Canvas API + Web Worker（生成コードのサンドボックス実行）
- SvelteKit server endpoints
- ローカル保存: `.local-data/games.json`
- Cerebras API: サーバー側から `https://api.cerebras.ai/v1/chat/completions` を呼び出し

## セットアップ

```bash
cp .env.example .env
bun install
bun run dev
```

ブラウザで http://localhost:5173 を開きます。

## Cerebras API を使う場合

`.env` に API キーを設定します。

```bash
CEREBRAS_API_KEY=your-api-key
CEREBRAS_MODEL=zai-glm-4.7
CEREBRAS_MOCK=0
```

- API キーを入れない場合は自動的にモック生成になります（強制モックは `CEREBRAS_MOCK=1`）
- serverless API で使えるモデルは `/v1/models` で確認できます
- GLM 系は reasoning がコンテキスト上限を圧迫して本文が切れるため、既定で `reasoning_effort: none` を送信します（`CEREBRAS_REASONING_EFFORT` で変更可）

## ディレクトリ構成

```text
src/routes/+page.svelte                    トップ画面・生成UI・ギャラリー
src/routes/g/[id]/+page.svelte             共有表示画面
src/routes/api/elements/+server.ts         3カテゴリ候補API
src/routes/api/generate/+server.ts         生成API
src/routes/api/games/+server.ts            ギャラリーAPI
src/lib/components/WorkerCanvasGame.svelte Web Worker + Canvas 実行ランナー
src/lib/server/cerebras.ts                 Cerebras API 呼び出し
src/lib/server/prompt.ts                   生成プロンプト（仕様の正本）
src/lib/server/validateGenerated.ts        生成物の検証（構文 + 実行時チェック）
src/lib/server/mockGame.ts                 APIキーなし用のモック生成
src/lib/server/storage.ts                  ローカルJSON保存
src/lib/server/elementPool.ts              要素候補プール
```

## 設計判断

### 1. 生成コードは Web Worker で実行、Svelte コンポーネントは保存のみ

LLM が返した Svelte コンポーネントをその場でコンパイル・実行する設計は重く壊れやすいため、実行本体は `workerScript`（描画コマンドを返す純粋な JS）に限定し、共通ランナーが Canvas に描画します。`svelteComponent` は将来のビルド・検査用に保存だけします。

### 2. 保存前に実行時チェックで検証

構文チェックだけでは「tick でクラッシュ」「フレームが変化しない」「タップ介入で落ちる」等の観察できないコードを弾けないため、`node:vm` で start + 180 tick を実際に実行します。120〜130 tick では pointer.down を送り、介入時もクラッシュしないことを確認してから保存します。不合格は自動リトライに乗ります。
（注意: `node:vm` はセキュリティ境界ではありません。ローカル試作前提であり、公開時は隔離実行への置き換えが必要です）

### 3. DB は SQLite ではなくローカル JSON

体験検証が目的のため、差し替えが簡単な JSON 保存にしています。Cloudflare 移行時は `src/lib/server/storage.ts` を D1/R2 実装に差し替えます（詳細: `docs/cloudflare-migration.md`）。

## 次にやると良いこと

- 生成結果の自動スクリーンショット・ギャラリー用サムネイル
- 失敗ログ保存・生成プロンプトのABテスト
- Worker の実行時間・描画命令数の制限強化
- スマホでの操作性テスト
- Cloudflare D1/R2 移行
