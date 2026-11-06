// Outil d'administration : node app/server/admin.js <commande>
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { hashPassword } from './lib.js';
import { PLANS } from './services.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.GRENIER_DATA ?? path.join(here, '..', '..', 'data');
const db = openDb(path.join(dataDir, 'grenier.db'));
const [cmd, a, b, c] = process.argv.slice(2);
const company = (key) => db.prepare('SELECT * FROM companies WHERE slug=? OR id=?').get(String(key), Number(key) || -1);
const out = (m) => console.log(m);

const HELP = `
Commandes :
  liste                                    Entreprises et utilisateurs
  mot-de-passe <email> <nouveau>           Réinitialiser le mot de passe d'un utilisateur (8 caractères minimum)
  offre <entreprise> <starter|pro|cooperative>   Changer l'offre (entreprise = identifiant ou « slug »)
  statut <entreprise> <active|trial|suspended> [AAAA-MM-JJ]   Activer, suspendre, ou fixer une date de fin d'abonnement
Les données sont lues dans : ${path.resolve(dataDir)}
`;

if (cmd === 'liste') {
  for (const co of db.prepare('SELECT * FROM companies ORDER BY id').all()) {
    out(`\n#${co.id}  ${co.name}  [${co.slug}]  offre=${co.plan}  statut=${co.subscription_status}${co.paid_until ? '  jusqu\'au ' + co.paid_until.slice(0, 10) : ''}`);
    for (const u of db.prepare('SELECT * FROM users WHERE company_id=?').all(co.id)) out(`     - ${u.email}  (${u.role})${u.active ? '' : '  [désactivé]'}`);
  }
} else if (cmd === 'mot-de-passe' && a && b) {
  if (b.length < 8) { out('Le mot de passe doit contenir au moins 8 caractères.'); process.exit(1); }
  const u = db.prepare('SELECT id FROM users WHERE email=?').get(a.toLowerCase());
  if (!u) { out('Utilisateur introuvable.'); process.exit(1); }
  db.prepare('UPDATE users SET password=? WHERE id=?').run(hashPassword(b), u.id);
  db.prepare('DELETE FROM tokens WHERE user_id=?').run(u.id);
  out('Mot de passe modifié. Les sessions ouvertes de cet utilisateur sont fermées.');
} else if (cmd === 'offre' && a && PLANS[b]) {
  const co = company(a); if (!co) { out('Entreprise introuvable.'); process.exit(1); }
  db.prepare('UPDATE companies SET plan=? WHERE id=?').run(b, co.id); out(`${co.name} : offre ${PLANS[b].label}.`);
} else if (cmd === 'statut' && a && ['active', 'trial', 'suspended'].includes(b)) {
  const co = company(a); if (!co) { out('Entreprise introuvable.'); process.exit(1); }
  const until = c ? new Date(c + 'T23:59:59Z').toISOString() : null;
  db.prepare('UPDATE companies SET subscription_status=?, paid_until=?, trial_ends_at=CASE WHEN ?=\'trial\' THEN ? ELSE trial_ends_at END WHERE id=?').run(b, b === 'active' ? until : null, b, until, co.id);
  out(`${co.name} : statut ${b}${until ? ' jusqu\'au ' + c : ''}.`);
} else out(HELP);
db.close();
