// Paiements mobiles et USSD.
//
// 1. ORDRES DE PAIEMENT MOBILE MONEY : la coopérative paie un membre (ou toute une liste) sur son téléphone,
//    via un agrégateur de paiement. Le montant est RÉSERVÉ dès l'ordre (il ne peut pas être payé deux fois) ;
//    le paiement n'est enregistré (reçu REC-…, SMS) qu'à la CONFIRMATION de l'agrégateur, par un rappel signé
//    (HMAC-SHA256). En secours, le propriétaire ou le gérant peut confirmer ou annuler à la main.
//    Fournisseurs (reglages.json → "paiement") :
//      { "fournisseur": "simulation" }   pour essayer sans contrat (réussit ; échoue si le numéro finit par 000)
//      { "fournisseur": "http", "url": "https://agregateur/api/payouts", "entetes": {…}, "secret_rappel": "…" }
//         envoie POST { reference, amount, currency: "XOF", phone, operator, callback_url } ;
//         attend un rappel POST /api/payments/callback { reference, status: "success"|"failed", transaction_id, message }
//         signé dans l'en-tête X-Grenier-Signature (HMAC-SHA256 hexadécimal du corps avec secret_rappel).
//         Chaque agrégateur a son format : l'adaptation tient dans sendHttp() / la lecture du rappel ci-dessous.
//
// 2. USSD : un membre compose le code USSD (*XXX#) depuis n'importe quel téléphone et consulte son solde, ses
//    dernières livraisons et paiements, et les prix d'achat. Format de passerelle : Africa's Talking (sessionId,
//    phoneNumber, text → « CON … » / « END … »). Adresse : POST /api/ussd?cle=<reglages.json → ussd.cle>.
//    Données : membres des entreprises hébergées sur ce serveur, et membres des installations locales qui ont
//    activé l'USSD (soldes envoyés avec le résumé de Grenier en ligne).
import crypto from 'node:crypto';
import { validate, HttpError, biz } from '../lib.js';
import { normalizePhone } from '../notify.js';

export const schema = `
CREATE TABLE IF NOT EXISTS payment_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL, member_id INTEGER NOT NULL, amount INTEGER NOT NULL,
  operator TEXT NOT NULL, phone TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'en_attente', advance INTEGER NOT NULL DEFAULT 0,
  provider TEXT NOT NULL, provider_ref TEXT, client_ref TEXT, payout_id INTEGER, error TEXT, batch TEXT,
  created_by INTEGER, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_ref ON payment_orders(company_id, client_ref) WHERE client_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS payment_orders_member ON payment_orders(member_id, status);
`;
export const OPERATORS = { orange: 'Orange Money', moov: 'Moov Money', coris: 'Coris Money', wave: 'Wave' };
const PENDING = ['en_attente', 'envoye'];

export function routes({ add, S, RULE, x, created }) {
  const cfg = x.paiement || null;
  const provider = cfg?.fournisseur ?? null;
  const fcfa = (n) => new Intl.NumberFormat('fr-FR').format(n).replace(/ | /g, ' ');
  const view = (o) => ({ ...o, advance: !!o.advance, operator_label: OPERATORS[o.operator] ?? o.operator, member: S.get('SELECT id,name,village,phone FROM members WHERE id=?', o.member_id) });
  const pendingOf = (mid) => Number(S.get(`SELECT SUM(amount) s FROM payment_orders WHERE member_id=? AND status IN ('en_attente','envoye')`, mid)?.s ?? 0);

  /** Confirmation (rappel, simulation ou main) : enregistre le paiement et son reçu, une seule fois. */
  function complete(o, ok, ref, message) {
    return S.tx(() => {
      const cur = S.get('SELECT * FROM payment_orders WHERE id=?', o.id);
      if (!PENDING.includes(cur.status)) return view(cur); // déjà traité (rappel répété)
      if (!ok) {
        S.run("UPDATE payment_orders SET status='echoue', error=?, provider_ref=COALESCE(?,provider_ref), updated_at=CURRENT_TIMESTAMP WHERE id=?", String(message ?? 'Échec').slice(0, 300), ref ?? null, cur.id);
        return view(S.get('SELECT * FROM payment_orders WHERE id=?', cur.id));
      }
      S.run("UPDATE payment_orders SET status='reussi', provider_ref=COALESCE(?,provider_ref), updated_at=CURRENT_TIMESTAMP WHERE id=?", ref ?? null, cur.id);
      const p = S.createPayout(cur.company_id, { member_id: cur.member_id, paid_on: new Date().toISOString().slice(0, 10), amount: cur.amount, method: OPERATORS[cur.operator] ?? cur.operator, reference: ref ?? cur.provider_ref ?? `ordre ${cur.id}`, note: cur.batch ? `Paie ${cur.batch}` : null, advance: !!cur.advance, internal: true, client_ref: `ordre-${cur.id}` }, cur.created_by);
      S.run('UPDATE payment_orders SET payout_id=? WHERE id=?', p.id, cur.id);
      return view(S.get('SELECT * FROM payment_orders WHERE id=?', cur.id));
    });
  }

  async function sendHttp(o) {
    const callback = x.publicUrl ? `${x.publicUrl.replace(/\/+$/, '')}/api/payments/callback` : null;
    const r = await fetch(cfg.url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cfg.entetes || {}) }, body: JSON.stringify({ reference: `GRN-${o.company_id}-${o.id}`, amount: o.amount, currency: 'XOF', phone: o.phone, operator: o.operator, callback_url: callback }) });
    const text = await r.text();
    if (!r.ok) throw new Error(`Agrégateur : HTTP ${r.status} ${text.slice(0, 200)}`);
    let j = {}; try { j = JSON.parse(text); } catch { /* */ }
    return j.transaction_id ?? j.id ?? null;
  }
  /** Transmet l'ordre au fournisseur (hors transaction). */
  async function dispatch(o) {
    try {
      if (provider === 'simulation') {
        S.run("UPDATE payment_orders SET status='envoye', provider_ref=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", `SIM-${o.id}`, o.id);
        setTimeout(() => { try { complete(o, !o.phone.endsWith('000'), `SIM-${o.id}`, 'Numéro refusé par l’opérateur (simulation)'); } catch { /* base fermée */ } }, x.simDelay ?? 1500).unref();
        return;
      }
      const ref = await sendHttp(o);
      S.run("UPDATE payment_orders SET status='envoye', provider_ref=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", ref, o.id);
    } catch (e) {
      S.run("UPDATE payment_orders SET status='echoue', error=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", String(e.message).slice(0, 300), o.id);
    }
  }

  function createOrder(company, user, d, batch) {
    if (!provider) throw biz("Aucun service de paiement mobile n'est configuré (reglages.json → \"paiement\"). Enregistrez le paiement à la main avec la référence de la transaction.");
    if (d.client_ref) { const dup = S.get('SELECT * FROM payment_orders WHERE company_id=? AND client_ref=?', company.id, d.client_ref); if (dup) return { order: dup, duplicate: true }; }
    const m = S.must(S.get('SELECT * FROM members WHERE id=? AND company_id=?', d.member_id, company.id), 'Membre');
    const phone = normalizePhone(d.phone || m.phone);
    if (!phone) throw biz(`Numéro de téléphone manquant ou invalide pour ${m.name}.`);
    if (d.advance && !RULE.correct.includes(user.role)) throw new HttpError(403, 'Seuls le propriétaire et le gérant peuvent accorder une avance.');
    const available = S.memberBalance(m.id) - pendingOf(m.id);
    if (!d.advance && d.amount > available) throw biz(`Le montant dépasse ce qui reste à payer à ${m.name} (${fcfa(Math.max(available, 0))} FCFA, paiements en cours déduits).`);
    const id = S.lastId(S.run('INSERT INTO payment_orders(company_id,member_id,amount,operator,phone,advance,provider,client_ref,batch,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)',
      company.id, m.id, d.amount, d.operator, phone, d.advance ? 1 : 0, provider, d.client_ref ?? null, batch ?? null, user.id));
    return { order: S.get('SELECT * FROM payment_orders WHERE id=?', id) };
  }

  const orderRules = { member_id: { required: true, type: 'integer' }, amount: { required: true, type: 'integer', gt: 0 }, operator: { required: true, in: Object.keys(OPERATORS), label: 'opérateur' }, phone: { max: 30 }, advance: { type: 'bool' }, client_ref: { max: 64 } };

  add('GET', '/api/payments/config', {}, () => ({ provider, operators: OPERATORS, ussd: !!x.ussd?.cle }));
  add('GET', '/api/payments/orders', { feature: 'coop', roles: RULE.payout }, ({ company, query }) => {
    const p = [company.id]; let sql = 'SELECT * FROM payment_orders WHERE company_id=?';
    if (query.status === 'pending') sql += " AND status IN ('en_attente','envoye')"; else if (query.status) { sql += ' AND status=?'; p.push(String(query.status)); }
    return S.all(sql + ' ORDER BY id DESC LIMIT 300', ...p).map(view);
  });
  add('POST', '/api/payments/orders', { feature: 'coop', roles: RULE.payout }, async ({ company, user, body }) => {
    const d = validate(body, orderRules);
    const r = S.tx(() => createOrder(company, user, d));
    if (r.duplicate) return view(r.order);
    await dispatch(r.order);
    return created(view(S.get('SELECT * FROM payment_orders WHERE id=?', r.order.id)));
  });
  /** Paie de campagne : plusieurs membres d'un coup (tout ou rien pour la création des ordres). */
  add('POST', '/api/payments/batch', { feature: 'coop', roles: RULE.correct }, async ({ company, user, body }) => {
    const label = validate(body, { label: { required: true, max: 80, label: 'nom de la paie' } }).label;
    if (!Array.isArray(body.orders) || !body.orders.length || body.orders.length > 500) throw new HttpError(422, 'Choisissez de 1 à 500 membres.');
    const rows = body.orders.map((o) => validate(o, orderRules));
    const made = S.tx(() => rows.map((d) => createOrder(company, user, { ...d, advance: false }, label).order));
    for (const o of made) await dispatch(o);
    return created({ count: made.length, total: made.reduce((s, o) => s + o.amount, 0), orders: made.map((o) => view(S.get('SELECT * FROM payment_orders WHERE id=?', o.id))) });
  });
  /** Secours : confirmer (avec la référence) ou annuler un ordre que l'agrégateur n'a pas confirmé. */
  add('POST', '/api/payments/orders/:id/resolve', { feature: 'coop', roles: RULE.correct }, ({ company, params, body }) => {
    const d = validate(body, { status: { required: true, in: ['reussi', 'annule'] }, reference: { max: 80, label: 'référence' }, note: { required: true, min: 3, max: 200, label: 'motif' } });
    const o = S.must(S.get('SELECT * FROM payment_orders WHERE id=? AND company_id=?', Number(params.id), company.id), 'Ordre');
    if (!PENDING.includes(o.status)) throw biz('Cet ordre est déjà terminé.');
    if (d.status === 'reussi') { if (!d.reference) throw new HttpError(422, 'Indiquez la référence de la transaction.', { reference: ['Indiquez la référence de la transaction.'] }); return complete(o, true, d.reference); }
    S.run("UPDATE payment_orders SET status='annule', error=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", d.note, o.id);
    return view(S.get('SELECT * FROM payment_orders WHERE id=?', o.id));
  });
  /** Rappel de l'agrégateur (signé). */
  add('POST', '/api/payments/callback', { public: true, raw: true, maxBytes: 64e3 }, ({ headers, body }) => {
    const secret = cfg?.secret_rappel;
    if (!secret) throw new HttpError(404, 'Rappel non configuré.');
    const sig = String(headers['x-grenier-signature'] ?? '');
    const expect = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) throw new HttpError(401, 'Signature invalide.');
    let j; try { j = JSON.parse(body.toString('utf8')); } catch { throw new HttpError(400, 'JSON invalide.'); }
    const m = /^GRN-(\d+)-(\d+)$/.exec(String(j.reference ?? ''));
    const o = m && S.get('SELECT * FROM payment_orders WHERE id=? AND company_id=?', Number(m[2]), Number(m[1]));
    if (!o) throw new HttpError(404, 'Ordre inconnu.');
    const r = complete(o, j.status === 'success', j.transaction_id ?? null, j.message);
    return { ok: true, status: r.status };
  });

  // ---------- USSD ----------
  add('POST', '/api/ussd', { public: true, raw: true, maxBytes: 8e3 }, ({ query, headers, body }) => {
    if (!x.ussd?.cle || query.cle !== x.ussd.cle) throw new HttpError(403, 'Accès refusé.');
    const text = body.toString('utf8');
    const f = String(headers['content-type'] ?? '').includes('json') ? JSON.parse(text || '{}') : Object.fromEntries(new URLSearchParams(text));
    return { raw: ussdReply(S, String(f.phoneNumber ?? ''), String(f.text ?? '')), type: 'text/plain; charset=utf-8' };
  });
  // activation par l'installation locale (soldes envoyés avec le résumé Grenier en ligne)
  add('POST', '/api/payments/ussd', { roles: RULE.admin }, ({ company, body }) => {
    const on = validate(body, { enabled: { required: true, type: 'bool' } }).enabled;
    S.run("INSERT INTO meta(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", `ussd_enabled_${company.id}`, on ? '1' : '0');
    return { enabled: on };
  });
}

/** Cherche le membre (entreprises hébergées + installations locales qui ont envoyé leurs soldes). */
function findMember(S, phone) {
  const out = [];
  for (const m of S.all("SELECT m.*, c.name AS coop FROM members m JOIN companies c ON c.id=m.company_id WHERE m.active=1 AND m.phone IS NOT NULL AND m.phone<>''")) {
    if (normalizePhone(m.phone) !== phone) continue;
    if (S.get("SELECT value FROM meta WHERE key=?", `ussd_enabled_${m.company_id}`)?.value !== '1') continue;
    const d = S.memberDetail(m.company_id, m.id);
    out.push({ coop: m.coop, name: m.name, balance: d.totals.balance,
      deliveries: d.deliveries.slice(0, 3).map((x) => ({ date: x.delivered_on, qty: x.qty, unit: x.item.unit, item: x.item.name, amount: x.amount })),
      payouts: d.payouts.slice(0, 3).map((p) => ({ date: p.paid_on, amount: p.amount, method: p.method })),
      prices: S.all("SELECT name, unit, ref_price FROM items WHERE company_id=? AND kind='mp' AND ref_price>0 ORDER BY name", m.company_id) });
  }
  for (const s of S.all('SELECT s.data, a.name FROM cloud_snapshots s JOIN registry_accounts a ON a.id=s.account_id WHERE a.active=1')) {
    const data = JSON.parse(s.data);
    for (const m of data.members ?? []) if (normalizePhone(m.phone) === phone) out.push({ coop: data.company?.name ?? s.name, ...m, prices: data.prices ?? [] });
  }
  return out;
}
const n = (v) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(v).replace(/ | /g, ' ');
const dmy = (s) => s.slice(5, 10).split('-').reverse().join('/');
const plain = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Menu USSD (texte sans accents : tous les téléphones l'affichent). */
export function ussdReply(S, rawPhone, text) {
  const phone = normalizePhone(rawPhone);
  const list = phone ? findMember(S, phone) : [];
  if (!list.length) return 'END Grenier : ce numero n\'est enregistre dans aucune cooperative. Adressez-vous a votre cooperative.';
  let steps = text ? text.split('*') : [];
  let m = list[0];
  if (list.length > 1) {
    if (!steps.length) return 'CON Grenier - choisissez votre cooperative\n' + list.map((x, i) => `${i + 1}. ${plain(x.coop)}`).join('\n');
    m = list[Number(steps[0]) - 1];
    if (!m) return 'END Choix invalide.';
    steps = steps.slice(1);
  }
  const menu = `CON ${plain(m.coop)}\nBonjour ${plain(m.name.split(' ')[0])}\n1. Mon solde\n2. Mes dernieres livraisons\n3. Mes derniers paiements\n4. Prix d'achat`;
  if (!steps.length) return menu;
  switch (steps[0]) {
    case '1': return m.balance >= 0 ? `END Votre solde : ${n(m.balance)} FCFA a recevoir de ${plain(m.coop)}.` : `END Vous devez ${n(-m.balance)} FCFA a ${plain(m.coop)} (avance).`;
    case '2': return 'END ' + (m.deliveries.length ? m.deliveries.map((d) => `${dmy(d.date)} ${n(d.qty)}${d.unit} ${plain(d.item)} ${n(d.amount)}F`).join('\n') : 'Aucune livraison.');
    case '3': return 'END ' + (m.payouts.length ? m.payouts.map((p) => `${dmy(p.date)} ${n(p.amount)}F ${plain(p.method)}`).join('\n') : 'Aucun paiement.');
    case '4': return 'END ' + (m.prices?.length ? m.prices.map((p) => `${plain(p.name)} : ${n(p.ref_price)}F/${p.unit}`).join('\n') : 'Prix non communiques.');
    default: return 'END Choix invalide.';
  }
}
