import { hashPassword, today, addDays } from './lib.js';

const MODES = ['Espèces', 'Orange Money', 'Moov Money', 'Coris Money'];

/** Crée une entreprise de démonstration complète (4 mois d'activité). Ne fait rien si une entreprise existe déjà. */
export function seedDemo(S) {
  if (S.get('SELECT COUNT(*) n FROM companies').n > 0) return false;
  const cid = S.lastId(S.run(`INSERT INTO companies(name,slug,address,phone,email,ifu,rccm,plan,subscription_status) VALUES
    ('Société Faso Délices (démo)','faso-delices-demo','Secteur 15, Ouagadougou','+226 70 00 00 00','demo@grenier.test','00000000X','BF-OUA-2026-B-0000','pro','active')`));
  let owner;
  for (const [name, email, role] of [['Directrice', 'owner@grenier.test', 'owner'], ['Gérant', 'manager@grenier.test', 'manager'], ['Magasinier', 'stock@grenier.test', 'storekeeper'], ['Comptable', 'compta@grenier.test', 'accountant'], ['Agent coopérative', 'coop@grenier.test', 'coop_agent']]) {
    const id = S.lastId(S.run('INSERT INTO users(company_id,name,email,password,role) VALUES (?,?,?,?,?)', cid, name, email, hashPassword('password'), role));
    owner ??= id;
  }
  const mk = (name, kind, unit, code, price, alert, shelf) => S.getItem(cid, S.lastId(S.run('INSERT INTO items(company_id,name,kind,unit,code,alert_qty,ref_price,shelf_days) VALUES (?,?,?,?,?,?,?,?)', cid, name, kind, unit, code, alert, price, shelf)));
  const aka = mk('Amandes de karité', 'mp', 'kg', 'AKA', 275, 100, 0), ses = mk('Sésame (graines)', 'mp', 'kg', 'SES', 600, 100, 0), man = mk('Mangues fraîches', 'mp', 'kg', 'MAN', 110, 200, 0);
  const pot = mk('Pot 250 g', 'emb', 'pièce', 'POT', 250, 150, 0), sac = mk('Sachet 100 g', 'emb', 'pièce', 'SAC', 60, 300, 0), bou = mk('Bouteille 500 ml', 'emb', 'pièce', 'BOU', 300, 100, 0);
  const bka = mk('Beurre de karité 250 g', 'pf', 'pot', 'BKA', 2000, 60, 720), hse = mk('Huile de sésame 500 ml', 'pf', 'bouteille', 'HSE', 3500, 40, 365), mse = mk('Mangue séchée 100 g', 'pf', 'sachet', 'MSE', 1000, 100, 100);

  const names = ['Awa Ouédraogo', 'Salamata Sawadogo', 'Fatimata Kaboré', 'Mariam Traoré', 'Pauline Zongo', 'Rasmata Compaoré', 'Adjara Ilboudo', 'Haoua Sanou', 'Alimata Ouattara', 'Kadiatou Barro', 'Joséphine Bambara', 'Zénabou Nikièma', 'Odette Tapsoba', 'Maïmouna Diallo'];
  const vill = ['Léo', 'Sapouy', 'Pô', 'Gaoua', 'Orodara', 'Banfora'], groups = ['Groupement Wend-Panga', 'Union Nongtaaba', 'Groupement Teeg-Wende'], mains = [aka, aka, aka, ses, ses, man];
  const members = names.map((n, i) => ({ id: S.lastId(S.run('INSERT INTO members(company_id,name,village,phone,group_name,joined_on) VALUES (?,?,?,?,?,?)', cid, n, vill[i % 6], `+226 7${1 + (i % 8)} ${10 + ((i * 7) % 90)} ${10 + ((i * 13) % 90)} ${10 + ((i * 3) % 90)}`, groups[i % 3], `2022-0${1 + (i % 9)}-15`)), main: mains[i % 6] }));
  const custs = [['Marina Market', 'Supermarché', 'Avenue Kwame N’Krumah, Ouaga'], ['Épicerie Wend-Panga', 'Détaillant', 'Marché de Dassasgho'], ['Restaurant Le Verdoyant', 'Restaurant', 'Zone du Bois'], ['Distribution Kossodo', 'Grossiste', 'Zone industrielle de Kossodo'], ['SahelTrade Export', 'Export', 'Bobo-Dioulasso'], ['Boutique Bio Faso', 'Détaillant', 'Ouaga 2000']]
    .map((c, i) => ({ id: S.lastId(S.run('INSERT INTO customers(company_id,name,type,address,phone) VALUES (?,?,?,?,?)', cid, c[0], c[1], c[2], `+226 76 0${i} 00 0${i}`)), type: c[1] }));

  let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const ok = (fn) => { try { return fn(); } catch { return null; } };
  const stock = (it) => S.getItem(cid, it.id).stock;
  const start = addDays(today(), -120);
  const recv = (it, date, qty) => ok(() => S.receipt(cid, owner, { item_id: it.id, qty, unit_cost: it.ref_price, date, supplier_name: 'Emballages du Faso' }));
  [[pot, 500], [sac, 900], [bou, 400]].forEach(([it, q]) => recv(it, start, q));
  for (let k = 0; k <= 120; k++) {
    const d = addDays(start, k);
    if (rnd() < 0.24) {
      const m = pick(members), it = m.main, q = it === aka ? 40 + Math.floor(rnd() * 140) : it === ses ? 60 + Math.floor(rnd() * 190) : 100 + Math.floor(rnd() * 300);
      ok(() => S.createDelivery(cid, owner, { member_id: m.id, item_id: it.id, delivered_on: d, qty: q, unit_price: it.ref_price, quality: rnd() < 0.75 ? 'A' : rnd() < 0.8 ? 'B' : 'C' }));
    }
    if (k % 25 === 10) [[pot, 400], [sac, 700], [bou, 300]].forEach(([it, q]) => recv(it, d, q));
    if (k % 8 === 5) {
      for (const [raw, pk, fin, y, lo, hi, fx] of [[aka, pot, bka, 1.4, 60, 130, 2400], [ses, bou, hse, 0.7, 60, 150, 1500], [man, sac, mse, 1.2, 100, 300, 2000]]) {
        let q = Math.min(stock(raw), lo + Math.floor(rnd() * (hi - lo)));
        if (q < lo) continue;
        let n = Math.round(q * y); const ps = stock(pk);
        if (n > ps) { n = Math.floor(ps); q = Math.ceil(n / y); }
        if (n < 10) continue;
        ok(() => S.createProduction(cid, owner, { item_id: fin.id, produced_on: d, qty: n, expires_on: addDays(d, fin.shelf_days), operator: pick(['Salif', 'Aminata', 'Boukary']), extra_cost: fx + n * 20, inputs: [{ item_id: raw.id, qty: q }, { item_id: pk.id, qty: n }] }));
      }
    }
    if (rnd() < 0.27) {
      const c = pick(custs), lines = [];
      for (const p of [bka, hse, mse]) { const av = stock(p); if (av >= 8 && rnd() < 0.6) lines.push({ item_id: p.id, qty: Math.min(av, 10 + Math.floor(rnd() * 50)), unit_price: Math.round(p.ref_price * (c.type === 'Grossiste' || c.type === 'Export' ? 0.9 : 1)) }); }
      if (lines.length) {
        const ex = c.type === 'Export', r = rnd(), tot = lines.reduce((s, l) => s + l.qty * l.unit_price, 0) * (ex ? 1 : 1.18);
        ok(() => S.createInvoice(cid, owner, { customer_id: c.id, issued_on: d, due_on: addDays(d, 15), vat_enabled: !ex, paid_amount: r < 0.55 ? Math.round(tot) : r < 0.7 ? Math.round(tot * 0.4) : 0, payment_method: pick(MODES), lines }));
      }
    }
    if (k % 10 === 7) for (const i of S.listInvoices(cid)) if (i.status === 'active' && i.balance > 0 && i.issued_on <= addDays(d, -12) && rnd() < 0.5) ok(() => S.addPayment(cid, i.id, { paid_on: d, amount: i.balance, method: pick(MODES) }));
    if (k % 14 === 6) for (const m of S.listMembers(cid)) if (m.balance > 1000 && rnd() < 0.8) ok(() => S.createPayout(cid, { member_id: m.id, paid_on: d, amount: Math.round((m.balance * (0.6 + rnd() * 0.4)) / 50) * 50, method: pick(['Espèces', 'Orange Money', 'Moov Money']) }));
  }
  return true;
}
