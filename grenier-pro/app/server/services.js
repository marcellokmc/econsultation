import { biz, r3, today, addDays, monthsBack } from './lib.js';
import { publicToken } from './db.js';
import { dueAlerts } from './modules/credit.js';

export const PLANS = {
  starter: { label: 'Starter', max_users: 3, coop: false },
  pro: { label: 'Pro', max_users: 10, coop: true },
  cooperative: { label: 'Coopérative', max_users: 25, coop: true },
};
const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });
const rnd = (x) => Math.round(x);
const daysUntil = (s) => { const [y, m, d] = s.split('-').map(Number); return Math.round((new Date(y, m - 1, d) - new Date(new Date().toDateString())) / 864e5); };

/**
 * hooks (facultatif) : { message(cid, phone, body, kind, ref) } — appelé dans la transaction pour mettre un SMS en file d'attente.
 */
export function makeServices(db, tx, hooks = {}) {
  const all = (sql, ...p) => db.prepare(sql).all(...p).map((r) => ({ ...r }));
  const get = (sql, ...p) => { const r = db.prepare(sql).get(...p); return r ? { ...r } : null; };
  const run = (sql, ...p) => db.prepare(sql).run(...p);
  const lastId = (r) => Number(r.lastInsertRowid);
  const sumOf = (sql, ...p) => Number(db.prepare(sql).get(...p)?.s ?? 0);
  const notFound = (what = 'Élément') => Object.assign(new Error(`${what} introuvable.`), { status: 404 });
  const must = (row, what) => { if (!row) throw notFound(what); return row; };

  // =================== articles ===================
  function itemView(it, stock, value) {
    return { ...it, alert_qty: Number(it.alert_qty), stock: r3(stock), stock_value: rnd(value), low_stock: it.alert_qty > 0 && stock <= it.alert_qty };
  }
  function listItems(cid, kind) {
    const rows = all(
      `SELECT i.*, COALESCE(SUM(l.qty_remaining),0) AS stock, COALESCE(SUM(l.qty_remaining*l.unit_cost),0) AS value
       FROM items i LEFT JOIN lots l ON l.item_id=i.id AND l.qty_remaining>0
       WHERE i.company_id=? ${kind ? 'AND i.kind=?' : ''} GROUP BY i.id ORDER BY i.name`, ...(kind ? [cid, kind] : [cid]));
    return rows.map((r) => { const { stock, value, ...it } = r; return itemView(it, stock, value); });
  }
  function getItem(cid, id) {
    const it = must(get('SELECT * FROM items WHERE id=? AND company_id=?', id, cid), 'Article');
    return itemView(it, sumOf('SELECT SUM(qty_remaining) s FROM lots WHERE item_id=?', id), sumOf('SELECT SUM(qty_remaining*unit_cost) s FROM lots WHERE item_id=? AND qty_remaining>0', id));
  }
  const rawItem = (cid, id) => must(get('SELECT * FROM items WHERE id=? AND company_id=?', id, cid), 'Article');

  // =================== lots et stock ===================
  function nextLotCode(cid, item, date) {
    const base = `${item.code.toUpperCase()}-${date.slice(2, 4)}${date.slice(5, 7)}${date.slice(8, 10)}`;
    let n = 1, code;
    do { code = `${base}-${String(n++).padStart(3, '0')}`; } while (get('SELECT 1 x FROM lots WHERE company_id=? AND code=?', cid, code));
    return code;
  }
  function move(cid, uid, lot, type, qty, date, ref, note) {
    run('INSERT INTO stock_movements(company_id,lot_id,item_id,type,qty,reference,note,occurred_on,user_id) VALUES (?,?,?,?,?,?,?,?,?)',
      cid, lot.id, lot.item_id, type, r3(qty), ref ?? null, note ?? null, date, uid ?? null);
  }
  function createLot(cid, uid, item, d, type = 'entree') {
    const code = nextLotCode(cid, item, d.date);
    const r = run(`INSERT INTO lots(company_id,item_id,code,received_on,qty_initial,qty_remaining,unit_cost,expires_on,origin_type,member_id,supplier_name,production_id,public_token)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, cid, item.id, code, d.date, r3(d.qty), r3(d.qty), d.unit_cost ?? 0, d.expires_on ?? null,
      d.origin_type, d.member_id ?? null, d.supplier_name ?? null, d.production_id ?? null, publicToken());
    const lot = get('SELECT * FROM lots WHERE id=?', lastId(r));
    move(cid, uid, lot, type, d.qty, d.date, code);
    return lot;
  }
  /** FIFO (matières) ou FEFO (ventes : date limite la plus proche, jamais un lot périmé). Appeler dans une transaction. */
  function take(cid, uid, item, qty, mode, date, type, ref) {
    if (!(qty > 0)) throw biz('La quantité doit être supérieure à 0.');
    // Jamais un lot bloqué par la qualité, ni un lot gagé (warrantage) ; en vente, jamais un lot périmé.
    const usable = "AND (quality_status IS NULL OR quality_status<>'bloque') AND pledge_id IS NULL";
    const lots = mode === 'fefo'
      ? all(`SELECT * FROM lots WHERE company_id=? AND item_id=? AND qty_remaining>0 ${usable} AND (expires_on IS NULL OR expires_on>=?) ORDER BY expires_on IS NULL, expires_on, received_on, id`, cid, item.id, date)
      : all(`SELECT * FROM lots WHERE company_id=? AND item_id=? AND qty_remaining>0 ${usable} ORDER BY received_on, id`, cid, item.id);
    let need = r3(qty);
    const taken = [];
    for (const lot of lots) {
      if (need <= 0) break;
      const part = Math.min(need, lot.qty_remaining);
      run('UPDATE lots SET qty_remaining=? WHERE id=?', r3(lot.qty_remaining - part), lot.id);
      move(cid, uid, lot, type, -part, date, ref);
      taken.push({ lot, qty: r3(part) });
      need = r3(need - part);
    }
    if (need > 0) {
      const held = sumOf(`SELECT SUM(qty_remaining) s FROM lots WHERE company_id=? AND item_id=? AND qty_remaining>0 AND ((quality_status='bloque') OR pledge_id IS NOT NULL)`, cid, item.id);
      throw biz(`Stock insuffisant pour « ${item.name} » (disponible : ${nf.format(r3(qty - need))} ${item.unit}${held > 0 ? ` ; ${nf.format(r3(held))} ${item.unit} bloqués par la qualité ou gagés` : ''}).`);
    }
    return taken;
  }
  function receipt(cid, uid, d) {
    return tx(() => {
      const item = rawItem(cid, d.item_id);
      if (item.kind === 'pf') throw biz('Un produit fini entre en stock par une production.');
      const lot = createLot(cid, uid, item, { date: d.date, qty: d.qty, unit_cost: d.unit_cost, origin_type: 'supplier', supplier_name: d.supplier_name });
      return lotView(cid, lot.id);
    });
  }
  function loss(cid, uid, lotId, d) {
    return tx(() => {
      const lot = must(get('SELECT * FROM lots WHERE id=? AND company_id=?', lotId, cid), 'Lot');
      if (d.qty > lot.qty_remaining) throw biz(`Il ne reste que ${nf.format(lot.qty_remaining)} dans ce lot.`);
      run('UPDATE lots SET qty_remaining=? WHERE id=?', r3(lot.qty_remaining - d.qty), lot.id);
      move(cid, uid, lot, 'perte', -d.qty, d.date, d.reason, d.note);
      return lotView(cid, lot.id);
    });
  }
  function hydrateLots(cid, rows) {
    const items = new Map(all('SELECT id,name,kind,unit,code FROM items WHERE company_id=?', cid).map((i) => [i.id, i]));
    const members = new Map(all('SELECT id,name,village FROM members WHERE company_id=?', cid).map((m) => [m.id, m]));
    return rows.map((l) => ({ ...l, item: items.get(l.item_id) ?? null, member: l.member_id ? members.get(l.member_id) ?? null : null }));
  }
  const lotView = (cid, id) => hydrateLots(cid, [must(get('SELECT * FROM lots WHERE id=? AND company_id=?', id, cid), 'Lot')])[0];
  function listLots(cid, q) {
    let sql = 'SELECT l.* FROM lots l JOIN items i ON i.id=l.item_id WHERE l.company_id=?';
    const p = [cid];
    if (q.in_stock !== '0' && q.in_stock !== 'false') sql += ' AND l.qty_remaining>0';
    if (q.item_id) { sql += ' AND l.item_id=?'; p.push(Number(q.item_id)); }
    if (q.kind === 'pf') sql += " AND i.kind='pf'"; else if (q.kind) sql += " AND i.kind!='pf'";
    if (q.q) { sql += ' AND l.code LIKE ?'; p.push(`%${q.q}%`); }
    sql += ' ORDER BY l.received_on DESC, l.id DESC LIMIT 500';
    return hydrateLots(cid, all(sql, ...p));
  }
  function listMovements(cid, q) {
    const rows = all(`SELECT m.*, i.name AS item_name, i.unit AS item_unit, l.code AS lot_code FROM stock_movements m
      JOIN items i ON i.id=m.item_id JOIN lots l ON l.id=m.lot_id WHERE m.company_id=? ${q.lot_id ? 'AND m.lot_id=?' : ''}
      ORDER BY m.occurred_on DESC, m.id DESC LIMIT 300`, ...(q.lot_id ? [cid, Number(q.lot_id)] : [cid]));
    return rows.map(({ item_name, item_unit, lot_code, ...m }) => ({ ...m, item: { name: item_name, unit: item_unit }, lot: { code: lot_code } }));
  }

  // =================== production ===================
  function createProduction(cid, uid, d) {
    return tx(() => {
      const item = rawItem(cid, d.item_id);
      if (item.kind !== 'pf') throw biz('Une production doit produire un produit fini.');
      const pr = run('INSERT INTO productions(company_id,item_id,produced_on,qty,expires_on,operator,extra_cost,note) VALUES (?,?,?,?,?,?,?,?)',
        cid, item.id, d.produced_on, d.qty, d.expires_on ?? null, d.operator ?? null, d.extra_cost || 0, d.note ?? null);
      const pid = lastId(pr);
      const lot = createLot(cid, uid, item, { date: d.produced_on, qty: d.qty, expires_on: d.expires_on, origin_type: 'production', production_id: pid }, 'prod');
      let cost = d.extra_cost || 0;
      for (const inp of d.inputs) {
        const it = rawItem(cid, inp.item_id);
        if (it.kind === 'pf') throw biz('Un produit fini ne peut pas être un intrant.');
        for (const part of take(cid, uid, it, inp.qty, 'fifo', d.produced_on, 'conso', lot.code)) {
          run('INSERT INTO production_inputs(production_id,lot_id,item_id,qty) VALUES (?,?,?,?)', pid, part.lot.id, it.id, part.qty);
          cost += part.qty * part.lot.unit_cost;
        }
      }
      run('UPDATE lots SET unit_cost=? WHERE id=?', Math.round((cost / d.qty) * 100) / 100, lot.id);
      run('UPDATE productions SET lot_id=?, total_cost=? WHERE id=?', lot.id, rnd(cost), pid);
      return productionView(cid, pid);
    });
  }
  function productionView(cid, id) {
    const p = must(get('SELECT * FROM productions WHERE id=? AND company_id=?', id, cid), 'Production');
    const item = getItem(cid, p.item_id);
    const lot = lotView(cid, p.lot_id);
    const inputs = all('SELECT pi.*, i.name, i.unit, i.kind, i.code, l.code AS lot_code FROM production_inputs pi JOIN items i ON i.id=pi.item_id JOIN lots l ON l.id=pi.lot_id WHERE pi.production_id=?', id)
      .map((x) => ({ id: x.id, qty: x.qty, item: { id: x.item_id, name: x.name, unit: x.unit, kind: x.kind, code: x.code }, lot: { code: x.lot_code } }));
    return { ...p, item, lot, inputs };
  }
  const listProductions = (cid) => all('SELECT id FROM productions WHERE company_id=? ORDER BY produced_on DESC, id DESC LIMIT 300', cid).map((r) => productionView(cid, r.id));

  // =================== clients et factures ===================
  const paidOf = (invId) => sumOf('SELECT SUM(amount) s FROM invoice_payments WHERE invoice_id=?', invId);
  function payStatus(inv, paid) {
    if (inv.status === 'cancelled') return 'cancelled';
    if (inv.total_ttc - paid <= 0) return 'paid';
    if (inv.due_on && inv.due_on < today()) return 'late';
    return paid > 0 ? 'partial' : 'open';
  }
  function invoiceSummary(inv) {
    const paid = paidOf(inv.id);
    const customer = get('SELECT id,name,type,phone,address,ifu FROM customers WHERE id=?', inv.customer_id);
    return { ...inv, paid_amount: paid, balance: inv.status === 'cancelled' ? 0 : Math.max(inv.total_ttc - paid, 0), payment_status: payStatus(inv, paid), customer };
  }
  function invoiceFull(cid, id) {
    const inv = must(get('SELECT * FROM invoices WHERE id=? AND company_id=?', id, cid), 'Facture');
    const lines = all('SELECT * FROM invoice_lines WHERE invoice_id=? ORDER BY id', id).map((l) => ({
      ...l, lots: all('SELECT ill.qty, lo.code FROM invoice_line_lots ill JOIN lots lo ON lo.id=ill.lot_id WHERE ill.invoice_line_id=?', l.id).map((x) => ({ qty: x.qty, lot: { code: x.code } })),
    }));
    return { ...invoiceSummary(inv), lines, payments: all('SELECT * FROM invoice_payments WHERE invoice_id=? ORDER BY id', id) };
  }
  function listInvoices(cid, status) {
    const out = all('SELECT * FROM invoices WHERE company_id=? ORDER BY issued_on DESC, id DESC LIMIT 500', cid).map(invoiceSummary);
    if (!status) return out;
    return out.filter((i) => (status === 'open' ? ['open', 'partial', 'late'].includes(i.payment_status) : i.payment_status === status));
  }
  function addPaymentTx(cid, invId, d) {
    const inv = must(get('SELECT * FROM invoices WHERE id=? AND company_id=?', invId, cid), 'Facture');
    if (inv.status === 'cancelled') throw biz('Cette facture est annulée.');
    if (d.amount <= 0) throw biz('Le montant doit être supérieur à 0.');
    const balance = inv.total_ttc - paidOf(inv.id);
    if (d.amount > balance) throw biz(`Le montant dépasse le reste à payer (${balance} FCFA).`);
    run('INSERT INTO invoice_payments(invoice_id,paid_on,amount,method,reference) VALUES (?,?,?,?,?)', inv.id, d.paid_on, d.amount, d.method, d.reference ?? null);
  }
  const addPayment = (cid, invId, d) => tx(() => { addPaymentTx(cid, invId, d); return invoiceFull(cid, invId); });

  function createInvoice(cid, uid, d) {
    return tx(() => {
      const customer = must(get('SELECT * FROM customers WHERE id=? AND company_id=?', d.customer_id, cid), 'Client');
      const company = get('SELECT * FROM companies WHERE id=?', cid);
      run('UPDATE companies SET invoice_seq=invoice_seq+1 WHERE id=?', cid);
      const seq = get('SELECT invoice_seq FROM companies WHERE id=?', cid).invoice_seq;
      const number = `FAC-${d.issued_on.slice(0, 4)}-${String(seq).padStart(4, '0')}`;
      const rate = d.vat_enabled === false ? 0 : Number(company.vat_rate);
      const ir = run('INSERT INTO invoices(company_id,customer_id,number,issued_on,due_on,vat_rate,note,user_id) VALUES (?,?,?,?,?,?,?,?)',
        cid, customer.id, number, d.issued_on, d.due_on ?? null, rate, d.note ?? null, uid ?? null);
      const invId = lastId(ir);
      let ht = 0;
      for (const l of d.lines) {
        const item = rawItem(cid, l.item_id);
        if (item.kind !== 'pf') throw biz('Seuls les produits finis peuvent être facturés.');
        const parts = take(cid, uid, item, l.qty, 'fefo', d.issued_on, 'vente', number);
        const total = rnd(l.qty * l.unit_price);
        ht += total;
        const lr = run('INSERT INTO invoice_lines(invoice_id,item_id,name,unit,qty,unit_price,line_total) VALUES (?,?,?,?,?,?,?)', invId, item.id, item.name, item.unit, l.qty, l.unit_price, total);
        for (const p of parts) run('INSERT INTO invoice_line_lots(invoice_line_id,lot_id,qty) VALUES (?,?,?)', lastId(lr), p.lot.id, p.qty);
      }
      const vat = rnd((ht * rate) / 100), ttc = ht + vat;
      run('UPDATE invoices SET total_ht=?, total_vat=?, total_ttc=? WHERE id=?', ht, vat, ttc, invId);
      if (d.paid_amount > 0) addPaymentTx(cid, invId, { paid_on: d.issued_on, amount: Math.min(d.paid_amount, ttc), method: d.payment_method || 'Espèces' });
      return invoiceFull(cid, invId);
    });
  }
  function cancelInvoice(cid, uid, id) {
    return tx(() => {
      const inv = must(get('SELECT * FROM invoices WHERE id=? AND company_id=?', id, cid), 'Facture');
      if (inv.status === 'cancelled') throw biz('Cette facture est déjà annulée.');
      for (const a of all('SELECT ill.lot_id, ill.qty FROM invoice_line_lots ill JOIN invoice_lines il ON il.id=ill.invoice_line_id WHERE il.invoice_id=?', id)) {
        const lot = get('SELECT * FROM lots WHERE id=?', a.lot_id);
        run('UPDATE lots SET qty_remaining=? WHERE id=?', r3(lot.qty_remaining + a.qty), lot.id);
        move(cid, uid, lot, 'annulation', a.qty, today(), inv.number);
      }
      run("UPDATE invoices SET status='cancelled' WHERE id=?", id);
      return invoiceFull(cid, id);
    });
  }
  function listCustomers(cid) {
    return all('SELECT * FROM customers WHERE company_id=? ORDER BY name', cid).map((c) => {
      const invs = all("SELECT * FROM invoices WHERE customer_id=? AND status='active'", c.id).map(invoiceSummary);
      return { ...c, invoiced: invs.reduce((s, i) => s + i.total_ttc, 0), outstanding: invs.reduce((s, i) => s + i.balance, 0) };
    });
  }

  // =================== coopérative ===================
  const fcfa = (n) => nf.format(Math.round(n)).replace(/ | /g, ' ');
  const companyName = (cid) => get('SELECT name FROM companies WHERE id=?', cid)?.name ?? '';
  /** Solde d'un membre = livraisons valides − paiements valides (négatif = avance consentie au membre). */
  const memberBalance = (mid) => sumOf("SELECT SUM(amount) s FROM deliveries WHERE member_id=? AND status='active'", mid)
    - sumOf("SELECT SUM(amount) s FROM member_payouts WHERE member_id=? AND status='active'", mid);
  const message = (cid, phone, body, kind, ref) => { if (phone && hooks.message) hooks.message(cid, phone, body, kind, ref); };

  function createDelivery(cid, uid, d) {
    return tx(() => {
      if (d.client_ref) {
        const dup = get('SELECT id FROM deliveries WHERE company_id=? AND client_ref=?', cid, d.client_ref);
        if (dup) return { ...deliveryView(cid, dup.id), duplicate: true }; // déjà reçue (synchronisation répétée)
      }
      const m = must(get('SELECT * FROM members WHERE id=? AND company_id=?', d.member_id, cid), 'Membre');
      if (!m.active) throw biz('Ce membre est désactivé.');
      const item = rawItem(cid, d.item_id);
      if (item.kind !== 'mp') throw biz('Une livraison concerne une matière première.');
      const lot = createLot(cid, uid, item, { date: d.delivered_on, qty: d.qty, unit_cost: d.unit_price, origin_type: 'member', member_id: m.id });
      const amount = rnd(d.qty * d.unit_price);
      const r = run('INSERT INTO deliveries(company_id,member_id,item_id,lot_id,delivered_on,qty,unit_price,amount,quality,note,client_ref,user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        cid, m.id, item.id, lot.id, d.delivered_on, d.qty, d.unit_price, amount, d.quality || 'A', d.note ?? null, d.client_ref ?? null, uid ?? null);
      message(cid, m.phone, `${companyName(cid)}: livraison du ${d.delivered_on.split('-').reverse().join('/')} enregistree. ${nf.format(r3(d.qty))} ${item.unit} ${item.name} (qualite ${d.quality || 'A'}) = ${fcfa(amount)} FCFA. Lot ${lot.code}. Votre solde: ${fcfa(memberBalance(m.id))} FCFA.`, 'livraison', lot.code);
      return deliveryView(cid, lastId(r));
    });
  }
  /** Annule une livraison saisie par erreur : seulement si son lot n'a pas encore été utilisé (production, vente, perte). */
  function cancelDelivery(cid, uid, id, reason) {
    return tx(() => {
      const d = must(get('SELECT * FROM deliveries WHERE id=? AND company_id=?', id, cid), 'Livraison');
      if (d.status === 'cancelled') throw biz('Cette livraison est déjà annulée.');
      const lot = get('SELECT * FROM lots WHERE id=?', d.lot_id);
      if (r3(lot.qty_remaining) !== r3(lot.qty_initial)) throw biz(`Le lot ${lot.code} a déjà été utilisé (production, vente ou perte) : la livraison ne peut plus être annulée. Enregistrez une perte ou un ajustement à la place.`);
      run('UPDATE lots SET qty_remaining=0 WHERE id=?', lot.id);
      move(cid, uid, lot, 'annulation', -lot.qty_remaining, today(), lot.code, reason);
      run("UPDATE deliveries SET status='cancelled', cancel_reason=?, cancelled_at=CURRENT_TIMESTAMP, cancelled_by=? WHERE id=?", reason, uid ?? null, id);
      const m = get('SELECT * FROM members WHERE id=?', d.member_id);
      message(cid, m?.phone, `${companyName(cid)}: la livraison du ${d.delivered_on.split('-').reverse().join('/')} (lot ${lot.code}, ${fcfa(d.amount)} FCFA) a ete annulee. Motif: ${reason}. Votre solde: ${fcfa(memberBalance(d.member_id))} FCFA.`, 'annulation', lot.code);
      return deliveryView(cid, id);
    });
  }
  function deliveryView(cid, id) {
    const d = must(get('SELECT * FROM deliveries WHERE id=? AND company_id=?', id, cid), 'Livraison');
    return { ...d, member: get('SELECT id,name,village FROM members WHERE id=?', d.member_id), item: get('SELECT id,name,unit,kind FROM items WHERE id=?', d.item_id), lot: get('SELECT id,code FROM lots WHERE id=?', d.lot_id) };
  }
  /** Par défaut seules les livraisons valides ; all=true inclut les annulées (écran Contrôle). */
  const listDeliveries = (cid, memberId, all_ = false) => all(`SELECT id FROM deliveries WHERE company_id=? ${all_ ? '' : "AND status='active'"} ${memberId ? 'AND member_id=?' : ''} ORDER BY delivered_on DESC, id DESC LIMIT 300`, ...(memberId ? [cid, Number(memberId)] : [cid])).map((r) => deliveryView(cid, r.id));

  /**
   * Paiement à un membre. Il ne peut pas dépasser le solde dû, sauf avance explicite (d.advance, propriétaire ou gérant :
   * contrôlé par la route). Le solde du membre devient alors négatif = somme que le membre doit à la coopérative.
   */
  function createPayout(cid, d, uid) {
    return tx(() => {
      if (d.client_ref) {
        const dup = get('SELECT id FROM member_payouts WHERE company_id=? AND client_ref=?', cid, d.client_ref);
        if (dup) return { ...payoutView(cid, dup.id), duplicate: true };
      }
      const m = must(get('SELECT * FROM members WHERE id=? AND company_id=?', d.member_id, cid), 'Membre');
      // Les ordres mobile money en cours sont réservés : on ne paie pas deux fois la même somme.
      const pending = d.internal ? 0 : sumOf("SELECT SUM(amount) s FROM payment_orders WHERE member_id=? AND status IN ('en_attente','envoye')", m.id);
      const balance = memberBalance(m.id) - pending;
      if (pending > 0 && !d.advance && d.amount > balance) throw biz(`Un paiement mobile money de ${fcfa(pending)} FCFA est en cours pour ${m.name} : il reste ${fcfa(Math.max(balance, 0))} FCFA à payer.`);
      if (!d.internal && !d.advance && d.amount > balance) {
        throw biz(balance > 0
          ? `Le montant dépasse ce qui est dû à ${m.name} (${fcfa(balance)} FCFA). Pour verser plus, enregistrez une avance (propriétaire ou gérant).`
          : `Rien n'est dû à ${m.name} (solde : ${fcfa(balance)} FCFA). Pour verser de l'argent, enregistrez une avance (propriétaire ou gérant).`);
      }
      run('UPDATE companies SET receipt_seq=receipt_seq+1 WHERE id=?', cid);
      const seq = get('SELECT receipt_seq FROM companies WHERE id=?', cid).receipt_seq;
      const number = `REC-${String(seq).padStart(4, '0')}`;
      const r = run('INSERT INTO member_payouts(company_id,member_id,number,paid_on,amount,method,note,kind,reference,client_ref,user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        cid, m.id, number, d.paid_on, d.amount, d.method, d.note ?? null, d.advance ? 'avance' : 'paiement', d.reference ?? null, d.client_ref ?? null, uid ?? null);
      message(cid, m.phone, `${companyName(cid)}: ${d.advance ? 'avance' : 'paiement'} de ${fcfa(d.amount)} FCFA (${d.method}${d.reference ? ' ref ' + d.reference : ''}) le ${d.paid_on.split('-').reverse().join('/')}. Recu ${number}. Votre solde: ${fcfa(memberBalance(m.id))} FCFA.`, 'paiement', number);
      return payoutView(cid, lastId(r));
    });
  }
  function cancelPayout(cid, uid, id, reason) {
    return tx(() => {
      const p = must(get('SELECT * FROM member_payouts WHERE id=? AND company_id=?', id, cid), 'Paiement');
      if (p.status === 'cancelled') throw biz('Ce paiement est déjà annulé.');
      run("UPDATE member_payouts SET status='cancelled', cancel_reason=?, cancelled_at=CURRENT_TIMESTAMP, cancelled_by=? WHERE id=?", reason, uid ?? null, id);
      const m = get('SELECT * FROM members WHERE id=?', p.member_id);
      message(cid, m?.phone, `${companyName(cid)}: le recu ${p.number} (${fcfa(p.amount)} FCFA) est annule. Motif: ${reason}. Votre solde: ${fcfa(memberBalance(p.member_id))} FCFA.`, 'annulation', p.number);
      return payoutView(cid, id);
    });
  }
  function payoutView(cid, id) {
    const p = must(get('SELECT * FROM member_payouts WHERE id=? AND company_id=?', id, cid), 'Paiement');
    return { ...p, member: get('SELECT id,name,village,phone FROM members WHERE id=?', p.member_id) };
  }
  const listPayouts = (cid, all_ = false) => all(`SELECT id FROM member_payouts WHERE company_id=? ${all_ ? '' : "AND status='active'"} ORDER BY paid_on DESC, id DESC LIMIT 300`, cid).map((r) => payoutView(cid, r.id));
  function listMembers(cid, q) {
    const rows = all(`SELECT m.*, COALESCE((SELECT SUM(qty) FROM deliveries WHERE member_id=m.id AND status='active'),0) AS delivered_qty,
      COALESCE((SELECT SUM(amount) FROM deliveries WHERE member_id=m.id AND status='active'),0) AS delivered_amount,
      COALESCE((SELECT SUM(amount) FROM member_payouts WHERE member_id=m.id AND status='active'),0) AS paid_amount
      FROM members m WHERE m.company_id=? ${q ? 'AND (m.name LIKE ? OR m.village LIKE ?)' : ''} ORDER BY m.name`, ...(q ? [cid, `%${q}%`, `%${q}%`] : [cid]));
    return rows.map((m) => ({ ...m, active: !!m.active, delivered_qty: r3(m.delivered_qty), balance: m.delivered_amount - m.paid_amount }));
  }
  function memberDetail(cid, id) {
    const member = must(listMembers(cid).find((m) => m.id === id), 'Membre');
    const deliveries = all("SELECT d.*, i.name AS iname, i.unit AS iunit, l.code AS lcode FROM deliveries d JOIN items i ON i.id=d.item_id JOIN lots l ON l.id=d.lot_id WHERE d.member_id=? AND d.status='active' ORDER BY d.delivered_on DESC, d.id DESC", id)
      .map(({ iname, iunit, lcode, ...d }) => ({ ...d, item: { name: iname, unit: iunit }, lot: { code: lcode } }));
    const payouts = all("SELECT * FROM member_payouts WHERE member_id=? AND status='active' ORDER BY paid_on DESC, id DESC", id);
    const amount = deliveries.reduce((s, d) => s + d.amount, 0), paid = payouts.reduce((s, p) => s + p.amount, 0);
    return { member, deliveries, payouts, totals: { qty: r3(deliveries.reduce((s, d) => s + d.qty, 0)), amount, paid, balance: amount - paid } };
  }
  function coopStats(cid, days) {
    const from = days ? addDays(today(), -days) : null;
    const deliveries = all(`SELECT d.*, m.village FROM deliveries d JOIN members m ON m.id=d.member_id WHERE d.company_id=? AND d.status='active' ${from ? 'AND d.delivered_on>=?' : ''}`, ...(from ? [cid, from] : [cid]));
    const payouts = all(`SELECT * FROM member_payouts WHERE company_id=? AND status='active' ${from ? 'AND paid_on>=?' : ''}`, ...(from ? [cid, from] : [cid]));
    const members = listMembers(cid);
    const byVillage = {};
    deliveries.forEach((d) => { const v = d.village || 'Non renseigné'; byVillage[v] = (byVillage[v] || 0) + d.qty; });
    const allDel = all("SELECT delivered_on, qty FROM deliveries WHERE company_id=? AND status='active'", cid);
    return {
      members_count: members.length,
      active_members: new Set(deliveries.map((d) => d.member_id)).size,
      delivered_qty: r3(deliveries.reduce((s, d) => s + d.qty, 0)),
      delivered_amount: deliveries.reduce((s, d) => s + d.amount, 0),
      paid_amount: payouts.reduce((s, p) => s + p.amount, 0),
      outstanding: members.reduce((s, m) => s + Math.max(m.balance, 0), 0),
      advances: members.reduce((s, m) => s + Math.max(-m.balance, 0), 0),
      by_village: Object.entries(byVillage).map(([village, qty]) => ({ village, qty: r3(qty) })).sort((a, b) => b.qty - a.qty).slice(0, 6),
      monthly: monthsBack(6).map((mo) => ({ month: mo, qty: r3(allDel.filter((d) => d.delivered_on.startsWith(mo)).reduce((s, d) => s + d.qty, 0)) })),
      top_balances: members.filter((m) => m.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 10).map((m) => ({ member_id: m.id, name: m.name, village: m.village, balance: m.balance })),
    };
  }

  // =================== tableau de bord ===================
  function dashboard(cid) {
    const invs = all("SELECT * FROM invoices WHERE company_id=? AND status='active'", cid).map(invoiceSummary);
    const mk = today().slice(0, 7);
    const month = invs.filter((i) => i.issued_on.startsWith(mk));
    const late = invs.filter((i) => i.payment_status === 'late');
    const alerts = [];
    for (const i of listItems(cid)) if (i.alert_qty > 0 && i.stock <= i.alert_qty) alerts.push({ type: 'low_stock', message: `${i.name} : ${nf.format(i.stock)} ${i.unit} en stock (seuil ${nf.format(i.alert_qty)})` });
    for (const l of all('SELECT * FROM lots WHERE company_id=? AND qty_remaining>0 AND expires_on IS NOT NULL', cid)) {
      const d = daysUntil(l.expires_on);
      if (d <= 30) alerts.push({ type: d < 0 ? 'expired' : 'expiring', lot: l.code, message: d < 0 ? `Lot ${l.code} périmé` : `Lot ${l.code} : date limite dans ${d} j` });
    }
    late.forEach((i) => alerts.push({ type: 'late_invoice', message: `Facture ${i.number} en retard : ${nf.format(i.balance)} FCFA` }));
    for (const l of all("SELECT code FROM lots WHERE company_id=? AND quality_status='bloque' AND qty_remaining>0", cid)) alerts.push({ type: 'blocked', lot: l.code, message: `Lot ${l.code} bloqué par la qualité` });
    alerts.push(...dueAlerts({ all }, cid));
    const adv = listMembers(cid).filter((m) => m.balance < 0);
    if (adv.length) alerts.push({ type: 'member_advance', message: `${adv.length} membre(s) doivent de l'argent à la coopérative (avances) : ${nf.format(adv.reduce((s, m) => s - m.balance, 0))} FCFA` });
    return {
      sales_month_ttc: month.reduce((s, i) => s + i.total_ttc, 0), sales_month_count: month.length,
      receivables: invs.reduce((s, i) => s + i.balance, 0), late_count: late.length,
      stock_value: rnd(sumOf('SELECT SUM(qty_remaining*unit_cost) s FROM lots WHERE company_id=? AND qty_remaining>0', cid)),
      owed_to_members: listMembers(cid).reduce((s, m) => s + Math.max(m.balance, 0), 0),
      advances_to_members: listMembers(cid).reduce((s, m) => s + Math.max(-m.balance, 0), 0),
      sales_monthly: monthsBack(6).map((mo) => ({ month: mo, ht: invs.filter((i) => i.issued_on.startsWith(mo)).reduce((s, i) => s + i.total_ht, 0) })),
      alerts: alerts.slice(0, 12),
    };
  }

  // =================== traçabilité ===================
  function origin(cid, lot, production) {
    const sources = production
      ? all('SELECT pi.qty, pi.lot_id, pi.item_id FROM production_inputs pi WHERE pi.production_id=?', production.id).map((x) => ({ lot: get('SELECT * FROM lots WHERE id=?', x.lot_id), qty: x.qty, item: get('SELECT * FROM items WHERE id=?', x.item_id) }))
      : [{ lot, qty: lot.qty_initial, item: get('SELECT * FROM items WHERE id=?', lot.item_id) }];
    const producers = new Map(), suppliers = [];
    for (const s of sources) {
      if (s.lot.origin_type === 'member') {
        const m = get('SELECT * FROM members WHERE id=?', s.lot.member_id);
        const e = producers.get(s.lot.member_id) ?? { member_id: s.lot.member_id, name: m?.name, village: m?.village, item: s.item.name, unit: s.item.unit, qty: 0, lots: [] };
        e.qty = r3(e.qty + s.qty); e.lots.push({ code: s.lot.code, date: s.lot.received_on });
        producers.set(s.lot.member_id, e);
      } else if (s.lot.origin_type === 'supplier') {
        suppliers.push({ name: s.lot.supplier_name || 'Fournisseur', item: s.item.name, unit: s.item.unit, qty: s.qty, lot: s.lot.code });
      }
    }
    return { producers: [...producers.values()], suppliers };
  }
  function trace(cid, code) {
    const raw = must(get('SELECT * FROM lots WHERE company_id=? AND code=?', cid, code), 'Lot');
    const lot = hydrateLots(cid, [raw])[0];
    const finished = lot.item.kind === 'pf';
    const production = finished && raw.production_id ? get('SELECT * FROM productions WHERE id=?', raw.production_id) : null;
    const usedIn = finished ? [] : all('SELECT DISTINCT p.id FROM productions p JOIN production_inputs pi ON pi.production_id=p.id WHERE pi.lot_id=?', raw.id).map((r) => productionView(cid, r.id));
    const downstream = finished ? [raw.id] : usedIn.map((p) => p.lot_id).filter(Boolean);
    const sales = [];
    for (const lotId of downstream) {
      for (const a of all(`SELECT ill.qty, il.unit, i.number, i.issued_on, c.name AS customer, lo.code AS lot FROM invoice_line_lots ill
        JOIN invoice_lines il ON il.id=ill.invoice_line_id JOIN invoices i ON i.id=il.invoice_id JOIN customers c ON c.id=i.customer_id JOIN lots lo ON lo.id=ill.lot_id
        WHERE ill.lot_id=? AND i.status='active'`, lotId)) sales.push({ invoice: a.number, date: a.issued_on, customer: a.customer, lot: a.lot, qty: a.qty, unit: a.unit });
    }
    return { lot, origin: origin(cid, raw, production), production, used_in: usedIn, sales };
  }
  function publicTrace(company, code) {
    const raw = get('SELECT * FROM lots WHERE company_id=? AND code=?', company.id, code);
    if (!raw) return null;
    const item = get('SELECT * FROM items WHERE id=?', raw.item_id);
    const prod = raw.production_id ? get('SELECT * FROM productions WHERE id=?', raw.production_id) : null;
    const lots = prod ? all('SELECT lot_id FROM production_inputs WHERE production_id=?', prod.id).map((r) => get('SELECT * FROM lots WHERE id=?', r.lot_id)) : [raw];
    const members = new Map();
    lots.filter((l) => l.origin_type === 'member').forEach((l) => members.set(l.member_id, get('SELECT village FROM members WHERE id=?', l.member_id)));
    const t = today();
    return {
      company: { name: company.name, address: company.address, phone: company.phone },
      lot: raw.code, product: item.name, kind: item.kind, date: raw.received_on, expires_on: raw.expires_on,
      expired: raw.expires_on ? raw.expires_on < t : false,
      withdrawn: raw.quality_status === 'bloque',
      controls: Number(get("SELECT COUNT(*) n FROM quality_checks WHERE lot_id=? AND result='conforme'", raw.id)?.n ?? 0),
      origin: { villages: [...new Set([...members.values()].map((m) => m?.village).filter(Boolean))], producers_count: members.size },
      verified_at: new Date().toISOString(),
    };
  }
  /** Texte encodé dans le QR : adresse du site du client si renseignée, sinon les informations du lot (lisibles sans internet). */
  function qrPayload(company, raw, publicUrl) {
    const base = (company.trace_base_url || '').trim().replace(/\/+$/, '');
    // QR vérifiable : registre Grenier Trace (entreprise reliée au registre) ou serveur hébergé avec adresse publique
    const verifyBase = company.registry_key && base ? base : publicUrl ? publicUrl.replace(/\/+$/, '') : null;
    if (verifyBase && raw.public_token) return `${verifyBase}/v/${encodeURIComponent((company.registry_key && company.registry_slug) || company.slug)}/${encodeURIComponent(raw.code)}/${raw.public_token}`;
    if (base) return base + '/' + encodeURIComponent(raw.code);
    const item = get('SELECT * FROM items WHERE id=?', raw.item_id);
    const pub = publicTrace(company, raw.code);
    const lines = [`LOT ${raw.code}`, item.name, `Producteur : ${company.name}`, `${item.kind === 'pf' ? 'Fabriqué' : 'Reçu'} le ${raw.received_on.split('-').reverse().join('/')}`];
    if (raw.expires_on) lines.push(`DLC : ${raw.expires_on.split('-').reverse().join('/')}`);
    if (pub.origin.villages.length) lines.push(`Origine : ${pub.origin.villages.join(', ')}`);
    return lines.join('\n');
  }

  return {
    all, get, run, lastId, tx, must, notFound,
    listItems, getItem, rawItem, createLot, receipt, loss, lotView, listLots, listMovements, hydrateLots,
    createProduction, listProductions, createInvoice, cancelInvoice, addPayment, listInvoices, invoiceFull, listCustomers,
    createDelivery, cancelDelivery, listDeliveries, createPayout, cancelPayout, listPayouts, payoutView, listMembers, memberDetail, coopStats, memberBalance,
    dashboard, trace, publicTrace, qrPayload,
  };
}
