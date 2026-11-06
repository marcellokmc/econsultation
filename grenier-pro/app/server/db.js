import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
  address TEXT, phone TEXT, email TEXT, ifu TEXT, rccm TEXT, vat_rate REAL NOT NULL DEFAULT 18, trace_base_url TEXT,
  plan TEXT NOT NULL DEFAULT 'pro', subscription_status TEXT NOT NULL DEFAULT 'active',
  trial_ends_at TEXT, paid_until TEXT, invoice_seq INTEGER NOT NULL DEFAULT 0, receipt_seq INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'owner', active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL, kind TEXT NOT NULL, unit TEXT NOT NULL, code TEXT NOT NULL,
  alert_qty REAL NOT NULL DEFAULT 0, ref_price INTEGER NOT NULL DEFAULT 0, shelf_days INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL, village TEXT, phone TEXT, group_name TEXT, joined_on TEXT, active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL, type TEXT, phone TEXT, address TEXT, ifu TEXT
);
CREATE TABLE IF NOT EXISTS lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id), code TEXT NOT NULL, received_on TEXT NOT NULL,
  qty_initial REAL NOT NULL, qty_remaining REAL NOT NULL, unit_cost REAL NOT NULL DEFAULT 0, expires_on TEXT,
  origin_type TEXT NOT NULL, member_id INTEGER REFERENCES members(id), supplier_name TEXT, production_id INTEGER,
  UNIQUE (company_id, code)
);
CREATE INDEX IF NOT EXISTS lots_item ON lots(item_id, qty_remaining);
CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL, lot_id INTEGER NOT NULL REFERENCES lots(id), item_id INTEGER NOT NULL,
  type TEXT NOT NULL, qty REAL NOT NULL, reference TEXT, note TEXT, occurred_on TEXT NOT NULL, user_id INTEGER
);
CREATE TABLE IF NOT EXISTS deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL, member_id INTEGER NOT NULL REFERENCES members(id),
  item_id INTEGER NOT NULL REFERENCES items(id), lot_id INTEGER NOT NULL REFERENCES lots(id), delivered_on TEXT NOT NULL,
  qty REAL NOT NULL, unit_price INTEGER NOT NULL, amount INTEGER NOT NULL, quality TEXT NOT NULL DEFAULT 'A', note TEXT
);
CREATE TABLE IF NOT EXISTS member_payouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL, member_id INTEGER NOT NULL REFERENCES members(id),
  number TEXT NOT NULL, paid_on TEXT NOT NULL, amount INTEGER NOT NULL, method TEXT NOT NULL, note TEXT, UNIQUE (company_id, number)
);
CREATE TABLE IF NOT EXISTS productions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL, item_id INTEGER NOT NULL REFERENCES items(id), lot_id INTEGER,
  produced_on TEXT NOT NULL, qty REAL NOT NULL, expires_on TEXT, operator TEXT, extra_cost INTEGER NOT NULL DEFAULT 0,
  total_cost INTEGER NOT NULL DEFAULT 0, note TEXT
);
CREATE TABLE IF NOT EXISTS production_inputs (
  id INTEGER PRIMARY KEY AUTOINCREMENT, production_id INTEGER NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
  lot_id INTEGER NOT NULL REFERENCES lots(id), item_id INTEGER NOT NULL, qty REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER NOT NULL, customer_id INTEGER NOT NULL REFERENCES customers(id),
  number TEXT NOT NULL, issued_on TEXT NOT NULL, due_on TEXT, vat_rate REAL NOT NULL DEFAULT 0,
  total_ht INTEGER NOT NULL DEFAULT 0, total_vat INTEGER NOT NULL DEFAULT 0, total_ttc INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', note TEXT, user_id INTEGER, UNIQUE (company_id, number)
);
CREATE TABLE IF NOT EXISTS invoice_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL, name TEXT NOT NULL, unit TEXT NOT NULL, qty REAL NOT NULL, unit_price INTEGER NOT NULL, line_total INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS invoice_line_lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_line_id INTEGER NOT NULL REFERENCES invoice_lines(id) ON DELETE CASCADE,
  lot_id INTEGER NOT NULL REFERENCES lots(id), qty REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS invoice_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  paid_on TEXT NOT NULL, amount INTEGER NOT NULL, method TEXT NOT NULL, reference TEXT
);
`;

export function openDb(file) {
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  return db;
}

/** Transaction : tout ou rien (une règle métier violée annule toutes les écritures). */
export function makeTx(db) {
  return (fn) => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const r = fn();
      db.exec('COMMIT');
      return r;
    } catch (e) {
      try { db.exec('ROLLBACK'); } catch { /* déjà annulée */ }
      throw e;
    }
  };
}
