// Grenier en ligne : synchronisation entre une installation locale et le serveur hébergé.
//
// Le même compte que le registre de traçabilité (clé grt_…) sert pour :
//   1. la SAUVEGARDE EN LIGNE : chaque jour, une copie de la base est compressée et CHIFFRÉE sur le poste
//      (AES-256-GCM, clé dérivée d'un code de récupération que seul le client connaît), puis envoyée.
//      Le serveur ne peut pas lire ces sauvegardes. Restauration sur un nouveau PC avec la clé + le code.
//   2. la CONSULTATION À DISTANCE : un résumé (chiffres clés, alertes, stock) est envoyé toutes les 15 minutes ;
//      le propriétaire le consulte sur https://<serveur>/distant avec un code d'accès qu'il choisit.
//   3. les SOLDES DES MEMBRES pour le service USSD (module paiements), si le propriétaire l'active.
// Ce n'est pas une réplication complète : on ne saisit pas sur le serveur des données de l'installation locale.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { validate, HttpError, biz, hashPassword, checkPassword } from '../lib.js';

export const schema = `
CREATE TABLE IF NOT EXISTS cloud_backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  size INTEGER NOT NULL, sha256 TEXT NOT NULL, salt TEXT NOT NULL, iv TEXT NOT NULL, data BLOB NOT NULL
);
CREATE INDEX IF NOT EXISTS cloud_backups_account ON cloud_backups(account_id, id);
CREATE TABLE IF NOT EXISTS cloud_snapshots (account_id INTEGER PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS cloud_remote (account_id INTEGER PRIMARY KEY, code_hash TEXT NOT NULL);
`;
const KEEP = 30;

// ---------- chiffrement ----------
export const normalizeCode = (c) => String(c ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
/** Code de récupération : 24 caractères (≈ 120 bits), par groupes de 4. */
export function newRecoveryCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = crypto.randomBytes(24);
  return Array.from(b, (x) => A[x % 32]).join('').match(/.{4}/g).join('-');
}
const deriveKey = (code, salt) => crypto.scryptSync(normalizeCode(code), salt, 32, { N: 16384, r: 8, p: 1 });
export function encrypt(plain, code) {
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', deriveKey(code, salt), iv);
  const data = Buffer.concat([c.update(zlib.gzipSync(plain)), c.final(), c.getAuthTag()]);
  return { salt: salt.toString('base64'), iv: iv.toString('base64'), data, sha256: crypto.createHash('sha256').update(plain).digest('hex') };
}
export function decrypt({ data, salt, iv, sha256 }, code) {
  const d = crypto.createDecipheriv('aes-256-gcm', deriveKey(code, Buffer.from(salt, 'base64')), Buffer.from(iv, 'base64'));
  d.setAuthTag(data.subarray(data.length - 16));
  let plain;
  try { plain = zlib.gunzipSync(Buffer.concat([d.update(data.subarray(0, data.length - 16)), d.final()])); }
  catch { throw new Error('Code de récupération incorrect (ou sauvegarde endommagée).'); }
  if (sha256 && crypto.createHash('sha256').update(plain).digest('hex') !== sha256) throw new Error('Sauvegarde endommagée (empreinte différente).');
  return plain;
}

/** Télécharge la dernière sauvegarde en ligne, la déchiffre et vérifie qu'elle s'ouvre. Retourne le chemin du fichier restauré. */
export async function fetchLatestBackup({ url, key, code, dataDir }) {
  const base = String(url).trim().replace(/\/+$/, '');
  const H = { Authorization: `Bearer ${key}` };
  const list = await fetch(`${base}/api/cloud/backups`, { headers: H }).catch(() => null);
  if (!list) throw new Error('Serveur Grenier en ligne injoignable.');
  if (list.status === 401) throw new Error('Clé refusée par le serveur.');
  if (!list.ok) throw new Error(`Serveur : HTTP ${list.status}`);
  const rows = await list.json();
  if (!rows.length) throw new Error('Aucune sauvegarde en ligne pour ce compte.');
  const r = await fetch(`${base}/api/cloud/backups/${rows[0].id}`, { headers: H });
  if (!r.ok) throw new Error(`Téléchargement impossible : HTTP ${r.status}`);
  const plain = decrypt({ data: Buffer.from(await r.arrayBuffer()), salt: r.headers.get('x-grenier-salt'), iv: r.headers.get('x-grenier-iv'), sha256: r.headers.get('x-grenier-sha256') }, code);
  const out = path.join(dataDir, 'grenier-restauration.db');
  fs.writeFileSync(out, plain);
  const test = new DatabaseSync(out);
  try { const n = test.prepare('SELECT COUNT(*) n FROM companies').get().n; if (!n) throw new Error('Sauvegarde vide.'); } finally { test.close(); }
  return { file: out, created_at: rows[0].created_at };
}

const meta = (S, k) => S.get('SELECT value FROM meta WHERE key=?', k)?.value ?? null;
const setMeta = (S, k, v) => (v === null ? S.run('DELETE FROM meta WHERE key=?', k) : S.run('INSERT INTO meta(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', k, String(v)));
const connected = (S) => S.all("SELECT * FROM companies WHERE registry_key IS NOT NULL AND registry_key<>'' AND trace_base_url IS NOT NULL AND trace_base_url<>''");

/** Résumé consultable à distance (chiffres clés, alertes, stock, coopérative, soldes pour l'USSD si activé). */
export function buildSnapshot(S, c) {
  const stock = S.listItems(c.id).map((i) => ({ name: i.name, kind: i.kind, unit: i.unit, stock: i.stock, low: i.low_stock, value: i.stock_value }));
  const out = { company: { name: c.name }, generated_at: new Date().toISOString(), dashboard: S.dashboard(c.id), stock, coop: S.coopStats(c.id, 30) };
  if (meta(S, `ussd_enabled_${c.id}`) === '1') {
    out.members = S.all("SELECT id, name, phone FROM members WHERE company_id=? AND active=1 AND phone IS NOT NULL AND phone<>''", c.id).map((m) => {
      const d = S.memberDetail(c.id, m.id);
      return { name: m.name, phone: m.phone, balance: d.totals.balance, deliveries: d.deliveries.slice(0, 3).map((x) => ({ date: x.delivered_on, qty: x.qty, unit: x.item.unit, item: x.item.name, amount: x.amount })), payouts: d.payouts.slice(0, 3).map((p) => ({ date: p.paid_on, amount: p.amount, method: p.method })) };
    });
    out.prices = S.all("SELECT name, unit, ref_price FROM items WHERE company_id=? AND kind='mp' AND ref_price>0 ORDER BY name", c.id);
  }
  return out;
}

export function routes({ add, S, RULE, mode, x, created }) {
  const account = (headers) => { const a = x.registry.account(headers.authorization); if (!a) throw new HttpError(401, 'Clé invalide.'); return a; };
  const secret = () => { let s = meta(S, 'cloud_secret'); if (!s) { s = crypto.randomBytes(32).toString('hex'); setMeta(S, 'cloud_secret', s); } return s; };
  const sign = (v) => crypto.createHmac('sha256', secret()).update(v).digest('base64url');

  // ===================== côté SERVEUR (compte Grenier en ligne) =====================
  add('POST', '/api/cloud/backups', { public: true, raw: true, maxBytes: 60e6 }, ({ headers, body }) => {
    const acc = account(headers);
    const salt = String(headers['x-grenier-salt'] ?? ''), iv = String(headers['x-grenier-iv'] ?? ''), sha = String(headers['x-grenier-sha256'] ?? '');
    if (!salt || !iv || !/^[0-9a-f]{64}$/.test(sha) || !body.length) throw new HttpError(422, 'Sauvegarde incomplète.');
    return S.tx(() => {
      const id = S.lastId(S.run('INSERT INTO cloud_backups(account_id,size,sha256,salt,iv,data) VALUES (?,?,?,?,?,?)', acc.id, body.length, sha, salt, iv, body));
      const old = S.all('SELECT id FROM cloud_backups WHERE account_id=? ORDER BY id DESC LIMIT -1 OFFSET ?', acc.id, KEEP);
      for (const o of old) S.run('DELETE FROM cloud_backups WHERE id=?', o.id);
      return created({ id, size: body.length });
    });
  });
  add('GET', '/api/cloud/backups', { public: true, limit: 'auth' }, ({ headers }) => S.all('SELECT id, created_at, size FROM cloud_backups WHERE account_id=? ORDER BY id DESC', account(headers).id));
  add('GET', '/api/cloud/backups/:id', { public: true, limit: 'auth' }, ({ headers, params }) => {
    const b = S.must(S.get('SELECT * FROM cloud_backups WHERE id=? AND account_id=?', Number(params.id), account(headers).id), 'Sauvegarde');
    return { raw: Buffer.from(b.data), type: 'application/octet-stream', headers: { 'X-Grenier-Salt': b.salt, 'X-Grenier-Iv': b.iv, 'X-Grenier-Sha256': b.sha256 } };
  });
  add('POST', '/api/cloud/snapshot', { public: true }, ({ headers, body }) => {
    const acc = account(headers);
    if (!body || typeof body.data !== 'object') throw new HttpError(422, 'Résumé invalide.');
    S.run('INSERT INTO cloud_snapshots(account_id,data,updated_at) VALUES (?,?,CURRENT_TIMESTAMP) ON CONFLICT(account_id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at', acc.id, JSON.stringify(body.data));
    return { ok: true };
  });
  add('POST', '/api/cloud/remote-code', { public: true }, ({ headers, body }) => {
    const acc = account(headers);
    const d = validate(body, { code: { required: true, min: 6, max: 100, label: "code d'accès" } });
    S.run('INSERT INTO cloud_remote(account_id,code_hash) VALUES (?,?) ON CONFLICT(account_id) DO UPDATE SET code_hash=excluded.code_hash', acc.id, hashPassword(d.code));
    return { ok: true };
  });
  // consultation à distance (téléphone du propriétaire)
  add('POST', '/api/public/remote/login', { public: true, limit: 'auth' }, ({ body }) => {
    const d = validate(body, { slug: { required: true, max: 80, label: 'identifiant' }, code: { required: true, max: 100, label: "code d'accès" } });
    const acc = S.get('SELECT * FROM registry_accounts WHERE slug=? AND active=1', d.slug.trim().toLowerCase());
    const r = acc && S.get('SELECT * FROM cloud_remote WHERE account_id=?', acc.id);
    if (!r || !checkPassword(d.code, r.code_hash)) throw new HttpError(422, 'Identifiant ou code incorrect.', { code: ['Identifiant ou code incorrect.'] });
    const exp = Date.now() + 12 * 3600e3;
    return { token: `${acc.id}.${exp}.${sign(`${acc.id}.${exp}`)}`, name: acc.name };
  });
  add('GET', '/api/public/remote/summary', { public: true }, ({ headers }) => {
    const [id, exp, sig] = String(headers['x-remote-token'] ?? '').split('.');
    const ok = id && exp && sig && Number(exp) > Date.now() && crypto.timingSafeEqual(Buffer.from(sign(`${id}.${exp}`)), Buffer.from(sig.padEnd(43).slice(0, 43)));
    if (!ok) throw new HttpError(401, 'Session expirée.');
    const s = S.get('SELECT * FROM cloud_snapshots WHERE account_id=?', Number(id));
    if (!s) throw new HttpError(404, "Aucun résumé reçu pour l'instant : l'installation n'a pas encore été reliée, ou n'a pas d'internet.");
    const data = JSON.parse(s.data); delete data.members;
    return { ...data, received_at: s.updated_at };
  });

  // ===================== côté INSTALLATION LOCALE =====================
  add('GET', '/api/cloud/status', { roles: RULE.correct }, ({ company }) => ({
    connected: !!(company.registry_key && company.trace_base_url), url: company.trace_base_url ?? null, slug: company.registry_slug ?? null, hosted: mode === 'saas',
    backup_enabled: !!meta(S, 'cloud_recovery'), last_backup: meta(S, 'cloud_last_backup'), last_backup_error: meta(S, 'cloud_backup_error'),
    last_snapshot: meta(S, 'cloud_last_snapshot'), snapshot_error: meta(S, 'cloud_snapshot_error'), remote_set: meta(S, `cloud_remote_${company.id}`) === '1',
    ussd_enabled: meta(S, `ussd_enabled_${company.id}`) === '1',
  }));
  add('POST', '/api/cloud/backup/enable', { roles: RULE.admin, always: true }, ({ company }) => {
    if (!(company.registry_key && company.trace_base_url)) throw biz("Reliez d'abord Grenier au serveur en ligne (adresse + clé).");
    if (meta(S, 'cloud_recovery')) throw biz('La sauvegarde en ligne est déjà activée.');
    const code = newRecoveryCode();
    setMeta(S, 'cloud_recovery', code);
    setTimeout(() => runBackup(S, x).catch(() => {}), 50);
    return { code };
  });
  add('POST', '/api/cloud/backup/disable', { roles: RULE.admin, always: true }, () => { setMeta(S, 'cloud_recovery', null); return { ok: true }; });
  add('POST', '/api/cloud/backup/now', { roles: RULE.correct, always: true }, async () => {
    if (!meta(S, 'cloud_recovery')) throw biz("La sauvegarde en ligne n'est pas activée.");
    const r = await runBackup(S, x);
    if (r.error) throw biz(r.error);
    return r;
  });
  add('POST', '/api/cloud/recovery', { roles: RULE.admin, always: true }, ({ user, body }) => {
    const d = validate(body, { password: { required: true, label: 'mot de passe' } });
    if (!checkPassword(d.password, S.get('SELECT password FROM users WHERE id=?', user.id).password)) throw new HttpError(422, 'Mot de passe incorrect.', { password: ['Mot de passe incorrect.'] });
    return { code: meta(S, 'cloud_recovery') };
  });
  add('POST', '/api/cloud/remote', { roles: RULE.admin }, async ({ company, body }) => {
    const d = validate(body, { code: { required: true, min: 6, max: 100, label: "code d'accès" } });
    if (!(company.registry_key && company.trace_base_url)) throw biz("Reliez d'abord Grenier au serveur en ligne.");
    const r = await fetch(`${company.trace_base_url.replace(/\/+$/, '')}/api/cloud/remote-code`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${company.registry_key}` }, body: JSON.stringify({ code: d.code }) }).catch(() => null);
    if (!r || !r.ok) throw biz('Serveur en ligne injoignable : réessayez avec une connexion internet.');
    setMeta(S, `cloud_remote_${company.id}`, '1');
    runSnapshot(S).catch(() => {});
    return { ok: true, url: `${company.trace_base_url.replace(/\/+$/, '')}/distant`, slug: company.registry_slug };
  });
  add('POST', '/api/cloud/snapshot/now', { roles: RULE.correct, always: true }, async () => runSnapshot(S));
  // restauration sur une installation NEUVE (aucune entreprise) : remplace la base puis redémarre
  add('POST', '/api/public/cloud-restore', { public: true, limit: 'auth' }, async ({ body }) => {
    if (S.get('SELECT COUNT(*) n FROM companies').n > 0) throw new HttpError(403, 'La restauration en ligne ne se fait que sur une installation neuve (aucune donnée).');
    const d = validate(body, { url: { required: true, max: 200, label: 'adresse du serveur' }, key: { required: true, max: 200, label: 'clé' }, code: { required: true, max: 60, label: 'code de récupération' } });
    let r;
    try { r = await fetchLatestBackup({ ...d, dataDir: x.dataDir }); } catch (e) { throw biz(e.message); }
    setTimeout(() => {
      const target = path.join(x.dataDir, 'grenier.db');
      x.db.close();
      for (const ext of ['-wal', '-shm']) if (fs.existsSync(target + ext)) fs.rmSync(target + ext);
      if (fs.existsSync(target)) fs.renameSync(target, path.join(x.dataDir, `grenier-avant-restauration-${Date.now()}.db`));
      fs.renameSync(r.file, target);
      x.requestRestart();
    }, 100);
    return { restored: true, backup_date: r.created_at };
  });
}

/** Sauvegarde chiffrée vers le serveur (installation locale). */
export async function runBackup(S, x) {
  const code = meta(S, 'cloud_recovery');
  const c = connected(S)[0];
  if (!code || !c) return { skipped: true };
  let tmp;
  try {
    tmp = x.snapshotDb();
    const enc = encrypt(fs.readFileSync(tmp), code);
    const r = await fetch(`${c.trace_base_url.replace(/\/+$/, '')}/api/cloud/backups`, {
      method: 'POST', body: enc.data,
      headers: { 'Content-Type': 'application/octet-stream', Authorization: `Bearer ${c.registry_key}`, 'X-Grenier-Salt': enc.salt, 'X-Grenier-Iv': enc.iv, 'X-Grenier-Sha256': enc.sha256 },
    });
    if (!r.ok) throw new Error(`Serveur : HTTP ${r.status}`);
    setMeta(S, 'cloud_last_backup', new Date().toISOString()); setMeta(S, 'cloud_backup_error', null);
    return { ok: true, size: enc.data.length };
  } catch (e) {
    const msg = e.cause?.code === 'ECONNREFUSED' || /fetch failed/.test(e.message) ? 'Serveur injoignable (pas d’internet ?)' : e.message;
    setMeta(S, 'cloud_backup_error', `${new Date().toISOString()} ${msg}`);
    return { error: msg };
  } finally { if (tmp && fs.existsSync(tmp)) fs.rmSync(tmp); }
}

/** Envoie le résumé consultable à distance. */
export async function runSnapshot(S) {
  let sent = 0;
  for (const c of connected(S)) {
    if (meta(S, `cloud_remote_${c.id}`) !== '1' && meta(S, `ussd_enabled_${c.id}`) !== '1') continue;
    try {
      const r = await fetch(`${c.trace_base_url.replace(/\/+$/, '')}/api/cloud/snapshot`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.registry_key}` }, body: JSON.stringify({ data: buildSnapshot(S, c) }) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      sent++; setMeta(S, 'cloud_last_snapshot', new Date().toISOString()); setMeta(S, 'cloud_snapshot_error', null);
    } catch (e) { setMeta(S, 'cloud_snapshot_error', `${new Date().toISOString()} ${e.message}`); }
  }
  return { sent };
}

export function jobs({ S, x }) {
  const backupIfDue = () => {
    const last = meta(S, 'cloud_last_backup');
    if (meta(S, 'cloud_recovery') && (!last || Date.now() - Date.parse(last) > 23 * 3600e3)) runBackup(S, x).catch(() => {});
  };
  return [setInterval(backupIfDue, 30 * 60e3), setInterval(() => runSnapshot(S).catch(() => {}), 15 * 60e3), setTimeout(backupIfDue, 60e3)];
}
