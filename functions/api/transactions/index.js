import { json, readJson } from '../../../src/server/http.js';
import { parseTransactionInput } from '../../../src/server/validate.js';
import { createTransaction, listTransactions, MAX_LOAD } from '../../../src/server/repo/transactions.js';
import { isUniqueViolation } from '../../../src/server/db.js';
import { HttpError } from '../../../src/server/http.js';

export async function onRequestGet({ data }) {
  const rows = await listTransactions(data.sql, data.user.id, MAX_LOAD);
  return json({ transactions: rows });
}

export async function onRequestPost({ request, data }) {
  const input = parseTransactionInput(await readJson(request));
  try {
    const row = await createTransaction(data.sql, data.user.id, input);
    return json({ transaction: row }, 201);
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'Transaksi dengan ID ini sudah ada.', { field: 'id' });
    throw err;
  }
}
