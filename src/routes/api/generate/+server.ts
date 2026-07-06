import { json, type RequestHandler } from '@sveltejs/kit';
import type { GenerateRequest } from '$lib/types';
import { generateGameWithCerebras } from '$lib/server/cerebras';
import { createGameId, saveGame, slugify } from '$lib/server/storage';

function normalizeBody(body: unknown): GenerateRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('body must be an object');
  }
  const data = body as Record<string, unknown>;
  const keyword = typeof data.keyword === 'string' ? data.keyword.trim().slice(0, 80) : '';
  const instruction = typeof data.instruction === 'string' ? data.instruction.trim().slice(0, 1000) : '';
  const elements = Array.isArray(data.elements)
    ? data.elements.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean).slice(0, 3)
    : [];

  if (elements.length !== 3) {
    throw new Error('3つの要素を選んでください');
  }

  return { keyword, instruction, elements };
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
          error: '生成に失敗しました。自動リトライ後も有効なゲームを作れませんでした。',
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
      engine: 'canvas-worker-v1',
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
