import { error } from '@sveltejs/kit';
import { getApp } from '$lib/server/storage';

export const load = async ({ params }) => {
  const app = await getApp(params.id);
  if (!app) {
    throw error(404, 'app not found');
  }
  return { app };
};
