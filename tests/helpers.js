// Pembantu pengujian: "sql" palsu yang meniru bentuk driver Neon.
export function fakeSql(responder = () => []) {
  const calls = [];
  const sql = (strings, ...values) => {
    const text = strings.join('?').replace(/\s+/g, ' ').trim();
    calls.push({ text, values });
    return Promise.resolve(responder(text, values));
  };
  sql.transaction = (queries) => Promise.all(queries);
  sql.calls = calls;
  return sql;
}

export const ORIGIN = 'https://kantong.example';
export const USER = { id: '11111111-1111-4111-8111-111111111111', username: 'ali', name: 'Ali', tokenVersion: 0, role: 'user', plan: 'free', proUntil: null, isPro: false };
export const PRO = { ...USER, id: '55555555-5555-4555-8555-555555555555', username: 'pro', plan: 'pro', isPro: true };
export const ADMIN = { ...USER, id: '66666666-6666-4666-8666-666666666666', username: 'boss', role: 'admin', isPro: true };
export const CAT_ID = '22222222-2222-4222-8222-222222222222';
export const TX_ID = '33333333-3333-4333-8333-333333333333';

export function makeRequest(method, path, { body, headers = {}, cookie } = {}) {
  const h = new Headers(headers);
  if (body !== undefined) h.set('content-type', 'application/json');
  if (cookie) h.set('cookie', cookie);
  return new Request(ORIGIN + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
}

export function makeCtx(request, { sql = fakeSql(), env = {}, user = USER, params = {} } = {}) {
  return { request, env: { JWT_SECRET: 'rahasia-uji-yang-cukup-panjang', ...env }, params, data: { sql, user } };
}
