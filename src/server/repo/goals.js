import { HttpError } from '../http.js';

export const MAX_GOALS = 50;

export async function listGoals(sql, userId) {
  return sql`
    select id, name, icon, color, target_amount::float8 as "targetAmount", saved_amount::float8 as "savedAmount",
           to_char(deadline, 'YYYY-MM-DD') as deadline, created_at as "createdAt"
    from kt_goals where user_id = ${userId}::uuid order by created_at asc`;
}

export async function createGoal(sql, userId, g) {
  const counted = await sql`select count(*)::int as n from kt_goals where user_id = ${userId}::uuid`;
  if (counted[0].n >= MAX_GOALS) throw new HttpError(400, `Maksimal ${MAX_GOALS} target tabungan.`);
  const rows = await sql`
    insert into kt_goals (user_id, name, icon, color, target_amount, deadline)
    values (${userId}::uuid, ${g.name}, ${g.icon}, ${g.color}, ${g.targetAmount}::bigint, ${g.deadline ?? null}::date)
    returning id, name, icon, color, target_amount::float8 as "targetAmount", saved_amount::float8 as "savedAmount",
              to_char(deadline, 'YYYY-MM-DD') as deadline, created_at as "createdAt"`;
  return rows[0];
}

export async function updateGoal(sql, userId, id, g) {
  const rows = await sql`
    update kt_goals set name = ${g.name}, icon = ${g.icon}, color = ${g.color},
           target_amount = ${g.targetAmount}::bigint, deadline = ${g.deadline ?? null}::date, updated_at = now()
    where id = ${id}::uuid and user_id = ${userId}::uuid
    returning id, name, icon, color, target_amount::float8 as "targetAmount", saved_amount::float8 as "savedAmount",
              to_char(deadline, 'YYYY-MM-DD') as deadline, created_at as "createdAt"`;
  if (!rows[0]) throw new HttpError(404, 'Target tidak ditemukan.');
  return rows[0];
}

// amount positif = setor, negatif = tarik. Saldo target tidak boleh di bawah nol.
export async function depositGoal(sql, userId, id, amount) {
  const exists = await sql`select saved_amount::float8 as saved from kt_goals where id = ${id}::uuid and user_id = ${userId}::uuid`;
  if (!exists[0]) throw new HttpError(404, 'Target tidak ditemukan.');
  if (exists[0].saved + amount < 0) throw new HttpError(400, 'Jumlah penarikan melebihi dana yang sudah terkumpul.', { field: 'amount' });
  const rows = await sql`
    update kt_goals set saved_amount = saved_amount + ${amount}::bigint, updated_at = now()
    where id = ${id}::uuid and user_id = ${userId}::uuid and saved_amount + ${amount}::bigint >= 0
    returning id, name, icon, color, target_amount::float8 as "targetAmount", saved_amount::float8 as "savedAmount",
              to_char(deadline, 'YYYY-MM-DD') as deadline, created_at as "createdAt"`;
  if (!rows[0]) throw new HttpError(400, 'Jumlah penarikan melebihi dana yang sudah terkumpul.', { field: 'amount' });
  return rows[0];
}

export async function deleteGoal(sql, userId, id) {
  const rows = await sql`delete from kt_goals where id = ${id}::uuid and user_id = ${userId}::uuid returning id`;
  if (!rows[0]) throw new HttpError(404, 'Target tidak ditemukan.');
}
