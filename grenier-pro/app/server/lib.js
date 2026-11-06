import crypto from 'node:crypto';

export class HttpError extends Error {
  constructor(status, message, errors, extra) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.extra = extra || {};
  }
}
/** Règle métier non respectée → HTTP 422. */
export const biz = (message) => new HttpError(422, message, { business: [message] });

export const r3 = (x) => Math.round(x * 1000) / 1000;
const pad = (n, l = 2) => String(n).padStart(l, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => iso(new Date());
export const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); const x = new Date(y, m - 1, d); x.setDate(x.getDate() + n); return iso(x); };
export const monthsBack = (n) => { const out = [], now = new Date(); for (let i = n - 1; i >= 0; i--) { const x = new Date(now.getFullYear(), now.getMonth() - i, 1); out.push(`${x.getFullYear()}-${pad(x.getMonth() + 1)}`); } return out; };

// ---------- mots de passe et jetons ----------
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.scryptSync(pw, salt, 64).toString('hex');
}
export function checkPassword(pw, stored) {
  const [salt, key] = String(stored).split(':');
  if (!salt || !key) return false;
  const a = Buffer.from(key, 'hex'), b = crypto.scryptSync(pw, salt, 64);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export const newToken = () => crypto.randomBytes(32).toString('hex');
export const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

// ---------- validation des entrées ----------
const LABEL = { name: 'nom', email: 'adresse e-mail', password: 'mot de passe', qty: 'quantité', amount: 'montant', date: 'date' };
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));

/**
 * rules : { champ: { required, type: 'string'|'number'|'integer'|'date'|'bool'|'email', max, min, gt, in: [...], past } }
 * past (dates) : refuse une date future.
 * Retourne uniquement les champs déclarés, convertis. Lève une erreur 422 si invalide.
 */
export function validate(body, rules, { partial = false } = {}) {
  const out = {}, errors = {};
  body = body && typeof body === 'object' ? body : {};
  for (const [f, r] of Object.entries(rules)) {
    let v = body[f];
    const label = r.label || LABEL[f] || f;
    const empty = v === undefined || v === null || v === '';
    if (empty) {
      if (r.required && !partial) errors[f] = [`Le champ « ${label} » est obligatoire.`];
      else if (v !== undefined) out[f] = null;
      continue;
    }
    const type = r.type || 'string';
    if (type === 'string' || type === 'email') {
      v = String(v).trim();
      if (r.max && v.length > r.max) errors[f] = [`Le champ « ${label} » est trop long (${r.max} caractères maximum).`];
      else if (r.min && v.length < r.min) errors[f] = [`Le champ « ${label} » doit contenir au moins ${r.min} caractères.`];
      else if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors[f] = [`Le champ « ${label} » doit être une adresse valide.`];
    } else if (type === 'number' || type === 'integer') {
      const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
      if (!isFinite(n)) errors[f] = [`Le champ « ${label} » doit être un nombre.`];
      else if (type === 'integer' && !Number.isInteger(Math.round(n * 1e9) / 1e9)) errors[f] = [`Le champ « ${label} » doit être un entier.`];
      else if (r.gt !== undefined && !(n > r.gt)) errors[f] = [`Le champ « ${label} » doit être supérieur à ${r.gt}.`];
      else if (r.min !== undefined && n < r.min) errors[f] = [`Le champ « ${label} » doit être au moins ${r.min}.`];
      else if (r.max !== undefined && n > r.max) errors[f] = [`Le champ « ${label} » doit être au plus ${r.max}.`];
      else v = type === 'integer' ? Math.round(n) : n;
    } else if (type === 'date') {
      v = String(v).slice(0, 10);
      if (!isDate(v)) errors[f] = [`Le champ « ${label} » doit être une date valide.`];
      // Une opération (livraison, paiement, vente…) ne peut pas être datée dans le futur (1 jour de marge pour les fuseaux horaires).
      else if (r.past && v > addDays(today(), 1)) errors[f] = [`Le champ « ${label} » ne peut pas être une date future.`];
    } else if (type === 'bool') {
      v = v === true || v === 1 || v === '1' || v === 'true';
    }
    if (!errors[f] && r.in && !r.in.includes(v)) errors[f] = [`La valeur du champ « ${label} » est invalide.`];
    if (!errors[f]) out[f] = v;
  }
  if (Object.keys(errors).length) {
    const first = Object.values(errors)[0][0];
    throw new HttpError(422, first, errors);
  }
  return out;
}

export const slugify = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'entreprise';
