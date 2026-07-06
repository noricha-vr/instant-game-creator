# 生成プロンプト契約

Cerebrasには、シミュレーション仕様とコードを一発で返させます。

## 入力

- keyword
- elements: `{ kind: 'subject' | 'dynamics' | 'touch', label: string }` の3件
- instruction

## 出力

MarkdownなしのJSONのみ。

```json
{
  "title": "シミュレーションタイトル",
  "summary": "短い説明",
  "controls": ["タップでエサをまく"],
  "workerScript": "self.onmessage = function(event) { ... }",
  "svelteComponent": "<script lang=\"ts\">...</script>"
}
```

JSONのトップレベルキーは `title`, `summary`, `controls`, `workerScript`, `svelteComponent` の5つだけです。

## シミュレーション要件

- 20〜80体の個体が簡単なルールで動き、創発的なパターンを生む
- 画面端は wrap か bounce で処理する
- tick の `input.pointer.down === true` で、その座標に可視な介入を起こす
- 開始から約3秒間、何が起きるかとタップ時の変化を text で表示する
- 終了条件、勝敗、制限時間、点数表示は作らない
- frame は必要に応じて `stats?: Record<string, number | string>` を0〜3個返す

## Workerプロトコル

```ts
type StartMessage = {
  type: 'start';
  width: number;
  height: number;
};

type TickMessage = {
  type: 'tick';
  dt: number;
  input: {
    keys: string[];
    pointer: { x: number; y: number; down: boolean };
  };
  width: number;
  height: number;
};

type WorkerFrame = {
  type: 'frame';
  background?: string;
  shapes: DrawCommand[];
  stats?: Record<string, number | string>;
  message?: string;
};
```

`dt` の単位はミリ秒です。物理計算で秒が必要な場合は `dt / 1000` に変換します。

## workerScriptの禁止事項

- import
- importScripts
- fetch
- XMLHttpRequest
- WebSocket
- eval
- Function
- document
- window
- localStorage
- indexedDB
- while(true)
- for(;;)

## 描画命令

CanvasはSvelte側で描画するため、Workerは描画命令だけを返します。

```ts
type DrawCommand =
  | { type: 'rect'; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; lineWidth?: number; radius?: number }
  | { type: 'circle'; x: number; y: number; r: number; fill?: string; stroke?: string; lineWidth?: number }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number; stroke?: string; lineWidth?: number }
  | { type: 'text'; text: string; x: number; y: number; size?: number; fill?: string; align?: CanvasTextAlign; baseline?: CanvasTextBaseline; maxWidth?: number };
```

## 失敗時

`/api/generate` は最大2回実行します。

1回目がJSON不正・検証NGなら、理由をプロンプトに入れて1回だけ再生成します。
