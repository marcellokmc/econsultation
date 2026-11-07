// Grenier en ligne : sauvegarde chiffrée, restauration sur un nouveau poste, consultation à distance.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../server/index.js';
import { today } from '../server/lib.js';
import { createRegistryAccount } from '../server/registry.js';
import { encrypt, decrypt, newRecoveryCode, normalizeCode } from '../server/modules/cloud.js';

const D = today();
async function boot(opts) {
  const dir = opts.dataDir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'gc-'));
  const app = startServer({ dataDir: dir, port: 0, host: '127.0.0.1', backups: false, timers: false, licence: false, ...opts });
  const base = `http://127.0.0.1:${await app.ready}`;
  const call = async (method, url, body, tok, extra = {}) => {
    const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}), ...extra }, body: body ? JSON.stringify(body) : undefined });
    const t = await r.text(); let json = null; try { json = JSON.parse(t); } catch { /* */ } return { status: r.status, json };
  };
  return { app, base, call, dir, close: () => app.close() };
}

test('chiffrement : aller-retour, code avec ou sans tirets, mauvais code refusé', () => {
  const code = newRecoveryCode();
  assert.match(code, /^([A-Z2-9]{4}-){5}[A-Z2-9]{4}$/);
  const plain = Buffer.from('données de la coopérative '.repeat(200));
  const enc = encrypt(plain, code);
  assert.ok(!enc.data.includes(Buffer.from('coopérative')));
  assert.ok(enc.data.length < plain.length); // compressé
  assert.deepEqual(decrypt(enc, normalizeCode(code).toLowerCase()), plain);
  assert.throws(() => decrypt(enc, newRecoveryCode()), /Code de récupération incorrect/);
});

test('sauvegarde en ligne chiffrée, consultation à distance, restauration sur un PC neuf', async () => {
  const cloud = await boot({ mode: 'saas' });
  const acc = createRegistryAccount(cloud.app.db, 'coop-wp', 'Coopérative Wend-Panga');
  // --- installation locale ---
  const local = await boot({ mode: 'local' });
  const reg = await local.call('POST', '/api/auth/register', { company_name: 'Coopérative Wend-Panga', name: 'Pdte', email: 'pdte@wp.bf', password: 'secret1234' });
  const tok = reg.json.token;
  const mp = (await local.call('POST', '/api/items', { name: 'Karité', kind: 'mp', unit: 'kg' }, tok)).json;
  const m = (await local.call('POST', '/api/members', { name: 'Awa', village: 'Léo', phone: '70112233' }, tok)).json;
  await local.call('POST', '/api/deliveries', { member_id: m.id, item_id: mp.id, delivered_on: D, qty: 100, unit_price: 275 }, tok);
  assert.equal((await local.call('POST', '/api/cloud/backup/enable', {}, tok)).status, 422); // pas encore relié
  assert.equal((await local.call('POST', '/api/registry/connect', { url: cloud.base, key: acc.key }, tok)).status, 200);
  const en = await local.call('POST', '/api/cloud/backup/enable', {}, tok);
  assert.equal(en.status, 200); const code = en.json.code;
  const now = await local.call('POST', '/api/cloud/backup/now', {}, tok);
  assert.equal(now.status, 200, JSON.stringify(now.json));
  const stored = cloud.app.S.all('SELECT * FROM cloud_backups');
  assert.ok(stored.length >= 1);
  assert.ok(!Buffer.from(stored[0].data).includes(Buffer.from('Wend-Panga'))); // illisible pour le serveur
  const st = (await local.call('GET', '/api/cloud/status', null, tok)).json;
  assert.equal(st.backup_enabled, true); assert.ok(st.last_backup);
  // le code se réaffiche avec le mot de passe du propriétaire
  assert.equal((await local.call('POST', '/api/cloud/recovery', { password: 'mauvais' }, tok)).status, 422);
  assert.equal((await local.call('POST', '/api/cloud/recovery', { password: 'secret1234' }, tok)).json.code, code);

  // --- consultation à distance ---
  assert.equal((await local.call('POST', '/api/cloud/remote', { code: 'baobab-2026' }, tok)).status, 200);
  await local.call('POST', '/api/cloud/snapshot/now', {}, tok);
  assert.equal((await cloud.call('POST', '/api/public/remote/login', { slug: 'coop-wp', code: 'faux-code' })).status, 422);
  const login = await cloud.call('POST', '/api/public/remote/login', { slug: 'coop-wp', code: 'baobab-2026' });
  assert.equal(login.status, 200);
  const sum = await cloud.call('GET', '/api/public/remote/summary', null, null, { 'X-Remote-Token': login.json.token });
  assert.equal(sum.status, 200); assert.equal(sum.json.company.name, 'Coopérative Wend-Panga'); assert.equal(sum.json.dashboard.owed_to_members, 27500);
  assert.equal((await cloud.call('GET', '/api/public/remote/summary', null, null, { 'X-Remote-Token': login.json.token.slice(0, -2) + 'xx' })).status, 401);

  // --- restauration sur un PC neuf ---
  let restarted;
  const restartedP = new Promise((r) => { restarted = r; });
  const fresh = await boot({ mode: 'local', onRestart: () => restarted() });
  assert.equal((await fresh.call('POST', '/api/public/cloud-restore', { url: cloud.base, key: acc.key, code: 'AAAA-BBBB-CCCC-DDDD-EEEE-FFFF' })).status, 422); // mauvais code
  const rr = await fresh.call('POST', '/api/public/cloud-restore', { url: cloud.base, key: acc.key, code: code.toLowerCase().replaceAll('-', ' ') });
  assert.equal(rr.status, 200, JSON.stringify(rr.json));
  await restartedP;
  await new Promise((r) => fresh.app.server.close(r));
  const again = await boot({ mode: 'local', dataDir: fresh.dir });
  const relog = await again.call('POST', '/api/auth/login', { email: 'pdte@wp.bf', password: 'secret1234' });
  assert.equal(relog.status, 200);
  assert.equal((await again.call('GET', '/api/members', null, relog.json.token)).json[0].balance, 27500);
  // une installation qui a déjà des données refuse la restauration
  assert.equal((await again.call('POST', '/api/public/cloud-restore', { url: cloud.base, key: acc.key, code })).status, 403);
  await again.close(); await local.close(); await cloud.close();
});
