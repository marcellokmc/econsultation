// Tests des ajouts de la version 1.1 : corrections, journal, SMS, licences, QR vérifiables, registre, collecte terrain.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../server/index.js';
import { addDays, today } from '../server/lib.js';
import { signLicence } from '../server/licence.js';
import { createRegistryAccount } from '../server/registry.js';
import { normalizePhone } from '../server/notify.js';

const D = today();

async function boot(opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grenier11-'));
  const app = startServer({ dataDir: dir, port: 0, host: '127.0.0.1', mode: 'saas', backups: false, timers: false, ...opts });
  const port = await app.ready;
  const base = `http://127.0.0.1:${port}`;
  const call = async (method, url, body, token) => {
    const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const text = await r.text();
    let json = null; try { json = JSON.parse(text); } catch { /* html, svg */ }
    return { status: r.status, json, text };
  };
  return { app, call, base, dir, close: () => app.close() };
}

/** Entreprise « pro » active avec un membre, une matière première, un produit fini et un client. */
async function coop(t, { phone = '70 11 22 33' } = {}) {
  const email = `p${Date.now()}${Math.random()}@t.dev`;
  const reg = await t.call('POST', '/api/auth/register', { company_name: `Coop ${Math.random()}`, name: 'Présidente', email, password: 'secret1234' });
  assert.equal(reg.status, 201, JSON.stringify(reg.json));
  t.app.S.run("UPDATE companies SET subscription_status='active', trial_ends_at=NULL, plan='pro' WHERE id=?", reg.json.company.id);
  const tok = reg.json.token;
  const mp = (await t.call('POST', '/api/items', { name: 'Sésame', kind: 'mp', unit: 'kg', code: 'SES', ref_price: 600 }, tok)).json;
  const pf = (await t.call('POST', '/api/items', { name: 'Huile de sésame', kind: 'pf', unit: 'bouteille', code: 'HSE' }, tok)).json;
  const member = (await t.call('POST', '/api/members', { name: 'Awa Ouédraogo', village: 'Léo', phone }, tok)).json;
  const customer = (await t.call('POST', '/api/customers', { name: 'Épicerie' }, tok)).json;
  const user = async (role) => {
    const u = await t.call('POST', '/api/users', { name: role, email: `${role}${Math.random()}@t.dev`, password: 'secret1234', role }, tok);
    return (await t.call('POST', '/api/auth/login', { email: u.json.email, password: 'secret1234' })).json.token;
  };
  const deliver = (qty, price = 600, extra = {}) => t.call('POST', '/api/deliveries', { member_id: member.id, item_id: mp.id, delivered_on: D, qty, unit_price: price, ...extra }, tok);
  return { tok, cid: reg.json.company.id, slug: reg.json.company.slug, mp, pf, member, customer, user, deliver };
}

test('paiement à un membre : jamais plus que le solde dû, sauf avance accordée par le propriétaire ou le gérant', async () => {
  const t = await boot();
  const c = await coop(t);
  await c.deliver(10, 600); // 6 000 FCFA dus
  const over = await t.call('POST', '/api/payouts', { member_id: c.member.id, paid_on: D, amount: 99999999, method: 'Espèces' }, c.tok);
  assert.equal(over.status, 422);
  assert.match(over.json.message, /dépasse ce qui est dû/);
  assert.equal((await t.call('POST', '/api/payouts', { member_id: c.member.id, paid_on: D, amount: 6000, method: 'Orange Money', reference: 'OM123' }, c.tok)).status, 201);
  const agent = await c.user('coop_agent');
  assert.equal((await t.call('POST', '/api/payouts', { member_id: c.member.id, paid_on: D, amount: 2000, method: 'Espèces', advance: true }, agent)).status, 403);
  const adv = await t.call('POST', '/api/payouts', { member_id: c.member.id, paid_on: D, amount: 2000, method: 'Espèces', advance: true }, c.tok);
  assert.equal(adv.status, 201); assert.equal(adv.json.kind, 'avance');
  const det = (await t.call('GET', `/api/members/${c.member.id}`, null, c.tok)).json;
  assert.equal(det.totals.balance, -2000);
  const dash = (await t.call('GET', '/api/dashboard', null, c.tok)).json;
  assert.equal(dash.advances_to_members, 2000);
  assert.ok(dash.alerts.some((a) => a.type === 'member_advance'));
  await t.close();
});

test('annuler une livraison : possible tant que son lot est intact, avec un motif, par le propriétaire ou le gérant', async () => {
  const t = await boot();
  const c = await coop(t);
  const d1 = (await c.deliver(10)).json;
  const d2 = (await c.deliver(20)).json;
  const agent = await c.user('coop_agent');
  assert.equal((await t.call('POST', `/api/deliveries/${d1.id}/cancel`, { reason: 'erreur de pesée' }, agent)).status, 403);
  assert.equal((await t.call('POST', `/api/deliveries/${d1.id}/cancel`, {}, c.tok)).status, 422); // motif obligatoire
  const ok = await t.call('POST', `/api/deliveries/${d1.id}/cancel`, { reason: 'erreur de pesée' }, c.tok);
  assert.equal(ok.status, 200); assert.equal(ok.json.status, 'cancelled');
  assert.equal((await t.call('POST', `/api/deliveries/${d1.id}/cancel`, { reason: 'encore' }, c.tok)).status, 422);
  // le lot annulé n'est plus en stock ; le solde du membre ne compte plus cette livraison
  assert.equal((await t.call('GET', `/api/items`, null, c.tok)).json.find((i) => i.id === c.mp.id).stock, 20);
  assert.equal((await t.call('GET', `/api/members/${c.member.id}`, null, c.tok)).json.totals.amount, 12000);
  assert.equal((await t.call('GET', '/api/deliveries', null, c.tok)).json.length, 1);
  assert.equal((await t.call('GET', '/api/deliveries?all=1', null, c.tok)).json.length, 2);
  // lot déjà utilisé en production : refus
  assert.equal((await t.call('POST', '/api/productions', { item_id: c.pf.id, produced_on: D, qty: 5, inputs: [{ item_id: c.mp.id, qty: 5 }] }, c.tok)).status, 201);
  const used = await t.call('POST', `/api/deliveries/${d2.id}/cancel`, { reason: 'test' }, c.tok);
  assert.equal(used.status, 422); assert.match(used.json.message, /déjà été utilisé/);
  await t.close();
});

test('annuler un paiement rétablit le solde ; le numéro de reçu reste réservé', async () => {
  const t = await boot();
  const c = await coop(t);
  await c.deliver(10, 1000);
  const p = (await t.call('POST', '/api/payouts', { member_id: c.member.id, paid_on: D, amount: 4000, method: 'Espèces' }, c.tok)).json;
  assert.equal((await t.call('POST', `/api/payouts/${p.id}/cancel`, { reason: 'saisi deux fois' }, c.tok)).json.status, 'cancelled');
  assert.equal((await t.call('GET', `/api/members/${c.member.id}`, null, c.tok)).json.totals.balance, 10000);
  const p2 = (await t.call('POST', '/api/payouts', { member_id: c.member.id, paid_on: D, amount: 1000, method: 'Espèces' }, c.tok)).json;
  assert.equal(p.number, 'REC-0001'); assert.equal(p2.number, 'REC-0002');
  await t.close();
});

test('une opération ne peut pas être datée dans le futur', async () => {
  const t = await boot();
  const c = await coop(t);
  const r = await c.deliver(5, 600, { delivered_on: addDays(D, 30) });
  assert.equal(r.status, 422); assert.match(r.json.message, /date future/);
  assert.equal((await t.call('POST', '/api/stock/receipts', { item_id: c.mp.id, qty: 1, unit_cost: 1, date: '2030-01-01' }, c.tok)).status, 422);
  assert.equal((await c.deliver(5, 600, { delivered_on: addDays(D, -3) })).status, 201);
  await t.close();
});

test('collecte terrain : renvoyer la même livraison (même référence) ne la crée qu’une fois', async () => {
  const t = await boot();
  const c = await coop(t);
  const ref = crypto.randomUUID();
  const a = await c.deliver(7, 600, { client_ref: ref });
  const b = await c.deliver(7, 600, { client_ref: ref });
  assert.equal(a.status, 201); assert.equal(b.status, 200); assert.equal(b.json.duplicate, true); assert.equal(a.json.id, b.json.id);
  assert.equal((await t.call('GET', '/api/deliveries', null, c.tok)).json.length, 1);
  const mref = crypto.randomUUID();
  const m1 = await t.call('POST', '/api/members', { name: 'Nouveau', client_ref: mref }, c.tok);
  const m2 = await t.call('POST', '/api/members', { name: 'Nouveau', client_ref: mref }, c.tok);
  assert.equal(m1.json.id, m2.json.id);
  await t.close();
});

test('journal : les actions et les connexions refusées sont tracées, sans mot de passe', async () => {
  const t = await boot();
  const c = await coop(t);
  const d = (await c.deliver(3)).json;
  await t.call('POST', `/api/deliveries/${d.id}/cancel`, { reason: 'doublon' }, c.tok);
  const email = (await t.call('GET', '/api/me', null, c.tok)).json.user.email;
  await t.call('POST', '/api/auth/login', { email, password: 'mauvais-mot' });
  const log = (await t.call('GET', '/api/audit', null, c.tok)).json;
  const actions = log.map((l) => l.action);
  assert.ok(actions.includes('Livraison')); assert.ok(actions.includes('Livraison ANNULÉE')); assert.ok(actions.includes('Nouveau membre'));
  assert.ok(log.find((l) => l.action === 'Livraison ANNULÉE').detail.includes('doublon'));
  assert.ok(!JSON.stringify(log).includes('secret1234'));
  const all = t.app.S.all('SELECT * FROM audit_log');
  assert.ok(all.some((l) => l.action === 'Connexion refusée' && !String(l.detail).includes('mauvais-mot')));
  const agent = await c.user('storekeeper');
  assert.equal((await t.call('GET', '/api/audit', null, agent)).status, 403);
  await t.close();
});

test('SMS : reçu de livraison et de paiement mis en file, envoyé par la passerelle configurée', async () => {
  const got = [];
  const gw = http.createServer((req, res) => { let b = ''; req.on('data', (x) => (b += x)); req.on('end', () => { got.push({ auth: req.headers['x-api-key'], ...JSON.parse(b) }); res.end('{}'); }); });
  await new Promise((r) => gw.listen(0, '127.0.0.1', r));
  const t = await boot({ sms: { fournisseur: 'http', url: `http://127.0.0.1:${gw.address().port}/send`, entetes: { 'X-Api-Key': 'k1' }, expediteur: 'COOP' } });
  const c = await coop(t, { phone: '70 11 22 33' });
  await c.deliver(10); // SMS désactivés : rien
  assert.equal(t.app.S.get('SELECT COUNT(*) n FROM messages').n, 0);
  await t.call('PUT', '/api/settings', { sms_enabled: true }, c.tok);
  await c.deliver(12, 650);
  await t.call('POST', '/api/payouts', { member_id: c.member.id, paid_on: D, amount: 5000, method: 'Orange Money', reference: 'OM-77' }, c.tok);
  const flushed = (await t.call('POST', '/api/messages/flush', {}, c.tok)).json;
  assert.equal(flushed.sent, 2);
  assert.equal(got.length, 2);
  assert.equal(got[0].to, '+22670112233'); assert.equal(got[0].auth, 'k1'); assert.equal(got[0].sender, 'COOP');
  assert.match(got[0].message, /livraison .* 12 kg Sesame \(qualite A\) = 7 800 FCFA/);
  assert.match(got[1].message, /paiement de 5 000 FCFA \(Orange Money ref OM-77\)/);
  assert.ok(got.every((m) => !/[éèàç]/.test(m.message)));
  const list = (await t.call('GET', '/api/messages', null, c.tok)).json;
  assert.equal(list.counts.sent, 2);
  await t.close(); gw.close();
});

test('SMS : une passerelle en panne ne bloque pas la saisie ; le message est retenté puis marqué en échec', async () => {
  const t = await boot({ sms: { fournisseur: 'http', url: 'http://127.0.0.1:9/hors-service' } });
  const c = await coop(t);
  await t.call('PUT', '/api/settings', { sms_enabled: true }, c.tok);
  assert.equal((await c.deliver(4)).status, 201);
  for (let i = 0; i < 5; i++) await t.app.messenger.flush();
  const m = t.app.S.get('SELECT * FROM messages');
  assert.equal(m.status, 'failed'); assert.equal(m.attempts, 5); assert.ok(m.error);
  assert.equal(normalizePhone('0022670112233'), '+22670112233'); assert.equal(normalizePhone('abc'), null);
  await t.close();
});

test('licence : essai de 60 jours, puis lecture seule ; une licence signée réactive, une licence modifiée est refusée', async () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const keyFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'k-')), 'pub.pem');
  fs.writeFileSync(keyFile, publicKey.export({ type: 'spki', format: 'pem' }));
  process.env.GRENIER_LICENCE_PUBKEY = keyFile;
  const priv = privateKey.export({ type: 'pkcs8', format: 'pem' });
  try {
    const t = await boot({ mode: 'local', licence: true });
    const reg = await t.call('POST', '/api/auth/register', { company_name: 'Unité', name: 'Dir', email: 'dir@u.dev', password: 'secret1234' });
    const tok = reg.json.token;
    assert.equal((await t.call('GET', '/api/licence', null, tok)).json.state, 'essai');
    // essai terminé
    t.app.S.run("UPDATE meta SET value=? WHERE key='first_start'", addDays(D, -61));
    assert.equal((await t.call('GET', '/api/licence', null, tok)).json.state, 'essai_termine');
    const blocked = await t.call('POST', '/api/items', { name: 'X', kind: 'mp', unit: 'kg' }, tok);
    assert.equal(blocked.status, 402);
    // licence falsifiée (offre modifiée après signature)
    const good = signLicence({ v: 1, client: 'Unité', plan: 'starter', expires: addDays(D, 365), issued: D }, priv);
    const [payload, sig] = good.split('.');
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url')), plan: 'cooperative' })).toString('base64url') + '.' + sig;
    const bad = await t.call('POST', '/api/licence', { text: forged }, tok);
    assert.equal(bad.status, 422); assert.match(bad.json.message, /Signature invalide/);
    // licence valide : enregistrable même en lecture seule
    const okr = await t.call('POST', '/api/licence', { text: good }, tok);
    assert.equal(okr.status, 200, JSON.stringify(okr.json)); assert.equal(okr.json.state, 'licence'); assert.equal(okr.json.plan, 'starter');
    assert.equal((await t.call('POST', '/api/items', { name: 'X', kind: 'mp', unit: 'kg' }, tok)).status, 201);
    assert.equal((await t.call('GET', '/api/members', null, tok)).status, 403); // Starter : pas de module coopérative
    // licence expirée
    const old = signLicence({ v: 1, client: 'Unité', plan: 'pro', expires: addDays(D, -1), issued: D }, priv);
    assert.equal((await t.call('POST', '/api/licence', { text: old }, tok)).json.state, 'licence_expiree');
    assert.equal((await t.call('POST', '/api/items', { name: 'Y', kind: 'mp', unit: 'kg' }, tok)).status, 402);
    // l'état est conservé au redémarrage
    await t.close();
    const t2 = startServer({ dataDir: t.dir, port: 0, host: '127.0.0.1', mode: 'local', backups: false, timers: false });
    await t2.ready;
    assert.equal(t2.licence().state, 'licence_expiree');
    await t2.close();
  } finally { delete process.env.GRENIER_LICENCE_PUBKEY; }
});

test('QR vérifiable (serveur hébergé) : lot authentique, code inconnu signalé, vérifications comptées', async () => {
  const t = await boot({ publicUrl: 'https://trace.exemple.bf' });
  const c = await coop(t);
  const d = (await c.deliver(10)).json;
  const lot = t.app.S.get('SELECT * FROM lots WHERE id=?', d.lot.id);
  assert.match(lot.public_token, /^[2-9a-z]{10}$/);
  const qrText = t.app.S.qrPayload(t.app.S.get('SELECT * FROM companies WHERE id=?', c.cid), lot, 'https://trace.exemple.bf');
  assert.equal(qrText, `https://trace.exemple.bf/v/${c.slug}/${encodeURIComponent(lot.code)}/${lot.public_token}`);
  const page = await fetch(`${t.base}/v/${c.slug}/${encodeURIComponent(lot.code)}/${lot.public_token}`);
  const html = await page.text();
  assert.equal(page.status, 200); assert.match(html, /Lot authentique/); assert.match(html, /Léo/);
  assert.ok(!html.includes('Awa')); // jamais le nom du producteur
  await fetch(`${t.base}/v/${c.slug}/${encodeURIComponent(lot.code)}/${lot.public_token}`);
  assert.equal(t.app.S.get('SELECT scans FROM lots WHERE id=?', lot.id).scans, 2);
  const fake = await fetch(`${t.base}/v/${c.slug}/${encodeURIComponent(lot.code)}/zzzzzzzzzz`);
  assert.equal(fake.status, 404); assert.match(await fake.text(), /non reconnu/);
  await t.close();
});

test('registre Grenier Trace : une installation locale publie ses lots, le QR se vérifie en ligne', async () => {
  const cloud = await boot({ mode: 'saas' });
  const acc = createRegistryAccount(cloud.app.db, 'Coop Leo', 'Coopérative de Léo');
  assert.equal(acc.slug, 'coop-leo');
  assert.throws(() => createRegistryAccount(cloud.app.db, 'coop-leo', 'Autre'), /déjà pris/);
  const local = await boot({ mode: 'local', licence: false });
  const reg = await local.call('POST', '/api/auth/register', { company_name: 'Coopérative de Léo', name: 'Pdte', email: 'p@leo.dev', password: 'secret1234' });
  const tok = reg.json.token;
  const mp = (await local.call('POST', '/api/items', { name: 'Karité', kind: 'mp', unit: 'kg', code: 'AKA' }, tok)).json;
  const m = (await local.call('POST', '/api/members', { name: 'Rasmata', village: 'Bouyounou' }, tok)).json;
  const d = (await local.call('POST', '/api/deliveries', { member_id: m.id, item_id: mp.id, delivered_on: D, qty: 50, unit_price: 275 }, tok)).json;
  assert.equal((await local.call('POST', '/api/registry/connect', { url: cloud.base, key: 'grt_mauvaise' }, tok)).status, 422);
  const con = await local.call('POST', '/api/registry/connect', { url: cloud.base, key: acc.key }, tok);
  assert.equal(con.status, 200, JSON.stringify(con.json)); assert.equal(con.json.slug, 'coop-leo');
  await local.app.registry.publish();
  const st = (await local.call('GET', '/api/registry/status', null, tok)).json;
  assert.equal(st.pending, 0); assert.equal(st.published, 1); assert.equal(st.last_error, null);
  const lot = local.app.S.get('SELECT * FROM lots WHERE id=?', d.lot.id);
  const qr = local.app.S.qrPayload(local.app.S.get('SELECT * FROM companies'), lot);
  assert.equal(qr, `${cloud.base}/v/coop-leo/${encodeURIComponent(lot.code)}/${lot.public_token}`);
  const page = await fetch(qr);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Lot authentique/); assert.match(html, /Bouyounou/); assert.ok(!html.includes('Rasmata'));
  // une clé inconnue ne peut pas publier
  const intrus = await fetch(`${cloud.base}/api/registry/lots`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer x' }, body: JSON.stringify({ lots: [] }) });
  assert.equal(intrus.status, 401);
  await local.close(); await cloud.close();
});

test('interface : toutes les adresses de l’application (terrain, fiches…) renvoient la page, jamais le code serveur', async () => {
  const t = await boot();
  for (const p of ['/terrain', '/cooperative/membres/3', '/t/slug/LOT-1']) {
    const r = await fetch(t.base + p);
    assert.equal(r.status, 200); assert.match(await r.text(), /<!doctype html>/i);
  }
  const trav = await fetch(t.base + '/..%2f..%2fserver%2findex.js');
  assert.ok(!(await trav.text()).includes('startServer'));
  await t.close();
});
