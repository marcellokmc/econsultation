// Marché : offres de vente des coopératives et unités, demandes d'achat des acheteurs, mises en relation,
// observatoire des prix d'achat par filière.
//
// Le marché vit sur le SERVEUR HÉBERGÉ (place de marché commune). Les entreprises hébergées y publient
// directement ; les installations locales publient avec la clé de leur compte Grenier en ligne.
// Les acheteurs consultent /marche sans compte et laissent leurs coordonnées ; le vendeur est prévenu.
// Les prix de l'observatoire sont des moyennes par filière et par mois, publiées seulement à partir de
// 2 sources (on ne peut pas en déduire les prix d'une coopérative).
import { validate, HttpError, biz, today, addDays } from '../lib.js';

export const schema = `
CREATE TABLE IF NOT EXISTS market_offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT, owner TEXT NOT NULL, seller TEXT NOT NULL, region TEXT, product TEXT NOT NULL, filiere TEXT,
  qty REAL NOT NULL, unit TEXT NOT NULL, price INTEGER, quality TEXT, certifications TEXT, available_on TEXT, phone TEXT, description TEXT,
  status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_on TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS market_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT, buyer TEXT NOT NULL, phone TEXT NOT NULL, product TEXT NOT NULL, filiere TEXT, qty REAL, unit TEXT,
  price_max INTEGER, region TEXT, description TEXT, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_on TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS market_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, offer_id INTEGER, request_id INTEGER, name TEXT NOT NULL, phone TEXT NOT NULL, message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS market_prices (
  owner TEXT NOT NULL, filiere TEXT NOT NULL, period TEXT NOT NULL, avg_price REAL NOT NULL, qty REAL NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (owner, filiere, period)
);
`;
export const FILIERES = { karite: 'Karité', sesame: 'Sésame', cajou: 'Cajou (anacarde)', mangue: 'Mangue', arachide: 'Arachide', mais: 'Maïs', sorgho: 'Sorgho / mil', riz: 'Riz', soja: 'Soja', niebe: 'Niébé', lait: 'Lait', miel: 'Miel', moringa: 'Moringa', hibiscus: 'Bissap (hibiscus)', autre: 'Autre' };
const OFFER_RULES = {
  product: { required: true, max: 120, label: 'produit' }, filiere: { in: Object.keys(FILIERES) }, qty: { required: true, type: 'number', gt: 0, label: 'quantité' }, unit: { required: true, max: 20, label: 'unité' },
  price: { type: 'integer', min: 0, label: 'prix' }, quality: { max: 80, label: 'qualité' }, certifications: { max: 120 }, available_on: { type: 'date', label: 'disponible le' },
  region: { max: 80, label: 'région ou localité' }, phone: { required: true, max: 30, label: 'téléphone de contact' }, description: { max: 600 }, days: { type: 'integer', min: 7, max: 120 },
};

/** Prix d'achat moyens par filière et par mois (3 derniers mois), à partir des livraisons et des entrées de stock. */
export function computePrices(S, cid) {
  const since = addDays(today(), -92).slice(0, 7) + '-01';
  return S.all(`SELECT i.filiere, substr(l.received_on,1,7) AS period, SUM(l.qty_initial*l.unit_cost)/SUM(l.qty_initial) AS avg_price, SUM(l.qty_initial) AS qty
    FROM lots l JOIN items i ON i.id=l.item_id WHERE l.company_id=? AND i.filiere IS NOT NULL AND i.filiere<>'' AND i.kind='mp' AND l.origin_type IN ('member','supplier')
    AND l.unit_cost>0 AND l.received_on>=? AND (l.id NOT IN (SELECT lot_id FROM deliveries WHERE status='cancelled')) GROUP BY i.filiere, period`, cid, since);
}

export function routes({ add, S, RULE, mode, x, created }) {
  const sellers = [...RULE.correct, 'accountant'];
  // ---------- fonctions de la place de marché (serveur) ----------
  const active = "status='active' AND expires_on>=?";
  function createOffer(owner, sellerName, body) {
    const d = validate(body, OFFER_RULES);
    const id = S.lastId(S.run('INSERT INTO market_offers(owner,seller,region,product,filiere,qty,unit,price,quality,certifications,available_on,phone,description,expires_on) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      owner, sellerName, d.region ?? null, d.product, d.filiere ?? null, d.qty, d.unit, d.price ?? null, d.quality ?? null, d.certifications ?? null, d.available_on ?? null, d.phone, d.description ?? null, addDays(today(), d.days ?? 60)));
    return S.get('SELECT * FROM market_offers WHERE id=?', id);
  }
  function closeOffer(owner, id) {
    const o = S.must(S.get('SELECT * FROM market_offers WHERE id=? AND owner=?', Number(id), owner), 'Offre');
    S.run("UPDATE market_offers SET status='close' WHERE id=?", o.id);
    return { ...o, status: 'close' };
  }
  const mine = (owner) => {
    const offers = S.all('SELECT * FROM market_offers WHERE owner=? ORDER BY id DESC LIMIT 100', owner);
    return { offers, contacts: offers.length ? S.all(`SELECT c.*, o.product FROM market_contacts c JOIN market_offers o ON o.id=c.offer_id WHERE o.owner=? ORDER BY c.id DESC LIMIT 200`, owner) : [] };
  };
  /** withPhones : numéros des acheteurs, réservés aux vendeurs identifiés (entreprise connectée ou compte en ligne). */
  function browse(q, withPhones = false) {
    const p = [today()]; let w = active;
    if (q.filiere) { w += ' AND filiere=?'; p.push(String(q.filiere)); }
    if (q.q) { w += ' AND (product LIKE ? OR region LIKE ? OR description LIKE ?)'; const s = `%${q.q}%`; p.push(s, s, s); }
    return {
      offers: S.all(`SELECT id,seller,region,product,filiere,qty,unit,price,quality,certifications,available_on,phone,description,created_at,expires_on FROM market_offers WHERE ${w} ORDER BY id DESC LIMIT 200`, ...p),
      requests: S.all(`SELECT id,buyer,${withPhones ? 'phone,' : ''}region,product,filiere,qty,unit,price_max,description,created_at,expires_on FROM market_requests WHERE ${w} ORDER BY id DESC LIMIT 200`, ...p),
      filieres: FILIERES,
    };
  }
  function prices() {
    const rows = S.all("SELECT filiere, period, SUM(avg_price*qty)/SUM(qty) AS price, SUM(qty) AS qty, COUNT(DISTINCT owner) AS sources FROM market_prices WHERE period>=? GROUP BY filiere, period HAVING COUNT(DISTINCT owner)>=2 ORDER BY filiere, period", addDays(today(), -92).slice(0, 7));
    return rows.map((r) => ({ ...r, price: Math.round(r.price), label: FILIERES[r.filiere] ?? r.filiere }));
  }
  const storePrices = (owner, rows) => S.tx(() => {
    S.run('DELETE FROM market_prices WHERE owner=?', owner);
    for (const r of rows.slice(0, 200)) if (FILIERES[r.filiere] && /^\d{4}-\d{2}$/.test(r.period) && r.avg_price > 0 && r.qty > 0) S.run('INSERT INTO market_prices(owner,filiere,period,avg_price,qty) VALUES (?,?,?,?,?)', owner, r.filiere, r.period, Number(r.avg_price), Number(r.qty));
  });
  const acc = (headers) => { const a = x.registry.account(headers.authorization); if (!a) throw new HttpError(401, 'Clé invalide.'); return a; };

  // ---------- public (acheteurs, visiteurs) ----------
  add('GET', '/api/public/market', { public: true }, ({ query }) => browse(query));
  add('GET', '/api/public/market/prices', { public: true }, () => prices());
  add('POST', '/api/public/market/requests', { public: true, limit: 'auth' }, ({ body }) => {
    const d = validate(body, { buyer: { required: true, max: 120, label: 'nom' }, phone: { required: true, max: 30, label: 'téléphone' }, product: { required: true, max: 120, label: 'produit recherché' },
      filiere: { in: Object.keys(FILIERES) }, qty: { type: 'number', gt: 0 }, unit: { max: 20 }, price_max: { type: 'integer', min: 0 }, region: { max: 80 }, description: { max: 600 } });
    const id = S.lastId(S.run('INSERT INTO market_requests(buyer,phone,product,filiere,qty,unit,price_max,region,description,expires_on) VALUES (?,?,?,?,?,?,?,?,?,?)',
      d.buyer, d.phone, d.product, d.filiere ?? null, d.qty ?? null, d.unit ?? null, d.price_max ?? null, d.region ?? null, d.description ?? null, addDays(today(), 60)));
    return created({ id });
  });
  add('POST', '/api/public/market/contacts', { public: true, limit: 'auth' }, ({ body }) => {
    const d = validate(body, { offer_id: { type: 'integer' }, name: { required: true, max: 120, label: 'nom' }, phone: { required: true, max: 30, label: 'téléphone' }, message: { max: 600 } });
    const o = S.must(d.offer_id && S.get(`SELECT * FROM market_offers WHERE id=? AND ${active}`, d.offer_id, today()), 'Offre');
    S.run('INSERT INTO market_contacts(offer_id,name,phone,message) VALUES (?,?,?,?)', o.id, d.name, d.phone, d.message ?? null);
    const [kind, id] = o.owner.split(':');
    if (kind === 'co') x.messenger?.enqueue(Number(id), o.phone, `Grenier Marche: ${d.name} (${d.phone}) est interesse par votre offre "${o.product}". ${d.message ? 'Message: ' + d.message : ''}`, 'marche', `offre-${o.id}`);
    return created({ ok: true });
  });

  // ---------- installations locales (clé du compte en ligne) ----------
  add('GET', '/api/hub/market/mine', { public: true }, ({ headers }) => mine(`acc:${acc(headers).id}`));
  add('GET', '/api/hub/market/browse', { public: true }, ({ headers, query }) => { acc(headers); return browse(query, true); });
  add('POST', '/api/hub/market/offers', { public: true }, ({ headers, body }) => { const a = acc(headers); return created(createOffer(`acc:${a.id}`, body.seller || a.name, body)); });
  add('POST', '/api/hub/market/offers/:id/close', { public: true }, ({ headers, params }) => closeOffer(`acc:${acc(headers).id}`, params.id));
  add('POST', '/api/hub/market/prices', { public: true }, ({ headers, body }) => { storePrices(`acc:${acc(headers).id}`, Array.isArray(body.rows) ? body.rows : []); return { ok: true }; });

  // ---------- application (entreprise connectée) : directe si hébergée, relayée vers le serveur si locale ----------
  async function hub(company, method, url, body) {
    if (!(company.registry_key && company.trace_base_url)) throw biz('Reliez Grenier au serveur en ligne (Paramètres → Grenier en ligne) pour utiliser le marché.');
    const r = await fetch(`${company.trace_base_url.replace(/\/+$/, '')}${url}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${company.registry_key}` }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
    if (!r) throw biz('Serveur en ligne injoignable : le marché demande une connexion internet.');
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) throw biz('Le serveur en ligne a refusé la clé de cette installation : vérifiez la liaison (Paramètres → Grenier en ligne).');
    if (!r.ok) throw new HttpError(r.status === 403 ? 422 : r.status, j.message ?? `Serveur : HTTP ${r.status}`, j.errors);
    return j;
  }
  const local = mode !== 'saas';
  add('GET', '/api/market/browse', {}, ({ company, query }) => (local ? hub(company, 'GET', `/api/hub/market/browse?${new URLSearchParams(query)}`) : browse(query, true)));
  add('GET', '/api/market/prices', {}, ({ company }) => (local ? hub(company, 'GET', '/api/public/market/prices') : prices()));
  add('GET', '/api/market/mine', { roles: sellers }, ({ company }) => (local ? hub(company, 'GET', '/api/hub/market/mine') : mine(`co:${company.id}`)));
  add('POST', '/api/market/offers', { roles: sellers }, async ({ company, body }) => created(local ? await hub(company, 'POST', '/api/hub/market/offers', { ...body, seller: company.name }) : createOffer(`co:${company.id}`, company.name, body)));
  add('POST', '/api/market/offers/:id/close', { roles: sellers }, ({ company, params }) => (local ? hub(company, 'POST', `/api/hub/market/offers/${Number(params.id)}/close`) : closeOffer(`co:${company.id}`, params.id)));
  add('GET', '/api/market/share', {}, ({ company }) => ({ enabled: S.get('SELECT value FROM meta WHERE key=?', `market_prices_${company.id}`)?.value === '1', mine: computePrices(S, company.id) }));
  add('POST', '/api/market/share', { roles: RULE.admin }, async ({ company, body }) => {
    const on = validate(body, { enabled: { required: true, type: 'bool' } }).enabled;
    S.run('INSERT INTO meta(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', `market_prices_${company.id}`, on ? '1' : '0');
    const rows = on ? computePrices(S, company.id) : [];
    if (local) await hub(company, 'POST', '/api/hub/market/prices', { rows }); else storePrices(`co:${company.id}`, rows);
    return { enabled: on };
  });
}

/** Chaque jour : republie les prix des entreprises qui partagent (hébergées : direct ; locales : vers le serveur). */
export function jobs({ S, x }) {
  const run = async () => {
    for (const c of S.all('SELECT * FROM companies')) {
      if (S.get('SELECT value FROM meta WHERE key=?', `market_prices_${c.id}`)?.value !== '1') continue;
      const rows = computePrices(S, c.id);
      try {
        if (x.mode === 'saas') {
          S.tx(() => { S.run('DELETE FROM market_prices WHERE owner=?', `co:${c.id}`); for (const r of rows) S.run('INSERT INTO market_prices(owner,filiere,period,avg_price,qty) VALUES (?,?,?,?,?)', `co:${c.id}`, r.filiere, r.period, r.avg_price, r.qty); });
        } else if (c.registry_key && c.trace_base_url) {
          await fetch(`${c.trace_base_url.replace(/\/+$/, '')}/api/hub/market/prices`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.registry_key}` }, body: JSON.stringify({ rows }) });
        }
      } catch { /* sans internet : demain */ }
    }
  };
  return [setInterval(run, 24 * 3600e3), setTimeout(run, 5 * 60e3)];
}
