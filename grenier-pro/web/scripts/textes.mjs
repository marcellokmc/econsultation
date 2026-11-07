// Traduction de l'interface (mooré, dioula, fulfulde) par des traducteurs natifs.
//
//   node scripts/textes.mjs exporter
//       → ../docs/traduction/textes-a-traduire.csv : tous les textes de l'interface (colonne « francais »)
//         avec les traductions déjà faites. S'ouvre dans Excel ou LibreOffice (séparateur « ; », UTF-8).
//   node scripts/textes.mjs importer <fichier.csv>
//       → réécrit src/i18n/mos.ts, dyu.ts, ff.ts à partir du tableau rempli, puis : npm run build
//
// Règles pour les traducteurs : garder tels quels les éléments entre accolades ({n}, {m}, {d}…), qui sont
// remplacés par des nombres, montants ou dates ; laisser vide ce qui n'est pas traduit (le français s'affiche).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, '..', 'src');
const OUT = path.join(here, '..', '..', 'docs', 'traduction', 'textes-a-traduire.csv');
const LANGS = [['mos', 'moore'], ['dyu', 'dioula'], ['ff', 'fulfulde']];

function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(dir, e.name)] : [])); }
/** Tous les t('…') du code (et les libellés de menu passés à t()). */
export function extract() {
  const keys = new Set();
  const re = /\bt\(\s*(['"])((?:\\.|(?!\1)[^\\])*)\1/g;
  for (const f of walk(SRC)) {
    if (f.includes(`${path.sep}i18n${path.sep}`)) continue;
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(re)) keys.add(m[2].replace(/\\(['"\\])/g, '$1'));
    for (const m of s.matchAll(/label: '((?:\\.|[^'\\])*)'/g)) keys.add(m[1].replace(/\\'/g, "'"));
  }
  keys.delete("");
  return [...keys].sort((a, b) => a.localeCompare(b, "fr"));
}
async function dict(code) {
  const file = path.join(SRC, 'i18n', `${code}.ts`);
  const txt = fs.readFileSync(file, 'utf8');
  const body = txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1);
  return Function(`return (${body});`)();
}
const cell = (s) => `"${String(s ?? '').replaceAll('"', '""')}"`;
function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ';') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur.replace(/\r$/, '')); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

const [cmd, file] = process.argv.slice(2);
if (cmd === 'exporter') {
  const keys = extract();
  const d = Object.fromEntries(await Promise.all(LANGS.map(async ([c]) => [c, await dict(c)])));
  const lines = [['francais', ...LANGS.map(([, l]) => l)].map(cell).join(';'), ...keys.map((k) => [k, ...LANGS.map(([c]) => d[c][k] ?? '')].map(cell).join(';'))];
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, '\ufeff' + lines.join('\r\n') + '\r\n');
  console.log(`${keys.length} textes exportés → ${OUT}`);
} else if (cmd === 'importer' && file) {
  const rows = parseCsv(fs.readFileSync(file, 'utf8').replace(/^\ufeff/, ''));
  const head = rows.shift().map((h) => h.trim().toLowerCase());
  const known = new Set(extract());
  for (const [code, name] of LANGS) {
    const col = head.indexOf(name);
    const out = {};
    let n = 0;
    for (const r of rows) {
      const fr = r[0], tr = (r[col] ?? '').trim();
      if (!fr || !tr || !known.has(fr)) continue;
      const vars = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join();
      if (vars(fr) !== vars(tr)) { console.warn(`[${name}] variables différentes, ignoré : ${fr}`); continue; }
      out[fr] = tr; n++;
    }
    const ts = `// Traductions (${name}) — générées par scripts/textes.mjs depuis le tableau des traducteurs. Clé = texte français.\nexport const ${code}: Record<string, string> = ${JSON.stringify(out, null, 2)};\n`;
    fs.writeFileSync(path.join(SRC, 'i18n', `${code}.ts`), ts);
    console.log(`${name} : ${n} / ${known.size} textes traduits`);
  }
} else {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
}
