// Sesi login: token JWT bertanda tangan di cookie HttpOnly.
import { HttpError, parseCookies, serializeCookie, isHttps } from './http.js';
import { signToken, verifyToken } from './auth.js';
import { isUuid } from './validate.js';
import { getAuthUser } from './repo/users.js';
import { isProUser } from './plan.js';

export const COOKIE_NAME = 'kantong_session';
export const SESSION_DAYS = 30;

export function getSecret(env) {
  const s = env && env.JWT_SECRET;
  if (!s || s.length < 16) throw new HttpError(500, 'JWT_SECRET belum diatur (minimal 16 karakter) di Cloudflare Pages.');
  return s;
}

export async function issueSessionCookie(env, request, user) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  const token = await signToken({ sub: user.id, tv: user.tokenVersion ?? 0, exp }, getSecret(env));
  return serializeCookie(COOKIE_NAME, token, { maxAge: SESSION_DAYS * 86400, secure: isHttps(request) });
}

export function clearSessionCookie(request) {
  return serializeCookie(COOKIE_NAME, '', { maxAge: 0, secure: isHttps(request) });
}

export async function authenticate({ request, env, data }) {
  const token = parseCookies(request.headers.get('cookie'))[COOKIE_NAME];
  if (!token) throw new HttpError(401, 'Silakan masuk terlebih dahulu.');
  const payload = await verifyToken(token, getSecret(env));
  if (!payload || !isUuid(payload.sub)) throw new HttpError(401, 'Sesi tidak valid atau sudah berakhir.');
  const user = await getAuthUser(data.sql, payload.sub);
  if (!user || user.tokenVersion !== payload.tv) throw new HttpError(401, 'Sesi sudah berakhir. Silakan masuk lagi.');
  return { ...user, isPro: isProUser(user) };
}
