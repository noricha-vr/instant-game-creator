import { json, type RequestHandler } from '@sveltejs/kit';
import { generateDirections } from '$lib/server/cerebras';

function normalizeIdea(body: unknown): string {
  if (!body || typeof body !== 'object') {
    throw new Error('body must be an object');
  }
  const data = body as Record<string, unknown>;
  const idea = typeof data.idea === 'string' ? data.idea.trim().slice(0, 200) : '';
  if (!idea) {
    throw new Error('作りたいものを入力してください');
  }
  return idea;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const idea = normalizeIdea(await request.json());
    const result = await generateDirections(idea);
    return json({
      ok: true,
      directions: result.directions,
      usedMock: result.usedMock
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
