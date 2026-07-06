import { json, type RequestHandler } from '@sveltejs/kit';
import type { ElementKind, GenerateRequest, SelectedElement } from '$lib/types';
import { generateGameWithCerebras } from '$lib/server/cerebras';
import { createGameId, saveGame, slugify } from '$lib/server/storage';

const requiredKinds: ElementKind[] = ['subject', 'dynamics', 'touch'];

function isElementKind(value: unknown): value is ElementKind {
  return value === 'subject' || value === 'dynamics' || value === 'touch';
}

function normalizeElement(value: unknown): SelectedElement | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const label = typeof item.label === 'string' ? item.label.trim().slice(0, 40) : '';
  if (!label || !isElementKind(item.kind)) return null;
  return { kind: item.kind, label };
}

function normalizeBody(body: unknown): GenerateRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('body must be an object');
  }
  const data = body as Record<string, unknown>;
  const keyword = typeof data.keyword === 'string' ? data.keyword.trim().slice(0, 80) : '';
  const instruction = typeof data.instruction === 'string' ? data.instruction.trim().slice(0, 1000) : '';
  const elements = Array.isArray(data.elements)
    ? data.elements.map(normalizeElement).filter((item): item is SelectedElement => item !== null)
    : [];

  const byKind = new Map<ElementKind, SelectedElement>();
  for (const element of elements) {
    if (byKind.has(element.kind)) {
      throw new Error('主役・うごき・さわるとの各カテゴリから1つずつ選んでください');
    }
    byKind.set(element.kind, element);
  }

  if (requiredKinds.some((kind) => !byKind.has(kind))) {
    throw new Error('主役・うごき・さわるとの各カテゴリから1つずつ選んでください');
  }

  return { keyword, instruction, elements: requiredKinds.map((kind) => byKind.get(kind) as SelectedElement) };
}

export const POST: RequestHandler = async ({ request }) => {
  const startedAt = Date.now();
  try {
    const body = await request.json();
    const input = normalizeBody(body);

    let attempts = 0;
    let lastError = '';
    let result;

    for (let i = 0; i < 2; i += 1) {
      attempts += 1;
      try {
        result = await generateGameWithCerebras(input, lastError || undefined);
        break;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'unknown generation error';
      }
    }

    if (!result) {
      return json(
        {
          ok: false,
          error: '生成に失敗しました。自動リトライ後も有効なシミュレーションを作れませんでした。',
          detail: lastError
        },
        { status: 502 }
      );
    }

    const id = createGameId();
    const slugBase = slugify(`${input.keyword}-${result.payload.title}`, id);
    const slug = `${slugBase}-${id.split('_').at(-1)}`;
    const now = new Date().toISOString();
    const game = await saveGame({
      id,
      slug,
      keyword: input.keyword,
      elements: input.elements,
      instruction: input.instruction,
      createdAt: now,
      updatedAt: now,
      attempts,
      engine: 'canvas-worker-sim-v1',
      sharePath: `/g/${slug}`,
      ...result.payload
    });

    return json({
      ok: true,
      game,
      meta: {
        elapsedMs: Date.now() - startedAt,
        attempts,
        usedMock: result.usedMock
      }
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'unknown error'
      },
      { status: 400 }
    );
  }
};
