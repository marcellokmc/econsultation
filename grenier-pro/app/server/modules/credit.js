// Crédit : warrantage (crédit garanti par le stock) et dossier de crédit.
//
// Un RÉCÉPISSÉ D'ENTREPÔT engage un ou plusieurs lots en garantie d'un prêt (institution de microfinance, banque).
// Les lots gagés restent dans le magasin mais ne peuvent être ni vendus ni transformés (règle de services.take)
// jusqu'à la LIBÉRATION (prêt remboursé) ou la RÉALISATION (le prêteur récupère le stock).
// Le prêteur vérifie l'authenticité et l'état du récépissé en scannant son QR code (page publique /r/…).
// Le DOSSIER DE CRÉDIT rassemble les chiffres vérifiables des 12 derniers mois pour une demande de financement.
import { validate, HttpError, biz, today, addDays, monthsBack } from '../lib.js';
import { publicToken } from '../db.js';

export const schema = `
CREATE TABLE IF NOT EXISTS warehouse_receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL, number TEXT NOT NULL, member_id INTEGER, lender TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'gage', issued_on TEXT NOT NULL, valuation_price REAL NOT NULL, value INTEGER NOT NULL,
  loan_amount INTEGER NOT NULL, loan_rate REAL NOT NULL DEFAULT 0, loan_due TEXT NOT NULL, closed_on TEXT, close_note TEXT,
  warehouse TEXT, note TEXT, token TEXT NOT NULL, created_by INTEGER, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, number)
);
CREATE TABLE IF NOT EXISTS warehouse_receipt_lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT, receipt_id INTEGER NOT NULL REFERENCES warehouse_receipts(id), lot_id INTEGER NOT NULL, qty REAL NOT NULL
);
`;
const STATUS = { gage: 'Gagé', libere: 'Libéré (prêt remboursé)', realise: 'Réalisé par le prêteur', annule: 'Annulé' };

export function routes({ add, S, RULE, x, created }) {
  const interest = (r, on = today()) => {
    const days = Math.max(0, Math.round((Date.parse(on) - Date.parse(r.issued_on)) / 864e5));
    return Math.round((r.loan_amount * (r.loan_rate / 100) * days) / 365);
  };
  function view(cid, r) {
    const lots = S.all('SELECT rl.qty, l.id, l.code, l.qty_remaining, l.received_on, i.name AS item, i.unit FROM warehouse_receipt_lots rl JOIN lots l ON l.id=rl.lot_id JOIN items i ON i.id=l.item_id WHERE rl.receipt_id=?', r.id);
    const member = r.member_id ? S.get('SELECT id,name,village,phone FROM members WHERE id=?', r.member_id) : null;
    const due = r.loan_amount + interest(r, r.status === 'gage' ? r.loan_due : (r.closed_on ?? r.loan_due));
    return { ...r, status_label: STATUS[r.status], member, lots, interest_to_date: interest(r), total_due_at_term: due, days_left: Math.round((Date.parse(r.loan_due) - Date.parse(today())) / 864e5) };
  }
  const get = (cid, id) => S.must(S.get('SELECT * FROM warehouse_receipts WHERE id=? AND company_id=?', Number(id), cid), 'Récépissé');

  add('GET', '/api/credit/receipts', {}, ({ company, query }) =>
    S.all(`SELECT * FROM warehouse_receipts WHERE company_id=? ${query.status ? 'AND status=?' : ''} ORDER BY id DESC LIMIT 300`, ...(query.status ? [company.id, query.status] : [company.id])).map((r) => view(company.id, r)));
  add('GET', '/api/credit/receipts/:id', {}, ({ company, params }) => view(company.id, get(company.id, params.id)));

  add('POST', '/api/credit/receipts', { roles: RULE.correct }, ({ company, user, body }) => {
    const d = validate(body, {
      lender: { required: true, max: 120, label: 'prêteur' }, member_id: { type: 'integer' }, issued_on: { required: true, type: 'date', past: true, label: 'date' },
      valuation_price: { required: true, type: 'number', gt: 0, label: "prix d'évaluation" }, loan_amount: { required: true, type: 'integer', gt: 0, label: 'montant du prêt' },
      loan_rate: { type: 'number', min: 0, max: 60, label: "taux d'intérêt annuel" }, loan_due: { required: true, type: 'date', label: 'échéance' },
      warehouse: { max: 120, label: 'magasin' }, note: { max: 300 },
    });
    if (d.loan_due <= d.issued_on) throw new HttpError(422, "L'échéance doit être postérieure à la date du récépissé.", { loan_due: ["L'échéance doit être postérieure à la date du récépissé."] });
    if (!Array.isArray(body.lot_ids) || !body.lot_ids.length) throw new HttpError(422, 'Choisissez au moins un lot à mettre en garantie.', { lot_ids: ['Choisissez au moins un lot.'] });
    if (d.member_id) S.must(S.get('SELECT id FROM members WHERE id=? AND company_id=?', d.member_id, company.id), 'Membre');
    return S.tx(() => {
      const lots = body.lot_ids.map((id) => {
        const l = S.must(S.get('SELECT l.*, i.unit, i.name AS item FROM lots l JOIN items i ON i.id=l.item_id WHERE l.id=? AND l.company_id=?', Number(id), company.id), 'Lot');
        if (l.qty_remaining <= 0) throw biz(`Le lot ${l.code} est vide.`);
        if (l.pledge_id) throw biz(`Le lot ${l.code} est déjà gagé.`);
        if (l.quality_status === 'bloque') throw biz(`Le lot ${l.code} est bloqué par la qualité : il ne peut pas servir de garantie.`);
        return l;
      });
      const units = new Set(lots.map((l) => l.unit));
      if (units.size > 1) throw biz('Les lots d’un même récépissé doivent avoir la même unité.');
      const qty = lots.reduce((s, l) => s + l.qty_remaining, 0);
      const value = Math.round(qty * d.valuation_price);
      if (d.loan_amount > value) throw biz(`Le prêt (${d.loan_amount} FCFA) dépasse la valeur du stock gagé (${value} FCFA).`);
      const year = d.issued_on.slice(0, 4);
      const n = S.get("SELECT COUNT(*) n FROM warehouse_receipts WHERE company_id=? AND number LIKE ?", company.id, `RE-${year}-%`).n + 1;
      const number = `RE-${year}-${String(n).padStart(4, '0')}`;
      const id = S.lastId(S.run('INSERT INTO warehouse_receipts(company_id,number,member_id,lender,issued_on,valuation_price,value,loan_amount,loan_rate,loan_due,warehouse,note,token,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        company.id, number, d.member_id ?? null, d.lender, d.issued_on, d.valuation_price, value, d.loan_amount, d.loan_rate ?? 0, d.loan_due, d.warehouse ?? null, d.note ?? null, publicToken(), user.id));
      for (const l of lots) { S.run('INSERT INTO warehouse_receipt_lots(receipt_id,lot_id,qty) VALUES (?,?,?)', id, l.id, l.qty_remaining); S.run('UPDATE lots SET pledge_id=? WHERE id=?', id, l.id); }
      return created(view(company.id, S.get('SELECT * FROM warehouse_receipts WHERE id=?', id)));
    });
  });

  /** Clôture : libération (prêt remboursé), réalisation (le prêteur prend le stock) ou annulation (erreur de saisie). */
  add('POST', '/api/credit/receipts/:id/close', { roles: RULE.correct }, ({ company, user, params, body }) => {
    const d = validate(body, { status: { required: true, in: ['libere', 'realise', 'annule'] }, note: { required: true, min: 3, max: 300, label: 'motif' }, date: { type: 'date', past: true } });
    const r = get(company.id, params.id);
    if (r.status !== 'gage') throw biz('Ce récépissé est déjà clôturé.');
    const on = d.date ?? today();
    return S.tx(() => {
      for (const rl of S.all('SELECT * FROM warehouse_receipt_lots WHERE receipt_id=?', r.id)) {
        const lot = S.get('SELECT * FROM lots WHERE id=?', rl.lot_id);
        S.run('UPDATE lots SET pledge_id=NULL WHERE id=?', lot.id);
        if (d.status === 'realise' && lot.qty_remaining > 0) {
          S.run('UPDATE lots SET qty_remaining=0 WHERE id=?', lot.id);
          S.run('INSERT INTO stock_movements(company_id,lot_id,item_id,type,qty,reference,note,occurred_on,user_id) VALUES (?,?,?,?,?,?,?,?,?)', company.id, lot.id, lot.item_id, 'perte', -lot.qty_remaining, r.number, `Réalisation du gage (${r.lender})`, on, user.id);
        }
      }
      S.run('UPDATE warehouse_receipts SET status=?, closed_on=?, close_note=? WHERE id=?', d.status, on, d.note, r.id);
      return view(company.id, S.get('SELECT * FROM warehouse_receipts WHERE id=?', r.id));
    });
  });

  // QR du récépissé (version hébergée : adresse publique connue)
  add('GET', '/api/credit/receipts/:id/qr', {}, ({ company, params }) => {
    const r = get(company.id, params.id);
    if (!x.publicUrl) throw new HttpError(404, 'QR disponible seulement sur la version hébergée.');
    return { raw: x.qrSvg(`${x.publicUrl.replace(/\/+$/, '')}/r/${encodeURIComponent(company.slug)}/${encodeURIComponent(r.number)}/${r.token}`), type: 'image/svg+xml' };
  });
  // vérification publique par le prêteur (QR du récépissé) : jamais de prix, ni de données personnelles au-delà du nom
  add('GET', '/api/public/receipt/:slug/:number/:token', { public: true }, ({ params }) => {
    const c = S.get('SELECT * FROM companies WHERE slug=?', params.slug);
    const r = c && S.get('SELECT * FROM warehouse_receipts WHERE company_id=? AND number=?', c.id, decodeURIComponent(params.number));
    if (!r || r.token !== params.token) throw new HttpError(404, 'Récépissé introuvable.');
    const v = view(c.id, r);
    return { company: { name: c.name, address: c.address, phone: c.phone }, number: r.number, status: r.status, status_label: v.status_label, issued_on: r.issued_on, loan_due: r.loan_due, lender: r.lender, closed_on: r.closed_on,
      holder: v.member?.name ?? c.name, lots: v.lots.map((l) => ({ code: l.code, item: l.item, unit: l.unit, qty: l.qty, still_in_stock: l.qty_remaining })) };
  });

  // dossier de crédit : chiffres des 12 derniers mois extraits de Grenier
  add('GET', '/api/credit/dossier', { roles: [...RULE.correct, 'accountant'] }, ({ company }) => {
    const months = monthsBack(12), from = months[0] + '-01';
    const inv = S.all("SELECT issued_on, total_ht, total_ttc, id FROM invoices WHERE company_id=? AND status='active' AND issued_on>=?", company.id, from);
    const paid = (id) => Number(S.get('SELECT SUM(amount) s FROM invoice_payments WHERE invoice_id=?', id)?.s ?? 0);
    const del = S.all("SELECT delivered_on, qty, amount, member_id FROM deliveries WHERE company_id=? AND status='active' AND delivered_on>=?", company.id, from);
    const pay = S.all("SELECT paid_on, amount FROM member_payouts WHERE company_id=? AND status='active' AND paid_on>=?", company.id, from);
    const dash = S.dashboard(company.id);
    return {
      company: { name: company.name, address: company.address, phone: company.phone, email: company.email, ifu: company.ifu, rccm: company.rccm, since: company.created_at },
      generated_at: new Date().toISOString(),
      monthly: months.map((m) => ({ month: m,
        sales_ht: inv.filter((i) => i.issued_on.startsWith(m)).reduce((s, i) => s + i.total_ht, 0),
        purchases_members: del.filter((x) => x.delivered_on.startsWith(m)).reduce((s, x) => s + x.amount, 0),
        paid_members: pay.filter((x) => x.paid_on.startsWith(m)).reduce((s, x) => s + x.amount, 0) })),
      totals: {
        sales_ht: inv.reduce((s, i) => s + i.total_ht, 0), sales_ttc: inv.reduce((s, i) => s + i.total_ttc, 0), invoices: inv.length,
        collected: inv.reduce((s, i) => s + paid(i.id), 0), receivables: dash.receivables, late: dash.late_count,
        stock_value: dash.stock_value, members: S.get('SELECT COUNT(*) n FROM members WHERE company_id=? AND active=1', company.id).n,
        active_members: new Set(del.map((x) => x.member_id)).size, delivered_value: del.reduce((s, x) => s + x.amount, 0), paid_members: pay.reduce((s, x) => s + x.amount, 0),
        owed_members: dash.owed_to_members, customers: S.get("SELECT COUNT(DISTINCT customer_id) n FROM invoices WHERE company_id=? AND status='active' AND issued_on>=?", company.id, from).n,
        quality_checks: S.get('SELECT COUNT(*) n FROM quality_checks WHERE company_id=? AND done_on>=?', company.id, from).n,
      },
      pledges: S.all("SELECT number, lender, loan_amount, loan_due, status FROM warehouse_receipts WHERE company_id=? AND (status='gage' OR closed_on>=?) ORDER BY id DESC", company.id, from),
    };
  });
}

/** Alertes d'échéance (ajoutées au tableau de bord par services.dashboard). */
export function dueAlerts(S, cid) {
  return S.all("SELECT number, lender, loan_due FROM warehouse_receipts WHERE company_id=? AND status='gage' AND loan_due<=?", cid, addDays(today(), 15))
    .map((r) => ({ type: r.loan_due < today() ? 'late_invoice' : 'expiring', message: `Récépissé ${r.number} (${r.lender}) : échéance du prêt le ${r.loan_due.split('-').reverse().join('/')}` }));
}
