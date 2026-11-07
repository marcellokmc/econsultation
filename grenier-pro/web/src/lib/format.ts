// Formats : nombres, FCFA, dates (français, fuseau local).
const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });
const clean = (s: string) => s.replace(/ | /g, ' ');

export const num = (n: number | null | undefined) => clean(nf.format(Number(n ?? 0)));
export const fcfa = (n: number | null | undefined) => `${num(Math.round(Number(n ?? 0)))} FCFA`;
export const qty = (n: number | null | undefined, unit?: string | null) => `${num(n)}${unit ? ' ' + unit : ''}`;

/** Lit un nombre saisi (virgule ou point, espaces ignorés). NaN si invalide. */
export function parseNum(v: string | number | null | undefined): number {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => isoDate(new Date());
export const addDays = (s: string, n: number) => { const [y, m, d] = s.split('-').map(Number); const x = new Date(y, m - 1, d); x.setDate(x.getDate() + n); return isoDate(x); };
export const frDate = (s?: string | null) => (s ? s.slice(0, 10).split('-').reverse().join('/') : '—');
export function frDateTime(s?: string | null) {
  if (!s) return '—';
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
  return isNaN(+d) ? s : d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}
export function daysUntil(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return Math.round((+new Date(y, m - 1, d) - +new Date(new Date().toDateString())) / 864e5);
}
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export const monthLabel = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1] ?? ym;
/** 1 300 000 → « 1,3 M » ; 437 000 → « 437 k ». */
export function short(n: number) {
  if (Math.abs(n) >= 1e6) return `${clean(new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n / 1e6))} M`;
  if (Math.abs(n) >= 1e3) return `${Math.round(n / 1e3)} k`;
  return String(Math.round(n));
}
export const uid = () => (typeof globalThis.crypto?.randomUUID === 'function' && isSecureContext ? crypto.randomUUID() : 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2));
