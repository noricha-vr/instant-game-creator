import { env } from '$env/dynamic/private';
import type { GenerateRequest, GeneratedGamePayload } from '$lib/types';
import { buildGamePrompt } from './prompt';
import { createMockGame } from './mockGame';
import { extractJsonObject, validateGeneratedPayload } from './validateGenerated';

const CEREBRAS_ENDPOINT = 'https://api.cerebras.ai/v1/chat/completions';

type CerebrasChoice = {
  message?: {
    content?: string;
  };
};

type CerebrasResponse = {
  choices?: CerebrasChoice[];
  error?: {
    message?: string;
  };
};

export async function generateGameWithCerebras(
  request: GenerateRequest,
  retryReason?: string
): Promise<{ payload: GeneratedGamePayload; usedMock: boolean }> {
  const forceMock = env.CEREBRAS_MOCK === '1' || env.CEREBRAS_MOCK === 'true';
  const apiKey = env.CEREBRAS_API_KEY;

  if (forceMock || !apiKey) {
    return { payload: createMockGame(request), usedMock: true };
  }

  const model = env.CEREBRAS_MODEL || 'zai-glm-4.7';
  const prompt = buildGamePrompt(request, retryReason);
  const response = await fetch(CEREBRAS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: retryReason ? 0.35 : 0.55,
      // reasoning トークンも max_tokens とコンテキスト上限（GLM serverless は合計8192）を消費し、
      // 本文が途中で切れるため思考は無効化する（コード生成には不要）
      reasoning_effort: env.CEREBRAS_REASONING_EFFORT || 'none',
      max_tokens: 20000,
      messages: [
        {
          role: 'system',
          content: 'Return valid JSON only. You generate safe, mesmerizing browser simulations for children.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    }),
    signal: AbortSignal.timeout(25_000)
  });

  const data = (await response.json().catch(() => ({}))) as CerebrasResponse;
  if (!response.ok) {
    throw new Error(data.error?.message || `Cerebras API error: ${response.status}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Cerebrasから本文が返りませんでした');
  }

  return {
    payload: validateGeneratedPayload(extractJsonObject(content)),
    usedMock: false
  };
}
