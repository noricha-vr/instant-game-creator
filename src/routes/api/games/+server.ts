import { json, type RequestHandler } from '@sveltejs/kit';
import { listApps } from '$lib/server/storage';

export const GET: RequestHandler = async ({ url }) => {
  const limit = Number(url.searchParams.get('limit') ?? '24');
  return json({
    apps: await listApps(Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 60) : 24)
  });
};
