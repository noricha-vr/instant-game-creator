import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readLegacyGame } from '../src/lib/server/legacyStorage';

const temporaryDirectories = [];

async function createStore(contents) {
  const directory = await mkdtemp(join(tmpdir(), 'instant-game-legacy-'));
  temporaryDirectories.push(directory);
  const path = join(directory, 'custom-games.json');
  await writeFile(path, JSON.stringify(contents, null, 2), 'utf-8');
  return path;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe('readLegacyGame', () => {
  test('finds an old share slug at a custom path without modifying the file', async () => {
    const path = await createStore({
      games: [
        {
          id: 'g_old',
          slug: 'old-share',
          title: '旧シミュレーション',
          summary: '保存済みデータ',
          keyword: '四角',
          elements: [],
          controls: ['クリック'],
          workerScript: 'self.onmessage = () => {};',
          svelteComponent: '<p>unused</p>',
          instruction: '',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          attempts: 1,
          engine: 'canvas-worker-sim-v1',
          sharePath: '/g/old-share'
        }
      ]
    });
    const before = await readFile(path, 'utf-8');

    const game = await readLegacyGame(path, 'old-share');

    expect(game?.id).toBe('g_old');
    expect(game?.workerScript).toContain('self.onmessage');
    expect(await readFile(path, 'utf-8')).toBe(before);
  });

  test('returns null when the legacy file does not exist', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'instant-game-missing-'));
    temporaryDirectories.push(directory);

    await expect(readLegacyGame(join(directory, 'missing.json'), 'missing')).resolves.toBeNull();
  });

  test('reports malformed stores and unsupported engines', async () => {
    const malformed = await createStore({ apps: [] });
    const unsupported = await createStore({ games: [{ engine: 'html-v1' }] });

    await expect(readLegacyGame(malformed, 'x')).rejects.toThrow('games array');
    await expect(readLegacyGame(unsupported, 'x')).rejects.toThrow('unsupported legacy game engine');
  });
});
