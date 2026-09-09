import type { Handle } from '@sveltejs/kit';

const FRAME_POLICY = "frame-src 'none'";

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.append('Content-Security-Policy', FRAME_POLICY);
  return response;
};
