import { json } from '../../../src/server/http.js';
import { countUsers, isRegistrationOpen } from '../../../src/server/repo/users.js';

// firstRun: belum ada akun sama sekali (akun pertama otomatis menjadi admin).
export async function onRequestGet({ env, data }) {
  const firstRun = (await countUsers(data.sql)) === 0;
  return json({ registrationOpen: firstRun || (await isRegistrationOpen(data.sql, env)), firstRun });
}
