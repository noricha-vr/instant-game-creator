import { error } from '@sveltejs/kit';
import { getSharedRecord } from '$lib/server/storage';
import { injectCsp } from '$lib/server/validateGeneratedHtml';

export const load = async ({ params }) => {
  const record = await getSharedRecord(params.id);
  if (!record) {
    throw error(404, 'app not found');
  }
  if (record.engine === 'html-v1') {
    return { app: { ...record, html: injectCsp(record.html) } };
  }
  return { app: record };
};
