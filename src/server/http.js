// Utilitas HTTP bersama untuk seluruh endpoint.

export class HttpError extends Error {
  constructor(status, message, { field, headers } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.field = field;
    this.headers = headers;
  }
}

const BASE_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...BASE_HEADERS, ...headers } });
}

export function errorResponse(err) {
  if (err instanceof HttpError) {
    const body = { error: err.message };
    if (err.field) body.field = err.field;
    return json(body, err.status, err.headers);
  }
  console.error('Kesalahan tak terduga:', err);
  return json({ error: 'Terjadi kesalahan pada server.' }, 500);
}

export async function readJson(request, maxBytes = 1_000_000) {
  const type = request.headers.get('content-type') || '';
  if (!type.toLowerCase().includes('application/json')) {
    throw new HttpError(415, 'Permintaan harus berformat JSON.');
  }
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, 'Data yang dikirim terlalu besar.');
  let value;
  try { value = JSON.parse(text); } catch { throw new HttpError(400, 'Isi permintaan bukan JSON yang valid.'); }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'Isi permintaan harus berupa objek JSON.');
  }
  return value;
}

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const key = part.slice(0, i).trim();
    const raw = part.slice(i + 1).trim();
    if (!key) continue;
    try { out[key] = decodeURIComponent(raw); } catch { out[key] = raw; }
  }
  return out;
}

export function serializeCookie(name, value, { maxAge, secure = true, path = '/' } = {}) {
  let s = `${name}=${encodeURIComponent(value)}; Path=${path}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
  if (secure) s += '; Secure';
  return s;
}

export const isHttps = (request) => new URL(request.url).protocol === 'https:';
