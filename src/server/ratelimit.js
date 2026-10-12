// Pembatas percobaan masuk: per nama pengguna dan per alamat IP, jendela 15 menit.
import { HttpError } from './http.js';

const MAX_PER_USER = 10;
const MAX_PER_IP = 30;

export const clientIp = (request) => request.headers.get('cf-connecting-ip') || 'unknown';

export async function ensureNotLimited(sql, username, ip) {
  const rows = await sql`
    select
      count(*) filter (where key = ${'u:' + username})::int as by_user,
      count(*) filter (where key = ${'ip:' + ip})::int as by_ip
    from kt_auth_attempts
    where at > now() - interval '15 minutes' and key in (${'u:' + username}, ${'ip:' + ip})`;
  const r = rows[0] || { by_user: 0, by_ip: 0 };
  if (r.by_user >= MAX_PER_USER || r.by_ip >= MAX_PER_IP) {
    throw new HttpError(429, 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.', { headers: { 'retry-after': '900' } });
  }
}

export async function recordFailure(sql, username, ip) {
  await sql.transaction([
    sql`insert into kt_auth_attempts (key) values (${'u:' + username}), (${'ip:' + ip})`,
    sql`delete from kt_auth_attempts where at < now() - interval '1 day'`,
  ]);
}

export async function clearFailures(sql, username) {
  await sql`delete from kt_auth_attempts where key = ${'u:' + username}`;
}
