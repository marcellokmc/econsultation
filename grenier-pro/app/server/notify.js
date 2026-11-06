// Messages (SMS) aux membres : reçus de livraison et de paiement.
// Les messages sont d'abord mis en file d'attente dans la base (table messages), puis envoyés quand c'est possible :
// une coupure d'internet ne bloque jamais la saisie, les messages partent au retour de la connexion.

/** Met un numéro au format international (+226XXXXXXXX par défaut pour un numéro local à 8 chiffres). */
export function normalizePhone(raw, indicatif = '226') {
  let p = String(raw || '').replace(/[^\d+]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (!p.startsWith('+')) p = p.length <= 10 ? `+${indicatif}${p.replace(/^0+/, '')}` : '+' + p;
  return /^\+\d{8,15}$/.test(p) ? p : null;
}

/** Retire les accents (un SMS sans accent tient en 160 caractères au lieu de 70). */
const plain = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'").replace(/ | /g, ' ');

/**
 * cfg (reglages.json → "sms") :
 *   { "fournisseur": "journal" }                                  messages gardés dans Grenier, non envoyés (par défaut)
 *   { "fournisseur": "http", "url": "...", "entetes": {...}, "expediteur": "GRENIER" }
 *        envoie POST {to, message, sender} en JSON — à adapter à la passerelle SMS choisie
 *   { "fournisseur": "orange", "client_id": "...", "client_secret": "...", "numero_expediteur": "+226XXXXXXXX", "nom_expediteur": "GRENIER" }
 *        API SMS d'Orange (developer.orange.com) — NON TESTÉE avec un vrai compte : à valider avant la mise en service
 */
export function makeMessenger(db, cfg = {}) {
  const provider = cfg.fournisseur || 'journal';
  const indicatif = String(cfg.indicatif || '226');

  function enqueue(cid, phone, body, kind, ref) {
    const c = db.prepare('SELECT sms_enabled FROM companies WHERE id=?').get(cid);
    if (!c || !c.sms_enabled) return;
    const to = normalizePhone(phone, indicatif);
    if (!to) return;
    db.prepare('INSERT INTO messages(company_id,to_phone,body,kind,ref) VALUES (?,?,?,?,?)').run(cid, to, plain(body).slice(0, 459), kind ?? null, ref ?? null);
  }

  let orangeToken = null;
  async function sendOrange(m) {
    if (!orangeToken || orangeToken.exp < Date.now()) {
      const r = await fetch('https://api.orange.com/oauth/v3/token', {
        method: 'POST',
        headers: { Authorization: 'Basic ' + Buffer.from(`${cfg.client_id}:${cfg.client_secret}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: 'grant_type=client_credentials',
      });
      if (!r.ok) throw new Error(`Orange (jeton) : HTTP ${r.status}`);
      const j = await r.json();
      orangeToken = { value: j.access_token, exp: Date.now() + (Number(j.expires_in || 3600) - 60) * 1000 };
    }
    const sender = `tel:${cfg.numero_expediteur}`;
    const r = await fetch(`https://api.orange.com/smsmessaging/v1/outbound/${encodeURIComponent(sender)}/requests`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${orangeToken.value}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ outboundSMSMessageRequest: { address: `tel:${m.to_phone}`, senderAddress: sender, ...(cfg.nom_expediteur ? { senderName: cfg.nom_expediteur } : {}), outboundSMSTextMessage: { message: m.body } } }),
    });
    if (!r.ok) throw new Error(`Orange : HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  }
  async function sendHttp(m) {
    const r = await fetch(cfg.url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cfg.entetes || {}) }, body: JSON.stringify({ to: m.to_phone, message: m.body, sender: cfg.expediteur || 'GRENIER' }) });
    if (!r.ok) throw new Error(`Passerelle SMS : HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  }

  let busy = false;
  /** Envoie les messages en attente (5 tentatives maximum par message). */
  async function flush() {
    if (busy) return { sent: 0 };
    busy = true;
    let sent = 0;
    try {
      const rows = db.prepare("SELECT * FROM messages WHERE status IN ('pending','retry') AND attempts < 5 ORDER BY id LIMIT 50").all();
      for (const m of rows) {
        if (provider === 'journal') { db.prepare("UPDATE messages SET status='journal' WHERE id=?").run(m.id); continue; }
        try {
          if (provider === 'orange') await sendOrange(m);
          else if (provider === 'http') await sendHttp(m);
          else throw new Error(`Fournisseur SMS inconnu : ${provider}`);
          db.prepare("UPDATE messages SET status='sent', sent_at=CURRENT_TIMESTAMP, attempts=attempts+1, error=NULL WHERE id=?").run(m.id);
          sent++;
        } catch (e) {
          db.prepare("UPDATE messages SET status=CASE WHEN attempts+1>=5 THEN 'failed' ELSE 'retry' END, attempts=attempts+1, error=? WHERE id=?").run(String(e.message).slice(0, 300), m.id);
        }
      }
    } finally { busy = false; }
    return { sent };
  }

  return { enqueue, flush, provider };
}
