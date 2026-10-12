import { json } from '../../../src/server/http.js';
import { countUsers } from '../../../src/server/repo/users.js';

// firstRun: belum ada akun sama sekali. Pendaftaran terbuka untuk akun pertama
// atau jika ALLOW_REGISTER=true.
export async function onRequestGet({ env, data }) {
  const firstRun = (await countUsers(data.sql)) === 0;
  return json({ registrationOpen: firstRun || env.ALLOW_REGISTER === 'true', firstRun });
}
