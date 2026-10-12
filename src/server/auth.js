// Kriptografi: hash kata sandi (PBKDF2) dan token sesi (JWT HS256) via Web Crypto.
// Cloudflare Workers membatasi PBKDF2 maksimal 100.000 iterasi.

const enc = new TextEncoder();
export const DEFAULT_ITERATIONS = 100_000;

const toB64u = (bytes) => {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64u = (s) => {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password, iterations = DEFAULT_ITERATIONS) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, iterations);
  return `pbkdf2$sha256$${iterations}$${toB64u(salt)}$${toB64u(hash)}`;
}

export async function verifyPassword(password, stored) {
  try {
    const [scheme, algo, iter, salt, hash] = String(stored).split('$');
    if (scheme !== 'pbkdf2' || algo !== 'sha256') return false;
    const iterations = Number(iter);
    if (!Number.isInteger(iterations) || iterations < 1 || iterations > 1_000_000) return false;
    const actual = await derive(password, fromB64u(salt), iterations);
    return safeEqual(actual, fromB64u(hash));
  } catch {
    return false;
  }
}

// Hash palsu untuk menyamakan waktu respons saat pengguna tidak ditemukan.
export const DUMMY_HASH = 'pbkdf2$sha256$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signToken(payload, secret) {
  const head = toB64u(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = toB64u(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(`${head}.${body}`));
  return `${head}.${body}.${toB64u(new Uint8Array(sig))}`;
}

export async function verifyToken(token, secret) {
  try {
    const parts = String(token).split('.');
    if (parts.length !== 3) return null;
    const [head, body, sig] = parts;
    const header = JSON.parse(new TextDecoder().decode(fromB64u(head)));
    if (header.alg !== 'HS256') return null;
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64u(sig), enc.encode(`${head}.${body}`));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64u(body)));
    if (!payload || typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
