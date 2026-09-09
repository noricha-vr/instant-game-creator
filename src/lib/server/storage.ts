import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { env } from '$env/dynamic/private';
import type { AppRecord, GalleryApp, SharedRecord } from '$lib/types';
import { readLegacyGame } from './legacyStorage';

const filePath = resolve(env.LOCAL_APPS_FILE || '.local-data/apps.json');
const legacyFilePath = resolve(env.LOCAL_GAMES_FILE || '.local-data/games.json');

type AppStore = {
  apps: AppRecord[];
};

async function ensureStore(): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  try {
    await readFile(filePath, 'utf-8');
  } catch {
    await writeFile(filePath, JSON.stringify({ apps: [] }, null, 2), 'utf-8');
  }
}

async function readStore(): Promise<AppStore> {
  await ensureStore();
  const raw = await readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as Partial<AppStore>;
  return { apps: Array.isArray(parsed.apps) ? parsed.apps : [] };
}

async function writeStore(store: AppStore): Promise<void> {
  await ensureStore();
  await writeFile(filePath, JSON.stringify(store, null, 2), 'utf-8');
}

export async function saveApp(app: AppRecord): Promise<AppRecord> {
  const store = await readStore();
  const withoutSame = store.apps.filter((item) => item.id !== app.id);
  withoutSame.unshift(app);
  await writeStore({ apps: withoutSame.slice(0, 300) });
  return app;
}

export async function listApps(limit = 24): Promise<GalleryApp[]> {
  const store = await readStore();
  return store.apps.slice(0, limit).map((app) => ({
    id: app.id,
    slug: app.slug,
    title: app.title,
    summary: app.summary,
    idea: app.idea,
    createdAt: app.createdAt,
    sharePath: app.sharePath
  }));
}

export async function getApp(idOrSlug: string): Promise<AppRecord | null> {
  const store = await readStore();
  return store.apps.find((app) => app.id === idOrSlug || app.slug === idOrSlug) ?? null;
}

/** Find a new app first, then fall back to the read-only legacy game store. */
export async function getSharedRecord(idOrSlug: string): Promise<SharedRecord | null> {
  return (await getApp(idOrSlug)) ?? readLegacyGame(legacyFilePath, idOrSlug);
}

export function createAppId(): string {
  const random = crypto.randomUUID().split('-')[0];
  return `a_${Date.now().toString(36)}_${random}`;
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
