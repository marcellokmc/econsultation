import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { openDb, makeTx } from './db.js';
import { makeServices } from './services.js';
import { buildRoutes } from './routes.js';
import { HttpError, sha, today } from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(here, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };

/** Lit le fichier de réglages facultatif (reglages.json) : { "port": 3000, "reseau": true, "dossier_donnees": "", "mode": "local" }. */
function loadSettings() {
  const file = process.env.GRENIER_CONFIG || path.join(APP_DIR, '..', 'reglages.json');
  if (!fs.existsSync(file)) return {};
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) || {}; }
  catch (e) { console.error(`Le fichier de réglages (${file}) est invalide : ${e.message}. Les valeurs par défaut sont utilisées.`); return {}; }
}

/** Ouvre l'adresse dans le navigateur par défaut (Windows, macOS, Linux). */
function openBrowser(url) {
  try {
    const p = process.platform;
    const [cmd, args] = p === 'win32' ? ['cmd', ['/c', 'start', '', url]] : p === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
    spawn(cmd, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  } catch { /* sans importance */ }
}

/** Démarre Grenier Pro. Options : { dataDir, port, host, mode, quiet } — utilisé aussi par les tests. */
export function startServer(opts = {}) {
  // Ordre de priorité : options > variables d'environnement > fichier reglages.json > valeurs par défaut
  const cfg = loadSettings();
  const dataDir = opts.dataDir ?? (process.env.GRENIER_DATA || cfg.dossier_donnees || process.env.GRENIER_DEFAULT_DATA || path.join(APP_DIR, '..', 'data'));
  const mode = opts.mode ?? (process.env.GRENIER_MODE || cfg.mode || 'local'); // local : un poste / un réseau d'entreprise · saas : inscription libre + essai
  const port = opts.port ?? (process.env.PORT ? Number(process.env.PORT) : Number.isInteger(cfg.port) ? cfg.port : 3000);
  const host = opts.host ?? (process.env.HOST || (cfg.reseau === false ? '127.0.0.1' : '0.0.0.0'));
  const publicDir = path.join(APP_DIR, 'public');
  fs.mkdirSync(dataDir, { recursive: true });

  const db = openDb(path.join(dataDir, 'grenier.db'));
  const tx = makeTx(db);
  const S = makeServices(db, tx);
  const { routes, RULE, isWritable } = buildRoutes({ S, mode });

  db.exec("DELETE FROM tokens WHERE created_at < datetime('now','-30 days')"); // sessions expirées

  // ---------- sauvegardes automatiques ----------
  const backupDir = path.join(dataDir, 'sauvegardes');
  function backup(label = 'auto') {
    fs.mkdirSync(backupDir, { recursive: true });
    const file = path.join(backupDir, `grenier-${today()}-${label}.db`);
    if (fs.existsSync(file)) fs.rmSync(file);
    db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
    const olds = fs.readdirSync(backupDir).filter((f) => f.endsWith('.db')).sort().slice(0, -30);
    olds.forEach((f) => fs.rmSync(path.join(backupDir, f)));
    return file;
  }
  if (opts.backups !== false) { try { backup(); } catch (e) { console.error('Sauvegarde impossible :', e.message); } }
  const timer = opts.backups !== false ? setInterval(() => { try { backup(); } catch { /* ignoré */ } }, 24 * 3600 * 1000) : null;
  timer?.unref();

  // ---------- limitation des tentatives (connexion / inscription) ----------
  const hits = new Map();
  const limited = (ip) => { const now = Date.now(), a = (hits.get(ip) || []).filter((t) => now - t < 60000); a.push(now); hits.set(ip, a); return a.length > 20; };

  // ---------- backup téléchargeable (propriétaire) ----------
  routes.push({
    method: 'GET', re: /^\/api\/backup$/, keys: [], opts: { roles: RULE.admin },
    handler: () => {
      const tmp = backup('manuel');
      return { raw: fs.readFileSync(tmp), type: 'application/octet-stream', headers: { 'Content-Disposition': `attachment; filename="grenier-sauvegarde-${today()}.db"` } };
    },
  });

  function authenticate(req) {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) throw new HttpError(401, 'Non connecté.');
    const row = S.get("SELECT u.* FROM tokens t JOIN users u ON u.id=t.user_id WHERE t.hash=? AND t.created_at > datetime('now','-30 days')", sha(token));
    if (!row || !row.active) throw new HttpError(401, 'Session expirée.');
    return { token, user: row, company: S.get('SELECT * FROM companies WHERE id=?', row.company_id) };
  }

  async function readBody(req) {
    const chunks = []; let size = 0;
    for await (const c of req) { size += c.length; if (size > 2e6) throw new HttpError(413, 'Requête trop volumineuse.'); chunks.push(c); }
    if (!chunks.length) return {};
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, 'JSON invalide.'); }
  }

  function send(res, status, body, headers = {}) {
    const isBuf = Buffer.isBuffer(body) || typeof body === 'string';
    res.writeHead(status, { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', ...(isBuf ? {} : { 'Content-Type': 'application/json; charset=utf-8' }), ...headers });
    res.end(isBuf ? body : JSON.stringify(body));
  }

  async function handleApi(req, res, url) {
    const route = routes.find((r) => r.method === req.method && r.re.test(url.pathname));
    if (!route) throw new HttpError(404, 'Route introuvable.');
    const ip = process.env.TRUST_PROXY ? (String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress) : req.socket.remoteAddress;
    if (route.opts.limit && limited(ip)) throw new HttpError(429, 'Trop de tentatives. Réessayez dans une minute.');
    const m = url.pathname.match(route.re);
    const params = Object.fromEntries(route.keys.map((k, i) => [k, m[i + 1]]));
    const ctx = { params, query: Object.fromEntries(url.searchParams), body: req.method === 'GET' ? {} : await readBody(req) };
    if (!route.opts.public) {
      Object.assign(ctx, authenticate(req));
      if (req.method !== 'GET' && !isWritable(ctx.company)) throw new HttpError(402, "Votre abonnement est expiré : l'application est en lecture seule. Contactez-nous pour le renouveler.", undefined, { code: 'subscription_expired' });
      if (route.opts.feature && !require_feature(ctx.company, route.opts.feature)) throw new HttpError(403, "Ce module n'est pas inclus dans votre offre.", undefined, { code: 'feature_unavailable' });
      if (route.opts.roles && !route.opts.roles.includes(ctx.user.role)) throw new HttpError(403, 'Action non autorisée pour votre rôle.');
    }
    const out = route.handler(ctx);
    if (out === null || out === undefined) return send(res, 204, '');
    if (out.raw !== undefined) return send(res, 200, out.raw, { 'Content-Type': out.type, ...(out.headers || {}) });
    if (out.status && out.body !== undefined) return send(res, out.status, out.body);
    if (out.body !== undefined && out.headers) return send(res, 200, out.body, out.headers);
    return send(res, 200, out);
  }
  const require_feature = (company, f) => ({ pro: true, cooperative: true }[company.plan] && f === 'coop') || false;

  function serveStatic(req, res, url) {
    if (!fs.existsSync(publicDir)) return send(res, 404, 'Interface non installée.', { 'Content-Type': 'text/plain; charset=utf-8' });
    let file = path.join(publicDir, decodeURIComponent(url.pathname));
    if (!file.startsWith(publicDir)) return send(res, 403, 'Interdit', { 'Content-Type': 'text/plain' });
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(publicDir, 'index.html'); // routes Angular
    const ext = path.extname(file);
    const cache = ext === '.html' || /sw\.js$|\.webmanifest$/.test(file) ? 'no-cache' : 'public, max-age=86400';
    send(res, 200, fs.readFileSync(file), { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': cache });
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) await handleApi(req, res, url);
      else serveStatic(req, res, url);
    } catch (e) {
      if (e instanceof HttpError || e.status) {
        send(res, e.status, { message: e.message, ...(e.errors ? { errors: e.errors } : {}), ...(e.extra || {}) });
      } else {
        console.error(e);
        send(res, 500, { message: 'Erreur interne. Consultez le journal du serveur.' });
      }
    }
  });

  const ready = new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, () => resolve(server.address().port)); });
  const close = () => new Promise((r) => { timer && clearInterval(timer); server.close(() => { db.close(); r(); }); });
  return { server, ready, close, db, S, backup, dataDir, mode };
}

// ---------- lancement en ligne de commande ----------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = startServer();
  const wantOpen = process.argv.includes('--open');
  app.ready.then(async (port) => {
    if (process.argv.includes('--demo')) {
      const { seedDemo } = await import('./seed-demo.js');
      if (seedDemo(app.S, app.db)) console.log('Données de démonstration créées.');
    }
    const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
    console.log('\n  ============================================');
    console.log('   GRENIER PRO est démarré');
    console.log('  ============================================');
    console.log(`   Sur cet ordinateur :  http://localhost:${port}`);
    if (app.server.address().address !== '127.0.0.1') ips.forEach((ip) => console.log(`   Sur le réseau local :  http://${ip}:${port}`));
    console.log(`   Vos données :         ${path.resolve(app.dataDir)}`);
    console.log('\n   Laissez cette fenêtre ouverte pendant que vous travaillez.');
    console.log('   Pour arrêter : fermez cette fenêtre (ou Ctrl+C).\n');
    if (wantOpen) openBrowser(`http://localhost:${port}`);
  }).catch((e) => {
    if (e.code === 'EADDRINUSE') {
      const port = e.port ?? 3000;
      console.log(`\n  Le port ${port} est déjà utilisé : Grenier Pro est probablement DÉJÀ OUVERT.`);
      console.log(`  Adresse : http://localhost:${port}`);
      console.log('  (Pour utiliser un autre port, modifiez le fichier reglages.json.)\n');
      if (wantOpen) openBrowser(`http://localhost:${port}`);
    } else console.error('Impossible de démarrer :', e.message);
    process.exit(1);
  });
  const stop = async () => { await app.close(); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
