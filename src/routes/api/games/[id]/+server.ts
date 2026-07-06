import { error, json, type RequestHandler } from '@sveltejs/kit';
import { getGame } from '$lib/server/storage';

export const GET: RequestHandler = async ({ params }) => {
  const game = await getGame(params.id ?? '');
  if (!game) {
    throw error(404, 'game not found');
  }
  return json({ game });
};
