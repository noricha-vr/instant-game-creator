import { elementKindLabel, type GenerateRequest } from '$lib/types';

/** Build the JSON-only generation prompt for a browser simulation. */
export function buildGamePrompt(request: GenerateRequest, retryReason?: string): string {
  const byKind = new Map(request.elements.map((element) => [element.kind, element.label]));
  const subject = byKind.get('subject') ?? 'メダカ';
  const dynamics = byKind.get('dynamics') ?? 'むれる';
  const touch = byKind.get('touch') ?? 'タップでふえる';
  const slots = [
    `${elementKindLabel.subject}=${subject}`,
    `${elementKindLabel.dynamics}=${dynamics}`,
    `${elementKindLabel.touch}=${touch}`
  ].join(' / ');
  const retry = retryReason
    ? `\n前回の出力は検証に失敗しました。理由: ${retryReason}\n今回は必ずJSONだけを返し、Worker契約を守ってください。`
    : '';

  return `あなたは子ども向けの、眺めて楽しいシミュレーションを作るクリエイティブコーダーです。

目的:
- ユーザーのキーワードと3つの定型スロットから、Canvasで動き続けるブラウザシミュレーションを作る。
- 20〜80体の個体が簡単なルールで動き、創発的なパターンを生む。
- タップまたはクリックによる可視な介入を必ず入れる。
- スマホ縦画面、PCブラウザ、タップ、マウスに対応する。
- 粗くても眺めて楽しいこと、止まらず動き続けることを優先する。

キーワード:
${request.keyword || '指定なし'}

選択スロット:
${slots}

追加指示:
${request.instruction || '指定なし'}

返答ルール:
- Markdownは禁止。
- 説明文は禁止。
- JSONオブジェクトだけを返す。
- JSONのキーは必ず title, summary, controls, workerScript, svelteComponent の5つ。
- title は30文字以内の日本語。
- summary は80文字以内の日本語。
- controls は「${touch}」に沿った介入説明を含む、短い日本語文字列の配列。
- workerScript はブラウザのWeb Workerでそのまま実行できるJavaScript文字列。
- svelteComponent は将来ビルド時に使うためのSvelteコンポーネント文字列。ただし実行本体はworkerScriptに置く。

シミュレーション内容:
- 主役は「${subject}」。
- うごき・おたがいは「${dynamics}」。
- さわるとは「${touch}」。
- 画面端は wrap か bounce のどちらかで処理し、個体が画面外へ消え続けないようにする。
- input.pointer.down === true の tick では、その座標に必ず可視な介入を起こす。「${touch}」に従い、粒子追加、エサ、壁、風、爆発、光などを描画にも反映する。
- 勝敗、ゴール、終了画面、制限時間、スコアを作らない。
- timeLeft と score は返さない。frame には stats を必要に応じて0〜3個だけ返す。
- stats のキーは日本語にする。例: { "なかま": 42, "風": "右" }。
- 開始から約3秒間、「なにが起きるか」と「タップするとどうなるか」を text で表示する。

workerScriptの制約:
- import, importScripts, fetch, XMLHttpRequest, WebSocket, eval, Function, document, window, localStorage, indexedDB は使わない。
- 無限ループは禁止。while(true), for(;;)は禁止。
- 状態（個体配列・経過時間・介入エフェクト等）は必ずトップレベルの変数に保持する。onmessage ハンドラの中で状態変数を宣言し直さない。
- 外部通信・外部読み込みは禁止。
- self.onmessage を定義し、type が start と tick のメッセージを処理する。
- startメッセージ: { type:'start', width:number, height:number }
- tickメッセージ: { type:'tick', dt:number, input:{ keys:string[], pointer:{x:number,y:number,down:boolean} }, width:number, height:number }
- dt の単位はミリ秒（約16.7）。物理計算で秒が必要なら dt / 1000 に変換してから使う。
- tickごとに self.postMessage({ type:'frame', background:string, shapes:Array, stats?:Object, message?:string }) を返す。
- postMessage するオブジェクトには必ず type:'frame' を含め、shapes は必ず配列にする。
- shapes は以下だけを使う:
  - { type:'rect', x, y, w, h, fill?, stroke?, lineWidth?, radius? }
  - { type:'circle', x, y, r, fill?, stroke?, lineWidth? }
  - { type:'line', x1, y1, x2, y2, stroke?, lineWidth? }
  - { type:'text', text, x, y, size?, fill?, align?, baseline?, maxWidth? }
- 説明文は1行12文字以内で複数行に分け、各 text に maxWidth: width - 40 を指定して画面からはみ出させない。
- 背景は単色で終わらせず、テーマに合う装飾やゆるい変化を複数の shape で常時描く。
- 主役は最低2つの shape の組み合わせで描き、動きの向きや状態が分かる見た目にする。
- タップ介入時に、広がる円・流れ線・小さな飛沫・光などの視覚エフェクトを短時間表示する。
- 配色はテーマに合った4〜6色のパレットに揃え、背景と前景のコントラストを確保する。
- 生成するコードは30000文字以内。
${retry}`;
}
