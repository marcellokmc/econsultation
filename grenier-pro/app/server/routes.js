import { createRequire } from 'node:module';
import { validate, HttpError, biz, hashPassword, checkPassword, newToken, sha, slugify, today, addDays } from './lib.js';
import { PLANS } from './services.js';

const require = createRequire(import.meta.url);
const qrcode = require('../vendor/qrcode.cjs');

const ROLES = ['owner', 'manager', 'storekeeper', 'accountant', 'coop_agent'];
const RULE = {
  items: ['owner', 'manager'],
  stock: ['owner', 'manager', 'storekeeper'],
  sales: ['owner', 'manager', 'accountant'],
  coop: ['owner', 'manager', 'coop_agent', 'storekeeper'],
  payout: ['owner', 'manager', 'accountant', 'coop_agent'],
  correct: ['owner', 'manager'],
  admin: ['owner'],
};

export function qrSvg(text) {
  if (qrcode.stringToBytesFuncs?.['UTF-8']) qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  let p = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) p += `M${c} ${r}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${n + 4} ${n + 4}" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${p}" fill="#000"/></svg>`;
}

/**
 * x (extensions 1.1, facultatives) : { messenger, registry, licence: { status(), install(text) }, publicUrl, afterRegister() }
 */
export function buildRoutes({ S, mode, x = {} }) {
  const routes = [];
  const add = (method, path, opts, handler) => {
    const keys = [];
    const re = new RegExp('^' + path.replace(/:([a-z_]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
    routes.push({ method, path, re, keys, opts, handler });
  };
  const isWritable = (c) => {
    if (c.subscription_status === 'active') return !c.paid_until || c.paid_until > new Date().toISOString();
    if (c.subscription_status === 'trial') return !!c.trial_ends_at && c.trial_ends_at > new Date().toISOString();
    return false;
  };
  const companyView = (c) => ({
    id: c.id, name: c.name, slug: c.slug, address: c.address, phone: c.phone, email: c.email, ifu: c.ifu, rccm: c.rccm,
    vat_rate: Number(c.vat_rate), trace_base_url: c.trace_base_url, plan: c.plan, plan_label: (PLANS[c.plan] || PLANS.starter).label,
    subscription_status: c.subscription_status, writable: isWritable(c), trial_ends_at: c.trial_ends_at,
    features: { coop: (PLANS[c.plan] || PLANS.starter).coop },
    sms_enabled: !!c.sms_enabled, registry_connected: !!(c.registry_key && c.trace_base_url), registry_slug: c.registry_slug ?? null,
    paid_until: c.paid_until ?? null, edition: mode,
  });
  const userView = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, active: !!u.active });
  const profile = (u, c, token) => ({ ...(token ? { token } : {}), user: userView(u), company: companyView(c) });
  const issueToken = (userId) => { const t = newToken(); S.run('INSERT INTO tokens(user_id,hash) VALUES (?,?)', userId, sha(t)); return t; };
  const created = (body) => ({ status: 201, body });

  // ---------- public ----------
  add('GET', '/api/public/info', { public: true }, () => ({
    product: 'Grenier Pro', mode, needs_setup: mode === 'local' && S.get('SELECT COUNT(*) n FROM companies').n === 0,
  }));

  add('POST', '/api/auth/register', { public: true, limit: 'auth' }, ({ body }) => {
    if (mode === 'local' && S.get('SELECT COUNT(*) n FROM companies').n > 0) {
      throw new HttpError(403, "L'inscription est fermée : demandez un compte au propriétaire (Paramètres → Équipe).");
    }
    const d = validate(body, {
      company_name: { required: true, max: 120, label: "nom de l'entreprise" }, name: { required: true, max: 120 },
      email: { required: true, type: 'email', max: 160 }, password: { required: true, min: 8, max: 100 }, phone: { max: 30 },
    });
    if (S.get('SELECT 1 x FROM users WHERE email=?', d.email.toLowerCase())) throw new HttpError(422, 'Cette adresse e-mail est déjà utilisée.', { email: ['Cette adresse e-mail est déjà utilisée.'] });
    return created(S.tx(() => {
      let slug = slugify(d.company_name);
      while (S.get('SELECT 1 x FROM companies WHERE slug=?', slug)) slug = slugify(d.company_name) + '-' + Math.random().toString(36).slice(2, 6);
      const saas = mode === 'saas';
      const cid = S.lastId(S.run('INSERT INTO companies(name,slug,phone,email,plan,subscription_status,trial_ends_at) VALUES (?,?,?,?,?,?,?)',
        d.company_name, slug, d.phone ?? null, d.email, 'pro', saas ? 'trial' : 'active', saas ? new Date(Date.now() + 30 * 864e5).toISOString() : null));
      const uid = S.lastId(S.run('INSERT INTO users(company_id,name,email,password,role) VALUES (?,?,?,?,?)', cid, d.name, d.email.toLowerCase(), hashPassword(d.password), 'owner'));
      x.afterRegister?.();
      return profile(S.get('SELECT * FROM users WHERE id=?', uid), S.get('SELECT * FROM companies WHERE id=?', cid), issueToken(uid));
    }));
  });

  add('POST', '/api/auth/login', { public: true, limit: 'auth' }, ({ body }) => {
    const d = validate(body, { email: { required: true, type: 'email' }, password: { required: true } });
    const u = S.get('SELECT * FROM users WHERE email=?', d.email.toLowerCase());
    if (!u || !u.active || !checkPassword(d.password, u.password)) throw new HttpError(422, 'Identifiants incorrects.', { email: ['Identifiants incorrects.'] });
    const c = S.get('SELECT * FROM companies WHERE id=?', u.company_id);
    if (c.subscription_status === 'suspended') throw new HttpError(422, 'Ce compte est suspendu. Contactez le support.', { email: ['Ce compte est suspendu. Contactez le support.'] });
    return profile(u, c, issueToken(u.id));
  });

  add('GET', '/api/public/trace/:slug/:code', { public: true }, ({ params }) => {
    const c = S.must(S.get('SELECT * FROM companies WHERE slug=?', params.slug), 'Entreprise');
    const data = S.publicTrace(c, decodeURIComponent(params.code));
    if (!data) throw new HttpError(404, 'Lot introuvable.');
    return { body: data, headers: { 'Cache-Control': 'public, max-age=60' } };
  });
  add('GET', '/api/public/qr/:slug/:code', { public: true }, ({ params }) => {
    const c = S.must(S.get('SELECT * FROM companies WHERE slug=?', params.slug), 'Entreprise');
    const lot = S.must(S.get('SELECT * FROM lots WHERE company_id=? AND code=?', c.id, decodeURIComponent(params.code)), 'Lot');
    return { raw: qrSvg(S.qrPayload(c, lot, x.publicUrl)), type: 'image/svg+xml', headers: { 'Cache-Control': 'public, max-age=300' } };
  });

  // ---------- session ----------
  add('GET', '/api/me', {}, ({ user, company }) => profile(user, company));
  add('POST', '/api/auth/logout', { always: true }, ({ token }) => { S.run('DELETE FROM tokens WHERE hash=?', sha(token)); return null; });
  add('GET', '/api/dashboard', {}, ({ company }) => S.dashboard(company.id));

  // ---------- articles ----------
  const itemRules = {
    name: { required: true, max: 120 }, kind: { required: true, in: ['mp', 'emb', 'pf'] }, unit: { required: true, max: 20 }, code: { max: 30, label: "code de l'article" },
    alert_qty: { type: 'number', min: 0 }, ref_price: { type: 'integer', min: 0 }, shelf_days: { type: 'integer', min: 0, max: 3650 },
  };
  /** Code de l'article = début du numéro de lot (CODE-AAMMJJ-NNN). Jusqu'à 30 caractères : lettres, chiffres, - et _. */
  const makeCode = (code, name) => {
    const ascii = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let c = ascii(code).toUpperCase().replace(/[^A-Z0-9_-]+/g, '-').replace(/-{2,}/g, '-').replace(/^[-_]+|[-_]+$/g, '').slice(0, 30);
    if (!c) c = ascii(name).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    return c || 'LOT';
  };
  add('GET', '/api/items', {}, ({ company, query }) => S.listItems(company.id, query.kind));
  add('POST', '/api/items', { roles: RULE.items }, ({ company, body }) => {
    const d = validate(body, itemRules);
    const id = S.lastId(S.run('INSERT INTO items(company_id,name,kind,unit,code,alert_qty,ref_price,shelf_days) VALUES (?,?,?,?,?,?,?,?)',
      company.id, d.name, d.kind, d.unit, makeCode(d.code, d.name), d.alert_qty ?? 0, d.ref_price ?? 0, d.shelf_days ?? 0));
    return created(S.getItem(company.id, id));
  });
  add('PUT', '/api/items/:id', { roles: RULE.items }, ({ company, params, body }) => {
    const it = S.rawItem(company.id, Number(params.id));
    const d = validate(body, itemRules, { partial: true });
    S.run('UPDATE items SET name=?, unit=?, code=?, alert_qty=?, ref_price=?, shelf_days=? WHERE id=?', d.name ?? it.name, d.unit ?? it.unit,
      d.code !== undefined ? makeCode(d.code, d.name ?? it.name) : it.code, d.alert_qty ?? it.alert_qty, d.ref_price ?? it.ref_price, d.shelf_days ?? it.shelf_days, it.id);
    return S.getItem(company.id, it.id);
  });

  // ---------- lots et stock ----------
  add('GET', '/api/lots', {}, ({ company, query }) => S.listLots(company.id, query));
  add('GET', '/api/lots/:id', {}, ({ company, params }) => S.lotView(company.id, Number(params.id)));
  add('GET', '/api/lots/:id/qr', {}, ({ company, params }) => {
    const lot = S.must(S.get('SELECT * FROM lots WHERE id=? AND company_id=?', Number(params.id), company.id), 'Lot');
    return { raw: qrSvg(S.qrPayload(company, lot, x.publicUrl)), type: 'image/svg+xml' };
  });
  add('GET', '/api/movements', {}, ({ company, query }) => S.listMovements(company.id, query));
  add('POST', '/api/stock/receipts', { roles: RULE.stock }, ({ company, user, body }) => {
    const d = validate(body, { item_id: { required: true, type: 'integer' }, qty: { required: true, type: 'number', gt: 0 }, unit_cost: { required: true, type: 'number', min: 0 }, date: { required: true, type: 'date', past: true }, supplier_name: { max: 120 } });
    return created(S.receipt(company.id, user.id, d));
  });
  add('POST', '/api/lots/:id/loss', { roles: RULE.stock }, ({ company, user, params, body }) => {
    const d = validate(body, { qty: { required: true, type: 'number', gt: 0 }, date: { required: true, type: 'date', past: true }, reason: { required: true, max: 60 }, note: { max: 200 } });
    return S.loss(company.id, user.id, Number(params.id), d);
  });

  // ---------- production ----------
  add('GET', '/api/productions', {}, ({ company }) => S.listProductions(company.id));
  add('POST', '/api/productions', { roles: RULE.stock }, ({ company, user, body }) => {
    const d = validate(body, {
      item_id: { required: true, type: 'integer' }, produced_on: { required: true, type: 'date', past: true }, qty: { required: true, type: 'number', gt: 0 },
      expires_on: { type: 'date' }, operator: { max: 80 }, extra_cost: { type: 'integer', min: 0 }, note: { max: 200 },
    });
    if (d.expires_on && d.expires_on < d.produced_on) throw new HttpError(422, 'La date limite doit être postérieure à la date de production.', { expires_on: ['La date limite doit être postérieure à la date de production.'] });
    if (!Array.isArray(body.inputs) || !body.inputs.length) throw new HttpError(422, 'Ajoutez au moins une matière première utilisée.', { inputs: ['Ajoutez au moins une matière première utilisée.'] });
    d.inputs = body.inputs.map((i) => validate(i, { item_id: { required: true, type: 'integer' }, qty: { required: true, type: 'number', gt: 0 } }));
    return created(S.createProduction(company.id, user.id, d));
  });

  // ---------- clients et factures ----------
  const customerRules = { name: { required: true, max: 120 }, type: { max: 40 }, phone: { max: 30 }, address: { max: 200 }, ifu: { max: 40 } };
  add('GET', '/api/customers', {}, ({ company }) => S.listCustomers(company.id));
  add('POST', '/api/customers', { roles: RULE.sales }, ({ company, body }) => {
    const d = validate(body, customerRules);
    const id = S.lastId(S.run('INSERT INTO customers(company_id,name,type,phone,address,ifu) VALUES (?,?,?,?,?,?)', company.id, d.name, d.type ?? null, d.phone ?? null, d.address ?? null, d.ifu ?? null));
    return created(S.get('SELECT * FROM customers WHERE id=?', id));
  });
  add('PUT', '/api/customers/:id', { roles: RULE.sales }, ({ company, params, body }) => {
    const c = S.must(S.get('SELECT * FROM customers WHERE id=? AND company_id=?', Number(params.id), company.id), 'Client');
    const d = { ...c, ...validate(body, customerRules, { partial: true }) };
    S.run('UPDATE customers SET name=?,type=?,phone=?,address=?,ifu=? WHERE id=?', d.name, d.type, d.phone, d.address, d.ifu, c.id);
    return S.get('SELECT * FROM customers WHERE id=?', c.id);
  });
  add('GET', '/api/invoices', {}, ({ company, query }) => S.listInvoices(company.id, query.status));
  add('GET', '/api/invoices/:id', {}, ({ company, params }) => S.invoiceFull(company.id, Number(params.id)));
  add('POST', '/api/invoices', { roles: RULE.sales }, ({ company, user, body }) => {
    const d = validate(body, {
      customer_id: { required: true, type: 'integer' }, issued_on: { required: true, type: 'date', past: true }, due_on: { type: 'date' }, vat_enabled: { type: 'bool' },
      note: { max: 300 }, paid_amount: { type: 'integer', min: 0 }, payment_method: { max: 40 },
    });
    if (d.due_on && d.due_on < d.issued_on) throw new HttpError(422, "L'échéance doit être postérieure à la date de la facture.", { due_on: ["L'échéance doit être postérieure à la date de la facture."] });
    if (!Array.isArray(body.lines) || !body.lines.length) throw new HttpError(422, 'Ajoutez au moins une ligne.', { lines: ['Ajoutez au moins une ligne.'] });
    d.vat_enabled = body.vat_enabled === undefined ? true : d.vat_enabled;
    d.lines = body.lines.map((l) => validate(l, { item_id: { required: true, type: 'integer' }, qty: { required: true, type: 'number', gt: 0 }, unit_price: { required: true, type: 'integer', min: 0 } }));
    return created(S.createInvoice(company.id, user.id, d));
  });
  add('POST', '/api/invoices/:id/cancel', { roles: RULE.sales }, ({ company, user, params }) => S.cancelInvoice(company.id, user.id, Number(params.id)));
  add('POST', '/api/invoices/:id/payments', { roles: RULE.sales }, ({ company, params, body }) => {
    const d = validate(body, { paid_on: { required: true, type: 'date', past: true }, amount: { required: true, type: 'integer', gt: 0 }, method: { required: true, max: 40 }, reference: { max: 80 } });
    return S.addPayment(company.id, Number(params.id), d);
  });
  add('GET', '/api/trace/:code', {}, ({ company, params }) => S.trace(company.id, decodeURIComponent(params.code)));

  // ---------- coopérative ----------
  const memberRules = { name: { required: true, max: 120 }, village: { max: 120 }, phone: { max: 30 }, group_name: { max: 120 }, joined_on: { type: 'date', past: true }, active: { type: 'bool' }, client_ref: { max: 64 } };
  add('GET', '/api/members', { feature: 'coop' }, ({ company, query }) => S.listMembers(company.id, query.q));
  add('GET', '/api/members/:id', { feature: 'coop' }, ({ company, params }) => S.memberDetail(company.id, Number(params.id)));
  add('POST', '/api/members', { feature: 'coop', roles: RULE.coop }, ({ company, body }) => {
    const d = validate(body, memberRules);
    const dup = d.client_ref && S.get('SELECT id FROM members WHERE company_id=? AND client_ref=?', company.id, d.client_ref);
    if (dup) return { ...S.listMembers(company.id).find((m) => m.id === dup.id), duplicate: true };
    const id = S.lastId(S.run('INSERT INTO members(company_id,name,village,phone,group_name,joined_on,client_ref) VALUES (?,?,?,?,?,?,?)', company.id, d.name, d.village ?? null, d.phone ?? null, d.group_name ?? null, d.joined_on ?? null, d.client_ref ?? null));
    return created(S.listMembers(company.id).find((m) => m.id === id));
  });
  add('PUT', '/api/members/:id', { feature: 'coop', roles: RULE.coop }, ({ company, params, body }) => {
    const m = S.must(S.get('SELECT * FROM members WHERE id=? AND company_id=?', Number(params.id), company.id), 'Membre');
    const d = { ...m, ...validate(body, memberRules, { partial: true }) };
    S.run('UPDATE members SET name=?,village=?,phone=?,group_name=?,joined_on=?,active=? WHERE id=?', d.name, d.village, d.phone, d.group_name, d.joined_on, d.active ? 1 : 0, m.id);
    return S.listMembers(company.id).find((x) => x.id === m.id);
  });
  add('GET', '/api/deliveries', { feature: 'coop' }, ({ company, query }) => S.listDeliveries(company.id, query.member_id, query.all === '1'));
  add('POST', '/api/deliveries', { feature: 'coop', roles: RULE.coop }, ({ company, user, body }) => {
    const d = validate(body, { member_id: { required: true, type: 'integer' }, item_id: { required: true, type: 'integer' }, delivered_on: { required: true, type: 'date', past: true }, qty: { required: true, type: 'number', gt: 0 }, unit_price: { required: true, type: 'integer', min: 0 }, quality: { in: ['A', 'B', 'C'] }, note: { max: 200 }, client_ref: { max: 64 } });
    const out = S.createDelivery(company.id, user.id, d);
    return out.duplicate ? out : created(out);
  });
  const cancelRules = { reason: { required: true, min: 3, max: 200, label: "motif de l'annulation" } };
  add('POST', '/api/deliveries/:id/cancel', { feature: 'coop', roles: RULE.correct }, ({ company, user, params, body }) => S.cancelDelivery(company.id, user.id, Number(params.id), validate(body, cancelRules).reason));
  add('GET', '/api/payouts', { feature: 'coop' }, ({ company, query }) => S.listPayouts(company.id, query.all === '1'));
  add('GET', '/api/payouts/:id', { feature: 'coop' }, ({ company, params }) => S.payoutView(company.id, Number(params.id)));
  add('POST', '/api/payouts', { feature: 'coop', roles: RULE.payout }, ({ company, user, body }) => {
    const d = validate(body, { member_id: { required: true, type: 'integer' }, paid_on: { required: true, type: 'date', past: true }, amount: { required: true, type: 'integer', gt: 0 }, method: { required: true, max: 40 }, note: { max: 200 }, reference: { max: 80, label: 'référence de la transaction' }, advance: { type: 'bool' }, client_ref: { max: 64 } });
    if (d.advance && !RULE.correct.includes(user.role)) throw new HttpError(403, 'Seuls le propriétaire et le gérant peuvent accorder une avance.');
    const out = S.createPayout(company.id, d, user.id);
    return out.duplicate ? out : created(out);
  });
  add('POST', '/api/payouts/:id/cancel', { feature: 'coop', roles: RULE.correct }, ({ company, user, params, body }) => S.cancelPayout(company.id, user.id, Number(params.id), validate(body, cancelRules).reason));
  add('GET', '/api/coop/dashboard', { feature: 'coop' }, ({ company, query }) => S.coopStats(company.id, [30, 90, 365].includes(Number(query.days)) ? Number(query.days) : null));

  // ---------- administration ----------
  add('PUT', '/api/settings', { roles: RULE.admin }, ({ company, body }) => {
    const d = validate(body, { name: { max: 120 }, address: { max: 200 }, phone: { max: 30 }, email: { type: 'email', max: 160 }, ifu: { max: 40 }, rccm: { max: 60 }, vat_rate: { type: 'number', min: 0, max: 30 }, trace_base_url: { max: 200 }, sms_enabled: { type: 'bool' } }, { partial: true });
    const c = { ...company, ...d };
    if (d.trace_base_url !== undefined && d.trace_base_url !== company.trace_base_url) { c.registry_key = null; c.registry_slug = null; } // autre adresse : relier à nouveau
    S.run('UPDATE companies SET name=?,address=?,phone=?,email=?,ifu=?,rccm=?,vat_rate=?,trace_base_url=?,sms_enabled=?,registry_key=?,registry_slug=? WHERE id=?', c.name, c.address, c.phone, c.email, c.ifu, c.rccm, c.vat_rate, c.trace_base_url,
      c.sms_enabled ? 1 : 0, c.registry_key ?? null, c.registry_slug ?? null, company.id);
    return S.get('SELECT * FROM companies WHERE id=?', company.id);
  });
  add('GET', '/api/users', { roles: RULE.admin }, ({ company }) => S.all('SELECT id,name,email,role,active FROM users WHERE company_id=? ORDER BY name', company.id).map((u) => ({ ...u, active: !!u.active })));
  add('POST', '/api/users', { roles: RULE.admin }, ({ company, body }) => {
    const plan = PLANS[company.plan] || PLANS.starter;
    if (S.get('SELECT COUNT(*) n FROM users WHERE company_id=? AND active=1', company.id).n >= plan.max_users) throw biz(`Votre offre ${plan.label} est limitée à ${plan.max_users} utilisateurs actifs.`);
    const d = validate(body, { name: { required: true, max: 120 }, email: { required: true, type: 'email', max: 160 }, password: { required: true, min: 8, max: 100 }, role: { required: true, in: ROLES } });
    if (S.get('SELECT 1 x FROM users WHERE email=?', d.email.toLowerCase())) throw new HttpError(422, 'Cette adresse e-mail est déjà utilisée.', { email: ['Cette adresse e-mail est déjà utilisée.'] });
    const id = S.lastId(S.run('INSERT INTO users(company_id,name,email,password,role) VALUES (?,?,?,?,?)', company.id, d.name, d.email.toLowerCase(), hashPassword(d.password), d.role));
    return created(userView(S.get('SELECT * FROM users WHERE id=?', id)));
  });
  add('PUT', '/api/users/:id', { roles: RULE.admin }, ({ company, user, params, body }) => {
    const u = S.must(S.get('SELECT * FROM users WHERE id=? AND company_id=?', Number(params.id), company.id), 'Utilisateur');
    const d = validate(body, { name: { max: 120 }, role: { in: ROLES }, active: { type: 'bool' }, password: { min: 8, max: 100 } }, { partial: true });
    if (u.id === user.id && (d.active === false || (d.role && d.role !== 'owner'))) throw biz('Vous ne pouvez pas retirer vos propres droits de propriétaire.');
    S.run('UPDATE users SET name=?, role=?, active=?, password=? WHERE id=?', d.name ?? u.name, d.role ?? u.role, d.active === undefined ? u.active : d.active ? 1 : 0, d.password ? hashPassword(d.password) : u.password, u.id);
    if (d.active === false || d.password) S.run('DELETE FROM tokens WHERE user_id=?', u.id);
    return userView(S.get('SELECT * FROM users WHERE id=?', u.id));
  });

  // ---------- contrôle (1.1) : journal, messages, licence, registre ----------
  add('GET', '/api/audit', { roles: RULE.correct }, ({ company, query }) => {
    const before = Number(query.before) || 1e15;
    return S.all('SELECT id,user_name,action,entity,entity_id,detail,at FROM audit_log WHERE company_id=? AND id<? ORDER BY id DESC LIMIT 100', company.id, before);
  });
  add('GET', '/api/messages', { roles: RULE.correct }, ({ company }) => ({
    provider: x.messenger?.provider ?? 'journal',
    counts: Object.fromEntries(S.all('SELECT status, COUNT(*) n FROM messages WHERE company_id=? GROUP BY status', company.id).map((r) => [r.status, r.n])),
    items: S.all('SELECT id,to_phone,body,kind,ref,status,attempts,error,created_at,sent_at FROM messages WHERE company_id=? ORDER BY id DESC LIMIT 100', company.id),
  }));
  add('POST', '/api/messages/flush', { roles: RULE.correct, always: true }, async () => (x.messenger ? x.messenger.flush() : { sent: 0 }));
  add('POST', '/api/messages/:id/retry', { roles: RULE.correct, always: true }, ({ company, params }) => {
    S.must(S.get('SELECT id FROM messages WHERE id=? AND company_id=?', Number(params.id), company.id), 'Message');
    S.run("UPDATE messages SET status='retry', attempts=0, error=NULL WHERE id=?", Number(params.id));
    return null;
  });

  add('GET', '/api/licence', { roles: RULE.admin }, () => (mode === 'local' && x.licence ? x.licence.status() : { state: mode === 'saas' ? 'hebergee' : 'sans_controle' }));
  add('POST', '/api/licence', { roles: RULE.admin, always: true }, ({ body }) => {
    if (mode !== 'local' || !x.licence) throw biz("Les licences ne concernent que l'édition installée.");
    const d = validate(body, { text: { required: true, max: 4000, label: 'licence' } });
    const r = x.licence.install(d.text);
    if (!r.ok) throw new HttpError(422, r.error, { text: [r.error] });
    return r.status;
  });

  add('GET', '/api/registry/status', { roles: RULE.correct }, ({ company }) => ({
    connected: !!(company.registry_key && company.trace_base_url), url: company.trace_base_url ?? null, slug: company.registry_slug ?? null,
    pending: S.get('SELECT COUNT(*) n FROM lots WHERE company_id=? AND published_at IS NULL', company.id).n,
    published: S.get('SELECT COUNT(*) n FROM lots WHERE company_id=? AND published_at IS NOT NULL', company.id).n,
    last_ok: S.get("SELECT value FROM meta WHERE key='registry_last_ok'")?.value ?? null,
    last_error: S.get("SELECT value FROM meta WHERE key='registry_last_error'")?.value ?? null,
    hosted: mode === 'saas', public_url: x.publicUrl ?? null,
  }));
  add('POST', '/api/registry/connect', { roles: RULE.admin }, async ({ company, body }) => {
    const d = validate(body, { url: { required: true, max: 200, label: 'adresse du registre' }, key: { required: true, max: 200, label: 'clé du registre' } });
    if (!/^https?:\/\//.test(d.url)) throw new HttpError(422, "L'adresse doit commencer par https://", { url: ["L'adresse doit commencer par https://"] });
    const r = await x.registry.connect(company, d.url, d.key);
    if (!r.ok) throw biz(r.error);
    S.run('UPDATE lots SET published_at=NULL WHERE company_id=?', company.id); // tout republier vers ce registre
    x.registry.publish().catch(() => {});
    return r;
  });
  add('POST', '/api/registry/publish', { roles: RULE.correct, always: true }, async () => x.registry.publish());
  // côté registre (serveur hébergé) : réception des lots publiés par les installations locales
  add('GET', '/api/registry/whoami', { public: true, limit: 'auth' }, ({ headers }) => {
    const acc = x.registry.account(headers.authorization);
    if (!acc) throw new HttpError(401, 'Clé de registre invalide.');
    return { slug: acc.slug, name: acc.name };
  });
  add('POST', '/api/registry/lots', { public: true }, ({ headers, body }) => {
    const acc = x.registry.account(headers.authorization);
    if (!acc) throw new HttpError(401, 'Clé de registre invalide.');
    if (!Array.isArray(body.lots) || body.lots.length > 500) throw new HttpError(422, 'Liste de lots invalide (500 au maximum).');
    for (const l of body.lots) if (!l || typeof l.code !== 'string' || typeof l.token !== 'string' || typeof l.data !== 'object') throw new HttpError(422, 'Lot invalide.');
    return { received: x.registry.receive(acc, body.lots) };
  });

  return { routes, RULE, isWritable };
}
