import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { env } from '$env/dynamic/private';
import type { GalleryGame, GameRecord } from '$lib/types';

const filePath = resolve(env.LOCAL_GAMES_FILE || '.local-data/games.json');

type GameStore = {
  games: GameRecord[];
};

async function ensureStore(): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  try {
    await readFile(filePath, 'utf-8');
  } catch {
    await writeFile(filePath, JSON.stringify({ games: [] }, null, 2), 'utf-8');
  }
}

async function readStore(): Promise<GameStore> {
  await ensureStore();
  const raw = await readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as Partial<GameStore>;
  return { games: Array.isArray(parsed.games) ? parsed.games : [] };
}

async function writeStore(store: GameStore): Promise<void> {
  await ensureStore();
  await writeFile(filePath, JSON.stringify(store, null, 2), 'utf-8');
}

export async function saveGame(game: GameRecord): Promise<GameRecord> {
  const store = await readStore();
  const withoutSame = store.games.filter((item) => item.id !== game.id);
  withoutSame.unshift(game);
  await writeStore({ games: withoutSame.slice(0, 300) });
  return game;
}

export async function listGames(limit = 24): Promise<GalleryGame[]> {
  const store = await readStore();
  return store.games.slice(0, limit).map((game) => ({
    id: game.id,
    slug: game.slug,
    title: game.title,
    summary: game.summary,
    keyword: game.keyword,
    elements: game.elements,
    createdAt: game.createdAt,
    sharePath: game.sharePath
  }));
}

export async function getGame(idOrSlug: string): Promise<GameRecord | null> {
  const store = await readStore();
  return store.games.find((game) => game.id === idOrSlug || game.slug === idOrSlug) ?? null;
}

export function createGameId(): string {
  const random = crypto.randomUUID().split('-')[0];
  return `g_${Date.now().toString(36)}_${random}`;
}

export function slugify(input: string, fallback: string): string {
  const ascii = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return ascii || fallback;
}
