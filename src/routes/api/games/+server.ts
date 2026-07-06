import { json, type RequestHandler } from '@sveltejs/kit';
import { listGames } from '$lib/server/storage';

export const GET: RequestHandler = async ({ url }) => {
  const limit = Number(url.searchParams.get('limit') ?? '24');
  return json({
    games: await listGames(Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 60) : 24)
  });
};
