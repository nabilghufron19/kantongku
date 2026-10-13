import { json, readJson } from '../../../src/server/http.js';
import { parseGoalInput } from '../../../src/server/validate.js';
import { requirePro } from '../../../src/server/plan.js';
import { createGoal, listGoals } from '../../../src/server/repo/goals.js';

export async function onRequestGet({ data }) {
  requirePro(data.user);
  return json({ goals: await listGoals(data.sql, data.user.id) });
}

export async function onRequestPost({ request, data }) {
  requirePro(data.user);
  const goal = await createGoal(data.sql, data.user.id, parseGoalInput(await readJson(request)));
  return json({ goal }, 201);
}
