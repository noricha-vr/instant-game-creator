import { error } from '@sveltejs/kit';
import { getGame } from '$lib/server/storage';

export const load = async ({ params }) => {
  const game = await getGame(params.id);
  if (!game) {
    throw error(404, 'simulation not found');
  }
  return { game };
};
