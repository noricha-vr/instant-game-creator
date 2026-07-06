# アーキテクチャ

## ゴール

ユーザーが「キーワード + 3要素 + 追加指示」を入力すると、すぐ遊べる1分ミニゲームが生成され、保存・共有できる状態にする。

## 初期ローカル版の流れ

```text
トップ画面
  ↓
/api/elements で候補をランダム取得
  ↓
ユーザーが3要素を選択
  ↓
/api/generate に送信
  ↓
Cerebras API または mockGame でゲーム生成
  ↓
validateGeneratedPayload で簡易検証
  ↓
.local-data/games.json に保存
  ↓
WorkerCanvasGame で即プレイ
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

## Workerプロトコル

### start

```ts
{
  type: 'start',
  width: number,
  height: number,
  durationSec: number
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
  score?: number,
  timeLeft?: number,
  message?: string
}
```

## なぜWorkerに寄せるか

- AI生成コードをメインスレッドで直接動かさない
- ゲームが重くてもUIを固めにくい
- 生成コードの実行インターフェースを固定できる
- Canvas描画命令だけを受け取るので失敗原因を切り分けやすい

## 現時点の制限

- 完全なサンドボックスではない
- Worker内の計算量制限は弱い
- ネットワークアクセス禁止は簡易検証のみ
- LLMが仕様を守らない場合は失敗する
- 生成したSvelteコンポーネントはまだ動的コンパイルしていない
