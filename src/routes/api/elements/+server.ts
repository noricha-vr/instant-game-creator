import { json, type RequestHandler } from '@sveltejs/kit';
import { getElementGroups } from '$lib/server/elementPool';

export const GET: RequestHandler = ({ url }) => {
  const keyword = url.searchParams.get('keyword') ?? '';
  const perKind = Number(url.searchParams.get('perKind') ?? '8');
  return json({
    groups: getElementGroups(keyword, Number.isFinite(perKind) ? Math.min(Math.max(perKind, 6), 8) : 8)
  });
};
