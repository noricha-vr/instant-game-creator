import type { DirectionCard, GenerateRequest, GeneratedAppPayload } from '$lib/types';
import { validateGeneratedAppPayload } from './validateGeneratedHtml';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function trimIdea(input: string): string {
  return input.replace(/[\n\r\t]+/g, ' ').trim().slice(0, 60) || '今日のひらめき';
}

function mockAdaptation(idea: string): string | null {
  if (/チャット|対戦|SNS|友達|オンライン/.test(idea)) {
    return '相手や通信要素はひとり用の疑似体験にアレンジしました';
  }
  return null;
}

export function createMockDirections(idea: string): DirectionCard[] {
  const base = trimIdea(idea);
  return [
    { id: 'd1', label: '診断にする', description: `${base}を質問つきの診断アプリにする` },
    { id: 'd2', label: '毎日使う', description: '記録や抽選で日々使える小さな道具にする' },
    { id: 'd3', label: '遊びを足す', description: 'ボタン操作で結果が変わる軽い遊びにする' },
    { id: 'd4', label: '見た目重視', description: '雰囲気のある画面と動きで楽しませる' }
  ];
}

export function createMockApp(request: GenerateRequest): GeneratedAppPayload {
  const idea = trimIdea(request.idea);
  const safeIdea = escapeHtml(idea);
  const adaptation = mockAdaptation(request.idea);
  const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeIdea}おみくじ</title>
<style>
  :root {
    color-scheme: light;
    --ink: #182230;
    --paper: #fff7ed;
    --accent: #c2410c;
    --accent-2: #0369a1;
    --soft: #fed7aa;
    --line: #fdba74;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
    background: linear-gradient(135deg, #fff7ed, #f0f9ff);
    color: var(--ink);
    font-family: ui-rounded, "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif;
  }
  main {
    width: min(100%, 520px);
    display: grid;
    gap: 18px;
    padding: 26px;
    border: 2px solid var(--line);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 24px 70px rgba(194, 65, 12, 0.18);
    text-align: center;
  }
  h1 { margin: 0; font-size: clamp(30px, 8vw, 48px); line-height: 1.12; }
  p { margin: 0; line-height: 1.7; }
  .result {
    min-height: 124px;
    display: grid;
    place-items: center;
    padding: 22px;
    border-radius: 18px;
    background: var(--paper);
    border: 1px dashed var(--accent);
    transition: transform 0.25s ease, background 0.25s ease;
  }
  .result.active { transform: rotate(-1deg) scale(1.02); background: #ffedd5; }
  .fortune { font-size: 42px; font-weight: 900; color: var(--accent); }
  .note { color: var(--accent-2); font-weight: 800; }
  button {
    width: 100%;
    border: 0;
    border-radius: 999px;
    padding: 15px 18px;
    background: var(--accent);
    color: white;
    font: inherit;
    font-weight: 900;
    cursor: pointer;
  }
  button:focus-visible { outline: 4px solid var(--soft); outline-offset: 3px; }
</style>
</head>
<body>
<main>
  <p class="note">すぐ使えるミニアプリ</p>
  <h1>${safeIdea}おみくじ</h1>
  <p>ボタンを押すたびに、今日の進め方を占います。迷ったら軽く引いてみてください。</p>
  <section class="result" id="result" aria-live="polite">
    <div>
      <div class="fortune" id="fortune">待機中</div>
      <p id="message">準備ができたら引いてください。</p>
    </div>
  </section>
  <button id="drawButton" type="button">おみくじを引く</button>
</main>
<script>
const fortunes = [
  ['大吉', '思いついた順にすぐ試すと良い日です。'],
  ['中吉', '小さく作って反応を見ると進みます。'],
  ['吉', '一番使う場面だけに絞ると形になります。'],
  ['小吉', '見た目を少し整えると気分が上がります。'],
  ['末吉', '今日はメモだけでも十分な前進です。'],
  ['凶', '欲張らず、最初の1ボタンだけ作りましょう。']
];
const result = document.getElementById('result');
const fortune = document.getElementById('fortune');
const message = document.getElementById('message');
document.getElementById('drawButton').addEventListener('click', function () {
  const item = fortunes[Math.floor(Math.random() * fortunes.length)];
  fortune.textContent = item[0];
  message.textContent = item[1];
  result.classList.remove('active');
  void result.offsetWidth;
  result.classList.add('active');
});
</script>
</body>
</html>`;

  return validateGeneratedAppPayload({
    title: `${idea}おみくじ`,
    summary: 'ボタンを押すだけで今日の進め方を占える単一HTMLアプリです。',
    howToUse: ['ボタンを押す', '結果と一言を読む', 'もう一度押して引き直す'],
    html,
    adaptation
  });
}
