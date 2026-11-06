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

export function buildRoutes({ S, mode }) {
  const routes = [];
  const add = (method, path, opts, handler) => {
    const keys = [];
    const re = new RegExp('^' + path.replace(/:([a-z_]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
    routes.push({ method, re, keys, opts, handler });
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
    return { raw: qrSvg(S.qrPayload(c, lot)), type: 'image/svg+xml', headers: { 'Cache-Control': 'public, max-age=300' } };
  });

  // ---------- session ----------
  add('GET', '/api/me', {}, ({ user, company }) => profile(user, company));
  add('POST', '/api/auth/logout', {}, ({ token }) => { S.run('DELETE FROM tokens WHERE hash=?', sha(token)); return null; });
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
    return { raw: qrSvg(S.qrPayload(company, lot)), type: 'image/svg+xml' };
  });
  add('GET', '/api/movements', {}, ({ company, query }) => S.listMovements(company.id, query));
  add('POST', '/api/stock/receipts', { roles: RULE.stock }, ({ company, user, body }) => {
    const d = validate(body, { item_id: { required: true, type: 'integer' }, qty: { required: true, type: 'number', gt: 0 }, unit_cost: { required: true, type: 'number', min: 0 }, date: { required: true, type: 'date' }, supplier_name: { max: 120 } });
    return created(S.receipt(company.id, user.id, d));
  });
  add('POST', '/api/lots/:id/loss', { roles: RULE.stock }, ({ company, user, params, body }) => {
    const d = validate(body, { qty: { required: true, type: 'number', gt: 0 }, date: { required: true, type: 'date' }, reason: { required: true, max: 60 }, note: { max: 200 } });
    return S.loss(company.id, user.id, Number(params.id), d);
  });

  // ---------- production ----------
  add('GET', '/api/productions', {}, ({ company }) => S.listProductions(company.id));
  add('POST', '/api/productions', { roles: RULE.stock }, ({ company, user, body }) => {
    const d = validate(body, {
      item_id: { required: true, type: 'integer' }, produced_on: { required: true, type: 'date' }, qty: { required: true, type: 'number', gt: 0 },
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
      customer_id: { required: true, type: 'integer' }, issued_on: { required: true, type: 'date' }, due_on: { type: 'date' }, vat_enabled: { type: 'bool' },
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
    const d = validate(body, { paid_on: { required: true, type: 'date' }, amount: { required: true, type: 'integer', gt: 0 }, method: { required: true, max: 40 }, reference: { max: 80 } });
    return S.addPayment(company.id, Number(params.id), d);
  });
  add('GET', '/api/trace/:code', {}, ({ company, params }) => S.trace(company.id, decodeURIComponent(params.code)));

  // ---------- coopérative ----------
  const memberRules = { name: { required: true, max: 120 }, village: { max: 120 }, phone: { max: 30 }, group_name: { max: 120 }, joined_on: { type: 'date' }, active: { type: 'bool' } };
  add('GET', '/api/members', { feature: 'coop' }, ({ company, query }) => S.listMembers(company.id, query.q));
  add('GET', '/api/members/:id', { feature: 'coop' }, ({ company, params }) => S.memberDetail(company.id, Number(params.id)));
  add('POST', '/api/members', { feature: 'coop', roles: RULE.coop }, ({ company, body }) => {
    const d = validate(body, memberRules);
    const id = S.lastId(S.run('INSERT INTO members(company_id,name,village,phone,group_name,joined_on) VALUES (?,?,?,?,?,?)', company.id, d.name, d.village ?? null, d.phone ?? null, d.group_name ?? null, d.joined_on ?? null));
    return created(S.listMembers(company.id).find((m) => m.id === id));
  });
  add('PUT', '/api/members/:id', { feature: 'coop', roles: RULE.coop }, ({ company, params, body }) => {
    const m = S.must(S.get('SELECT * FROM members WHERE id=? AND company_id=?', Number(params.id), company.id), 'Membre');
    const d = { ...m, ...validate(body, memberRules, { partial: true }) };
    S.run('UPDATE members SET name=?,village=?,phone=?,group_name=?,joined_on=?,active=? WHERE id=?', d.name, d.village, d.phone, d.group_name, d.joined_on, d.active ? 1 : 0, m.id);
    return S.listMembers(company.id).find((x) => x.id === m.id);
  });
  add('GET', '/api/deliveries', { feature: 'coop' }, ({ company, query }) => S.listDeliveries(company.id, query.member_id));
  add('POST', '/api/deliveries', { feature: 'coop', roles: RULE.coop }, ({ company, user, body }) => {
    const d = validate(body, { member_id: { required: true, type: 'integer' }, item_id: { required: true, type: 'integer' }, delivered_on: { required: true, type: 'date' }, qty: { required: true, type: 'number', gt: 0 }, unit_price: { required: true, type: 'integer', min: 0 }, quality: { in: ['A', 'B', 'C'] }, note: { max: 200 } });
    return created(S.createDelivery(company.id, user.id, d));
  });
  add('GET', '/api/payouts', { feature: 'coop' }, ({ company }) => S.listPayouts(company.id));
  add('GET', '/api/payouts/:id', { feature: 'coop' }, ({ company, params }) => S.payoutView(company.id, Number(params.id)));
  add('POST', '/api/payouts', { feature: 'coop', roles: RULE.payout }, ({ company, body }) => {
    const d = validate(body, { member_id: { required: true, type: 'integer' }, paid_on: { required: true, type: 'date' }, amount: { required: true, type: 'integer', gt: 0 }, method: { required: true, max: 40 }, note: { max: 200 } });
    return created(S.createPayout(company.id, d));
  });
  add('GET', '/api/coop/dashboard', { feature: 'coop' }, ({ company, query }) => S.coopStats(company.id, [30, 90, 365].includes(Number(query.days)) ? Number(query.days) : null));

  // ---------- administration ----------
  add('PUT', '/api/settings', { roles: RULE.admin }, ({ company, body }) => {
    const d = validate(body, { name: { max: 120 }, address: { max: 200 }, phone: { max: 30 }, email: { type: 'email', max: 160 }, ifu: { max: 40 }, rccm: { max: 60 }, vat_rate: { type: 'number', min: 0, max: 30 }, trace_base_url: { max: 200 } }, { partial: true });
    const c = { ...company, ...d };
    S.run('UPDATE companies SET name=?,address=?,phone=?,email=?,ifu=?,rccm=?,vat_rate=?,trace_base_url=? WHERE id=?', c.name, c.address, c.phone, c.email, c.ifu, c.rccm, c.vat_rate, c.trace_base_url, company.id);
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

  return { routes, RULE, isWritable };
}
