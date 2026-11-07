// node render.cjs <horizontal|vertical> <dossier-images> [fps] [contact] [temps,…]  → images JPEG numérotées
const { chromium } = require('playwright');
const [fmt, out, fps = '30', contact = '', only] = process.argv.slice(2);
(async () => {
  const V = fmt === 'vertical';
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: V ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await p.goto(`file://${__dirname}/promo.html?format=${fmt}&contact=${encodeURIComponent(contact)}`);
  await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); });
  const dur = await p.evaluate(() => window.DURATION);
  const times = only ? only.split(',').map(Number) : Array.from({ length: Math.round(dur * Number(fps)) }, (_, i) => i / Number(fps));
  require('fs').mkdirSync(out, { recursive: true });
  let n = 0;
  for (const t of times) {
    await p.evaluate((x) => window.render(x), t);
    await p.screenshot({ path: `${out}/${only ? 't' + t : String(n).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
    n++;
  }
  await b.close();
  console.log(`${n} images`);
})();
