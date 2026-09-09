import { json, type RequestHandler } from '@sveltejs/kit';
import { generateAppWithCerebras } from '$lib/server/cerebras';
import { createAppId, saveApp, slugify } from '$lib/server/storage';
import { processGenerateRequest } from '$lib/server/generateWorkflow';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const result = await processGenerateRequest(body, {
      generate: generateAppWithCerebras,
      save: saveApp,
      createId: createAppId,
      slugify,
      now: () => new Date()
    });
    return json(result.body, { status: result.status });
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
