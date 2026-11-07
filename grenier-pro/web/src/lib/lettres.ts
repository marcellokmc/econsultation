// Montant en toutes lettres (factures et reçus) — règles de l'orthographe traditionnelle française.
const U = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const T = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function under100(n: number): string {
  if (n < 20) return U[n];
  const t = Math.floor(n / 10), u = n % 10;
  if (t === 7 || t === 9) return T[t] + (u === 1 && t === 7 ? '-et-' : '-') + U[10 + u];
  if (u === 0) return T[t] + (t === 8 ? 's' : '');
  if (u === 1 && t !== 8) return T[t] + '-et-un';
  return T[t] + '-' + U[u];
}
function under1000(n: number): string {
  const c = Math.floor(n / 100), r = n % 100;
  let s = '';
  if (c === 1) s = 'cent';
  else if (c > 1) s = U[c] + ' cent' + (r === 0 ? 's' : '');
  if (r) s += (s ? ' ' : '') + under100(r);
  return s || 'zéro';
}

/** 145140 → « cent quarante-cinq mille cent quarante ». */
export function enLettres(value: number): string {
  let n = Math.round(Math.abs(value));
  if (n === 0) return 'zéro';
  const parts: string[] = [];
  const scales: [number, string, string][] = [[1e9, 'milliard', 'milliards'], [1e6, 'million', 'millions']];
  for (const [v, one, many] of scales) {
    const k = Math.floor(n / v);
    if (k) { parts.push(`${under1000(k)} ${k > 1 ? many : one}`); n %= v; }
  }
  const th = Math.floor(n / 1000);
  if (th) { parts.push(th === 1 ? 'mille' : `${under1000(th).replace(/cents$/, 'cent')} mille`); n %= 1000; }
  if (n) parts.push(under1000(n));
  return (value < 0 ? 'moins ' : '') + parts.join(' ');
}
export const fcfaEnLettres = (n: number) => `${enLettres(n)} franc${Math.abs(Math.round(n)) > 1 ? 's' : ''} CFA`;
