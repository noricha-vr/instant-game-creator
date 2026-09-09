import { describe, expect, test } from 'bun:test';
import { processGenerateRequest } from '../src/lib/server/generateWorkflow';

const generatedPayload = {
  title: '生成結果',
  summary: '説明',
  howToUse: ['押す'],
  html: '<!doctype html><html><body>ok</body></html>',
  adaptation: null
};

function dependencies(overrides = {}) {
  const dates = [new Date('2026-09-09T00:00:00.000Z'), new Date('2026-09-09T00:00:01.500Z')];
  return {
    generate: async () => ({ payload: generatedPayload, usedMock: true }),
    save: async (app) => app,
    createId: () => 'a_fixed_suffix',
    slugify: () => 'fixed',
    now: () => dates.shift() || new Date('2026-09-09T00:00:01.500Z'),
    ...overrides
  };
}

describe('processGenerateRequest', () => {
  test('retries once, passes the failure reason, and saves the successful app', async () => {
    const retryReasons = [];
    const saved = [];
    let calls = 0;
    const result = await processGenerateRequest(
      { idea: '  入力  ', instruction: '条件', direction: { label: '案', description: '説明' } },
      dependencies({
        generate: async (_input, retryReason) => {
          calls += 1;
          retryReasons.push(retryReason);
          if (calls === 1) throw new Error('first failure');
          return { payload: generatedPayload, usedMock: false };
        },
        save: async (app) => {
          saved.push(app);
          return app;
        }
      })
    );

    expect(result.status).toBe(200);
    expect(retryReasons).toEqual([undefined, 'first failure']);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ idea: '入力', attempts: 2, engine: 'html-v1', sharePath: '/g/fixed-suffix' });
    expect(result.body.meta).toEqual({ elapsedMs: 1500, attempts: 2, usedMock: false });
  });

  test('returns 502 after two failures without saving', async () => {
    let saves = 0;
    const result = await processGenerateRequest(
      { idea: '入力' },
      dependencies({
        generate: async () => {
          throw new Error('still invalid');
        },
        save: async (app) => {
          saves += 1;
          return app;
        }
      })
    );

    expect(result.status).toBe(502);
    expect(result.body).toMatchObject({ ok: false, detail: 'still invalid' });
    expect(saves).toBe(0);
  });

  test('rejects an empty API body before generation', async () => {
    let generations = 0;
    const result = await processGenerateRequest({}, dependencies({
      generate: async () => {
        generations += 1;
        return { payload: generatedPayload, usedMock: true };
      }
    }));

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({ ok: false });
    expect(generations).toBe(0);
  });
});
