import { json } from '../../../src/server/http.js';
import { clearSessionCookie } from '../../../src/server/session.js';

export async function onRequestPost({ request }) {
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie(request) });
}
