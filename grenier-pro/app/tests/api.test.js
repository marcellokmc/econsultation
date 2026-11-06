import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../server/index.js';
import { addDays, today } from '../server/lib.js';

async function boot(mode = 'saas') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grenier-'));
  const app = startServer({ dataDir: dir, port: 0, host: '127.0.0.1', mode, backups: false });
  const port = await app.ready;
  const base = `http://127.0.0.1:${port}`;
  const call = async (method, url, body, token) => {
    const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const text = await r.text();
    let json = null; try { json = JSON.parse(text); } catch { /* svg, etc. */ }
    return { status: r.status, json, text, headers: r.headers };
  };
  let n = 0;
  /** Crée une entreprise + un utilisateur du rôle voulu ; retourne les jetons. */
  const tenant = async (role = 'owner', patch = {}) => {
    n++;
    const reg = await call('POST', '/api/auth/register', { company_name: `Entreprise ${n} ${Math.random()}`, name: 'Prop', email: `o${n}${Date.now()}@t.dev`, password: 'secret1234' });
    assert.equal(reg.status, 201);
    const cid = reg.json.company.id;
    const sets = { subscription_status: 'active', trial_ends_at: null, ...patch };
    app.S.run('UPDATE companies SET subscription_status=?, trial_ends_at=?, plan=? WHERE id=?', sets.subscription_status, sets.trial_ends_at, sets.plan ?? 'pro', cid);
    let token = reg.json.token, email = reg.json.user.email;
    if (role !== 'owner') {
      const u = await call('POST', '/api/users', { name: 'Equipe', email: `r${n}${Date.now()}@t.dev`, password: 'secret1234', role }, token);
      assert.equal(u.status, 201, JSON.stringify(u.json));
      const login = await call('POST', '/api/auth/login', { email: u.json.email, password: 'secret1234' });
      token = login.json.token;
    }
    return { token, cid, slug: reg.json.company.slug, ownerToken: reg.json.token };
  };
  return { app, call, tenant, close: () => app.close() };
}
const D = today();
const item = async (t, name, kind, unit, extra = {}) => (await t.call('POST', '/api/items', { name, kind, unit, ...extra }, t.tk.token)).json;
const lotRow = (t, id) => t.app.S.get('SELECT * FROM lots WHERE id=?', id);

async function setup(mode) {
  const t = await boot(mode);
  t.tk = await t.tenant();
  const mp = await item(t, 'Amandes', 'mp', 'kg', { code: 'AKA' });
  const pf = await item(t, 'Beurre', 'pf', 'pot', { code: 'BKA' });
  const customer = (await t.call('POST', '/api/customers', { name: 'Client' }, t.tk.token)).json;
  const tok = t.tk.token;
  t.receive = async (qty, cost = 100, date = D) => (await t.call('POST', '/api/stock/receipts', { item_id: mp.id, qty, unit_cost: cost, date, supplier_name: 'Fournisseur' }, tok));
  t.produce = async (qty, expires, date = D) => { await t.receive(qty, 100, date); return t.call('POST', '/api/productions', { item_id: pf.id, produced_on: date, qty, expires_on: expires, inputs: [{ item_id: mp.id, qty }] }, tok); };
  t.invoice = (lines, extra = {}) => t.call('POST', '/api/invoices', { customer_id: customer.id, issued_on: D, lines, ...extra }, tok);
  Object.assign(t, { mp, pf, customer, tok });
  return t;
}

// ===================== Stock, production, ventes =====================
test('une vente sort d’abord le lot à date limite la plus proche (FEFO)', async () => {
  const t = await setup();
  const far = (await t.produce(50, addDays(D, 300))).json, near = (await t.produce(50, addDays(D, 60))).json;
  const inv = await t.invoice([{ item_id: t.pf.id, qty: 30, unit_price: 2000 }]);
  assert.equal(inv.status, 201);
  assert.equal(inv.json.lines[0].lots[0].lot.code, near.lot.code);
  assert.equal(lotRow(t, near.lot.id).qty_remaining, 20);
  assert.equal(lotRow(t, far.lot.id).qty_remaining, 50);
  assert.equal(inv.json.total_ht, 60000);
  assert.equal(inv.json.total_ttc, 70800); // TVA 18 %
  await t.close();
});

test('stock insuffisant : refus (422) et aucune écriture', async () => {
  const t = await setup();
  const p = (await t.produce(10, addDays(D, 100))).json;
  const r = await t.invoice([{ item_id: t.pf.id, qty: 11, unit_price: 2000 }]);
  assert.equal(r.status, 422);
  assert.match(r.json.errors.business[0], /Stock insuffisant/);
  assert.equal(lotRow(t, p.lot.id).qty_remaining, 10);
  assert.equal(t.app.S.get('SELECT COUNT(*) n FROM invoices').n, 0);
  await t.close();
});

test('un lot périmé n’est jamais vendu', async () => {
  const t = await setup();
  await t.produce(10, addDays(D, -1), addDays(D, -30));
  const r = await t.invoice([{ item_id: t.pf.id, qty: 1, unit_price: 2000 }]);
  assert.equal(r.status, 422);
  await t.close();
});

test('la production consomme les lots les plus anciens (FIFO) et calcule le coût', async () => {
  const t = await setup();
  const old = (await t.receive(40, 200, addDays(D, -20))).json, neu = (await t.receive(40, 300, addDays(D, -2))).json;
  const p = await t.call('POST', '/api/productions', { item_id: t.pf.id, produced_on: D, qty: 10, extra_cost: 1000, inputs: [{ item_id: t.mp.id, qty: 60 }] }, t.tok);
  assert.equal(p.status, 201);
  assert.equal(lotRow(t, old.id).qty_remaining, 0);
  assert.equal(lotRow(t, neu.id).qty_remaining, 20);
  assert.equal(p.json.total_cost, 15000); // 40×200 + 20×300 + 1000
  assert.equal(lotRow(t, p.json.lot.id).unit_cost, 1500);
  await t.close();
});

test('annuler une facture remet le stock en place (une seule fois)', async () => {
  const t = await setup();
  const p = (await t.produce(20, addDays(D, 100))).json;
  const inv = (await t.invoice([{ item_id: t.pf.id, qty: 12, unit_price: 1000 }], { vat_enabled: false })).json;
  assert.equal(lotRow(t, p.lot.id).qty_remaining, 8);
  const c = await t.call('POST', `/api/invoices/${inv.id}/cancel`, {}, t.tok);
  assert.equal(c.status, 200); assert.equal(c.json.status, 'cancelled');
  assert.equal(lotRow(t, p.lot.id).qty_remaining, 20);
  assert.equal((await t.call('POST', `/api/invoices/${inv.id}/cancel`, {}, t.tok)).status, 422);
  await t.close();
});

test('un paiement ne peut pas dépasser le reste dû', async () => {
  const t = await setup();
  await t.produce(20, addDays(D, 100));
  const inv = (await t.invoice([{ item_id: t.pf.id, qty: 10, unit_price: 1000 }], { vat_enabled: false, paid_amount: 4000 })).json;
  assert.equal(inv.balance, 6000);
  assert.equal((await t.call('POST', `/api/invoices/${inv.id}/payments`, { paid_on: D, amount: 7000, method: 'Espèces' }, t.tok)).status, 422);
  const ok = await t.call('POST', `/api/invoices/${inv.id}/payments`, { paid_on: D, amount: 6000, method: 'Espèces' }, t.tok);
  assert.equal(ok.json.payment_status, 'paid');
  await t.close();
});

test('les factures sont numérotées sans trou', async () => {
  const t = await setup();
  await t.produce(50, addDays(D, 100));
  const a = (await t.invoice([{ item_id: t.pf.id, qty: 1, unit_price: 1000 }])).json;
  await t.invoice([{ item_id: t.pf.id, qty: 9999, unit_price: 1000 }]); // refusée : ne consomme pas de numéro
  const b = (await t.invoice([{ item_id: t.pf.id, qty: 1, unit_price: 1000 }])).json;
  assert.equal(a.number, `FAC-${D.slice(0, 4)}-0001`);
  assert.equal(b.number, `FAC-${D.slice(0, 4)}-0002`);
  await t.close();
});

// ===================== Coopérative et traçabilité =====================
test('solde d’un membre = livraisons − paiements, reçus numérotés', async () => {
  const t = await setup();
  const m = (await t.call('POST', '/api/members', { name: 'Awa', village: 'Léo' }, t.tok)).json;
  const d = await t.call('POST', '/api/deliveries', { member_id: m.id, item_id: t.mp.id, delivered_on: D, qty: 100, unit_price: 275, quality: 'A' }, t.tok);
  assert.equal(d.status, 201); assert.equal(d.json.amount, 27500);
  const p = await t.call('POST', '/api/payouts', { member_id: m.id, paid_on: D, amount: 10000, method: 'Orange Money' }, t.tok);
  assert.equal(p.json.number, 'REC-0001');
  assert.equal((await t.call('GET', `/api/members/${m.id}`, null, t.tok)).json.totals.balance, 17500);
  const dash = (await t.call('GET', '/api/coop/dashboard', null, t.tok)).json;
  assert.equal(dash.outstanding, 17500); assert.equal(dash.delivered_qty, 100);
  await t.close();
});

test('une livraison crée un lot rattaché au producteur', async () => {
  const t = await setup();
  const m = (await t.call('POST', '/api/members', { name: 'Awa', village: 'Léo' }, t.tok)).json;
  const d = (await t.call('POST', '/api/deliveries', { member_id: m.id, item_id: t.mp.id, delivered_on: D, qty: 50, unit_price: 275 }, t.tok)).json;
  const lot = (await t.call('GET', `/api/lots/${d.lot.id}`, null, t.tok)).json;
  assert.equal(lot.origin_type, 'member'); assert.equal(lot.member.village, 'Léo');
  await t.close();
});

test('chaîne de traçabilité complète et page publique sans données sensibles', async () => {
  const t = await setup();
  const m = (await t.call('POST', '/api/members', { name: 'Awa Ouédraogo', village: 'Léo' }, t.tok)).json;
  await t.call('POST', '/api/deliveries', { member_id: m.id, item_id: t.mp.id, delivered_on: D, qty: 100, unit_price: 275 }, t.tok);
  const prod = (await t.call('POST', '/api/productions', { item_id: t.pf.id, produced_on: D, qty: 60, expires_on: addDays(D, 365), inputs: [{ item_id: t.mp.id, qty: 50 }] }, t.tok)).json;
  await t.call('POST', '/api/customers', { name: 'Marina Market' }, t.tok);
  const mm = t.app.S.get("SELECT id FROM customers WHERE name='Marina Market'");
  await t.call('POST', '/api/invoices', { customer_id: mm.id, issued_on: D, lines: [{ item_id: t.pf.id, qty: 10, unit_price: 2000 }] }, t.tok);
  const code = prod.lot.code;
  const tr = (await t.call('GET', `/api/trace/${code}`, null, t.tok)).json;
  assert.equal(tr.origin.producers[0].name, 'Awa Ouédraogo');
  assert.equal(tr.sales[0].customer, 'Marina Market');
  const pub = await t.call('GET', `/api/public/trace/${t.tk.slug}/${code}`);
  assert.equal(pub.status, 200);
  assert.deepEqual(pub.json.origin.villages, ['Léo']); assert.equal(pub.json.origin.producers_count, 1);
  for (const secret of ['Awa', 'Marina', 'unit_cost', 'price']) assert.ok(!pub.text.includes(secret), `la page publique ne doit pas contenir « ${secret} »`);
  await t.close();
});

test('un lot de matière première est tracé jusqu’aux clients (rappel de lot)', async () => {
  const t = await setup();
  const m = (await t.call('POST', '/api/members', { name: 'Awa', village: 'Léo' }, t.tok)).json;
  const del = (await t.call('POST', '/api/deliveries', { member_id: m.id, item_id: t.mp.id, delivered_on: D, qty: 100, unit_price: 275 }, t.tok)).json;
  await t.call('POST', '/api/productions', { item_id: t.pf.id, produced_on: D, qty: 60, expires_on: addDays(D, 365), inputs: [{ item_id: t.mp.id, qty: 50 }] }, t.tok);
  await t.invoice([{ item_id: t.pf.id, qty: 5, unit_price: 2000 }]);
  const tr = (await t.call('GET', `/api/trace/${del.lot.code}`, null, t.tok)).json;
  assert.equal(tr.used_in.length, 1); assert.equal(tr.sales.length, 1); assert.equal(tr.sales[0].customer, 'Client');
  await t.close();
});

test('le QR code est une image SVG ; sans site client il contient les infos du lot', async () => {
  const t = await setup();
  const lot = (await t.receive(10)).json;
  const svg = await t.call('GET', `/api/lots/${lot.id}/qr`, null, t.tok);
  assert.equal(svg.status, 200); assert.match(svg.headers.get('content-type'), /svg/); assert.match(svg.text, /<svg/);
  const payload = t.app.S.qrPayload(t.app.S.get('SELECT * FROM companies WHERE id=?', t.tk.cid), t.app.S.get('SELECT * FROM lots WHERE id=?', lot.id));
  assert.ok(payload.includes(lot.code)); assert.ok(payload.includes('Amandes'));
  t.app.S.run("UPDATE companies SET trace_base_url='https://monsite.bf/lot' WHERE id=?", t.tk.cid);
  assert.equal(t.app.S.qrPayload(t.app.S.get('SELECT * FROM companies WHERE id=?', t.tk.cid), t.app.S.get('SELECT * FROM lots WHERE id=?', lot.id)), `https://monsite.bf/lot/${lot.code}`);
  assert.equal((await t.call('GET', `/api/public/qr/${t.tk.slug}/${lot.code}`)).status, 200);
  await t.close();
});

// ===================== Sécurité, rôles, abonnement =====================
test('une entreprise ne voit jamais les données d’une autre', async () => {
  const t = await boot();
  const a = await t.tenant(), b = await t.tenant();
  const it = (await t.call('POST', '/api/items', { name: 'Secret A', kind: 'mp', unit: 'kg' }, a.token)).json;
  assert.deepEqual((await t.call('GET', '/api/items', null, b.token)).json, []);
  assert.equal((await t.call('PUT', `/api/items/${it.id}`, { name: 'Piraté' }, b.token)).status, 404);
  assert.equal(t.app.S.get('SELECT name FROM items WHERE id=?', it.id).name, 'Secret A');
  assert.equal((await t.call('GET', `/api/public/trace/${b.slug}/XXX`)).status, 404);
  await t.close();
});

test('les rôles limitent les actions', async () => {
  const t = await boot();
  const store = await t.tenant('storekeeper');
  assert.equal((await t.call('POST', '/api/customers', { name: 'X' }, store.token)).status, 403);
  assert.equal((await t.call('POST', '/api/invoices', {}, store.token)).status, 403);
  assert.equal((await t.call('PUT', '/api/settings', { name: 'Nouveau' }, store.token)).status, 403);
  assert.equal((await t.call('POST', '/api/items', { name: 'X', kind: 'mp', unit: 'kg' }, store.token)).status, 403);
  assert.equal((await t.call('GET', '/api/items', null, store.token)).status, 200);
  await t.close();
});

test('essai ou abonnement expiré : lecture seule (402)', async () => {
  const t = await boot();
  const x = await t.tenant('owner', { subscription_status: 'trial', trial_ends_at: new Date(Date.now() - 864e5).toISOString() });
  assert.equal((await t.call('GET', '/api/items', null, x.token)).status, 200);
  const r = await t.call('POST', '/api/items', { name: 'X', kind: 'mp', unit: 'kg' }, x.token);
  assert.equal(r.status, 402); assert.equal(r.json.code, 'subscription_expired');
  await t.close();
});

test('l’offre Starter n’inclut pas le module coopérative', async () => {
  const t = await boot();
  const x = await t.tenant('owner', { plan: 'starter' });
  const r = await t.call('GET', '/api/members', null, x.token);
  assert.equal(r.status, 403); assert.equal(r.json.code, 'feature_unavailable');
  await t.close();
});

test('le nombre d’utilisateurs suit l’offre', async () => {
  const t = await boot();
  const x = await t.tenant('owner', { plan: 'starter' });
  for (const n of ['a', 'b']) assert.equal((await t.call('POST', '/api/users', { name: n, email: `${n}${Date.now()}@x.dev`, password: 'secret1234', role: 'manager' }, x.token)).status, 201);
  assert.equal((await t.call('POST', '/api/users', { name: 'c', email: `c${Date.now()}@x.dev`, password: 'secret1234', role: 'manager' }, x.token)).status, 422);
  await t.close();
});

test('inscription, connexion et déconnexion', async () => {
  const t = await boot();
  const r = await t.call('POST', '/api/auth/register', { company_name: 'Karité du Sahel', name: 'Aminata', email: 'aminata@test.dev', password: 'motdepasse1' });
  assert.equal(r.status, 201); assert.equal(r.json.company.subscription_status, 'trial'); assert.equal(r.json.user.role, 'owner');
  assert.equal((await t.call('POST', '/api/auth/login', { email: 'aminata@test.dev', password: 'faux' })).status, 422);
  const ok = await t.call('POST', '/api/auth/login', { email: 'aminata@test.dev', password: 'motdepasse1' });
  assert.equal(ok.status, 200);
  assert.equal((await t.call('GET', '/api/me', null, ok.json.token)).status, 200);
  assert.equal((await t.call('POST', '/api/auth/logout', {}, ok.json.token)).status, 204);
  assert.equal((await t.call('GET', '/api/me', null, ok.json.token)).status, 401);
  assert.equal((await t.call('GET', '/api/items')).status, 401);
  await t.close();
});

test('édition locale : l’inscription se ferme après la création du premier compte', async () => {
  const t = await boot('local');
  assert.equal((await t.call('GET', '/api/public/info')).json.needs_setup, true);
  const r = await t.call('POST', '/api/auth/register', { company_name: 'Ma coopérative', name: 'Directeur', email: 'dir@test.dev', password: 'motdepasse1' });
  assert.equal(r.status, 201); assert.equal(r.json.company.subscription_status, 'active'); assert.equal(r.json.company.writable, true);
  assert.equal((await t.call('GET', '/api/public/info')).json.needs_setup, false);
  assert.equal((await t.call('POST', '/api/auth/register', { company_name: 'Intrus', name: 'X', email: 'x@test.dev', password: 'motdepasse1' })).status, 403);
  await t.close();
});

test('validation : les erreurs sont lisibles en français', async () => {
  const t = await setup();
  const r = await t.call('POST', '/api/items', { name: '', kind: 'zzz', unit: 'kg' }, t.tok);
  assert.equal(r.status, 422); assert.match(r.json.message, /obligatoire/);
  const q = await t.call('POST', '/api/stock/receipts', { item_id: t.mp.id, qty: -5, unit_cost: 1, date: D }, t.tok);
  assert.equal(q.status, 422);
  await t.close();
});

test('sauvegarde : le fichier téléchargé est une base SQLite valide', async () => {
  const t = await setup();
  await t.receive(10);
  const r = await fetch(`http://127.0.0.1:${t.app.server.address().port}/api/backup`, { headers: { Authorization: `Bearer ${t.tok}` } });
  assert.equal(r.status, 200);
  const buf = Buffer.from(await r.arrayBuffer());
  assert.equal(buf.subarray(0, 15).toString(), 'SQLite format 3');
  await t.close();
});

test('données de démonstration : cohérentes et sans stock négatif', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grenier-demo-'));
  const app = startServer({ dataDir: dir, port: 0, host: '127.0.0.1', mode: 'local', backups: false });
  await app.ready;
  const { seedDemo } = await import('../server/seed-demo.js');
  assert.equal(seedDemo(app.S), true); assert.equal(seedDemo(app.S), false);
  assert.equal(app.S.get('SELECT COUNT(*) n FROM lots WHERE qty_remaining < 0').n, 0);
  assert.ok(app.S.get('SELECT COUNT(*) n FROM invoices').n > 10);
  assert.ok(app.S.get('SELECT COUNT(*) n FROM productions').n > 5);
  const c = app.S.get('SELECT id FROM companies');
  const sum = (sql) => app.S.get(sql).s;
  // cohérence : somme des mouvements = somme des quantités restantes
  assert.equal(Math.round(sum('SELECT SUM(qty) s FROM stock_movements') * 1000), Math.round(sum('SELECT SUM(qty_remaining) s FROM lots') * 1000));
  assert.ok(c.id);
  await app.close();
});

// ===================== Réglages et application installable =====================
test('réglages : reglages.json fixe le dossier de données et limite l’accès à cet ordinateur', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grenier-cfg-'));
  const dataDir = path.join(dir, 'mes-donnees');
  const cfgFile = path.join(dir, 'reglages.json');
  fs.writeFileSync(cfgFile, JSON.stringify({ port: 0, reseau: false, dossier_donnees: dataDir }));
  process.env.GRENIER_CONFIG = cfgFile;
  const app = startServer({ backups: false });
  try {
    const port = await app.ready;
    assert.equal(app.server.address().address, '127.0.0.1');       // « reseau »: false
    assert.equal(app.dataDir, dataDir);                              // dossier choisi
    assert.ok(fs.existsSync(path.join(dataDir, 'grenier.db')));
    assert.equal((await fetch(`http://127.0.0.1:${port}/api/public/info`)).status, 200);
  } finally { delete process.env.GRENIER_CONFIG; await app.close(); }
});

test('réglages : un fichier invalide ne empêche pas le démarrage', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grenier-cfg-'));
  const cfgFile = path.join(dir, 'reglages.json');
  fs.writeFileSync(cfgFile, '{ ceci n’est pas du JSON');
  process.env.GRENIER_CONFIG = cfgFile;
  const app = startServer({ dataDir: path.join(dir, 'd'), port: 0, host: '127.0.0.1', backups: false });
  try { await app.ready; assert.ok(app.server.listening); } finally { delete process.env.GRENIER_CONFIG; await app.close(); }
});

test('un port déjà utilisé est signalé clairement', async () => {
  const a = startServer({ dataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'g1-')), port: 0, host: '127.0.0.1', backups: false });
  const port = await a.ready;
  const b = startServer({ dataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'g2-')), port, host: '127.0.0.1', backups: false });
  await assert.rejects(b.ready, (e) => e.code === 'EADDRINUSE');
  b.db.close(); await a.close();
});

test('application installable : manifeste, service worker et icônes sont servis correctement', async () => {
  const t = await boot('local');
  const base = `http://127.0.0.1:${t.app.server.address().port}`;
  const man = await fetch(base + '/manifest.webmanifest');
  assert.equal(man.status, 200); assert.match(man.headers.get('content-type'), /manifest\+json/);
  const j = await man.json();
  assert.equal(j.display, 'standalone'); assert.ok(j.icons.some((i) => i.sizes === '512x512'));
  const sw = await fetch(base + '/sw.js');
  assert.equal(sw.status, 200); assert.match(sw.headers.get('content-type'), /javascript/); assert.equal(sw.headers.get('cache-control'), 'no-cache');
  assert.equal((await fetch(base + '/icon-192.png')).headers.get('content-type'), 'image/png');
  assert.match(await (await fetch(base + '/')).text(), /rel="manifest"/);
  assert.ok(!(await sw.clone().text().catch(() => '')).includes("'/api/'") === false); // le service worker exclut /api
  await t.close();
});

test('les sessions expirent après 30 jours', async () => {
  const t = await boot();
  const x = await t.tenant();
  assert.equal((await t.call('GET', '/api/me', null, x.token)).status, 200);
  t.app.S.run("UPDATE tokens SET created_at = datetime('now','-31 days')");
  assert.equal((await t.call('GET', '/api/me', null, x.token)).status, 401);
  await t.close();
});

// ===================== Codes d'article longs =====================
test('le code de l’article peut être long : il devient le début des numéros de lot', async () => {
  const t = await boot();
  const x = await t.tenant();
  const it = await t.call('POST', '/api/items', { name: 'Beurre de karité', kind: 'mp', unit: 'kg', code: 'Beurre Karité-250g_BIO' }, x.token);
  assert.equal(it.status, 201);
  assert.equal(it.json.code, 'BEURRE-KARITE-250G_BIO');                       // normalisé, accents et espaces gérés
  const lot = (await t.call('POST', '/api/stock/receipts', { item_id: it.json.id, qty: 5, unit_cost: 100, date: D }, x.token)).json;
  assert.ok(lot.code.startsWith('BEURRE-KARITE-250G_BIO-'), lot.code);
  assert.match(lot.code, /^BEURRE-KARITE-250G_BIO-\d{6}-001$/);
  // la fiche de traçabilité, le QR et la page publique fonctionnent avec ce code long
  assert.equal((await t.call('GET', `/api/trace/${encodeURIComponent(lot.code)}`, null, x.token)).status, 200);
  assert.equal((await t.call('GET', `/api/public/qr/${x.slug}/${encodeURIComponent(lot.code)}`)).status, 200);
  assert.equal((await t.call('GET', `/api/public/trace/${x.slug}/${encodeURIComponent(lot.code)}`)).status, 200);
  // jusqu'à 30 caractères exactement ; au-delà : refus clair
  const c30 = 'A'.repeat(30);
  assert.equal((await t.call('POST', '/api/items', { name: 'Trente', kind: 'mp', unit: 'kg', code: c30 }, x.token)).json.code, c30);
  const tooLong = await t.call('POST', '/api/items', { name: 'Trop long', kind: 'mp', unit: 'kg', code: 'B'.repeat(31) }, x.token);
  assert.equal(tooLong.status, 422); assert.match(tooLong.json.message, /trop long \(30 caractères maximum\)/);
  await t.close();
});

test('code d’article modifiable ; les anciens lots gardent leur numéro, les nouveaux prennent le nouveau code', async () => {
  const t = await boot();
  const x = await t.tenant();
  const it = (await t.call('POST', '/api/items', { name: 'Sésame', kind: 'mp', unit: 'kg', code: 'SES' }, x.token)).json;
  const old = (await t.call('POST', '/api/stock/receipts', { item_id: it.id, qty: 5, unit_cost: 100, date: D }, x.token)).json;
  const up = await t.call('PUT', `/api/items/${it.id}`, { code: 'SESAME-GRAINES-BLANC-2026' }, x.token);
  assert.equal(up.json.code, 'SESAME-GRAINES-BLANC-2026');
  const neu = (await t.call('POST', '/api/stock/receipts', { item_id: it.id, qty: 5, unit_cost: 100, date: D }, x.token)).json;
  assert.ok(old.code.startsWith('SES-')); assert.ok(neu.code.startsWith('SESAME-GRAINES-BLANC-2026-'));
  await t.close();
});

test('sans code saisi, un code court est généré à partir du nom (comportement inchangé)', async () => {
  const t = await boot();
  const x = await t.tenant();
  assert.equal((await t.call('POST', '/api/items', { name: 'Mangues séchées', kind: 'pf', unit: 'sachet' }, x.token)).json.code, 'MAN');
  await t.close();
});
