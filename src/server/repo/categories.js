import { HttpError } from '../http.js';

export async function listCategories(sql, userId) {
  return sql`
    select id, name, icon, color, type, is_fallback as "isFallback", position
    from kt_categories where user_id = ${userId}::uuid
    order by case when type = 'out' then 0 else 1 end, position, created_at`;
}

export async function createCategory(sql, userId, { name, icon, color, type }) {
  const rows = await sql`
    insert into kt_categories (user_id, name, icon, color, type, position)
    values (${userId}::uuid, ${name}, ${icon}, ${color}, ${type},
            (select coalesce(max(position), 0) + 1 from kt_categories where user_id = ${userId}::uuid))
    returning id, name, icon, color, type, is_fallback as "isFallback", position`;
  return rows[0];
}

export async function updateCategory(sql, userId, id, { name, icon, color }) {
  const rows = await sql`
    update kt_categories set name = ${name}, icon = ${icon}, color = ${color}
    where id = ${id}::uuid and user_id = ${userId}::uuid
    returning id, name, icon, color, type, is_fallback as "isFallback", position`;
  if (!rows[0]) throw new HttpError(404, 'Kategori tidak ditemukan.');
  return rows[0];
}

// Transaksi di kategori yang dihapus dipindahkan ke kategori bawaan ("Lainnya"/"Pemasukan lain").
export async function deleteCategory(sql, userId, id) {
  const found = await sql`
    select type, is_fallback as "isFallback" from kt_categories
    where id = ${id}::uuid and user_id = ${userId}::uuid`;
  const cat = found[0];
  if (!cat) throw new HttpError(404, 'Kategori tidak ditemukan.');
  if (cat.isFallback) throw new HttpError(400, 'Kategori bawaan tidak bisa dihapus.');
  const fb = await sql`
    select id from kt_categories
    where user_id = ${userId}::uuid and type = ${cat.type} and is_fallback`;
  if (!fb[0]) throw new HttpError(409, 'Kategori penampung tidak ditemukan. Impor ulang cadangan atau hubungi pemilik.');
  const counted = await sql`
    select count(*)::int as n from kt_transactions where user_id = ${userId}::uuid and category_id = ${id}::uuid`;
  await sql.transaction([
    sql`update kt_transactions set category_id = ${fb[0].id}::uuid, updated_at = now()
        where user_id = ${userId}::uuid and category_id = ${id}::uuid`,
    sql`delete from kt_budgets where user_id = ${userId}::uuid and category_id = ${id}::uuid`,
    sql`delete from kt_categories where id = ${id}::uuid and user_id = ${userId}::uuid`,
  ]);
  return { moved: counted[0].n, movedTo: fb[0].id };
}
