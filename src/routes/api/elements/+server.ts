import { json, type RequestHandler } from '@sveltejs/kit';
import { getRandomElements } from '$lib/server/elementPool';

export const GET: RequestHandler = ({ url }) => {
  const keyword = url.searchParams.get('keyword') ?? '';
  const count = Number(url.searchParams.get('count') ?? '12');
  return json({
    elements: getRandomElements(keyword, Number.isFinite(count) ? Math.min(Math.max(count, 6), 24) : 12)
  });
};
