// Satu panggilan untuk memuat semua data awal setelah login.
import { json } from '../../src/server/http.js';
import { MAX_LOAD } from '../../src/server/repo/transactions.js';
import { publicUser } from '../../src/server/plan.js';

export async function onRequestGet({ data }) {
  const { sql, user } = data;
  const [categories, transactions, budgets, goals] = await sql.transaction([
    sql`select id, name, icon, color, type, is_fallback as "isFallback", position
        from kt_categories where user_id = ${user.id}::uuid
        order by case when type = 'out' then 0 else 1 end, position, created_at`,
    sql`select id, type, amount::float8 as amount, to_char(occurred_on, 'YYYY-MM-DD') as date,
               category_id as "categoryId", method, note, created_at as "createdAt"
        from kt_transactions where user_id = ${user.id}::uuid
        order by occurred_on desc, created_at desc
        limit ${MAX_LOAD + 1}`,
    sql`select category_id as "categoryId", amount::float8 as amount
        from kt_budgets where user_id = ${user.id}::uuid`,
    sql`select id, name, icon, color, target_amount::float8 as "targetAmount", saved_amount::float8 as "savedAmount",
               to_char(deadline, 'YYYY-MM-DD') as deadline, created_at as "createdAt"
        from kt_goals where user_id = ${user.id}::uuid order by created_at asc`,
  ]);
  const truncated = transactions.length > MAX_LOAD;
  return json({
    user: publicUser(user),
    categories,
    transactions: truncated ? transactions.slice(0, MAX_LOAD) : transactions,
    budgets,
    goals: user.isPro ? goals : [],
    truncated,
  });
}
