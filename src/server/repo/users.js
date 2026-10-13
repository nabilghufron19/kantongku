import { DEFAULT_CATEGORIES } from '../defaults.js';

export async function countUsers(sql) {
  const rows = await sql`select count(*)::int as n from kt_users`;
  return rows[0].n;
}

// Pendaftaran terbuka untuk umum. Setel ALLOW_REGISTER=false untuk menutupnya
// (akun pertama tetap bisa dibuat agar selalu ada admin).
export async function isRegistrationOpen(sql, env) {
  if (!env || env.ALLOW_REGISTER !== 'false') return true;
  return (await countUsers(sql)) === 0;
}

export async function findLoginUser(sql, username) {
  const rows = await sql`
    select id, username, display_name as name, password_hash as "passwordHash", token_version as "tokenVersion",
           role, plan, pro_until as "proUntil"
    from kt_users where username = ${username}`;
  return rows[0] || null;
}

export async function getAuthUser(sql, id) {
  const rows = await sql`
    select id, username, display_name as name, token_version as "tokenVersion",
           role, plan, pro_until as "proUntil"
    from kt_users where id = ${id}::uuid`;
  return rows[0] || null;
}

export async function getPasswordHash(sql, id) {
  const rows = await sql`select password_hash as "passwordHash" from kt_users where id = ${id}::uuid`;
  return rows[0] ? rows[0].passwordHash : null;
}

// Membuat akun beserta kategori bawaannya dalam satu transaksi database.
export async function createUser(sql, { id, username, name, passwordHash, role = 'user' }) {
  const names = DEFAULT_CATEGORIES.map((c) => c.name);
  const icons = DEFAULT_CATEGORIES.map((c) => c.icon);
  const colors = DEFAULT_CATEGORIES.map((c) => c.color);
  const types = DEFAULT_CATEGORIES.map((c) => c.type);
  const fallbacks = DEFAULT_CATEGORIES.map((c) => Boolean(c.isFallback));
  const positions = DEFAULT_CATEGORIES.map((_, i) => i + 1);
  await sql.transaction([
    sql`insert into kt_users (id, username, display_name, password_hash, role)
        values (${id}::uuid, ${username}, ${name}, ${passwordHash}, ${role})`,
    sql`insert into kt_categories (user_id, name, icon, color, type, is_fallback, position)
        select ${id}::uuid, t.name, t.icon, t.color, t.type, t.is_fallback, t.position
        from unnest(${names}::text[], ${icons}::text[], ${colors}::text[], ${types}::text[], ${fallbacks}::boolean[], ${positions}::int[])
          as t(name, icon, color, type, is_fallback, position)`,
  ]);
}

export async function updateName(sql, id, name) {
  const rows = await sql`
    update kt_users set display_name = ${name} where id = ${id}::uuid
    returning id, username, display_name as name, token_version as "tokenVersion", role, plan, pro_until as "proUntil"`;
  return rows[0] || null;
}

// Mengganti kata sandi sekaligus mencabut semua sesi lama (token_version naik).
export async function changePassword(sql, id, passwordHash) {
  const rows = await sql`
    update kt_users set password_hash = ${passwordHash}, token_version = token_version + 1
    where id = ${id}::uuid
    returning id, username, display_name as name, token_version as "tokenVersion", role, plan, pro_until as "proUntil"`;
  return rows[0] || null;
}

export async function touchLogin(sql, id) {
  await sql`update kt_users set last_login_at = now() where id = ${id}::uuid`;
}

export async function deleteUser(sql, id) {
  await sql`delete from kt_users where id = ${id}::uuid`;
}
