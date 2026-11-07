// Paiements mobile money (ordres, réservation, rappel signé, paie de campagne) et USSD.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../server/index.js';
import { today } from '../server/lib.js';
import { createRegistryAccount } from '../server/registry.js';

const D = today();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function boot(opts = {}) {
  const app = startServer({ dataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'gp-')), port: 0, host: '127.0.0.1', mode: 'saas', backups: false, timers: false, licence: false, simDelay: 30, ...opts });
  const base = `http://127.0.0.1:${await app.ready}`;
  const call = async (method, url, body, tok, extra = {}, raw) => {
    const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}), ...extra }, body: raw ?? (body ? JSON.stringify(body) : undefined) });
    const t = await r.text(); let json = null; try { json = JSON.parse(t); } catch { /* texte */ } return { status: r.status, json, text: t };
  };
  return { app, base, call, close: () => app.close() };
}
async function coop(t) {
  const reg = await t.call('POST', '/api/auth/register', { company_name: 'Coop ' + Math.random(), name: 'P', email: `p${Math.random()}@t.dev`, password: 'secret1234' });
  t.app.S.run("UPDATE companies SET subscription_status='active', trial_ends_at=NULL WHERE id=?", reg.json.company.id);
  const tok = reg.json.token;
  const mp = (await t.call('POST', '/api/items', { name: 'Sésame', kind: 'mp', unit: 'kg', ref_price: 600 }, tok)).json;
  const mk = async (name, phone, qty) => { const m = (await t.call('POST', '/api/members', { name, village: 'Gaoua', phone }, tok)).json; if (qty) await t.call('POST', '/api/deliveries', { member_id: m.id, item_id: mp.id, delivered_on: D, qty, unit_price: 600 }, tok); return m; };
  return { tok, mp, mk, cid: reg.json.company.id };
}

test('mobile money (simulation) : le montant est réservé puis payé à la confirmation, avec reçu', async () => {
  const t = await boot({ paiement: { fournisseur: 'simulation' } });
  const c = await coop(t);
  const m = await c.mk('Kadiatou', '72 73 37 37', 10); // 6 000 FCFA dus
  assert.equal((await t.call('POST', '/api/payments/orders', { member_id: m.id, amount: 7000, operator: 'orange' }, c.tok)).status, 422);
  const o = await t.call('POST', '/api/payments/orders', { member_id: m.id, amount: 6000, operator: 'orange', client_ref: 'r1' }, c.tok);
  assert.equal(o.status, 201); assert.equal(o.json.status, 'envoye'); assert.equal(o.json.phone, '+22672733737');
  // pendant l'envoi : impossible de payer la même somme à la main
  const manual = await t.call('POST', '/api/payouts', { member_id: m.id, paid_on: D, amount: 1000, method: 'Espèces' }, c.tok);
  assert.equal(manual.status, 422); assert.match(manual.json.message, /en cours/);
  // même référence : pas de second ordre
  assert.equal((await t.call('POST', '/api/payments/orders', { member_id: m.id, amount: 6000, operator: 'orange', client_ref: 'r1' }, c.tok)).json.id, o.json.id);
  await wait(150);
  const done = (await t.call('GET', '/api/payments/orders', null, c.tok)).json[0];
  assert.equal(done.status, 'reussi'); assert.ok(done.payout_id);
  const pay = (await t.call('GET', `/api/payouts/${done.payout_id}`, null, c.tok)).json;
  assert.equal(pay.method, 'Orange Money'); assert.equal(pay.reference, `SIM-${o.json.id}`); assert.match(pay.number, /^REC-/);
  assert.equal((await t.call('GET', `/api/members/${m.id}`, null, c.tok)).json.totals.balance, 0);
  await t.close();
});

test('mobile money : un échec libère la réservation ; ordre annulé ou confirmé à la main avec motif', async () => {
  const t = await boot({ paiement: { fournisseur: 'simulation' } });
  const c = await coop(t);
  const m = await c.mk('Mariam', '74 31 49 00', 10);
  await t.call('POST', '/api/members', { name: 'X' }, c.tok);
  const o = (await t.call('POST', '/api/payments/orders', { member_id: m.id, amount: 6000, operator: 'moov', phone: '70000000' }, c.tok)).json;
  await wait(150);
  assert.equal((await t.call('GET', '/api/payments/orders', null, c.tok)).json.find((x) => x.id === o.id).status, 'echoue');
  assert.equal((await t.call('GET', `/api/members/${m.id}`, null, c.tok)).json.totals.balance, 6000);
  // ordre resté en attente (fournisseur muet) : confirmation manuelle par le gérant, référence obligatoire
  t.app.x.simDelay = 1e9;
  const o2 = (await t.call('POST', '/api/payments/orders', { member_id: m.id, amount: 2000, operator: 'moov' }, c.tok)).json;
  assert.equal((await t.call('POST', `/api/payments/orders/${o2.id}/resolve`, { status: 'reussi', note: 'vu sur le relevé' }, c.tok)).status, 422);
  const ok = await t.call('POST', `/api/payments/orders/${o2.id}/resolve`, { status: 'reussi', reference: 'MP231107.1234', note: 'vu sur le relevé Moov' }, c.tok);
  assert.equal(ok.json.status, 'reussi');
  const o3 = (await t.call('POST', '/api/payments/orders', { member_id: m.id, amount: 4000, operator: 'moov' }, c.tok)).json;
  assert.equal((await t.call('POST', `/api/payments/orders/${o3.id}/resolve`, { status: 'annule', note: 'erreur de numéro' }, c.tok)).json.status, 'annule');
  assert.equal((await t.call('GET', `/api/members/${m.id}`, null, c.tok)).json.totals.balance, 4000);
  await t.close();
});

test('paie de campagne : tous les ordres ou aucun', async () => {
  const t = await boot({ paiement: { fournisseur: 'simulation' } });
  const c = await coop(t);
  const a = await c.mk('A', '70 00 00 11', 10), b = await c.mk('B', '70 00 00 22', 5);
  const bad = await t.call('POST', '/api/payments/batch', { label: 'Campagne 2026', orders: [{ member_id: a.id, amount: 6000, operator: 'orange' }, { member_id: b.id, amount: 9999, operator: 'orange' }] }, c.tok);
  assert.equal(bad.status, 422);
  assert.equal((await t.call('GET', '/api/payments/orders', null, c.tok)).json.length, 0);
  const ok = await t.call('POST', '/api/payments/batch', { label: 'Campagne 2026', orders: [{ member_id: a.id, amount: 6000, operator: 'orange' }, { member_id: b.id, amount: 3000, operator: 'moov' }] }, c.tok);
  assert.equal(ok.status, 201); assert.equal(ok.json.total, 9000);
  await wait(150);
  assert.deepEqual((await t.call('GET', '/api/payments/orders', null, c.tok)).json.map((o) => o.status), ['reussi', 'reussi']);
  await t.close();
});

test('mobile money (agrégateur HTTP) : ordre transmis, rappel signé, rappel répété sans double paiement', async () => {
  const got = [];
  const agg = http.createServer((req, res) => { let s = ''; req.on('data', (x) => (s += x)); req.on('end', () => { got.push({ key: req.headers['x-api-key'], ...JSON.parse(s) }); res.end(JSON.stringify({ transaction_id: 'AGG-777' })); }); });
  await new Promise((r) => agg.listen(0, '127.0.0.1', r));
  const secret = 'chut';
  const t = await boot({ paiement: { fournisseur: 'http', url: `http://127.0.0.1:${agg.address().port}/payouts`, entetes: { 'X-Api-Key': 'k' }, secret_rappel: secret }, publicUrl: 'https://grenier.test' });
  const c = await coop(t);
  const m = await c.mk('Pauline', '75 38 62 22', 10);
  const o = (await t.call('POST', '/api/payments/orders', { member_id: m.id, amount: 6000, operator: 'orange' }, c.tok)).json;
  assert.equal(o.status, 'envoye'); assert.equal(o.provider_ref, 'AGG-777');
  assert.deepEqual({ ...got[0] }, { key: 'k', reference: `GRN-${c.cid}-${o.id}`, amount: 6000, currency: 'XOF', phone: '+22675386222', operator: 'orange', callback_url: 'https://grenier.test/api/payments/callback' });
  const body = JSON.stringify({ reference: `GRN-${c.cid}-${o.id}`, status: 'success', transaction_id: 'OM-998877' });
  const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
  assert.equal((await t.call('POST', '/api/payments/callback', null, null, { 'X-Grenier-Signature': 'f'.repeat(64) }, body)).status, 401);
  assert.equal((await t.call('POST', '/api/payments/callback', null, null, { 'X-Grenier-Signature': sig }, body)).json.status, 'reussi');
  assert.equal((await t.call('POST', '/api/payments/callback', null, null, { 'X-Grenier-Signature': sig }, body)).json.status, 'reussi');
  assert.equal((await t.call('GET', '/api/payouts', null, c.tok)).json.length, 1);
  assert.equal((await t.call('GET', '/api/payouts', null, c.tok)).json[0].reference, 'OM-998877');
  await t.close(); agg.close();
});

test('sans service configuré : message clair, saisie manuelle toujours possible', async () => {
  const t = await boot();
  const c = await coop(t);
  const m = await c.mk('Z', '70 11 11 11', 1);
  const r = await t.call('POST', '/api/payments/orders', { member_id: m.id, amount: 100, operator: 'orange' }, c.tok);
  assert.equal(r.status, 422); assert.match(r.json.message, /Aucun service de paiement mobile/);
  await t.close();
});

test('USSD : menu, solde, livraisons, prix ; entreprise hébergée et installation locale via le résumé en ligne', async () => {
  const t = await boot({ ussd: { cle: 'secret-ussd' } });
  const c = await coop(t);
  await c.mk('Awa Ouédraogo', '70 10 10 10', 12);
  const form = (phone, text) => new URLSearchParams({ sessionId: 's1', serviceCode: '*123#', phoneNumber: phone, text }).toString();
  const ussd = (phone, text, cle = 'secret-ussd') => t.call('POST', `/api/ussd?cle=${cle}`, null, null, { 'Content-Type': 'application/x-www-form-urlencoded' }, form(phone, text));
  assert.equal((await ussd('+22670101010', '', 'faux')).status, 403);
  assert.match((await ussd('+22670101010', '')).text, /^END .*aucune cooperative/); // USSD pas encore activé
  await t.call('POST', '/api/payments/ussd', { enabled: true }, c.tok);
  const menu = (await ussd('+22670101010', '')).text;
  assert.match(menu, /^CON /); assert.match(menu, /Bonjour Awa/); assert.ok(!/[éèà]/.test(menu));
  assert.equal((await ussd('+22670101010', '1')).text, 'END Votre solde : 7 200 FCFA a recevoir de ' + (await t.call('GET', '/api/me', null, c.tok)).json.company.name.normalize('NFD').replace(/[̀-ͯ]/g, '') + '.');
  assert.match((await ussd('+22670101010', '2')).text, /12kg Sesame 7 200F/);
  assert.match((await ussd('+22670101010', '4')).text, /Sesame : 600F\/kg/);
  assert.match((await ussd('+22699999999', '')).text, /^END /);
  // installation locale : ses soldes arrivent avec le résumé Grenier en ligne
  const acc = createRegistryAccount(t.app.db, 'coop-locale', 'Coop locale');
  const local = await boot({ mode: 'local' });
  const lc = await coop(local);
  await lc.mk('Rasmata', '76 45 75 25', 3);
  await local.call('POST', '/api/registry/connect', { url: t.base, key: acc.key }, lc.tok);
  await local.call('POST', '/api/payments/ussd', { enabled: true }, lc.tok);
  await local.call('POST', '/api/cloud/snapshot/now', {}, lc.tok);
  assert.match((await ussd('76457525', '1')).text, /1 800 FCFA/);
  await local.close(); await t.close();
});
