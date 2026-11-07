// Module Qualité : listes HACCP, contrôles, analyses de laboratoire, blocage des lots.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../server/index.js';
import { today } from '../server/lib.js';

const D = today();
async function setup() {
  const app = startServer({ dataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'gq-')), port: 0, host: '127.0.0.1', mode: 'saas', backups: false, timers: false });
  const base = `http://127.0.0.1:${await app.ready}`;
  const call = async (method, url, body, tok) => { const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); let json = null; try { json = JSON.parse(t); } catch { /* */ } return { status: r.status, json }; };
  const reg = await call('POST', '/api/auth/register', { company_name: 'Q ' + Math.random(), name: 'P', email: `q${Math.random()}@t.dev`, password: 'secret1234' });
  app.S.run("UPDATE companies SET subscription_status='active', trial_ends_at=NULL WHERE id=?", reg.json.company.id);
  const tok = reg.json.token;
  const mp = (await call('POST', '/api/items', { name: 'Sésame', kind: 'mp', unit: 'kg' }, tok)).json;
  const pf = (await call('POST', '/api/items', { name: 'Huile', kind: 'pf', unit: 'L' }, tok)).json;
  const lot = (await call('POST', '/api/stock/receipts', { item_id: mp.id, qty: 100, unit_cost: 500, date: D }, tok)).json;
  return { app, call, tok, mp, pf, lot, slug: reg.json.company.slug, close: () => app.close() };
}

test('qualité : trois listes HACCP proposées à la première utilisation, modifiables', async () => {
  const t = await setup();
  const tpls = (await t.call('GET', '/api/quality/templates', null, t.tok)).json;
  assert.deepEqual(tpls.map((x) => x.scope).sort(), ['hygiene', 'production', 'reception']);
  const r = await t.call('POST', '/api/quality/templates', { name: 'Aflatoxines (arachide)', scope: 'reception', items: [{ label: 'Grains moisis', type: 'ok', critical: true }, { label: 'Humidité', type: 'num', unit: '%', max: 8 }] }, t.tok);
  assert.equal(r.status, 201); assert.equal(r.json.items[1].max, 8);
  assert.equal((await t.call('POST', '/api/quality/templates', { name: 'Vide', items: [] }, t.tok)).status, 422);
  await t.close();
});

test('qualité : un contrôle conforme ne bloque rien ; un point critique non conforme bloque le lot', async () => {
  const t = await setup();
  const rec = (await t.call('GET', '/api/quality/templates', null, t.tok)).json.find((x) => x.scope === 'reception');
  const yes = rec.items.map((i) => ({ label: i.label, value: i.type === 'num' ? 7 : true }));
  const ok = await t.call('POST', '/api/quality/checks', { template_id: rec.id, lot_id: t.lot.id, done_on: D, answers: yes }, t.tok);
  assert.equal(ok.status, 201); assert.equal(ok.json.result, 'conforme'); assert.equal(ok.json.lot_blocked, false);
  // humidité trop haute (non critique) : non conforme mais pas bloqué
  const humid = yes.map((a) => (a.label.startsWith("Taux d'humidité") ? { ...a, value: 14 } : a));
  const nc = await t.call('POST', '/api/quality/checks', { template_id: rec.id, lot_id: t.lot.id, done_on: D, answers: humid }, t.tok);
  assert.equal(nc.json.result, 'non_conforme'); assert.equal(nc.json.lot_blocked, false);
  // moisissures (critique) : lot bloqué
  const mold = yes.map((a) => (a.label === 'Absence de moisissures' ? { ...a, value: false } : a));
  const bad = await t.call('POST', '/api/quality/checks', { template_id: rec.id, lot_id: t.lot.id, done_on: D, answers: mold }, t.tok);
  assert.equal(bad.json.lot_blocked, true);
  // valeur chiffrée manquante : refus
  assert.equal((await t.call('POST', '/api/quality/checks', { template_id: rec.id, done_on: D, answers: [] }, t.tok)).status, 422);
  await t.close();
});

test('qualité : un lot bloqué n’est ni consommé ni vendu ; libération motivée par le gérant', async () => {
  const t = await setup();
  const lab = await t.call('POST', '/api/quality/lab', { lot_id: t.lot.id, lab: 'LNSP Ouagadougou', analysed_on: D, parameter: 'Aflatoxine B1', value: '12', unit: 'µg/kg', limit_text: '≤ 2', conforme: false, reference: 'BUL-2026-114' }, t.tok);
  assert.equal(lab.status, 201); assert.equal(lab.json.lot_blocked, true);
  const prod = await t.call('POST', '/api/productions', { item_id: t.pf.id, produced_on: D, qty: 10, inputs: [{ item_id: t.mp.id, qty: 30 }] }, t.tok);
  assert.equal(prod.status, 422); assert.match(prod.json.message, /bloqués par la qualité/);
  const dash = (await t.call('GET', '/api/dashboard', null, t.tok)).json;
  assert.ok(dash.alerts.some((a) => a.type === 'blocked'));
  const store = (await t.call('POST', '/api/users', { name: 'M', email: `m${Math.random()}@t.dev`, password: 'secret1234', role: 'storekeeper' }, t.tok)).json;
  const stok = (await t.call('POST', '/api/auth/login', { email: store.email, password: 'secret1234' })).json.token;
  assert.equal((await t.call('POST', `/api/lots/${t.lot.id}/quality`, { status: 'ok', note: 'contre-analyse conforme' }, stok)).status, 403);
  assert.equal((await t.call('POST', `/api/lots/${t.lot.id}/quality`, { status: 'ok' }, t.tok)).status, 422); // motif obligatoire
  const free = await t.call('POST', `/api/lots/${t.lot.id}/quality`, { status: 'ok', note: 'Contre-analyse conforme (BUL-2026-120)' }, t.tok);
  assert.equal(free.status, 200); assert.equal(free.json.quality_status, null);
  assert.equal((await t.call('POST', '/api/productions', { item_id: t.pf.id, produced_on: D, qty: 10, inputs: [{ item_id: t.mp.id, qty: 30 }] }, t.tok)).status, 201);
  const sum = (await t.call('GET', '/api/quality/summary', null, t.tok)).json;
  assert.equal(sum.lab_30d, 1); assert.equal(sum.blocked.length, 0);
  await t.close();
});

test('qualité : la page publique signale un lot retiré et compte les contrôles conformes', async () => {
  const t = await setup();
  const rec = (await t.call('GET', '/api/quality/templates', null, t.tok)).json.find((x) => x.scope === 'reception');
  await t.call('POST', '/api/quality/checks', { template_id: rec.id, lot_id: t.lot.id, done_on: D, answers: rec.items.map((i) => ({ label: i.label, value: i.type === 'num' ? 5 : true })) }, t.tok);
  let pub = (await t.call('GET', `/api/public/trace/${t.slug}/${encodeURIComponent(t.lot.code)}`)).json;
  assert.equal(pub.controls, 1); assert.equal(pub.withdrawn, false);
  await t.call('POST', `/api/lots/${t.lot.id}/quality`, { status: 'bloque', note: 'Rappel par précaution' }, t.tok);
  pub = (await t.call('GET', `/api/public/trace/${t.slug}/${encodeURIComponent(t.lot.code)}`)).json;
  assert.equal(pub.withdrawn, true);
  await t.close();
});
