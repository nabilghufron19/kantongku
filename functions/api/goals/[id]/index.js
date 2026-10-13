import { json, readJson } from '../../../../src/server/http.js';
import { parseGoalInput, requireUuid } from '../../../../src/server/validate.js';
import { requirePro } from '../../../../src/server/plan.js';
import { deleteGoal, updateGoal } from '../../../../src/server/repo/goals.js';

export async function onRequestPut({ request, params, data }) {
  requirePro(data.user);
  const goal = await updateGoal(data.sql, data.user.id, requireUuid(params.id), parseGoalInput(await readJson(request)));
  return json({ goal });
}

export async function onRequestDelete({ params, data }) {
  requirePro(data.user);
  await deleteGoal(data.sql, data.user.id, requireUuid(params.id));
  return json({ ok: true });
}
