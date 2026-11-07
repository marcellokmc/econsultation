// Crédit : warrantage (récépissés d'entrepôt) et dossier de crédit.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../server/index.js';
import { today, addDays } from '../server/lib.js';

const D = today();
async function setup() {
  const app = startServer({ dataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'gcr-')), port: 0, host: '127.0.0.1', mode: 'saas', backups: false, timers: false });
  const base = `http://127.0.0.1:${await app.ready}`;
  const call = async (method, url, body, tok) => { const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); let json = null; try { json = JSON.parse(t); } catch { /* */ } return { status: r.status, json }; };
  const reg = await call('POST', '/api/auth/register', { company_name: 'Union ' + Math.random(), name: 'P', email: `u${Math.random()}@t.dev`, password: 'secret1234' });
  app.S.run("UPDATE companies SET subscription_status='active', trial_ends_at=NULL WHERE id=?", reg.json.company.id);
  const tok = reg.json.token;
  const mp = (await call('POST', '/api/items', { name: 'Maïs', kind: 'mp', unit: 'kg' }, tok)).json;
  const pf = (await call('POST', '/api/items', { name: 'Farine', kind: 'pf', unit: 'kg' }, tok)).json;
  const l1 = (await call('POST', '/api/stock/receipts', { item_id: mp.id, qty: 1000, unit_cost: 150, date: D }, tok)).json;
  const l2 = (await call('POST', '/api/stock/receipts', { item_id: mp.id, qty: 500, unit_cost: 150, date: D }, tok)).json;
  return { app, call, tok, mp, pf, l1, l2, slug: reg.json.company.slug, close: () => app.close() };
}
const base = (t, extra = {}) => ({ lender: 'Caisse populaire de Koudougou', issued_on: D, valuation_price: 175, loan_amount: 120000, loan_rate: 12, loan_due: addDays(D, 120), lot_ids: [t.l1.id], ...extra });

test('warrantage : le lot gagé ne peut plus être transformé ; la libération le rend utilisable', async () => {
  const t = await setup();
  assert.equal((await t.call('POST', '/api/credit/receipts', base(t, { loan_amount: 999999 }), t.tok)).status, 422); // prêt > valeur
  assert.equal((await t.call('POST', '/api/credit/receipts', base(t, { loan_due: D }), t.tok)).status, 422);
  const r = await t.call('POST', '/api/credit/receipts', base(t), t.tok);
  assert.equal(r.status, 201); assert.match(r.json.number, /^RE-\d{4}-0001$/); assert.equal(r.json.value, 175000 * 1);
  assert.equal(r.json.lots[0].qty, 1000);
  assert.equal((await t.call('POST', '/api/credit/receipts', base(t, { loan_amount: 1000 }), t.tok)).status, 422); // déjà gagé
  // seuls les 500 kg non gagés sont utilisables
  assert.equal((await t.call('POST', '/api/productions', { item_id: t.pf.id, produced_on: D, qty: 100, inputs: [{ item_id: t.mp.id, qty: 600 }] }, t.tok)).status, 422);
  assert.equal((await t.call('POST', '/api/productions', { item_id: t.pf.id, produced_on: D, qty: 100, inputs: [{ item_id: t.mp.id, qty: 400 }] }, t.tok)).status, 201);
  // vérification publique par le prêteur
  const rec = t.app.S.get('SELECT * FROM warehouse_receipts WHERE id=?', r.json.id);
  const pub = await t.call('GET', `/api/public/receipt/${t.slug}/${rec.number}/${rec.token}`);
  assert.equal(pub.json.status, 'gage'); assert.equal(pub.json.lots[0].still_in_stock, 1000); assert.equal(pub.json.lender, 'Caisse populaire de Koudougou');
  assert.equal((await t.call('GET', `/api/public/receipt/${t.slug}/${rec.number}/mauvais`)).status, 404);
  // libération
  assert.equal((await t.call('POST', `/api/credit/receipts/${r.json.id}/close`, { status: 'libere' }, t.tok)).status, 422); // motif
  const free = await t.call('POST', `/api/credit/receipts/${r.json.id}/close`, { status: 'libere', note: 'Prêt remboursé le jour même' }, t.tok);
  assert.equal(free.json.status, 'libere');
  assert.equal((await t.call('POST', '/api/productions', { item_id: t.pf.id, produced_on: D, qty: 100, inputs: [{ item_id: t.mp.id, qty: 600 }] }, t.tok)).status, 201);
  await t.close();
});

test('warrantage : réalisation par le prêteur (le stock sort), intérêts et alerte d’échéance', async () => {
  const t = await setup();
  const r = (await t.call('POST', '/api/credit/receipts', base(t, { lot_ids: [t.l2.id], loan_amount: 50000, loan_due: addDays(D, 10) }), t.tok)).json;
  assert.ok((await t.call('GET', '/api/dashboard', null, t.tok)).json.alerts.some((a) => /Récépissé RE-/.test(a.message)));
  assert.equal(r.total_due_at_term, 50000 + Math.round(50000 * 0.12 * 10 / 365));
  const done = await t.call('POST', `/api/credit/receipts/${r.id}/close`, { status: 'realise', note: 'Défaut de remboursement' }, t.tok);
  assert.equal(done.json.status, 'realise');
  assert.equal(t.app.S.get('SELECT qty_remaining FROM lots WHERE id=?', t.l2.id).qty_remaining, 0);
  assert.equal((await t.call('POST', `/api/credit/receipts/${r.id}/close`, { status: 'libere', note: 'encore' }, t.tok)).status, 422);
  await t.close();
});

test('dossier de crédit : 12 mois de chiffres, réservé aux rôles autorisés', async () => {
  const t = await setup();
  const c = (await t.call('POST', '/api/customers', { name: 'Client' }, t.tok)).json;
  await t.call('POST', '/api/productions', { item_id: t.pf.id, produced_on: D, qty: 100, inputs: [{ item_id: t.mp.id, qty: 200 }] }, t.tok);
  await t.call('POST', '/api/invoices', { customer_id: c.id, issued_on: D, vat_enabled: false, lines: [{ item_id: t.pf.id, qty: 10, unit_price: 1000 }] }, t.tok);
  const d = await t.call('GET', '/api/credit/dossier', null, t.tok);
  assert.equal(d.status, 200); assert.equal(d.json.monthly.length, 12); assert.equal(d.json.totals.sales_ht, 10000); assert.equal(d.json.totals.customers, 1);
  const s = (await t.call('POST', '/api/users', { name: 'S', email: `s${Math.random()}@t.dev`, password: 'secret1234', role: 'storekeeper' }, t.tok)).json;
  const stok = (await t.call('POST', '/api/auth/login', { email: s.email, password: 'secret1234' })).json.token;
  assert.equal((await t.call('GET', '/api/credit/dossier', null, stok)).status, 403);
  await t.close();
});
