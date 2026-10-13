import { json, readJson } from '../../../../src/server/http.js';
import { parseDeposit, requireUuid } from '../../../../src/server/validate.js';
import { requirePro } from '../../../../src/server/plan.js';
import { depositGoal } from '../../../../src/server/repo/goals.js';

// Body: { amount } positif = setor, negatif = tarik.
export async function onRequestPost({ request, params, data }) {
  requirePro(data.user);
  const goal = await depositGoal(data.sql, data.user.id, requireUuid(params.id), parseDeposit(await readJson(request)));
  return json({ goal });
}
