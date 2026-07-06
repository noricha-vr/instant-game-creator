import { json, type RequestHandler } from '@sveltejs/kit';
import type { DirectionCard, GenerateRequest } from '$lib/types';
import { generateAppWithCerebras } from '$lib/server/cerebras';
import { createAppId, saveApp, slugify } from '$lib/server/storage';

function normalizeDirection(value: unknown): Pick<DirectionCard, 'label' | 'description'> | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const item = value as Record<string, unknown>;
  const label = typeof item.label === 'string' ? item.label.trim().slice(0, 40) : '';
  const description = typeof item.description === 'string' ? item.description.trim().slice(0, 120) : '';
  return label && description ? { label, description } : undefined;
}

function normalizeBody(body: unknown): GenerateRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('body must be an object');
  }
  const data = body as Record<string, unknown>;
  const idea = typeof data.idea === 'string' ? data.idea.trim().slice(0, 200) : '';
  const instruction = typeof data.instruction === 'string' ? data.instruction.trim().slice(0, 1000) : '';
  const direction = normalizeDirection(data.direction);

  if (!idea) {
    throw new Error('作りたいものを入力してください');
  }

  return { idea, instruction, direction };
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
        result = await generateAppWithCerebras(input, lastError || undefined);
        break;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'unknown generation error';
      }
    }

    if (!result) {
      return json(
        {
          ok: false,
          error: '生成に失敗しました。自動リトライ後も有効なアプリを作れませんでした。',
          detail: lastError
        },
        { status: 502 }
      );
    }

    const id = createAppId();
    const slugBase = slugify(`${input.idea}-${result.payload.title}`, id);
    const slug = `${slugBase}-${id.split('_').at(-1)}`;
    const now = new Date().toISOString();
    const app = await saveApp({
      id,
      slug,
      idea: input.idea,
      direction: input.direction ?? null,
      instruction: input.instruction,
      createdAt: now,
      updatedAt: now,
      attempts,
      engine: 'html-v1',
      sharePath: `/g/${slug}`,
      ...result.payload
    });

    return json({
      ok: true,
      app,
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
