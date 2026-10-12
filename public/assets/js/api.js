// Klien HTTP untuk /api. Semua kesalahan dibungkus ApiError berpesan Bahasa Indonesia.
export class ApiError extends Error {
  constructor(status, message, field) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.field = field;
  }
}

let unauthorizedHandler = () => {};
export const onUnauthorized = (fn) => { unauthorizedHandler = fn; };

async function request(method, path, body) {
  let res;
  try {
    res = await fetch('/api' + path, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'content-type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Tidak bisa terhubung ke server. Periksa koneksi internet lalu coba lagi.');
  }
  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { /* bukan JSON */ } }
  if (!res.ok) {
    const err = new ApiError(res.status, (data && data.error) || `Permintaan gagal (${res.status}).`, data && data.field);
    // 401 di luar halaman login berarti sesi berakhir
    if (res.status === 401 && !path.startsWith('/auth/')) unauthorizedHandler(err);
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b = {}) => request('POST', p, b),
  put: (p, b = {}) => request('PUT', p, b),
  patch: (p, b = {}) => request('PATCH', p, b),
  del: (p, b) => request('DELETE', p, b),
};
