import type { GeneratedGamePayload } from '$lib/types';

const forbiddenPatterns: Array<[RegExp, string]> = [
  [/\bimport\s+/i, 'import is not allowed'],
  [/\bimportScripts\s*\(/i, 'importScripts is not allowed'],
  [/\bfetch\s*\(/i, 'fetch is not allowed'],
  [/\bXMLHttpRequest\b/i, 'XMLHttpRequest is not allowed'],
  [/\bWebSocket\b/i, 'WebSocket is not allowed'],
  [/\beval\s*\(/i, 'eval is not allowed'],
  [/\bFunction\s*\(/i, 'Function constructor is not allowed'],
  [/\bdocument\b/i, 'document is not allowed in worker'],
  [/\bwindow\b/i, 'window is not allowed in worker'],
  [/\blocalStorage\b/i, 'localStorage is not allowed'],
  [/\bindexedDB\b/i, 'indexedDB is not allowed'],
  [/while\s*\(\s*true\s*\)/i, 'while(true) is not allowed'],
  [/for\s*\(\s*;\s*;\s*\)/i, 'for(;;) is not allowed']
];

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1]);
      } catch {
        // fall through
      }
    }
    const first = trimmed.indexOf('{');
    const last = trimmed.lastIndexOf('}');
    if (first >= 0 && last > first) {
      return JSON.parse(trimmed.slice(first, last + 1));
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

  return {
    title,
    summary,
    controls: candidate.controls.slice(0, 6) as string[],
    workerScript,
    svelteComponent
  };
}
