// Captures haute définition des écrans de Grenier pour la vidéo promotionnelle.
const { chromium, devices } = require('playwright');
const OUT = __dirname + '/img';
const L = 'http://127.0.0.1:3911', H = 'http://127.0.0.1:3912';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function pick(select, prefix) {
  for (let i = 0; i < 25; i++) { const v = await select.evaluate((el, pre) => [...el.options].find((o) => o.textContent.trim().startsWith(pre))?.value, prefix); if (v) return select.selectOption(v); await wait(200); }
  throw new Error('option ' + prefix);
}
(async () => {
  const b = await chromium.launch();
  // ---------- bureau (1600×1000, rendu ×1.5 pour la netteté) ----------
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const p = await ctx.newPage();
  p.on('dialog', (d) => d.accept());
  const go = async (u) => { await p.goto(L + u); await p.waitForLoadState('networkidle'); await wait(500); };
  const dlg = () => p.locator('[role=dialog]');
  await go('/'); await p.fill('#f-email', 'owner@grenier.test'); await p.fill('#f-password', 'password'); await p.click('button:has-text("Se connecter")');
  await p.waitForSelector('h1:has-text("Accueil")'); await wait(600);
  await p.screenshot({ path: `${OUT}/accueil.png` });
  await go('/cooperative'); await p.screenshot({ path: `${OUT}/coop.png` });
  // paie de campagne (simulation)
  await p.click('[role=tab]:has-text("Mobile money")'); await p.click('button:has-text("Paie de campagne")'); await p.waitForSelector('[role=dialog] tbody tr'); await wait(400);
  await p.screenshot({ path: `${OUT}/paie-dialog.png` });
  await dlg().locator('button:has-text("Payer")').click(); await p.waitForSelector('.badge:has-text("Payé")', { timeout: 15000 }); await wait(2500);
  await p.screenshot({ path: `${OUT}/paie-ok.png` });
  // reçu
  await p.locator('a:has-text("Reçu")').first().click(); await p.waitForSelector('.doc'); await wait(400);
  await p.screenshot({ path: `${OUT}/recu.png` });
  // traçabilité d'un produit fini vendu
  const tok = await p.evaluate(() => localStorage.getItem('grenier.token'));
  const lots = await (await fetch(L + '/api/lots?in_stock=0&kind=pf', { headers: { Authorization: 'Bearer ' + tok } })).json();
  let traced = null;
  for (const l of lots) { const tr = await (await fetch(L + '/api/trace/' + encodeURIComponent(l.code), { headers: { Authorization: 'Bearer ' + tok } })).json(); if (tr.sales.length >= 2 && tr.origin.producers.length) { traced = l; break; } }
  await go('/tracabilite/' + encodeURIComponent(traced.code)); await p.screenshot({ path: `${OUT}/trace.png` });
  await go('/etiquettes?lots=' + encodeURIComponent(traced.code) + '&n=6'); await wait(800); await p.screenshot({ path: `${OUT}/etiquettes.png` });
  // qualité : lot bloqué
  const mp = (await (await fetch(L + '/api/lots?in_stock=1&kind=mp', { headers: { Authorization: 'Bearer ' + tok } })).json()).find((l) => l.item.name.startsWith('Sésame'));
  await go('/tracabilite/' + encodeURIComponent(mp.code));
  await p.click('button:has-text("Résultat de laboratoire")');
  await dlg().locator('#f-lab').fill('LNSP Ouagadougou'); await dlg().locator('#f-parameter').fill('Aflatoxine B1'); await dlg().locator('#f-value').fill('12'); await dlg().locator('#f-unit').fill('µg/kg'); await dlg().locator('#f-limit_text').fill('≤ 2 µg/kg');
  await dlg().locator('#f-conforme').selectOption('false'); await dlg().locator('button:has-text("Enregistrer")').click(); await p.waitForSelector('.badge:has-text("Lot bloqué")'); await wait(4200);
  await p.locator('h2:has-text("Qualité")').scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, -120)); await wait(300);
  await p.screenshot({ path: `${OUT}/qualite-bloque.png` });
  await go('/qualite'); await p.screenshot({ path: `${OUT}/qualite.png` });
  // crédit
  await go('/credit'); await p.locator('a:has-text("Ouvrir")').first().click(); await p.waitForSelector('.doc'); await wait(400); await p.screenshot({ path: `${OUT}/recepisse.png` });
  await go('/credit'); await p.click('[role=tab]:has-text("Dossier de crédit")'); await p.waitForSelector('text=Évolution mensuelle'); await wait(400); await p.screenshot({ path: `${OUT}/dossier.png` });
  // ---------- téléphone de l'agent : terrain hors ligne ----------
  const agent = await b.newContext({ ...devices['Pixel 7'] });
  const t = await agent.newPage();
  await t.goto(L + '/terrain'); await t.fill('#f-email', 'coop@grenier.test'); await t.fill('#f-password', 'password'); await t.click('button:has-text("Se connecter")');
  await t.waitForSelector('h2:has-text("Nouvelle livraison")'); await wait(1500);
  await agent.setOffline(true); await t.evaluate(() => window.dispatchEvent(new Event('offline'))); await wait(300);
  await t.fill('input[type=search]', 'Fati'); await t.click('.pick button'); await wait(200);
  await pick(t.locator('select').first(), 'Amandes de karité'); await t.fill('#f-qty', '86,5'); await t.click('.seg button:has-text("A")'); await wait(300);
  await t.screenshot({ path: `${OUT}/terrain-saisie.png` });
  await t.click('button:has-text("Enregistrer la livraison")'); await t.waitForSelector('h2:has-text("Livraison enregistrée")'); await wait(300);
  await t.screenshot({ path: `${OUT}/terrain-recu.png` });
  await t.click('button:has-text("Livraison suivante")'); await t.click('[role=tab]:has-text("En attente")'); await wait(300);
  await t.screenshot({ path: `${OUT}/terrain-attente.png` });
  await agent.setOffline(false); await t.evaluate(() => window.dispatchEvent(new Event('online'))); await t.waitForSelector('[role=tab]:has-text("En attente (0)")', { timeout: 15000 }); await wait(800);
  await t.screenshot({ path: `${OUT}/terrain-envoye.png` });
  // ---------- téléphone du client : QR vérifié ----------
  const cli = await b.newContext({ ...devices['Pixel 7'] });
  const c = await cli.newPage();
  await c.goto(`${L}/t/faso-delices-demo/${encodeURIComponent(traced.code)}`); await c.waitForSelector('text=Lot authentique'); await wait(400);
  await c.screenshot({ path: `${OUT}/qr-public.png` });
  // ---------- marché public (serveur hébergé avec offres) ----------
  const m = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const mp2 = await m.newPage();
  await mp2.goto(H + '/marche'); await mp2.waitForSelector('text=Amandes de karité'); await wait(500); await mp2.screenshot({ path: `${OUT}/marche.png` });
  await mp2.click('[role=tab]:has-text("Prix du marché")'); await mp2.waitForSelector('td:has-text("Karité")'); await wait(400); await mp2.screenshot({ path: `${OUT}/prix.png` });
  const mob = await b.newContext({ ...devices['Pixel 7'] });
  const mm = await mob.newPage(); await mm.goto(H + '/marche'); await mm.waitForSelector('text=Amandes de karité'); await wait(400); await mm.screenshot({ path: `${OUT}/marche-mobile.png` });
  await b.close();
  console.log('captures terminées');
})();
