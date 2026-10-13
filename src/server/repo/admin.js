// Kueri khusus panel admin.
import { isProUser } from '../plan.js';

const withPro = (u) => ({ ...u, isPro: isProUser(u) });

export async function listUsers(sql) {
  const [users, stats] = await sql.transaction([
    sql`select u.id, u.username, u.display_name as name, u.role, u.plan, u.pro_until as "proUntil",
               u.created_at as "createdAt", u.last_login_at as "lastLoginAt",
               (select count(*)::int from kt_transactions t where t.user_id = u.id) as "txCount"
        from kt_users u order by u.created_at desc limit 1000`,
    sql`select count(*)::int as users,
               (count(*) filter (where role = 'admin'))::int as admins,
               (count(*) filter (where plan = 'pro' and (pro_until is null or pro_until > now())))::int as pro,
               (count(*) filter (where created_at > now() - interval '7 days'))::int as "new7",
               (select count(*)::int from kt_transactions) as transactions
        from kt_users`,
  ]);
  return { users: users.map(withPro), stats: stats[0] };
}

export async function getUser(sql, id) {
  const rows = await sql`
    select u.id, u.username, u.display_name as name, u.role, u.plan, u.pro_until as "proUntil",
           u.created_at as "createdAt", u.last_login_at as "lastLoginAt",
           (select count(*)::int from kt_transactions t where t.user_id = u.id) as "txCount"
    from kt_users u where u.id = ${id}::uuid`;
  return rows[0] ? withPro(rows[0]) : null;
}

export async function countOtherAdmins(sql, id) {
  const rows = await sql`select count(*)::int as n from kt_users where role = 'admin' and id <> ${id}::uuid`;
  return rows[0].n;
}

// patch: { role?, plan?, proDays? | lifetime? } (sudah divalidasi)
export async function applyPatch(sql, id, patch) {
  const q = [];
  if (patch.role) q.push(sql`update kt_users set role = ${patch.role} where id = ${id}::uuid`);
  if (patch.plan === 'free') {
    q.push(sql`update kt_users set plan = 'free', pro_until = null where id = ${id}::uuid`);
  } else if (patch.plan === 'pro' && patch.lifetime) {
    q.push(sql`update kt_users set plan = 'pro', pro_until = null where id = ${id}::uuid`);
  } else if (patch.plan === 'pro') {
    // memperpanjang dari tanggal berakhir yang masih berlaku; Pro selamanya tetap selamanya
    q.push(sql`
      update kt_users set
        pro_until = case when plan = 'pro' and pro_until is null then null
                         else greatest(coalesce(pro_until, now()), now()) + make_interval(days => ${patch.proDays}::int) end,
        plan = 'pro'
      where id = ${id}::uuid`);
  }
  if (q.length) await sql.transaction(q);
}

export async function setPasswordHash(sql, id, hash) {
  const rows = await sql`
    update kt_users set password_hash = ${hash}, token_version = token_version + 1
    where id = ${id}::uuid returning id`;
  return Boolean(rows[0]);
}
