// Remplit le serveur hébergé de démonstration avec des offres de marché et des prix (plusieurs sources).
const H = 'http://127.0.0.1:3912';
const call = async (m, u, b, tok) => { const r = await fetch(H + u, { method: m, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: b ? JSON.stringify(b) : undefined }); return r.json(); };
const today = new Date().toISOString().slice(0, 10);
const back = (d) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
const coops = [
  { name: 'Union des productrices de karité de Léo', phone: '+226 70 21 45 10', region: 'Léo (Sissili)', buys: [['Amandes de karité', 'karite', 270], ['Sésame (graines)', 'sesame', 610]],
    offers: [{ product: 'Amandes de karité', filiere: 'karite', qty: 12, unit: 'tonne', price: 285000, quality: 'Sèches, triées, grade A', certifications: 'Bio (en conversion)' },
             { product: 'Beurre de karité non raffiné', filiere: 'karite', qty: 2500, unit: 'kg', price: 1900, quality: 'Artisanal, filtré', certifications: 'Bio' }] },
  { name: 'Coopérative Teeg-Wende de Pô', phone: '+226 76 33 10 02', region: 'Pô (Nahouri)', buys: [['Amandes de karité', 'karite', 280], ['Sésame (graines)', 'sesame', 590]],
    offers: [{ product: 'Sésame blanc', filiere: 'sesame', qty: 8, unit: 'tonne', price: 640000, quality: 'Pureté 99 %, humidité 6 %', certifications: '' }] },
  { name: 'Société Faso Délices', phone: '+226 70 00 00 00', region: 'Ouagadougou', buys: [['Mangues fraîches', 'mangue', 110], ['Amandes de karité', 'karite', 275]],
    offers: [{ product: 'Mangue séchée (sachets 100 g)', filiere: 'mangue', qty: 4000, unit: 'sachet', price: 1000, quality: 'Variété Amélie', certifications: 'Commerce équitable' }] },
];
for (const c of coops) {
  const reg = await call('POST', '/api/auth/register', { company_name: c.name, name: 'Responsable', email: `contact${Math.random()}@exemple.bf`, password: 'secret1234', phone: c.phone });
  const tok = reg.token;
  for (const [name, filiere, price] of c.buys) {
    const it = await call('POST', '/api/items', { name, kind: 'mp', unit: 'kg', filiere }, tok);
    for (const d of [70, 40, 12]) await call('POST', '/api/stock/receipts', { item_id: it.id, qty: 800 + Math.round(Math.random() * 400), unit_cost: price + Math.round((Math.random() - 0.5) * 20), date: back(d) }, tok);
  }
  await call('POST', '/api/market/share', { enabled: true }, tok);
  for (const o of c.offers) await call('POST', '/api/market/offers', { ...o, region: c.region, phone: c.phone, available_on: today, days: 60 }, tok);
}
await call('POST', '/api/public/market/requests', { buyer: 'Huilerie du Houet (Bobo-Dioulasso)', phone: '+226 20 97 00 00', product: 'Sésame blanc décortiqué', filiere: 'sesame', qty: 30, unit: 'tonne', price_max: 650000, region: 'Bobo-Dioulasso' });
await call('POST', '/api/public/market/requests', { buyer: 'Cantines scolaires de Koudougou', phone: '+226 25 44 00 00', product: 'Farine de maïs enrichie', filiere: 'mais', qty: 5, unit: 'tonne', region: 'Koudougou' });
console.log('marché rempli');
