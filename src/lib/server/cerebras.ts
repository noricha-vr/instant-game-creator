import { env } from '$env/dynamic/private';
import type { DirectionCard, GenerateRequest, GeneratedAppPayload } from '$lib/types';
import { buildAppPrompt, buildDirectionsPrompt } from './prompt';
import { createMockApp, createMockDirections } from './mockApp';
import { normalizeDirections } from './directions';
import { extractJsonObject, validateGeneratedAppPayload } from './validateGeneratedHtml';

const CEREBRAS_ENDPOINT = 'https://api.cerebras.ai/v1/chat/completions';
const SYSTEM_PROMPT = 'Return valid JSON only. You build complete, delightful single-file HTML mini apps.';

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

type RequestOptions = {
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
};

function useMock(): boolean {
  return env.CEREBRAS_MOCK === '1' || env.CEREBRAS_MOCK === 'true' || !env.CEREBRAS_API_KEY;
}

async function callCerebras(prompt: string, options: RequestOptions): Promise<string> {
  const apiKey = env.CEREBRAS_API_KEY;
  if (!apiKey) {
    throw new Error('CEREBRAS_API_KEY is not configured');
  }

  const response = await fetch(CEREBRAS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: env.CEREBRAS_MODEL || 'zai-glm-4.7',
      temperature: options.temperature,
      reasoning_effort: env.CEREBRAS_REASONING_EFFORT || 'none',
      max_tokens: options.maxTokens,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    }),
    signal: AbortSignal.timeout(options.timeoutMs)
  });

  const data = (await response.json().catch(() => ({}))) as CerebrasResponse;
  if (!response.ok) {
    throw new Error(data.error?.message || `Cerebras API error: ${response.status}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Cerebrasから本文が返りませんでした');
  }
  return content;
}

export async function generateDirections(idea: string): Promise<{ directions: DirectionCard[]; usedMock: boolean }> {
  if (useMock()) {
    return { directions: createMockDirections(idea), usedMock: true };
  }

  const content = await callCerebras(buildDirectionsPrompt(idea), {
    temperature: 0.8,
    maxTokens: 800,
    timeoutMs: 10_000
  });

  return { directions: normalizeDirections(extractJsonObject(content)), usedMock: false };
}

export async function generateAppWithCerebras(
  request: GenerateRequest,
  retryReason?: string
): Promise<{ payload: GeneratedAppPayload; usedMock: boolean }> {
  if (useMock()) {
    return { payload: createMockApp(request), usedMock: true };
  }

  const content = await callCerebras(buildAppPrompt(request, retryReason), {
    temperature: retryReason ? 0.35 : 0.55,
    maxTokens: 20_000,
    timeoutMs: 60_000
  });

  return {
    payload: validateGeneratedAppPayload(extractJsonObject(content)),
    usedMock: false
  };
}
