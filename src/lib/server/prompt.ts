import type { GenerateRequest } from '$lib/types';

/** Build the JSON-only prompt for idea expansion cards. */
export function buildDirectionsPrompt(idea: string): string {
  return `あなたは日本語のプロダクト企画者です。

ユーザーの作りたいものを、単一HTMLミニアプリとして面白くする「ふくらませ方」を3〜4案出してください。

アイデア:
${idea || '指定なし'}

返答ルール:
- Markdownは禁止。
- 説明文は禁止。
- JSONオブジェクトだけを返す。
- JSONのキーは directions だけ。
- directions は3〜4件の配列。
- 各要素は { "label": "12字以内", "description": "40字以内" }。
- ラベルと説明は日本語。
- 実装できない外部API連携やログイン前提にしない。
- 単一HTMLで完結する方向だけにする。`;
}

/** Build the JSON-only prompt for a complete single-file HTML app. */
export function buildAppPrompt(request: GenerateRequest, retryReason?: string): string {
  const direction = request.direction
    ? `ふくらませ方: ${request.direction.label} — ${request.direction.description}`
    : 'ふくらませ方: あなたのセンスで完成度を上げる';
  const retry = retryReason
    ? `\n前回の出力は検証に失敗しました。理由: ${retryReason}\n今回は必ずJSONだけを返し、HTML構造と禁止事項を守ってください。`
    : '';

  return `あなたは、作りたいものをすぐ使える単一HTMLアプリに仕上げるプロダクトエンジニアです。

ユーザーのアイデア:
${request.idea || '指定なし'}

${direction}

追加指示:
${request.instruction || '指定なし'}

返答ルール:
- Markdownは禁止。
- 説明文は禁止。
- JSONオブジェクトだけを返す。
- JSONのキーは必ず title, summary, howToUse, html の4つ。
- title は30文字以内の日本語。
- summary は80文字以内の日本語。
- howToUse は使い方を示す日本語文字列の配列。1〜4件。
- html は完全な単一HTML文書。500〜30000文字。

HTMLアプリの要件:
- <!doctype html> から始まる自己完結のHTMLにする。
- <html> は1回だけ使い、必ず </html> で閉じる。
- <head> 内に charset と viewport meta を入れる。
- CSSとJavaScriptはすべてインラインにする。
- 外部リソース、外部通信、外部フォント、外部画像、CDN、APIは一切使わない。
- alert, confirm, prompt, localStorage, indexedDB, document.cookie は使わない。
- 状態はJavaScript変数だけに持つ。
- スマホ縦画面を最優先し、PC幅でも破綻しない。
- タップとクリックの両方で使える。
- UI文言は日本語。
- 4〜6色のまとまったパレットを使い、十分なコントラストを確保する。
- プレースホルダや未完成の説明だけで終わらせず、開いた瞬間に使える完成品にする。
- 最初の画面に1行説明、または「はじめる」導線を置く。
- ボタン・入力・結果表示など、ユーザーが操作して変化を感じる要素を必ず入れる。

禁止トークン:
- fetch(, XMLHttpRequest, WebSocket, EventSource, sendBeacon, importScripts, import(, <script src=, <link , <iframe, <embed, <object
- window.top, window.parent, document.cookie, localStorage, indexedDB
- alert(, confirm(, prompt(, while(true), for(;;)
${retry}`;
}
