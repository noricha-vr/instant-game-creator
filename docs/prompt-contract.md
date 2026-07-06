# 生成プロンプト契約

Cerebrasには、ゲーム仕様とコードを一発で返させます。

## 入力

- keyword
- elements: 3件
- instruction

## 出力

MarkdownなしのJSONのみ。

```json
{
  "title": "ゲームタイトル",
  "summary": "短い説明",
  "controls": ["タップで移動", "矢印キーで移動"],
  "workerScript": "self.onmessage = function(event) { ... }",
  "svelteComponent": "<script lang=\"ts\">...</script>"
}
```

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
  | { type: 'rect'; x: number; y: number; w: number; h: number; fill?: string }
  | { type: 'circle'; x: number; y: number; r: number; fill?: string }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number; stroke?: string }
  | { type: 'text'; text: string; x: number; y: number; size?: number; fill?: string };
```

## 失敗時

`/api/generate` は最大2回実行します。

1回目がJSON不正・検証NGなら、理由をプロンプトに入れて1回だけ再生成します。
