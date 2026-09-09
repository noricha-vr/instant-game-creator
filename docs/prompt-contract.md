# 生成プロンプト契約

Cerebrasには、方向カードまたは単一HTMLアプリをJSONだけで返させます。

## 方向カード

### 入力

- idea

### 出力

```json
{
  "directions": [
    { "label": "診断にする", "description": "質問に答える形で結果を出す" }
  ]
}
```

- directions は3〜4件
- label は12字以内
- description は40字以内
- 外部APIやログインが必要な案は出さない

## アプリ生成

### 入力

- idea
- direction: 任意の `{ label, description }`
- instruction

### 出力

MarkdownなしのJSONのみ。

```json
{
  "title": "アプリタイトル",
  "summary": "短い説明",
  "howToUse": ["ボタンを押す", "結果を見る"],
  "html": "<!doctype html><html lang=\"ja\">...</html>",
  "adaptation": null
}
```

JSONのトップレベルキーは `title`, `summary`, `howToUse`, `html`, `adaptation` の5つです。余剰キーは保存前に無視します。

`adaptation` は、通信・複数人・ログイン・永続保存など単一HTMLでそのまま実現できない前提を、ひとり用に翻案した場合だけ1行で説明します。翻案不要なら `null` です。

## HTML要件

- 自己完結の単一HTML文書
- `<html>` は1回だけ
- `</html>` で閉じる
- `<head>` に charset と viewport meta を含める
- CSSとJavaScriptはすべてインライン
- 外部リソース、外部通信、CDN、外部フォント、外部画像を使わない
- スマホ縦画面を最優先し、PC幅にも対応する
- タップとクリックの両方で使える
- UI文言は日本語
- 4〜6色のまとまった配色
- 開いた瞬間に使える完成品にする
- 通信・複数人・複数デバイス・ログイン・永続保存が前提の入力は、一人・1画面・セッション内だけで体験の核を再現する

## 禁止トークン

- `fetch(`
- `XMLHttpRequest`
- `WebSocket`
- `EventSource`
- `sendBeacon`
- `importScripts`
- `import(`
- `<script src=`
- `<link `
- `<iframe`
- `<embed`
- `<object`
- `window.top`
- `window.parent`
- `document.cookie`
- `localStorage`
- `indexedDB`
- `alert(`
- `confirm(`
- `prompt(`
- `while(true)`
- `for(;;)`

## 保存前処理

`validateGeneratedAppPayload` で構造と禁止事項を検証した後、`injectCsp` で信頼側のDOCTYPEとCSP専用の`<head>`を生成HTML全体より前へ追加します。既存のCSPは残し、複数policyとして制限を合成します。保存済みHTMLにも表示前に再適用します。

```text
default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'
```

## 失敗時

`/api/generate` は最大2回実行します。

1回目がJSON不正・HTML不正・検証NGなら、理由をプロンプトに入れて1回だけ再生成します。`/api/directions` はリトライしません。
