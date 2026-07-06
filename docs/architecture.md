# アーキテクチャ

## ゴール

ユーザーが「キーワード + 主役 + うごき・おたがい + さわると」を入力すると、眺めて楽しいシミュレーションが生成され、保存・共有できる状態にする。

## 初期ローカル版の流れ

```text
トップ画面
  ↓
/api/elements で3カテゴリ候補を取得
  ↓
ユーザーが各カテゴリから1要素を選択
  ↓
/api/generate に送信
  ↓
Cerebras API または mockGame で生成
  ↓
validateGeneratedPayload で簡易検証
  ↓
.local-data/games.json に保存
  ↓
WorkerCanvasGame で即観察
  ↓
/g/:slug で共有
```

## 生成物の契約

```ts
type GeneratedGamePayload = {
  title: string;
  summary: string;
  controls: string[];
  workerScript: string;
  svelteComponent: string;
};
```

実行に使うのは `workerScript` です。

`svelteComponent` は、将来的に生成物をSvelteコンポーネントとしてビルド・保存・レビューするために保持します。

## 要素選択

```ts
type ElementKind = 'subject' | 'dynamics' | 'touch';

type SelectedElement = {
  kind: ElementKind;
  label: string;
};
```

- `subject`: 主役
- `dynamics`: うごき・おたがい
- `touch`: さわると

`/api/generate` は3カテゴリが各1件そろっていることを検証します。

## Workerプロトコル

### start

```ts
{
  type: 'start',
  width: number,
  height: number
}
```

### tick

```ts
{
  type: 'tick',
  dt: number,
  input: {
    keys: string[],
    pointer: { x: number, y: number, down: boolean }
  },
  width: number,
  height: number
}
```

### frame

```ts
{
  type: 'frame',
  background?: string,
  shapes: DrawCommand[],
  stats?: Record<string, number | string>,
  message?: string
}
```

`stats` は日本語キーの汎用メトリクスです。HUD は `Object.entries(stats)` をそのまま表示します。

## なぜWorkerに寄せるか

- AI生成コードをメインスレッドで直接動かさない
- 計算が重くてもUIを固めにくい
- 生成コードの実行インターフェースを固定できる
- Canvas描画命令だけを受け取るので失敗原因を切り分けやすい

## 現時点の制限

- 完全なサンドボックスではない
- Worker内の計算量制限は弱い
- ネットワークアクセス禁止は簡易検証のみ
- LLMが仕様を守らない場合は失敗する
- 生成したSvelteコンポーネントはまだ動的コンパイルしていない
