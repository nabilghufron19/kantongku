import { json, readJson } from '../../../src/server/http.js';
import { parseTransactionInput, requireUuid } from '../../../src/server/validate.js';
import { deleteTransaction, updateTransaction } from '../../../src/server/repo/transactions.js';

export async function onRequestPut({ request, params, data }) {
  const id = requireUuid(params.id);
  const { id: _ignored, ...input } = parseTransactionInput(await readJson(request));
  const row = await updateTransaction(data.sql, data.user.id, id, input);
  return json({ transaction: row });
}

export async function onRequestDelete({ params, data }) {
  await deleteTransaction(data.sql, data.user.id, requireUuid(params.id));
  return json({ ok: true });
}
