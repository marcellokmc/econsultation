// Module Qualité : listes de contrôle HACCP, contrôles par lot, analyses de laboratoire, blocage des lots.
// Un lot BLOQUÉ n'est jamais consommé en production ni vendu (règle appliquée dans services.take).
// Un contrôle non conforme sur un point critique, ou une analyse hors limite, bloque le lot automatiquement.
import { validate, HttpError, biz, today } from '../lib.js';

export const schema = `
CREATE TABLE IF NOT EXISTS quality_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL, name TEXT NOT NULL, scope TEXT NOT NULL DEFAULT 'autre',
  items TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS quality_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL, template_id INTEGER, template_name TEXT NOT NULL,
  lot_id INTEGER, done_on TEXT NOT NULL, answers TEXT NOT NULL, result TEXT NOT NULL, note TEXT,
  user_id INTEGER, user_name TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS quality_checks_lot ON quality_checks(lot_id);
CREATE TABLE IF NOT EXISTS lab_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL, lot_id INTEGER NOT NULL, lab TEXT NOT NULL, analysed_on TEXT NOT NULL,
  parameter TEXT NOT NULL, value TEXT NOT NULL, unit TEXT, limit_text TEXT, conforme INTEGER NOT NULL, reference TEXT, note TEXT,
  user_id INTEGER, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS lab_results_lot ON lab_results(lot_id);
`;

/** Listes proposées à la première utilisation (modifiables). Points « critiques » : un échec bloque le lot. */
const DEFAULTS = [
  { name: 'Réception de matière première', scope: 'reception', items: [
    { label: "Taux d'humidité", type: 'num', unit: '%', max: 10, critical: false },
    { label: 'Absence de moisissures', type: 'ok', critical: true },
    { label: "Absence d'insectes ou de traces de rongeurs", type: 'ok', critical: true },
    { label: 'Absence de corps étrangers (pierres, sable, plastique)', type: 'ok', critical: false },
    { label: 'Sacs propres, intacts et étiquetés', type: 'ok', critical: false },
  ] },
  { name: 'Contrôle de production', scope: 'production', items: [
    { label: 'Matériel nettoyé avant la production', type: 'ok', critical: true },
    { label: 'Hygiène du personnel (tenue, mains lavées)', type: 'ok', critical: true },
    { label: 'Température de cuisson ou de séchage', type: 'num', unit: '°C', critical: false },
    { label: 'Emballages propres et intacts', type: 'ok', critical: false },
    { label: 'Étiquetage conforme (n° de lot, date limite)', type: 'ok', critical: true },
  ] },
  { name: 'Hygiène quotidienne de l’atelier', scope: 'hygiene', items: [
    { label: 'Sols et plans de travail nettoyés', type: 'ok', critical: false },
    { label: 'Point de lavage des mains (eau, savon)', type: 'ok', critical: false },
    { label: 'Eau potable disponible', type: 'ok', critical: true },
    { label: 'Absence de nuisibles', type: 'ok', critical: true },
    { label: 'Poubelles fermées et vidées', type: 'ok', critical: false },
  ] },
];
const SCOPES = ['reception', 'production', 'hygiene', 'autre'];

/** Vérifie les points d'un modèle de liste. */
function cleanItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 40) throw new HttpError(422, 'La liste doit contenir de 1 à 40 points.', { items: ['La liste doit contenir de 1 à 40 points.'] });
  return items.map((i) => {
    const label = String(i?.label ?? '').trim().slice(0, 160);
    if (!label) throw new HttpError(422, 'Chaque point doit avoir un intitulé.', { items: ['Chaque point doit avoir un intitulé.'] });
    const type = i.type === 'num' ? 'num' : 'ok';
    const n = (v) => (v === '' || v === null || v === undefined || !isFinite(Number(v)) ? null : Number(v));
    return { label, type, critical: !!i.critical, ...(type === 'num' ? { unit: String(i.unit ?? '').slice(0, 12), min: n(i.min), max: n(i.max) } : {}) };
  });
}

/** Évalue les réponses : un point « ok » est conforme si coché ; un point chiffré, s'il est dans [min, max]. */
function evaluate(items, answers) {
  const byLabel = new Map((Array.isArray(answers) ? answers : []).map((a) => [String(a?.label), a?.value]));
  let criticalFail = false, anyFail = false;
  const out = items.map((it) => {
    const v = byLabel.get(it.label);
    let ok;
    if (it.type === 'num') {
      const x = v === '' || v === null || v === undefined ? NaN : Number(String(v).replace(',', '.'));
      if (!isFinite(x)) throw new HttpError(422, `Indiquez la valeur de « ${it.label} ».`, { answers: [`Indiquez la valeur de « ${it.label} ».`] });
      ok = (it.min === null || it.min === undefined || x >= it.min) && (it.max === null || it.max === undefined || x <= it.max);
      if (!ok) { anyFail = true; if (it.critical) criticalFail = true; }
      return { label: it.label, value: x, unit: it.unit, ok, critical: it.critical };
    }
    ok = v === true || v === 'true' || v === 1 || v === 'oui';
    if (!ok) { anyFail = true; if (it.critical) criticalFail = true; }
    return { label: it.label, value: ok, ok, critical: it.critical };
  });
  return { answers: out, result: anyFail ? 'non_conforme' : 'conforme', criticalFail };
}

export function routes({ add, S, RULE, created }) {
  const CHECK = ['owner', 'manager', 'storekeeper', 'coop_agent'];
  const tpl = (r) => ({ ...r, items: JSON.parse(r.items), active: !!r.active });
  const ensureDefaults = (cid) => {
    if (S.get('SELECT 1 x FROM quality_templates WHERE company_id=?', cid)) return;
    for (const d of DEFAULTS) S.run('INSERT INTO quality_templates(company_id,name,scope,items) VALUES (?,?,?,?)', cid, d.name, d.scope, JSON.stringify(d.items));
  };
  const lotOf = (cid, id) => S.must(S.get('SELECT * FROM lots WHERE id=? AND company_id=?', Number(id), cid), 'Lot');
  // published_at=NULL : le changement de statut est republié vers le registre en ligne (page de vérification du QR)
  const block = (lot, note) => S.run("UPDATE lots SET quality_status='bloque', quality_note=?, published_at=NULL WHERE id=?", note.slice(0, 300), lot.id);
  const checkView = (r) => ({ ...r, answers: JSON.parse(r.answers), lot: r.lot_id ? S.get('SELECT id,code FROM lots WHERE id=?', r.lot_id) : null });

  // ----- modèles de listes -----
  add('GET', '/api/quality/templates', {}, ({ company }) => { ensureDefaults(company.id); return S.all('SELECT * FROM quality_templates WHERE company_id=? ORDER BY active DESC, name', company.id).map(tpl); });
  const tplRules = { name: { required: true, max: 120, label: 'nom de la liste' }, scope: { in: SCOPES }, active: { type: 'bool' } };
  add('POST', '/api/quality/templates', { roles: RULE.correct }, ({ company, body }) => {
    const d = validate(body, tplRules);
    const id = S.lastId(S.run('INSERT INTO quality_templates(company_id,name,scope,items) VALUES (?,?,?,?)', company.id, d.name, d.scope ?? 'autre', JSON.stringify(cleanItems(body.items))));
    return created(tpl(S.get('SELECT * FROM quality_templates WHERE id=?', id)));
  });
  add('PUT', '/api/quality/templates/:id', { roles: RULE.correct }, ({ company, params, body }) => {
    const t = S.must(S.get('SELECT * FROM quality_templates WHERE id=? AND company_id=?', Number(params.id), company.id), 'Liste');
    const d = validate(body, tplRules, { partial: true });
    S.run('UPDATE quality_templates SET name=?, scope=?, active=?, items=? WHERE id=?', d.name ?? t.name, d.scope ?? t.scope, d.active === undefined ? t.active : d.active ? 1 : 0,
      body.items !== undefined ? JSON.stringify(cleanItems(body.items)) : t.items, t.id);
    return tpl(S.get('SELECT * FROM quality_templates WHERE id=?', t.id));
  });

  // ----- contrôles -----
  add('GET', '/api/quality/checks', {}, ({ company, query }) => {
    const p = [company.id]; let sql = 'SELECT * FROM quality_checks WHERE company_id=?';
    if (query.lot_id) { sql += ' AND lot_id=?'; p.push(Number(query.lot_id)); }
    if (query.result) { sql += ' AND result=?'; p.push(String(query.result)); }
    return S.all(sql + ' ORDER BY done_on DESC, id DESC LIMIT 300', ...p).map(checkView);
  });
  add('POST', '/api/quality/checks', { roles: CHECK }, ({ company, user, body }) => {
    const d = validate(body, { template_id: { required: true, type: 'integer', label: 'liste de contrôle' }, lot_id: { type: 'integer' }, done_on: { required: true, type: 'date', past: true }, note: { max: 500 } });
    const t = S.must(S.get('SELECT * FROM quality_templates WHERE id=? AND company_id=?', d.template_id, company.id), 'Liste');
    const lot = d.lot_id ? lotOf(company.id, d.lot_id) : null;
    const ev = evaluate(JSON.parse(t.items), body.answers);
    return S.tx(() => {
      const id = S.lastId(S.run('INSERT INTO quality_checks(company_id,template_id,template_name,lot_id,done_on,answers,result,note,user_id,user_name) VALUES (?,?,?,?,?,?,?,?,?,?)',
        company.id, t.id, t.name, lot?.id ?? null, d.done_on, JSON.stringify(ev.answers), ev.result, d.note ?? null, user.id, user.name));
      if (lot && ev.criticalFail) block(lot, `Contrôle « ${t.name} » du ${d.done_on} : point critique non conforme.`);
      return created({ ...checkView(S.get('SELECT * FROM quality_checks WHERE id=?', id)), lot_blocked: !!(lot && ev.criticalFail) });
    });
  });

  // ----- analyses de laboratoire -----
  add('GET', '/api/quality/lab', {}, ({ company, query }) => {
    const p = [company.id]; let sql = 'SELECT r.*, l.code AS lot_code FROM lab_results r JOIN lots l ON l.id=r.lot_id WHERE r.company_id=?';
    if (query.lot_id) { sql += ' AND r.lot_id=?'; p.push(Number(query.lot_id)); }
    return S.all(sql + ' ORDER BY r.analysed_on DESC, r.id DESC LIMIT 300', ...p).map(({ lot_code, ...r }) => ({ ...r, conforme: !!r.conforme, lot: { id: r.lot_id, code: lot_code } }));
  });
  add('POST', '/api/quality/lab', { roles: CHECK }, ({ company, user, body }) => {
    const d = validate(body, {
      lot_id: { required: true, type: 'integer', label: 'lot' }, lab: { required: true, max: 120, label: 'laboratoire' }, analysed_on: { required: true, type: 'date', past: true, label: "date d'analyse" },
      parameter: { required: true, max: 120, label: 'paramètre analysé' }, value: { required: true, max: 60, label: 'résultat' }, unit: { max: 20 }, limit_text: { max: 80, label: 'limite' },
      conforme: { required: true, type: 'bool' }, reference: { max: 80, label: 'référence du bulletin' }, note: { max: 300 },
    });
    const lot = lotOf(company.id, d.lot_id);
    return S.tx(() => {
      const id = S.lastId(S.run('INSERT INTO lab_results(company_id,lot_id,lab,analysed_on,parameter,value,unit,limit_text,conforme,reference,note,user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        company.id, lot.id, d.lab, d.analysed_on, d.parameter, d.value, d.unit ?? null, d.limit_text ?? null, d.conforme ? 1 : 0, d.reference ?? null, d.note ?? null, user.id));
      if (!d.conforme) block(lot, `Analyse « ${d.parameter} » (${d.lab}, ${d.analysed_on}) hors limite.`);
      return created({ ...S.get('SELECT * FROM lab_results WHERE id=?', id), conforme: d.conforme, lot_blocked: !d.conforme });
    });
  });

  // ----- blocage / libération d'un lot -----
  add('POST', '/api/lots/:id/quality', { roles: RULE.correct }, ({ company, params, body }) => {
    const d = validate(body, { status: { required: true, in: ['ok', 'bloque'] }, note: { required: true, min: 3, max: 300, label: 'motif' } });
    const lot = lotOf(company.id, params.id);
    if (d.status === 'ok' && lot.quality_status !== 'bloque') throw biz("Ce lot n'est pas bloqué.");
    S.run('UPDATE lots SET quality_status=?, quality_note=?, published_at=NULL WHERE id=?', d.status === 'ok' ? null : 'bloque', d.note, lot.id);
    return S.lotView(company.id, lot.id);
  });

  // ----- synthèse -----
  add('GET', '/api/quality/summary', {}, ({ company }) => {
    const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    return {
      checks_30d: S.get('SELECT COUNT(*) n FROM quality_checks WHERE company_id=? AND done_on>=?', company.id, since).n,
      nonconform_30d: S.get("SELECT COUNT(*) n FROM quality_checks WHERE company_id=? AND done_on>=? AND result='non_conforme'", company.id, since).n,
      lab_30d: S.get('SELECT COUNT(*) n FROM lab_results WHERE company_id=? AND analysed_on>=?', company.id, since).n,
      hygiene_today: !!S.get("SELECT 1 x FROM quality_checks c JOIN quality_templates t ON t.id=c.template_id WHERE c.company_id=? AND t.scope='hygiene' AND c.done_on=?", company.id, today()),
      blocked: S.hydrateLots(company.id, S.all("SELECT * FROM lots WHERE company_id=? AND quality_status='bloque' ORDER BY received_on DESC", company.id)),
    };
  });
}
