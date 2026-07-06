import { createContext, runInContext, Script } from 'node:vm';
import type { GeneratedGamePayload } from '$lib/types';

const forbiddenPatterns: Array<[RegExp, string]> = [
  [/\bimport\s+/i, 'import is not allowed'],
  [/\bimportScripts\s*\(/i, 'importScripts is not allowed'],
  [/\bfetch\s*\(/i, 'fetch is not allowed'],
  [/\bXMLHttpRequest\b/i, 'XMLHttpRequest is not allowed'],
  [/\bWebSocket\b/i, 'WebSocket is not allowed'],
  [/\beval\s*\(/i, 'eval is not allowed'],
  // /i を付けると無名関数 `function(` まで誤検知するため、コンストラクタの大文字 F のみ照合する
  [/\bFunction\s*\(/, 'Function constructor is not allowed'],
  [/\bdocument\b/i, 'document is not allowed in worker'],
  [/\bwindow\b/i, 'window is not allowed in worker'],
  [/\blocalStorage\b/i, 'localStorage is not allowed'],
  [/\bindexedDB\b/i, 'indexedDB is not allowed'],
  [/while\s*\(\s*true\s*\)/i, 'while(true) is not allowed'],
  [/for\s*\(\s*;\s*;\s*\)/i, 'for(;;) is not allowed']
];

// LLM（特に GLM 系）は JSON 文字列の中に生の改行・タブを混ぜて返すことがあり、
// そのままでは JSON.parse が Unterminated string で落ちるためエスケープして修復する
function escapeControlCharsInStrings(json: string): string {
  let result = '';
  let inString = false;
  let escaped = false;
  for (const ch of json) {
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      } else if (ch === '\n') {
        result += '\\n';
        continue;
      } else if (ch === '\r') {
        result += '\\r';
        continue;
      } else if (ch === '\t') {
        result += '\\t';
        continue;
      }
    } else if (ch === '"') {
      inString = true;
    }
    result += ch;
  }
  return result;
}

function parseJsonLenient(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(escapeControlCharsInStrings(text));
  }
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return parseJsonLenient(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) {
      try {
        return parseJsonLenient(fenced[1]);
      } catch {
        // fall through
      }
    }
    const first = trimmed.indexOf('{');
    const last = trimmed.lastIndexOf('}');
    if (first >= 0 && last > first) {
      return parseJsonLenient(trimmed.slice(first, last + 1));
    }
    throw new Error('JSONオブジェクトを抽出できませんでした');
  }
}

function asString(value: unknown, name: string, maxLength: number): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  if (value.length > maxLength) {
    throw new Error(`${name} is too long`);
  }
  return value;
}

export function validateGeneratedPayload(value: unknown): GeneratedGamePayload {
  if (!value || typeof value !== 'object') {
    throw new Error('生成結果がオブジェクトではありません');
  }

  const candidate = value as Record<string, unknown>;
  const title = asString(candidate.title, 'title', 80);
  const summary = asString(candidate.summary, 'summary', 300);
  const workerScript = asString(candidate.workerScript, 'workerScript', 30_000);
  const svelteComponent = asString(candidate.svelteComponent, 'svelteComponent', 40_000);

  if (!Array.isArray(candidate.controls) || candidate.controls.some((item) => typeof item !== 'string')) {
    throw new Error('controls must be a string array');
  }

  if (!/self\.onmessage\s*=/.test(workerScript) && !/addEventListener\s*\(\s*['"]message['"]/.test(workerScript)) {
    throw new Error('workerScript must define a message handler');
  }

  for (const [pattern, reason] of forbiddenPatterns) {
    if (pattern.test(workerScript)) {
      throw new Error(reason);
    }
  }

  // LLM が閉じ括弧を落とした不完全コードを保存前に弾く（コンパイルのみで実行はしない）
  try {
    new Script(workerScript);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown syntax error';
    throw new Error(`workerScript has a syntax error: ${detail}`);
  }

  // 構文が通っても「tickでクラッシュ」「timeLeftがNaN」「フレームが変わらない」等の実行時不良は
  // 遊べないゲームになるため、保存前に短時間シミュレーションで振り落とす
  simulateWorkerScript(workerScript);

  return {
    title,
    summary,
    controls: candidate.controls.slice(0, 6) as string[],
    workerScript,
    svelteComponent
  };
}

const SIMULATION_WIDTH = 400;
const SIMULATION_HEIGHT = 640;
const SIMULATION_DURATION_SEC = 60;
const SIMULATION_TICK_DT_MS = 16.7;
const SIMULATION_TICK_COUNT = 180;
// vm の timeout は同期実行の上限。生成コード側の無限ループでサーバーが固まらないよう控えめに取る
const SIMULATION_INIT_TIMEOUT_MS = 250;
const SIMULATION_DISPATCH_TIMEOUT_MS = 100;

// 注意: node:vm はセキュリティ境界ではない（constructor 経由の escape が可能）。
// ローカル試作前提の品質フィルタであり、本番公開時は isolated-vm や別プロセス実行に置き換えること。
export function simulateWorkerScript(workerScript: string): void {
  const frames: unknown[] = [];
  // vm 内から自然に呼び出せる self を組み立てる。addEventListener 経由の登録も許容する
  const sandbox: Record<string, unknown> = {
    Math,
    JSON,
    // 生成コードのデバッグ log がサーバーログに漏れないよう捨てる
    console: { log: () => {}, warn: () => {}, error: () => {}, info: () => {}, debug: () => {} },
    performance: { now: () => Date.now() }
  };
  const messageHandlers: Array<(event: { data: unknown }) => void> = [];
  const self = {
    onmessage: null as null | ((event: { data: unknown }) => void),
    postMessage: (frame: unknown) => {
      frames.push(frame);
    },
    addEventListener: (type: string, handler: (event: { data: unknown }) => void) => {
      if (type === 'message' && typeof handler === 'function') {
        messageHandlers.push(handler);
      }
    },
    removeEventListener: () => {}
  };
  sandbox.self = self;
  sandbox.globalThis = sandbox;

  const context = createContext(sandbox);

  try {
    runInContext(workerScript, context, { timeout: SIMULATION_INIT_TIMEOUT_MS });
  } catch (error) {
    throw new Error(`workerScriptが実行時エラー: ${describeError(error)}`);
  }

  const handler = typeof self.onmessage === 'function' ? self.onmessage : messageHandlers[0];
  if (typeof handler !== 'function') {
    throw new Error('workerScriptがmessageハンドラを登録していません');
  }

  // ハンドラ呼び出しにも timeout を効かせるため、sandbox 内の関数として dispatch を作り runInContext から起動する
  sandbox.__dispatch = (message: unknown) => {
    const fn = typeof self.onmessage === 'function' ? self.onmessage : messageHandlers[0];
    if (typeof fn !== 'function') {
      throw new Error('handler-missing');
    }
    fn({ data: message });
  };

  const dispatch = (message: unknown, label: string) => {
    sandbox.__message = message;
    try {
      runInContext('__dispatch(__message);', context, { timeout: SIMULATION_DISPATCH_TIMEOUT_MS });
    } catch (error) {
      throw new Error(`workerScriptが実行時エラー: ${label}: ${describeError(error)}`);
    }
  };

  dispatch(
    { type: 'start', width: SIMULATION_WIDTH, height: SIMULATION_HEIGHT, durationSec: SIMULATION_DURATION_SEC },
    'start'
  );

  const tickMessage = {
    type: 'tick',
    dt: SIMULATION_TICK_DT_MS,
    input: { keys: [], pointer: { x: SIMULATION_WIDTH / 2, y: SIMULATION_HEIGHT / 2, down: false } },
    width: SIMULATION_WIDTH,
    height: SIMULATION_HEIGHT,
    durationSec: SIMULATION_DURATION_SEC
  };

  const framesBeforeTicks = frames.length;
  for (let i = 0; i < SIMULATION_TICK_COUNT; i += 1) {
    dispatch(tickMessage, `tick#${i + 1}`);
  }

  const tickFrames = frames.slice(framesBeforeTicks);
  if (tickFrames.length === 0) {
    throw new Error('workerScriptが実行時エラー: tickに対してframeが返りません');
  }

  const lastFrame = tickFrames[tickFrames.length - 1] as { timeLeft?: unknown } | null;
  const timeLeft = lastFrame && typeof lastFrame === 'object' ? lastFrame.timeLeft : undefined;
  if (typeof timeLeft !== 'number' || Number.isNaN(timeLeft)) {
    throw new Error('workerScriptが実行時エラー: timeLeftが数値ではありません');
  }
  // timeLeft をミリ秒で返すコードは HUD 表示が壊れるため秒単位を強制する
  if (timeLeft > SIMULATION_DURATION_SEC) {
    throw new Error('workerScriptが実行時エラー: timeLeftが秒単位ではありません（ミリ秒で返している疑い）');
  }

  // 「3秒経っても画面が変化しない」は (a) 開始から一切動いていない、(b) 途中で止まった、の両方を含める。
  // dt を秒扱いする実装バグで durationSec を早々に消化し tick 数回でフリーズするケースを弾くため、
  // 中間フレーム(全体の1/3地点)と最終フレームの一致もフリーズ扱いにする
  const firstJson = safeStringify(tickFrames[0]);
  const lastJson = safeStringify(tickFrames[tickFrames.length - 1]);
  const midJson = safeStringify(tickFrames[Math.floor(tickFrames.length / 3)]);
  if (firstJson !== null && lastJson !== null && firstJson === lastJson) {
    throw new Error('workerScriptが実行時エラー: フレームが変化しません');
  }
  if (midJson !== null && lastJson !== null && midJson === lastJson) {
    throw new Error('workerScriptが実行時エラー: フレームが変化しません');
  }
}

// vm コンテキスト側で throw されたエラーは instanceof Error にマッチしないので message を直接読む
function describeError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return typeof error === 'string' && error.length > 0 ? error : 'unknown error';
}

function safeStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}
