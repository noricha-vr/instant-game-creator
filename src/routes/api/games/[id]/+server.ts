import { error, json, type RequestHandler } from '@sveltejs/kit';
import { getApp } from '$lib/server/storage';

export const GET: RequestHandler = async ({ params }) => {
  const app = await getApp(params.id ?? '');
  if (!app) {
    throw error(404, 'app not found');
  }
  return json({ app });
};
