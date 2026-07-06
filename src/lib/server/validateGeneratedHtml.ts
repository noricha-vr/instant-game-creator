import { Script } from 'node:vm';
import type { GeneratedAppPayload } from '$lib/types';

const CSP_CONTENT =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'";

const forbiddenPatterns: Array<[RegExp, string]> = [
  [/\bfetch\s*\(/i, 'fetch is not allowed'],
  [/\bXMLHttpRequest\b/i, 'XMLHttpRequest is not allowed'],
  [/\bWebSocket\b/i, 'WebSocket is not allowed'],
  [/\bEventSource\b/i, 'EventSource is not allowed'],
  [/\bsendBeacon\b/i, 'sendBeacon is not allowed'],
  [/\bimportScripts\s*\(/i, 'importScripts is not allowed'],
  [/\bimport\s*\(/i, 'dynamic import is not allowed'],
  [/<script\b[^>]*\bsrc\s*=/i, 'external script is not allowed'],
  [/<link\b/i, 'link tag is not allowed'],
  [/<iframe\b/i, 'iframe tag is not allowed'],
  [/<embed\b/i, 'embed tag is not allowed'],
  [/<object\b/i, 'object tag is not allowed'],
  [/\bwindow\.top\b/i, 'window.top is not allowed'],
  [/\bwindow\.parent\b/i, 'window.parent is not allowed'],
  [/\bdocument\.cookie\b/i, 'document.cookie is not allowed'],
  [/\blocalStorage\b/i, 'localStorage is not allowed'],
  [/\bindexedDB\b/i, 'indexedDB is not allowed'],
  [/\balert\s*\(/i, 'alert is not allowed'],
  [/\bconfirm\s*\(/i, 'confirm is not allowed'],
  [/\bprompt\s*\(/i, 'prompt is not allowed'],
  [/while\s*\(\s*true\s*\)/i, 'while(true) is not allowed'],
  [/for\s*\(\s*;\s*;\s*\)/i, 'for(;;) is not allowed']
];

// LLM（特に GLM 系）は JSON 文字列の中に生の改行・タブを混ぜて返すことがあり、
// そのままでは JSON.parse が落ちるためエスケープして修復する
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

export function injectCsp(html: string): string {
  const withoutExistingCsp = html.replace(
    /<meta\b[^>]*http-equiv\s*=\s*["']?content-security-policy["']?[^>]*>/gi,
    ''
  );
  const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${CSP_CONTENT}">`;
  if (/<head\b[^>]*>/i.test(withoutExistingCsp)) {
    return withoutExistingCsp.replace(/<head\b[^>]*>/i, (head) => `${head}\n${cspMeta}`);
  }
  return `${cspMeta}\n${withoutExistingCsp}`;
}

export function validateGeneratedAppPayload(value: unknown): GeneratedAppPayload {
  if (!value || typeof value !== 'object') {
    throw new Error('生成結果がオブジェクトではありません');
  }

  const candidate = value as Record<string, unknown>;
  const title = asString(candidate.title, 'title', 80);
  const summary = asString(candidate.summary, 'summary', 300);
  const html = asString(candidate.html, 'html', 60_000);

  if (!Array.isArray(candidate.howToUse) || candidate.howToUse.some((item) => typeof item !== 'string')) {
    throw new Error('howToUse must be a string array');
  }

  validateHtml(html);

  return {
    title,
    summary,
    howToUse: (candidate.howToUse as string[]).slice(0, 4),
    html: injectCsp(html)
  };
}

function validateHtml(html: string): void {
  const htmlOpenCount = html.match(/<html\b/gi)?.length ?? 0;
  if (htmlOpenCount !== 1) {
    throw new Error('html must contain exactly one <html> tag');
  }
  if (!/<\/html>\s*$/i.test(html.trim())) {
    throw new Error('html must end with </html>');
  }
  if (html.length < 500 || html.length > 60_000) {
    throw new Error('html length must be between 500 and 60000 characters');
  }

  for (const [pattern, reason] of forbiddenPatterns) {
    if (pattern.test(html)) {
      throw new Error(reason);
    }
  }

  for (const script of extractScriptBlocks(html)) {
    try {
      new Script(script);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown syntax error';
      throw new Error(`script has a syntax error: ${detail}`);
    }
  }
}

function extractScriptBlocks(html: string): string[] {
  return Array.from(html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi), (match) => match[1] ?? '');
}
