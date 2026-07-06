# 今すぐゲームクリエイター / Instant Game Creator

キーワードと3つの要素から、子ども向けの即興ミニゲームを生成するローカル試作品です。

最初の目的は **Cloudflareに載せる前に、この体験がローカルで成立するかを確認すること** です。

## できること

- キーワード入力
- 3要素の候補をランダム表示
- クリックで3要素を選択・差し替え
- 追加指示入力
- Cerebras APIで「仕様 + コード」を一発生成
- APIキー未設定時はモック生成で即動作確認
- 生成コードをWeb Workerで実行
- Canvasでゲーム表示
- ローカルJSONに保存
- `/g/:slug` の共有URL
- ギャラリー表示
- 生成失敗時の自動1回リトライ

## 技術構成

- SvelteKit
- Svelte 5
- Canvas API
- Web Worker
- SvelteKit server endpoints
- ローカル保存: `.local-data/games.json`
- Cerebras API: サーバー側から `https://api.cerebras.ai/v1/chat/completions` を呼び出し

## セットアップ

```bash
cd instant-game-creator
cp .env.example .env
npm install
npm run dev
```

ブラウザで以下を開きます。

```text
http://localhost:5173
```

## Cerebras APIを使う場合

`.env` にAPIキーを設定します。

```bash
CEREBRAS_API_KEY=your-api-key
CEREBRAS_MODEL=gpt-oss-120b
CEREBRAS_MOCK=0
```

APIキーを入れない場合は、自動的にモック生成になります。

強制的にモック生成にしたい場合:

```bash
CEREBRAS_MOCK=1
```

## ディレクトリ構成

```text
src/routes/+page.svelte                 トップ画面・生成UI・ギャラリー
src/routes/g/[id]/+page.svelte           共有ゲーム画面
src/routes/api/elements/+server.ts       3要素候補API
src/routes/api/generate/+server.ts       生成API
src/routes/api/games/+server.ts          ギャラリーAPI
src/lib/components/WorkerCanvasGame.svelte Web Worker + Canvasゲーム実行UI
src/lib/server/cerebras.ts               Cerebras API呼び出し
src/lib/server/prompt.ts                 生成プロンプト
src/lib/server/validateGenerated.ts      生成物の簡易検証
src/lib/server/mockGame.ts               APIキーなし用のモックゲーム
src/lib/server/storage.ts                ローカルJSON保存
```

## 生成データ

生成されたゲームは以下に保存されます。

```text
.local-data/games.json
```

このファイルは `.gitignore` に入れています。

## 現時点の重要な設計判断

### 1. 「Svelteコンポーネントを返す」は保存し、実行はWorkerに寄せる

LLMが返したSvelteコンポーネントをブラウザ上でその場でコンパイル・実行する設計は、初期検証としては重く、壊れやすく、危険です。

そのため、この試作品ではCerebrasに以下を返させます。

- `svelteComponent`: 将来のビルド・保存・検査用
- `workerScript`: 実際にブラウザで動かすゲーム本体

ユーザーにはコードを見せず、Svelte側の共通ランナーでWeb Workerを起動してCanvasに描画します。

### 2. Phaser.js / Three.js は初期版では未使用

最初はCanvas APIに絞っています。理由は、生成コードの制約を強めやすく、失敗時の原因が見えやすいからです。

次の段階で、ゲームタイプごとに以下のように分ける想定です。

- 2Dカジュアル: Canvas API
- 2Dアクションが複雑化: Phaser.js
- 3Dミニゲーム: Three.js

### 3. DBはSQLiteではなくローカルJSON

まずは体験検証が目的なので、SQLiteよりも差し替えが簡単なJSON保存にしています。

Cloudflare移行時は `src/lib/server/storage.ts` をD1/R2実装に差し替えます。

## Cloudflare移行の見取り図

詳細は `docs/cloudflare-migration.md` を参照してください。

ざっくりは以下です。

1. `@sveltejs/adapter-cloudflare` に変更
2. D1に `games` テーブルを作成
3. R2に生成コード・サムネイルを保存
4. `storage.ts` をD1/R2対応に差し替え
5. Cerebras APIキーをCloudflare Secretsに保存
6. 共有URLとギャラリーを本番向けに調整

## 次にやると良いこと

- 生成ゲームの自動スクリーンショット作成
- ギャラリー用サムネイル保存
- 失敗ゲームのログ保存
- 生成プロンプトのABテスト
- Workerの実行時間・描画命令数の制限強化
- スマホでの操作性テスト
- Cloudflare D1/R2移行
