// Licences signées (édition installée chez le client, mode « local »).
// Une licence est un texte « données.signature » signé avec la clé PRIVÉE de l'éditeur (outils-editeur/licence.js),
// vérifié ici avec la clé PUBLIQUE. Sans licence valide : 60 jours d'essai, puis lecture seule.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLANS } from './services.js';
import { today, addDays } from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const TRIAL_DAYS = 60;

function publicKey() {
  const file = process.env.GRENIER_LICENCE_PUBKEY || path.join(here, 'licence-cle-publique.pem');
  return fs.existsSync(file) ? crypto.createPublicKey(fs.readFileSync(file)) : null;
}

/** Vérifie une licence. Retourne { ok, data } ou { ok:false, error }. */
export function readLicence(text, key = publicKey()) {
  try {
    const [payload, sig] = String(text || '').trim().split('.');
    if (!payload || !sig) return { ok: false, error: 'Format de licence invalide.' };
    if (!key) return { ok: false, error: 'Clé publique de licence absente de cette installation.' };
    if (!crypto.verify(null, Buffer.from(payload), key, Buffer.from(sig, 'base64url'))) return { ok: false, error: 'Signature invalide : cette licence n\'a pas été émise par l\'éditeur ou a été modifiée.' };
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!PLANS[data.plan]) return { ok: false, error: 'Offre inconnue dans la licence.' };
    return { ok: true, data };
  } catch { return { ok: false, error: 'Licence illisible.' }; }
}

/** Signe une licence (outil éditeur uniquement : nécessite la clé privée). */
export function signLicence(data, privateKeyPem) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto.sign(null, Buffer.from(payload), crypto.createPrivateKey(privateKeyPem)).toString('base64url');
  return `${payload}.${sig}`;
}

const meta = (db, k) => db.prepare('SELECT value FROM meta WHERE key=?').get(k)?.value ?? null;
const setMeta = (db, k, v) => db.prepare('INSERT INTO meta(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k, v);

/**
 * Applique la licence (ou l'essai) aux entreprises de l'installation et retourne l'état.
 * Appelée au démarrage, toutes les heures et à l'enregistrement d'une licence.
 */
export function applyLicence(db) {
  if (!meta(db, 'first_start')) setMeta(db, 'first_start', today());
  const trialEnd = addDays(meta(db, 'first_start'), TRIAL_DAYS);
  const text = meta(db, 'licence');
  const lic = text ? readLicence(text) : null;
  const companies = db.prepare('SELECT * FROM companies').all();
  if (lic?.ok) {
    const until = lic.data.expires ? `${lic.data.expires}T23:59:59.000Z` : null;
    for (const c of companies) db.prepare("UPDATE companies SET plan=?, subscription_status='active', paid_until=?, trial_ends_at=NULL WHERE id=?").run(lic.data.plan, until, c.id);
    const expired = !!until && until < new Date().toISOString();
    return { state: expired ? 'licence_expiree' : 'licence', client: lic.data.client, plan: lic.data.plan, expires: lic.data.expires ?? null, id: lic.data.id ?? null };
  }
  for (const c of companies) db.prepare("UPDATE companies SET subscription_status='trial', trial_ends_at=?, paid_until=NULL WHERE id=?").run(`${trialEnd}T23:59:59.000Z`, c.id);
  return { state: trialEnd >= today() ? 'essai' : 'essai_termine', trial_ends: trialEnd, error: lic && !lic.ok ? lic.error : null };
}

export function installLicence(db, text) {
  const lic = readLicence(text);
  if (!lic.ok) return lic;
  setMeta(db, 'licence', String(text).trim());
  return { ok: true, status: applyLicence(db) };
}
