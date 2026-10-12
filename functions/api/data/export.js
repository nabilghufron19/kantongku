import { json } from '../../../src/server/http.js';
import { exportAll } from '../../../src/server/repo/data.js';

export async function onRequestGet({ data }) {
  return json(await exportAll(data.sql, data.user.id));
}
