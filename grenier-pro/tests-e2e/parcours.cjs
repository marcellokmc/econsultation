// Parcours de bout en bout dans un vrai navigateur (Playwright).
//   node tests-e2e/parcours.cjs [dossier-captures]
// Démarre Grenier en démonstration sur un dossier temporaire, parcourt chaque écran, fait les actions principales
// (article, entrée, production, facture, encaissement, livraison, paiement, annulation, terrain hors ligne…)
// et échoue à la moindre erreur JavaScript ou étape ratée.
const { chromium, devices } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');

const SHOTS = process.argv[2] || null;
const PORT = 3990 + Math.floor(Math.random() * 9);
const B = `http://127.0.0.1:${PORT}`;
const steps = [];
let failed = 0;
async function step(name, fn) {
  try { await fn(); steps.push(`ok   ${name}`); }
  catch (e) { failed++; steps.push(`FAIL ${name} — ${String(e.message).split('\n')[0]}`); }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
/** Choisit l'option dont le texte commence par « prefix ». */
async function pick(select, prefix) {
  let value;
  for (let i = 0; i < 25 && !value; i++) { // la liste peut être encore en chargement
    value = await select.evaluate((el, pre) => [...el.options].find((o) => o.textContent.trim().startsWith(pre))?.value, prefix);
    if (!value) await new Promise((r) => setTimeout(r, 200));
  }
  if (!value) throw new Error(`option « ${prefix} » introuvable`);
  await select.selectOption(value);
}

(async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'grenier-e2e-'));
  const srv = spawn(process.execPath, ['--no-warnings', path.join(__dirname, '..', 'app', 'server', 'index.js'), '--demo'], { env: { ...process.env, GRENIER_DATA: data, PORT: String(PORT), HOST: '127.0.0.1' }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { if ((await fetch(B + '/api/public/info')).ok) break; } catch { /* démarrage */ } await new Promise((r) => setTimeout(r, 200)); }
  const browser = await chromium.launch();
  const errors = [];
  const watch = (p, tag) => {
    p.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
    p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_INTERNET_DISCONNECTED|net::ERR/.test(m.text())) errors.push(`${tag}: ${m.text()}`); });
  };
  const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: false }); };

  // ================= bureau =================
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const p = await ctx.newPage(); watch(p, 'bureau');
  const go = async (url) => { await p.goto(B + url); await p.waitForLoadState('networkidle'); };
  const dialog = () => p.locator('[role=dialog]');

  await step('connexion', async () => {
    await go('/');
    await p.fill('#f-email', 'owner@grenier.test'); await p.fill('#f-password', 'password'); await p.click('button:has-text("Se connecter")');
    await p.waitForSelector('h1:has-text("Accueil")'); await shot(p, '01-accueil');
  });
  await step('accueil : indicateurs et alertes', async () => {
    expect(await p.locator('.kpi').count() >= 4, 'indicateurs absents');
    expect(await p.locator('.alerts li').count() > 0, 'alertes absentes');
  });
  await step('stock : nouvel article', async () => {
    await go('/stock'); await p.click('button:has-text("Nouvel article")');
    await dialog().locator('#f-name').fill('Arachides décortiquées'); await dialog().locator('#f-kind').selectOption('mp');
    await dialog().locator('#f-alert_qty').fill('50'); await dialog().locator('#f-ref_price').fill('400'); await dialog().locator('#f-filiere').selectOption('arachide');
    await dialog().locator('button:has-text("Enregistrer")').click(); await p.waitForSelector('td:has-text("Arachides décortiquées")');
    await shot(p, '02-stock');
  });
  await step('stock : entrée de stock', async () => {
    await p.click('button:has-text("Entrée de stock")');
    await dialog().locator('#f-item_id').selectOption({ label: 'Arachides décortiquées (kg)' });
    await dialog().locator('#f-qty').fill('120,5'); await dialog().locator('#f-supplier_name').fill('Marché de Pouytenga');
    await dialog().locator('button:has-text("Enregistrer")').click(); await p.waitForSelector('.toast:has-text("Lot")');
  });
  await step('stock : lots et retrait', async () => {
    await p.click('[role=tab]:has-text("Lots")'); await p.waitForSelector('td.mono');
    await p.locator('button:has-text("Retirer")').first().click();
    await dialog().locator('#f-qty').fill('1'); await dialog().locator('button:has-text("Retirer")').click();
    await p.waitForSelector('.toast:has-text("Retrait")');
    await p.click('[role=tab]:has-text("Mouvements")'); await p.waitForSelector('td:has-text("Retrait")');
  });
  await step('production : nouvelle production avec coût estimé', async () => {
    await go('/production'); await p.click('button:has-text("Nouvelle production")');
    await dialog().locator('select').nth(0).selectOption({ label: 'Beurre de karité 250 g' });
    await dialog().locator('#f-qty').fill('20'); await dialog().locator('#f-operator').fill('Test');
    const lines = dialog().locator('.line');
    await lines.nth(0).locator('select').selectOption({ index: 1 }); await lines.nth(0).locator('input').fill('5');
    await pick(lines.nth(1).locator('select'), 'Pot 250 g'); await lines.nth(1).locator('input').fill('20');
    await p.waitForSelector('text=Coût de revient estimé');
    await dialog().locator('button:has-text("Enregistrer la production")').click(); await p.waitForSelector('.toast:has-text("produit")');
    await shot(p, '03-production');
  });
  let invoiceUrl = '';
  await step('ventes : nouvelle facture, total et montant en lettres', async () => {
    await go('/ventes'); await p.click('button:has-text("Nouvelle facture")');
    await dialog().locator('#f-customer_id').selectOption({ index: 1 });
    const line = dialog().locator('.line').first();
    await pick(line.locator('select'), 'Beurre de karité 250 g'); await line.locator('input').first().fill('10');
    await p.waitForSelector('text=Total TTC 23 600 FCFA');
    await dialog().locator('#f-paid_amount').fill('5000');
    await dialog().locator('button:has-text("Établir la facture")').click();
    await p.waitForURL(/\/ventes\/factures\/\d+/); invoiceUrl = p.url();
    await p.waitForSelector('text=vingt-trois mille six cents francs CFA'); await shot(p, '04-facture');
  });
  await step('ventes : encaissement du reste', async () => {
    await p.click('button:has-text("Encaisser un paiement")');
    expect(await dialog().locator('#f-amount').inputValue() === '18600', 'reste proposé incorrect');
    await dialog().locator('button:has-text("Enregistrer")').click(); await p.waitForSelector('.badge:has-text("Payée")');
  });
  await step('ventes : filtres et clients', async () => {
    await go('/ventes'); await p.click('.chips button:has-text("En retard")'); await p.waitForSelector('.badge:has-text("En retard")');
    await p.click('[role=tab]:has-text("Clients")'); await p.waitForSelector('button:has-text("Facturer")');
  });
  await step('traçabilité : fiche de lot et étiquettes', async () => {
    await go('/tracabilite'); await p.locator('a:has-text("Tracer")').first().click();
    await p.waitForSelector('h2:has-text("Origine")'); await p.waitForSelector('h2:has-text("Distribution")'); await shot(p, '05-trace');
    await p.click('a:has-text("Étiquettes QR")'); await p.waitForSelector('.label img'); await p.waitForLoadState('networkidle');
    const ok = await p.locator('.label img').first().evaluate((img) => img.complete && img.naturalWidth > 0);
    expect(ok, 'QR non affiché'); await shot(p, '06-etiquettes');
  });
  await step('coopérative : tableau de bord', async () => { await go('/cooperative'); await p.waitForSelector('h2:has-text("Soldes à payer")'); await shot(p, '07-coop'); });
  await step('coopérative : nouvelle livraison', async () => {
    await p.click('button:has-text("Nouvelle livraison")');
    await dialog().locator('#f-member_id').selectOption({ index: 1 });
    await dialog().locator('select').nth(1).selectOption({ label: 'Sésame (graines)' });
    await dialog().locator('#f-qty').fill('30'); await p.waitForSelector('text=Montant : 18 000 FCFA');
    await dialog().locator('button:has-text("Enregistrer")').click(); await p.waitForSelector('.toast:has-text("Livraison enregistrée")');
  });
  await step('coopérative : paiement supérieur au dû refusé, paiement correct, reçu', async () => {
    await p.click('button:has-text("Payer un membre")');
    await pick(dialog().locator('#f-member_id'), 'Rasmata');
    await dialog().locator('#f-amount').fill('99999999');
    await dialog().locator('button:has-text("Enregistrer le paiement")').click(); await p.waitForSelector('[role=dialog] .msg.err:has-text("dépasse")');
    await dialog().locator('#f-amount').fill('1000');
    await dialog().locator('#f-method').selectOption('Orange Money'); await dialog().locator('#f-reference').fill('OM-E2E-1');
    await dialog().locator('button:has-text("Enregistrer le paiement")').click();
    await p.waitForURL(/\/cooperative\/recus\/\d+/); await p.waitForSelector('text=mille francs CFA'); await shot(p, '08-recu');
  });
  await step('coopérative : annulation motivée d’une livraison', async () => {
    await go('/cooperative'); await p.click('[role=tab]:has-text("Livraisons")');
    await p.locator('button:has-text("Annuler")').first().click();
    await dialog().locator('button:has-text("Confirmer")').click(); await p.waitForSelector('[role=dialog] .msg.err');
    await dialog().locator('#f-reason').fill('Erreur de pesée (test)'); await dialog().locator('button:has-text("Confirmer")').click();
    await p.waitForSelector('.toast:has-text("annulée")');
  });
  await step('coopérative : fiche membre et avances', async () => {
    await p.click('[role=tab]:has-text("Membres")'); await p.locator('a:has-text("Fiche")').first().click();
    await p.waitForSelector('h2:has-text("Relevé")');
    await go('/cooperative'); await p.click('[role=tab]:has-text("Avances")'); await p.waitForSelector('button:has-text("Accorder une avance")');
  });
  await step('qualité : contrôle d’hygiène conforme', async () => {
    await go('/qualite'); await p.waitForSelector('text=Contrôles sur 30 jours');
    await p.click('button:has-text("Nouveau contrôle")');
    await pick(dialog().locator('#f-template_id'), 'Hygiène quotidienne');
    for (const b of await dialog().locator('.seg button:has-text("Oui")').all()) await b.click();
    await dialog().locator('button:has-text("Enregistrer le contrôle")').click(); await p.waitForSelector('.toast:has-text("conforme")');
    await shot(p, '15-qualite');
  });
  await step('qualité : analyse hors limite → lot bloqué, puis libéré avec motif', async () => {
    await go('/tracabilite'); await p.locator('a:has-text("Tracer")').first().click(); await p.waitForSelector('h2:has-text("Qualité")');
    await p.click('button:has-text("Résultat de laboratoire")');
    await dialog().locator('#f-lab').fill('LNSP'); await dialog().locator('#f-parameter').fill('Aflatoxine B1'); await dialog().locator('#f-value').fill('12');
    await dialog().locator('#f-conforme').selectOption('false'); await dialog().locator('button:has-text("Enregistrer")').click();
    await p.waitForSelector('.badge:has-text("Lot bloqué")'); await shot(p, '16-lot-bloque');
    await p.click('button:has-text("Libérer")'); await dialog().locator('#f-note').fill('Contre-analyse conforme'); await dialog().locator('button:has-text("Libérer")').click();
    await p.waitForSelector('.badge:has-text("Utilisable")');
  });
  await step('paramètres : chaque onglet', async () => {
    await go('/parametres');
    for (const tab of ['Équipe', 'Licence', 'Sauvegarde', 'SMS', 'Grenier en ligne', 'Journal', 'Mon compte', 'Entreprise']) {
      await p.click(`[role=tab]:has-text("${tab}")`); await p.waitForTimeout(400);
      expect(!(await p.locator('.msg.err').count()), `erreur dans l’onglet ${tab}`);
    }
    await p.click('[role=tab]:has-text("Journal")'); await p.waitForSelector('td:has-text("Livraison ANNULÉE")'); await shot(p, '09-journal');
  });
  await step('impression : la facture tient sans menu', async () => {
    expect(invoiceUrl, 'facture non créée à l’étape précédente');
    await p.goto(invoiceUrl); await p.waitForSelector('.doc'); await p.emulateMedia({ media: 'print' });
    expect(!(await p.locator('.side').isVisible()), 'menu visible à l’impression'); await shot(p, '10-facture-impression'); await p.emulateMedia({ media: 'screen' });
  });
  await step('page publique de traçabilité (sans connexion)', async () => {
    const lot = await (await fetch(B + '/api/lots?in_stock=1&kind=pf', { headers: { Authorization: 'Bearer ' + (await p.evaluate(() => localStorage.getItem('grenier.token'))) } })).json();
    const pub = await browser.newPage(); watch(pub, 'public');
    await pub.goto(`${B}/t/faso-delices-demo/${encodeURIComponent(lot[0].code)}`); await pub.waitForSelector('text=Lot authentique'); await shot(pub, '11-public'); await pub.close();
  });
  await step('langue : le sélecteur change la langue', async () => {
    await go('/'); await p.selectOption('.side-foot select', 'mos'); await p.waitForTimeout(300); await p.selectOption('.side-foot select', 'fr');
  });

  // ================= téléphone =================
  const phone = await browser.newContext({ ...devices['Pixel 7'] });
  const m = await phone.newPage(); watch(m, 'telephone');
  await step('téléphone : navigation du bas et menu', async () => {
    await m.goto(B + '/'); await m.fill('#f-email', 'owner@grenier.test'); await m.fill('#f-password', 'password'); await m.click('button:has-text("Se connecter")');
    await m.waitForSelector('.bottomnav'); await shot(m, '12-mobile-accueil');
    const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(!overflow, 'défilement horizontal de la page');
    await m.click('.bottomnav button'); await m.waitForSelector('.side.open'); await m.click('.side.open a:has-text("Paramètres")'); await m.waitForSelector('h1:has-text("Paramètres")');
  });
  const agent = await browser.newContext({ ...devices['Pixel 7'] });
  const tp = await agent.newPage(); watch(tp, 'terrain');
  await step('terrain : connexion de l’agent', async () => {
    await tp.goto(B + '/terrain'); await tp.fill('#f-email', 'coop@grenier.test'); await tp.fill('#f-password', 'password'); await tp.click('button:has-text("Se connecter")');
    await tp.waitForSelector('h2:has-text("Nouvelle livraison")'); await tp.waitForTimeout(1500);
  });
  await step('terrain : saisie hors ligne (nouveau membre + livraison), rechargement sans réseau, envoi au retour', async () => {
    await agent.setOffline(true); await tp.evaluate(() => window.dispatchEvent(new Event('offline')));
    await tp.click('button:has-text("Nouveau membre")'); await tp.fill('#f-name', 'Bintou E2E'); await tp.fill('#f-village', 'Koudougou'); await tp.click('button:has-text("Ajouter")');
    await tp.fill('#f-qty', '42,5'); await tp.click('.seg button:has-text("B")'); await shot(tp, '13-terrain-saisie');
    await tp.click('button:has-text("Enregistrer la livraison")'); await tp.waitForSelector('h2:has-text("Livraison enregistrée")'); await shot(tp, '14-terrain-recu');
    await tp.click('button:has-text("Livraison suivante")');
    await tp.reload(); await tp.waitForSelector('[role=tab]:has-text("En attente (2)")', { timeout: 8000 });
    await agent.setOffline(false); await tp.evaluate(() => window.dispatchEvent(new Event('online')));
    await tp.waitForSelector('[role=tab]:has-text("En attente (0)")', { timeout: 10000 });
    const token = await p.evaluate(() => localStorage.getItem('grenier.token'));
    const dels = await (await fetch(B + '/api/deliveries', { headers: { Authorization: 'Bearer ' + token } })).json();
    expect(dels.some((d) => d.member.name === 'Bintou E2E' && d.qty === 42.5 && d.quality === 'B'), 'livraison terrain absente du serveur');
  });
  await step('terrain : paiement excessif refusé', async () => {
    await tp.click('[role=tab]:has-text("Paiement")'); await pick(tp.locator('select').first(), 'Rasmata');
    await tp.fill('#f-amount', '999999999'); await tp.click('button:has-text("Enregistrer le paiement")'); await tp.waitForSelector('.msg.err:has-text("dépasse")');
  });

  await browser.close(); srv.kill();
  steps.forEach((s) => console.log(s));
  if (errors.length) { console.log('\nErreurs JavaScript :'); errors.forEach((e) => console.log('  ' + e)); }
  console.log(`\n${steps.length - failed}/${steps.length} étapes réussies, ${errors.length} erreur(s) JavaScript.`);
  process.exit(failed || errors.length ? 1 : 0);
})();
