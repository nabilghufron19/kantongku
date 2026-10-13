import { json } from '../../../../src/server/http.js';
import { requireAdmin } from '../../../../src/server/plan.js';
import { listUsers } from '../../../../src/server/repo/admin.js';

export async function onRequestGet({ data }) {
  requireAdmin(data.user);
  return json(await listUsers(data.sql));
}
