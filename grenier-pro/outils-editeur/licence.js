// OUTIL ÉDITEUR — ne jamais livrer ce dossier ni la clé privée aux clients.
//
//   node outils-editeur/licence.js cles <dossier-secret>
//        crée la paire de clés : <dossier-secret>/grenier-cle-privee.pem (À GARDER SECRÈTE, hors ligne, sauvegardée)
//        et app/server/licence-cle-publique.pem (livrée dans l'installateur). Une nouvelle paire invalide les licences déjà émises.
//
//   node outils-editeur/licence.js emettre <cle-privee.pem> --client "Coopérative X" --offre pro [--jusqua 2027-12-31] [--note "..."]
//        affiche la licence (une ligne de texte) à envoyer au client : il la colle dans Contrôle > Licence.
//
//   node outils-editeur/licence.js lire "<licence>"
//        vérifie une licence avec la clé publique de ce dossier et affiche son contenu.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { signLicence, readLicence } from '../app/server/licence.js';
import { PLANS } from '../app/server/services.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const pubFile = path.join(here, '..', 'app', 'server', 'licence-cle-publique.pem');
const [cmd, ...args] = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const fail = (m) => { console.error(m); process.exit(1); };

if (cmd === 'cles') {
  const dir = args[0] || fail('Indiquez le dossier secret où ranger la clé privée.');
  const out = path.join(dir, 'grenier-cle-privee.pem');
  if (fs.existsSync(out)) fail(`${out} existe déjà : refus de l'écraser.`);
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(out, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
  fs.writeFileSync(pubFile, publicKey.export({ type: 'spki', format: 'pem' }));
  console.log(`Clé privée : ${out}  (secrète : sauvegardez-la hors ligne)\nClé publique : ${pubFile}  (à livrer)`);
} else if (cmd === 'emettre') {
  const key = args[0] && fs.existsSync(args[0]) ? fs.readFileSync(args[0], 'utf8') : fail('Clé privée introuvable.');
  const client = opt('client') || fail('--client obligatoire');
  const plan = opt('offre') || fail('--offre obligatoire (starter, pro ou cooperative)');
  if (!PLANS[plan]) fail(`Offre inconnue : ${plan}`);
  const expires = opt('jusqua') ?? null;
  if (expires && !/^\d{4}-\d{2}-\d{2}$/.test(expires)) fail('--jusqua au format AAAA-MM-JJ');
  const data = { v: 1, id: crypto.randomUUID(), client, plan, expires, issued: new Date().toISOString().slice(0, 10), ...(opt('note') ? { note: opt('note') } : {}) };
  const text = signLicence(data, key);
  const check = readLicence(text, fs.existsSync(pubFile) ? crypto.createPublicKey(fs.readFileSync(pubFile)) : null);
  if (!check.ok) console.error(`ATTENTION : la clé publique livrée ne correspond pas à cette clé privée (${check.error}).`);
  console.log(text);
} else if (cmd === 'lire') {
  const r = readLicence(args[0]);
  console.log(r.ok ? JSON.stringify(r.data, null, 2) : `Invalide : ${r.error}`);
} else {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
}
