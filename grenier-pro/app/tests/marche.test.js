// Marché : offres (hébergée et locale), demandes d'achat, mises en relation, observatoire des prix.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../server/index.js';
import { today } from '../server/lib.js';
import { createRegistryAccount } from '../server/registry.js';

const D = today();
async function boot(opts = {}) {
  const app = startServer({ dataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'gm-')), port: 0, host: '127.0.0.1', mode: 'saas', backups: false, timers: false, licence: false, ...opts });
  const base = `http://127.0.0.1:${await app.ready}`;
  const call = async (method, url, body, tok) => { const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); let json = null; try { json = JSON.parse(t); } catch { /* */ } return { status: r.status, json }; };
  return { app, base, call, close: () => app.close() };
}
async function company(t, name, price) {
  const reg = await t.call('POST', '/api/auth/register', { company_name: name, name: 'P', email: `p${Math.random()}@t.dev`, password: 'secret1234' });
  t.app.S.run("UPDATE companies SET subscription_status='active', trial_ends_at=NULL WHERE id=?", reg.json.company.id);
  const tok = reg.json.token;
  const mp = (await t.call('POST', '/api/items', { name: 'Amandes de karité', kind: 'mp', unit: 'kg', filiere: 'karite' }, tok)).json;
  if (price) await t.call('POST', '/api/stock/receipts', { item_id: mp.id, qty: 1000, unit_cost: price, date: D }, tok);
  return { tok, mp };
}
const offer = { product: 'Amandes de karité', filiere: 'karite', qty: 5, unit: 'tonne', price: 250000, quality: 'Bio, sèches', region: 'Léo', phone: '+226 70 00 00 01' };

test('marché : une entreprise hébergée publie, un acheteur la contacte sans compte, le vendeur voit le contact', async () => {
  const t = await boot();
  const a = await company(t, 'Union des productrices de Léo');
  assert.equal((await t.call('POST', '/api/market/offers', { ...offer, qty: 0 }, a.tok)).status, 422);
  const o = await t.call('POST', '/api/market/offers', offer, a.tok);
  assert.equal(o.status, 201);
  const list = (await t.call('GET', '/api/public/market?filiere=karite')).json;
  assert.equal(list.offers.length, 1); assert.equal(list.offers[0].seller, 'Union des productrices de Léo');
  assert.equal((await t.call('POST', '/api/public/market/contacts', { offer_id: o.json.id, name: 'SahelTrade', phone: '+226 76 04 00 04', message: 'Prix pour 20 t ?' })).status, 201);
  const mine = (await t.call('GET', '/api/market/mine', null, a.tok)).json;
  assert.equal(mine.contacts.length, 1); assert.equal(mine.contacts[0].name, 'SahelTrade');
  // demande d'achat publique
  assert.equal((await t.call('POST', '/api/public/market/requests', { buyer: 'Huilerie Bobo', phone: '70707070', product: 'Sésame blanc', filiere: 'sesame', qty: 30, unit: 'tonne' })).status, 201);
  assert.equal((await t.call('GET', '/api/public/market')).json.requests.length, 1);
  assert.equal((await t.call('GET', '/api/public/market')).json.requests[0].phone, undefined); // jamais en public
  assert.equal((await t.call('GET', '/api/market/browse', null, a.tok)).json.requests[0].phone, '70707070'); // vendeur identifié
  // retrait de l'offre
  await t.call('POST', `/api/market/offers/${o.json.id}/close`, {}, a.tok);
  assert.equal((await t.call('GET', '/api/public/market')).json.offers.length, 0);
  await t.close();
});

test('marché : une installation locale publie via le serveur en ligne', async () => {
  const hub = await boot();
  const acc = createRegistryAccount(hub.app.db, 'coop-po', 'Coopérative de Pô');
  const local = await boot({ mode: 'local' });
  const c = await company(local, 'Coopérative de Pô');
  assert.equal((await local.call('POST', '/api/market/offers', offer, c.tok)).status, 422); // pas encore reliée
  await local.call('POST', '/api/registry/connect', { url: hub.base, key: acc.key }, c.tok);
  const o = await local.call('POST', '/api/market/offers', offer, c.tok);
  assert.equal(o.status, 201, JSON.stringify(o.json));
  assert.equal((await hub.call('GET', '/api/public/market')).json.offers[0].seller, 'Coopérative de Pô');
  assert.equal((await local.call('GET', '/api/market/browse', null, c.tok)).json.offers.length, 1);
  await hub.call('POST', '/api/public/market/contacts', { offer_id: o.json.id, name: 'Acheteur', phone: '71717171' });
  assert.equal((await local.call('GET', '/api/market/mine', null, c.tok)).json.contacts.length, 1);
  await local.close(); await hub.close();
});

test('observatoire : prix moyen publié seulement à partir de deux sources', async () => {
  const t = await boot();
  const a = await company(t, 'A', 250), b = await company(t, 'B', 300);
  await t.call('POST', '/api/market/share', { enabled: true }, a.tok);
  assert.equal((await t.call('GET', '/api/public/market/prices')).json.length, 0); // une seule source
  await t.call('POST', '/api/market/share', { enabled: true }, b.tok);
  const p = (await t.call('GET', '/api/public/market/prices')).json;
  assert.equal(p.length, 1); assert.equal(p[0].filiere, 'karite'); assert.equal(p[0].price, 275); assert.equal(p[0].sources, 2);
  await t.close();
});
