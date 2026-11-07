// Grenier Trace : QR codes vérifiables par le consommateur ou l'acheteur.
//
// Chaque lot reçoit un jeton aléatoire (public_token) imprimé dans le QR : https://<registre>/v/<entreprise>/<lot>/<jeton>.
// - Serveur hébergé (mode saas) : les lots sont dans sa base, la page de vérification les lit directement.
// - Installation locale : Grenier PUBLIE ses lots vers un registre en ligne (un serveur Grenier hébergé) dès qu'internet
//   est disponible. Seules les informations publiques partent : produit, lot, dates, villages d'origine — jamais de noms
//   de producteurs ou de clients, ni de prix.
// Un QR recopié reste lisible (c'est le cas de tout QR) ; le compteur de vérifications signale les copies massives.
import crypto from 'node:crypto';
import { sha, slugify } from './lib.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const frDate = (s) => (s ? s.slice(0, 10).split('-').reverse().join('/') : '');
export const SCAN_WARNING = 200;

/** Page HTML de vérification (rendue par le serveur : lisible sans JavaScript, légère pour les réseaux 2G). */
export function verifyPage({ found, data, scans, publishedBy }) {
  let body;
  if (!found) {
    body = `<div class="badge bad">✖ Code non reconnu</div>
      <p>Ce code ne correspond à aucun lot enregistré. Le produit peut être une <strong>contrefaçon</strong>, ou l'étiquette a été mal imprimée.</p>
      <p>Ne consommez pas le produit en cas de doute et signalez-le au vendeur.</p>`;
  } else {
    const expired = data.expires_on && data.expires_on < new Date().toISOString().slice(0, 10);
    const badge = data.withdrawn ? '<div class="badge bad">⚠ Lot authentique mais RETIRÉ DE LA VENTE — ne pas consommer</div>'
      : `<div class="badge ${expired ? 'warn' : 'ok'}">${expired ? '⚠ Lot authentique mais PÉRIMÉ' : '✔ Lot authentique'}</div>`;
    body = `${badge}${data.controls ? `<p class="muted">${data.controls} contrôle(s) qualité conforme(s) enregistré(s).</p>` : ''}
      <h1>${esc(data.product)}</h1>
      <dl>
        <dt>Lot</dt><dd>${esc(data.lot)}</dd>
        <dt>${data.kind === 'pf' ? 'Fabriqué le' : 'Reçu le'}</dt><dd>${frDate(data.date)}</dd>
        ${data.expires_on ? `<dt>À consommer avant</dt><dd>${frDate(data.expires_on)}</dd>` : ''}
        ${data.origin?.villages?.length ? `<dt>Origine</dt><dd>${esc(data.origin.villages.join(', '))}${data.origin.producers_count ? ` · ${data.origin.producers_count} producteur(s)` : ''}</dd>` : ''}
        <dt>Producteur</dt><dd>${esc(data.company?.name)}${data.company?.address ? `<br>${esc(data.company.address)}` : ''}${data.company?.phone ? `<br>${esc(data.company.phone)}` : ''}</dd>
      </dl>
      <p class="muted">Code vérifié ${scans} fois.${scans > SCAN_WARNING ? ' <strong>Nombre inhabituel : si vous venez d\'acheter ce produit, signalez-le au producteur (étiquette peut-être copiée).</strong>' : ''}</p>
      ${publishedBy ? `<p class="muted">Publié le ${frDate(publishedBy)}.</p>` : ''}`;
  }
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vérification de lot — Grenier Trace</title><meta name="robots" content="noindex">
<style>body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#F1F3F0;color:#1A2030}main{max-width:520px;margin:0 auto;padding:16px}
.card{background:#fff;border:1px solid #D9DFE4;border-radius:12px;padding:20px}.badge{display:inline-block;padding:8px 12px;border-radius:8px;font-weight:700;margin-bottom:8px}
.ok{background:#E1F1E7;color:#1F6B43}.bad{background:#FBE4E2;color:#A52A23}.warn{background:#FBF0D9;color:#8F5E08}h1{font-size:22px;margin:8px 0}
dl{display:grid;grid-template-columns:auto 1fr;gap:6px 14px}dt{color:#566074}dd{margin:0;font-weight:500}.muted{color:#566074;font-size:14px}
footer{margin-top:14px;color:#566074;font-size:13px;text-align:center}@media (prefers-color-scheme:dark){body{background:#0E131E;color:#E6E9F2}.card{background:#161C2B;border-color:#2A3346}dt,.muted,footer{color:#9AA4BA}}</style></head>
<body><main><div class="card">${body}</div><footer>Vérification Grenier Trace</footer></main></body></html>`;
}

/** Crée un compte sur le registre (serveur hébergé) et retourne sa clé, affichée une seule fois. */
export function createRegistryAccount(db, slugWanted, name) {
  const slug = slugify(slugWanted);
  if (db.prepare('SELECT 1 x FROM registry_accounts WHERE slug=?').get(slug) || db.prepare('SELECT 1 x FROM companies WHERE slug=?').get(slug)) {
    throw new Error(`L'identifiant « ${slug} » est déjà pris sur ce registre : choisissez-en un autre.`);
  }
  const key = 'grt_' + crypto.randomBytes(24).toString('base64url');
  db.prepare('INSERT INTO registry_accounts(slug,name,key_hash) VALUES (?,?,?)').run(slug, name, sha(key));
  return { slug, key };
}

export function makeRegistry({ db, S }) {
  /** Recherche le lot (base locale d'abord, puis lots publiés par des installations locales) et compte la vérification. */
  function verify(slug, code, token) {
    const c = S.get('SELECT * FROM companies WHERE slug=? OR registry_slug=?', slug, slug);
    if (c) {
      const lot = S.get('SELECT * FROM lots WHERE company_id=? AND code=?', c.id, code);
      if (lot && lot.public_token && lot.public_token === token) {
        S.run('UPDATE lots SET scans=scans+1, last_scan_at=CURRENT_TIMESTAMP WHERE id=?', lot.id);
        return { found: true, data: S.publicTrace(c, code), scans: lot.scans + 1 };
      }
    }
    const acc = S.get('SELECT * FROM registry_accounts WHERE slug=? AND active=1', slug);
    if (acc) {
      const r = S.get('SELECT * FROM registry_lots WHERE account_id=? AND code=?', acc.id, code);
      if (r && r.token === token) {
        S.run('UPDATE registry_lots SET scans=scans+1, last_scan_at=CURRENT_TIMESTAMP WHERE id=?', r.id);
        return { found: true, data: JSON.parse(r.data), scans: r.scans + 1, publishedBy: r.published_at };
      }
    }
    return { found: false };
  }

  /** Côté registre : compte appelant (clé API d'un compte du registre). */
  function account(authHeader) {
    const key = String(authHeader || '').startsWith('Bearer ') ? authHeader.slice(7) : '';
    return key ? S.get('SELECT * FROM registry_accounts WHERE key_hash=? AND active=1', sha(key)) : null;
  }
  function receive(acc, lots) {
    const up = db.prepare(`INSERT INTO registry_lots(account_id,code,token,data) VALUES (?,?,?,?)
      ON CONFLICT(account_id,code) DO UPDATE SET token=excluded.token, data=excluded.data, published_at=CURRENT_TIMESTAMP`);
    return S.tx(() => { for (const l of lots) up.run(acc.id, String(l.code).slice(0, 80), String(l.token).slice(0, 40), JSON.stringify(l.data).slice(0, 8000)); return lots.length; });
  }

  /** Côté installation locale : publie les lots non encore publiés vers le registre configuré. */
  let running = null;
  /** Une seule publication à la fois : un appel pendant une publication en cours attend la même. */
  const publish = () => (running ??= doPublish().finally(() => { running = null; }));
  async function doPublish() {
    let published = 0;
    try {
      for (const c of S.all("SELECT * FROM companies WHERE registry_key IS NOT NULL AND registry_key<>'' AND trace_base_url IS NOT NULL AND trace_base_url<>''")) {
        const base = c.trace_base_url.trim().replace(/\/+$/, '');
        for (;;) {
          const lots = S.all('SELECT * FROM lots WHERE company_id=? AND published_at IS NULL AND public_token IS NOT NULL ORDER BY id LIMIT 200', c.id);
          if (!lots.length) break;
          const payload = lots.map((l) => {
            const data = S.publicTrace(c, l.code);
            delete data.verified_at;
            return { code: l.code, token: l.public_token, data };
          });
          const r = await fetch(`${base}/api/registry/lots`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.registry_key}` }, body: JSON.stringify({ lots: payload }) });
          if (!r.ok) throw new Error(`Registre : HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
          const mark = db.prepare('UPDATE lots SET published_at=CURRENT_TIMESTAMP WHERE id=?');
          S.tx(() => lots.forEach((l) => mark.run(l.id)));
          published += lots.length;
        }
      }
      S.run("INSERT INTO meta(key,value) VALUES ('registry_last_ok',datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value");
      S.run("DELETE FROM meta WHERE key='registry_last_error'");
    } catch (e) {
      S.run("INSERT INTO meta(key,value) VALUES ('registry_last_error',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", `${new Date().toISOString()} ${e.message}`);
    }
    return { published };
  }

  /** Relie l'entreprise à un registre : vérifie la clé et récupère l'identifiant public (slug) attribué par le registre. */
  async function connect(company, url, key) {
    const base = url.trim().replace(/\/+$/, '');
    const r = await fetch(`${base}/api/registry/whoami`, { headers: { Authorization: `Bearer ${key}` } }).catch((e) => ({ ok: false, status: 0, text: async () => e.message }));
    if (!r.ok) return { ok: false, error: r.status === 401 ? 'Clé refusée par le registre.' : `Registre injoignable (${r.status || (await r.text())}).` };
    const j = await r.json();
    S.run('UPDATE companies SET trace_base_url=?, registry_key=?, registry_slug=? WHERE id=?', base, key, j.slug, company.id);
    return { ok: true, slug: j.slug, name: j.name };
  }

  return { verify, account, receive, publish, connect };
}
