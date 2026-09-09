# アーキテクチャ

## ゴール

ユーザーが「作りたいもの」を自由入力すると、LLM が自己完結の単一 HTML アプリを生成し、保存・共有・即実行できる状態にする。

## 初期ローカル版の流れ

```text
トップ画面
  ↓
アイデアを入力
  ├─ /api/directions で方向カードを取得
  └─ カードなしで続行
  ↓
/api/generate に { idea, direction?, instruction } を送信
  ↓
Cerebras API または mockApp で HTML 生成
  ↓
validateGeneratedAppPayload で検証
  ↓
injectCsp で CSP meta を強制注入
  ↓
.local-data/apps.json に保存
  ↓
/g/:slug で sandbox iframe 実行
```

旧`.local-data/games.json`は読み取り専用で参照し、`canvas-worker-sim-v1`の共有URLを従来のWorkerランナーで表示します。新しいHTMLアプリへ暗黙変換したり、旧ファイルを書き換えたりしません。

## 生成物の契約

```ts
type GeneratedAppPayload = {
  title: string;
  summary: string;
  howToUse: string[];
  html: string;
  adaptation: string | null;
};
```

`html` は `<!doctype html>` から始まる自己完結の単一HTML文書です。CSSとJavaScriptはすべてインラインにします。
`adaptation` は、通信・複数人・ログイン・永続保存などの前提をひとり用へ翻案した場合だけ説明します。

## データモデル

```ts
type DirectionCard = {
  id: string;
  label: string;
  description: string;
};

type GenerateRequest = {
  idea: string;
  direction?: Pick<DirectionCard, 'label' | 'description'>;
  instruction: string;
};

type AppRecord = GeneratedAppPayload & {
  id: string;
  slug: string;
  idea: string;
  direction: Pick<DirectionCard, 'label' | 'description'> | null;
  instruction: string;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  engine: 'html-v1';
  sharePath: string;
};
```

## API

### POST /api/directions

```ts
type Request = { idea: string };
type Response = {
  ok: boolean;
  directions: DirectionCard[];
  usedMock: boolean;
};
```

方向カードは必須依存ではありません。失敗時はクライアントがカードなし生成へフォールバックできます。

### POST /api/generate

```ts
type Request = {
  idea: string;
  direction?: Pick<DirectionCard, 'label' | 'description'>;
  instruction?: string;
};
type Response = {
  ok: boolean;
  app: AppRecord;
  meta: { elapsedMs: number; attempts: number; usedMock: boolean };
};
```

## 安全設計

### iframe sandbox

共有ページでは次の形で実行します。

```svelte
<iframe sandbox="allow-scripts" srcdoc={app.html}></iframe>
```

`allow-same-origin`, `allow-popups`, `allow-top-navigation`, `allow-modals` は付けません。

### CSP 注入

保存前と共有画面の読取時に、信頼側のDOCTYPEと次のCSPを持つ`<head>`を生成HTML全体より前へ追加します。既存CSPは別policyとして残し、制限を緩めません。親documentにも`frame-src 'none'`を設定し、srcdoc内の自己ナビゲーションがネットワークへ出ないようにします。

```text
default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'
```

### 検証

- JSON 4キー検証
- `<html` が1回だけ存在すること
- `</html>` で閉じること
- HTML長 500〜60,000文字
- 外部通信、外部読み込み、親フレーム参照、Storage、ダイアログAPI等の禁止トークン検査
- `<script>` ブロックを抽出して `node:vm` の `Script` で構文検査

## 現時点の制限

- HTMLの意味的な完成度は検証できない
- 外部リソース・リクエストの制限は静的検査とCSPに依存する。WebRTCは検証対象外であり、あらゆるネットワーク通信の完全隔離は保証しない
- iframeの通信遮断・操作と旧Worker描画の回帰テストはローカルブラウザを必要とする
- 生成HTMLのサイズが大きいほどローカルJSONが肥大化する
