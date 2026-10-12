import { HttpError } from '../http.js';

export async function listBudgets(sql, userId) {
  return sql`
    select category_id as "categoryId", amount::float8 as amount
    from kt_budgets where user_id = ${userId}::uuid`;
}

// amount 0 = hapus batas. Anggaran hanya untuk kategori pengeluaran.
export async function setBudget(sql, userId, categoryId, amount) {
  if (amount === 0) {
    await sql`delete from kt_budgets where user_id = ${userId}::uuid and category_id = ${categoryId}::uuid`;
    return { categoryId, amount: 0 };
  }
  const rows = await sql`
    insert into kt_budgets (user_id, category_id, amount)
    select ${userId}::uuid, c.id, ${amount}::bigint
    from kt_categories c
    where c.id = ${categoryId}::uuid and c.user_id = ${userId}::uuid and c.type = 'out'
    on conflict (user_id, category_id) do update set amount = excluded.amount, updated_at = now()
    returning category_id as "categoryId", amount::float8 as amount`;
  if (!rows[0]) throw new HttpError(400, 'Anggaran hanya bisa dipasang pada kategori pengeluaran milik Anda.', { field: 'categoryId' });
  return rows[0];
}

// Mengganti seluruh anggaran sekaligus. entries: [{ categoryId, amount > 0 }]
export async function replaceBudgets(sql, userId, entries) {
  const queries = [sql`delete from kt_budgets where user_id = ${userId}::uuid`];
  if (entries.length) {
    const ids = entries.map((e) => e.categoryId);
    const amounts = entries.map((e) => e.amount);
    queries.push(sql`
      insert into kt_budgets (user_id, category_id, amount)
      select ${userId}::uuid, c.id, b.amount
      from unnest(${ids}::uuid[], ${amounts}::bigint[]) as b(category_id, amount)
      join kt_categories c on c.id = b.category_id and c.user_id = ${userId}::uuid and c.type = 'out'
      where true`);
  }
  await sql.transaction(queries);
}
