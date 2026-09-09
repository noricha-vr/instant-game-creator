import { readFile } from 'node:fs/promises';
import type { LegacyGameRecord } from '$lib/types';

type LegacyStore = {
  games: unknown[];
};

function isFileNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function parseStore(raw: string): LegacyStore {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || !('games' in parsed) || !Array.isArray(parsed.games)) {
    throw new Error('legacy games store must contain a games array');
  }
  return { games: parsed.games };
}

function parseGame(value: unknown): LegacyGameRecord {
  if (!value || typeof value !== 'object') {
    throw new Error('legacy game record must be an object');
  }
  const record = value as Record<string, unknown>;
  if (record.engine !== 'canvas-worker-sim-v1') {
    throw new Error(`unsupported legacy game engine: ${String(record.engine)}`);
  }
  for (const field of ['id', 'slug', 'title', 'summary', 'workerScript', 'sharePath']) {
    if (typeof record[field] !== 'string') {
      throw new Error(`legacy game record has invalid ${field}`);
    }
  }
  return value as LegacyGameRecord;
}

/** Read one legacy game without creating or modifying its store file. */
export async function readLegacyGame(filePath: string, idOrSlug: string): Promise<LegacyGameRecord | null> {
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch (error) {
    if (isFileNotFound(error)) return null;
    throw error;
  }

  const store = parseStore(raw);
  const games = store.games.map(parseGame);
  return games.find((game) => game.id === idOrSlug || game.slug === idOrSlug) ?? null;
}
