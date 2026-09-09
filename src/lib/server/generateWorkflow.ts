import type { AppRecord, DirectionCard, GenerateRequest, GeneratedAppPayload } from '$lib/types';

type GeneratedResult = { payload: GeneratedAppPayload; usedMock: boolean };
type Dependencies = {
  generate: (request: GenerateRequest, retryReason?: string) => Promise<GeneratedResult>;
  save: (app: AppRecord) => Promise<AppRecord>;
  createId: () => string;
  slugify: (input: string, fallback: string) => string;
  now: () => Date;
};

function normalizeDirection(value: unknown): Pick<DirectionCard, 'label' | 'description'> | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const item = value as Record<string, unknown>;
  const label = typeof item.label === 'string' ? item.label.trim().slice(0, 40) : '';
  const description = typeof item.description === 'string' ? item.description.trim().slice(0, 120) : '';
  return label && description ? { label, description } : undefined;
}

function normalizeBody(body: unknown): GenerateRequest {
  if (!body || typeof body !== 'object') throw new Error('body must be an object');
  const data = body as Record<string, unknown>;
  const idea = typeof data.idea === 'string' ? data.idea.trim().slice(0, 200) : '';
  const instruction = typeof data.instruction === 'string' ? data.instruction.trim().slice(0, 1000) : '';
  if (!idea) throw new Error('作りたいものを入力してください');
  return { idea, instruction, direction: normalizeDirection(data.direction) };
}

async function generateTwice(input: GenerateRequest, generate: Dependencies['generate']) {
  let lastError = '';
  for (let attempts = 1; attempts <= 2; attempts += 1) {
    try {
      return { result: await generate(input, lastError || undefined), attempts, lastError };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'unknown generation error';
    }
  }
  return { result: null, attempts: 2, lastError };
}

function generationFailure(detail: string) {
  return {
    status: 502,
    body: {
      ok: false,
      error: '生成に失敗しました。自動リトライ後も有効なアプリを作れませんでした。',
      detail
    }
  };
}

async function saveGenerated(
  input: GenerateRequest,
  result: GeneratedResult,
  attempts: number,
  startedAt: Date,
  dependencies: Dependencies
) {
  const id = dependencies.createId();
  const slugBase = dependencies.slugify(`${input.idea}-${result.payload.title}`, id);
  const slug = `${slugBase}-${id.split('_').at(-1)}`;
  const now = dependencies.now();
  const app = await dependencies.save({
    id,
    slug,
    idea: input.idea,
    direction: input.direction ?? null,
    instruction: input.instruction,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    attempts,
    engine: 'html-v1',
    sharePath: `/g/${slug}`,
    ...result.payload
  });
  return {
    status: 200,
    body: { ok: true, app, meta: { elapsedMs: now.getTime() - startedAt.getTime(), attempts, usedMock: result.usedMock } }
  };
}

/** Process one generate API body with bounded retry and persistence. */
export async function processGenerateRequest(body: unknown, dependencies: Dependencies) {
  const startedAt = dependencies.now();
  try {
    const input = normalizeBody(body);
    const attempt = await generateTwice(input, dependencies.generate);
    if (!attempt.result) return generationFailure(attempt.lastError);
    return saveGenerated(input, attempt.result, attempt.attempts, startedAt, dependencies);
  } catch (error) {
    return {
      status: 400,
      body: { ok: false, error: error instanceof Error ? error.message : 'unknown error' }
    };
  }
}
