import { json } from '../../../src/server/http.js';
import { publicUser } from '../../../src/server/plan.js';

// Dipakai klien untuk menyegarkan role/paket setelah admin mengubahnya.
export async function onRequestGet({ data }) {
  return json({ user: publicUser(data.user) });
}
