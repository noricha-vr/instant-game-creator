import type { GenerateRequest } from '$lib/types';

export function buildGamePrompt(request: GenerateRequest, retryReason?: string): string {
  const elements = request.elements.map((element, index) => `${index + 1}. ${element}`).join('\n');
  const retry = retryReason
    ? `\n前回の出力は検証に失敗しました。理由: ${retryReason}\n今回は必ずJSONだけを返してください。`
    : '';

  return `あなたは子ども向けの即興ミニゲームを作るゲームデザイナー兼Svelteエンジニアです。

目的:
- ユーザーが入力したキーワードと3要素から、30秒くらい遊べるCanvasミニゲームを作る。
- スマホ縦画面、PCブラウザ、タップ、マウス、キーボードに対応する。
- 粗くても即遊べることを優先する。

キーワード:
${request.keyword || '指定なし'}

選択された3要素:
${elements}

追加指示:
${request.instruction || '指定なし'}

返答ルール:
- Markdownは禁止。
- 説明文は禁止。
- JSONオブジェクトだけを返す。
- JSONのキーは必ず title, summary, controls, workerScript, svelteComponent の5つ。
- title は30文字以内の日本語。
- summary は80文字以内の日本語。
- controls は短い日本語文字列の配列。
- workerScript はブラウザのWeb Workerでそのまま実行できるJavaScript文字列。
- svelteComponent は将来ビルド時に使うためのSvelteコンポーネント文字列。ただし実行本体はworkerScriptに置く。

workerScriptの制約:
- import, importScripts, fetch, XMLHttpRequest, WebSocket, eval, Function, document, window, localStorage, indexedDB は使わない。
- 無限ループは禁止。while(true), for(;;)は禁止。
- ゲームの状態（スコア・位置・タイマー等）は必ずトップレベルの変数に保持する。onmessage ハンドラの中で状態変数を宣言し直さない。
- 外部通信・外部読み込みは禁止。
- self.onmessage を定義し、type が start と tick のメッセージを処理する。
- startメッセージ: { type:'start', width:number, height:number, durationSec:number }
- tickメッセージ: { type:'tick', dt:number, input:{ keys:string[], pointer:{x:number,y:number,down:boolean} }, width:number, height:number, durationSec:number }
- dt の単位はミリ秒（約16.7）。物理計算で秒が必要なら dt / 1000 に変換してから使う。
- input.keys には押下中キーの event.key と event.code の両方が入る（例: ' ', 'Space', 'ArrowUp', 'w', 'KeyW'）。
- tickごとに self.postMessage({ type:'frame', background:string, shapes:Array, score:number, timeLeft:number, message?:string }) を返す。
- timeLeft は残り秒数（秒単位、ミリ秒ではない）。durationSec から経過秒を引いた値を返す。
- shapes は以下だけを使う:
  - { type:'rect', x, y, w, h, fill?, stroke?, lineWidth?, radius? }
  - { type:'circle', x, y, r, fill?, stroke?, lineWidth? }
  - { type:'line', x1, y1, x2, y2, stroke?, lineWidth? }
  - { type:'text', text, x, y, size?, fill?, align?, baseline?, maxWidth? }
- 30秒で遊べるゲームにする。勝敗またはスコアが分かるようにする。
- 開始から約3秒間、プレイ方法（操作方法と目的）を画面中央付近に text で大きく表示してから本編を始める。文字は背景と十分なコントラストを取る。
- 説明文は1行12文字以内で複数行に分け、各 text に maxWidth: width - 40 を指定して画面からはみ出させない。
- ゲーム終了画面に「タップ か スペースキー でもういちど」という案内を text で表示する。
- 背景は単色で終わらせず、テーマに合う装飾（星・雲・木・波・建物など）を複数の shape で常時描く。
- プレイヤーと敵は最低3つの shape の組み合わせで描き、目や模様など表情を付ける。
- アイテム取得時や被弾時に、広がる円・小さな飛沫・スコアのポップアップ text などの視覚エフェクトを短時間表示する。
- 配色はテーマに合った4〜6色のパレットに揃え、背景と前景のコントラストを確保する。
- 生成するコードは30000文字以内。
${retry}`;
}
