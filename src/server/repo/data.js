// Ekspor, impor, dan pengosongan data milik satu pengguna.
import { listCategories } from './categories.js';
import { listTransactions } from './transactions.js';
import { listBudgets } from './budgets.js';

const CHUNK = 1000;

export async function exportAll(sql, userId) {
  const [categories, transactions, budgets] = await Promise.all([
    listCategories(sql, userId),
    listTransactions(sql, userId, 200_000),
    listBudgets(sql, userId),
  ]);
  return {
    app: 'kantong',
    version: 2,
    exportedAt: new Date().toISOString(),
    categories,
    transactions: transactions.map(({ createdAt, ...t }) => t),
    budgets,
  };
}

// Hapus semua transaksi dan anggaran. Kategori dipertahankan.
export async function clearData(sql, userId) {
  await sql.transaction([
    sql`delete from kt_budgets where user_id = ${userId}::uuid`,
    sql`delete from kt_transactions where user_id = ${userId}::uuid`,
  ]);
}

export async function loadExistingCategories(sql, userId) {
  const rows = await sql`
    select id, name, type, is_fallback as "isFallback", position
    from kt_categories where user_id = ${userId}::uuid`;
  return {
    categories: rows,
    maxPosition: rows.reduce((m, r) => Math.max(m, r.position), 0),
  };
}

export async function applyImportPlan(sql, userId, plan) {
  const q = [];
  if (plan.replace) {
    q.push(sql`delete from kt_budgets where user_id = ${userId}::uuid`);
    q.push(sql`delete from kt_transactions where user_id = ${userId}::uuid`);
    q.push(sql`delete from kt_categories where user_id = ${userId}::uuid`);
  }
  if (plan.categories.length) {
    const c = plan.categories;
    q.push(sql`
      insert into kt_categories (id, user_id, name, icon, color, type, is_fallback, position)
      select x.id, ${userId}::uuid, x.name, x.icon, x.color, x.type, x.is_fallback, x.position
      from unnest(${c.map((r) => r.id)}::uuid[], ${c.map((r) => r.name)}::text[], ${c.map((r) => r.icon)}::text[],
                  ${c.map((r) => r.color)}::text[], ${c.map((r) => r.type)}::text[],
                  ${c.map((r) => r.isFallback)}::boolean[], ${c.map((r) => r.position)}::int[])
        as x(id, name, icon, color, type, is_fallback, position)`);
  }
  for (let i = 0; i < plan.transactions.length; i += CHUNK) {
    const t = plan.transactions.slice(i, i + CHUNK);
    q.push(sql`
      insert into kt_transactions (id, user_id, category_id, type, amount, occurred_on, method, note)
      select x.id, ${userId}::uuid, x.category_id, x.type, x.amount, x.occurred_on, x.method, x.note
      from unnest(${t.map((r) => r.id)}::uuid[], ${t.map((r) => r.categoryId)}::uuid[], ${t.map((r) => r.type)}::text[],
                  ${t.map((r) => r.amount)}::bigint[], ${t.map((r) => r.date)}::date[],
                  ${t.map((r) => r.method)}::text[], ${t.map((r) => r.note)}::text[])
        as x(id, category_id, type, amount, occurred_on, method, note)
      where true
      on conflict (id) do nothing`);
  }
  if (plan.budgets.length) {
    const b = plan.budgets;
    q.push(sql`
      insert into kt_budgets (user_id, category_id, amount)
      select ${userId}::uuid, x.category_id, x.amount
      from unnest(${b.map((r) => r.categoryId)}::uuid[], ${b.map((r) => r.amount)}::bigint[]) as x(category_id, amount)
      where true
      on conflict (user_id, category_id) do update set amount = excluded.amount, updated_at = now()`);
  }
  if (q.length) await sql.transaction(q);
}
