import { HttpError } from '../http.js';

export const MAX_LOAD = 50_000;

export async function listTransactions(sql, userId, limit = MAX_LOAD + 1) {
  return sql`
    select id, type, amount::float8 as amount, to_char(occurred_on, 'YYYY-MM-DD') as date,
           category_id as "categoryId", method, note, created_at as "createdAt"
    from kt_transactions where user_id = ${userId}::uuid
    order by occurred_on desc, created_at desc
    limit ${limit}`;
}

// Kategori harus milik pengguna dan berjenis sama dengan transaksi.
export async function createTransaction(sql, userId, t) {
  const rows = await sql`
    insert into kt_transactions (id, user_id, category_id, type, amount, occurred_on, method, note)
    select coalesce(${t.id ?? null}::uuid, gen_random_uuid()), ${userId}::uuid, c.id, c.type,
           ${t.amount}::bigint, ${t.date}::date, ${t.method}::text, ${t.note}::text
    from kt_categories c
    where c.id = ${t.categoryId}::uuid and c.user_id = ${userId}::uuid and c.type = ${t.type}
    returning id, type, amount::float8 as amount, to_char(occurred_on, 'YYYY-MM-DD') as date,
              category_id as "categoryId", method, note, created_at as "createdAt"`;
  if (!rows[0]) throw new HttpError(400, 'Kategori tidak ditemukan atau jenisnya tidak cocok.', { field: 'categoryId' });
  return rows[0];
}

export async function updateTransaction(sql, userId, id, t) {
  const exists = await sql`select 1 as ok from kt_transactions where id = ${id}::uuid and user_id = ${userId}::uuid`;
  if (!exists[0]) throw new HttpError(404, 'Transaksi tidak ditemukan.');
  const rows = await sql`
    update kt_transactions as x
    set category_id = c.id, type = c.type, amount = ${t.amount}::bigint, occurred_on = ${t.date}::date,
        method = ${t.method}::text, note = ${t.note}::text, updated_at = now()
    from kt_categories c
    where x.id = ${id}::uuid and x.user_id = ${userId}::uuid
      and c.id = ${t.categoryId}::uuid and c.user_id = ${userId}::uuid and c.type = ${t.type}
    returning x.id, x.type, x.amount::float8 as amount, to_char(x.occurred_on, 'YYYY-MM-DD') as date,
              x.category_id as "categoryId", x.method, x.note, x.created_at as "createdAt"`;
  if (!rows[0]) throw new HttpError(400, 'Kategori tidak ditemukan atau jenisnya tidak cocok.', { field: 'categoryId' });
  return rows[0];
}

export async function deleteTransaction(sql, userId, id) {
  const rows = await sql`
    delete from kt_transactions where id = ${id}::uuid and user_id = ${userId}::uuid returning id`;
  if (!rows[0]) throw new HttpError(404, 'Transaksi tidak ditemukan.');
}
