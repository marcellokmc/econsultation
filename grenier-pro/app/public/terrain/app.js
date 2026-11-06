// Grenier Terrain : saisie des livraisons des membres, avec ou sans connexion.
// Les données (membres, produits) sont gardées sur le téléphone ; les livraisons saisies sans réseau
// attendent dans une file et partent automatiquement au retour de la connexion. Chaque livraison porte une
// référence unique (client_ref) : un envoi répété ne crée jamais de doublon côté serveur.

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });
const fcfa = (n) => `${nf.format(Math.round(n || 0))} FCFA`;
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const frDate = (s) => (s ? s.slice(0, 10).split('-').reverse().join('/') : '');
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2));
const num = (v) => { const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
const TOKEN_KEY = 'grenier.token'; // même session que l'application principale

// ---------- stockage local (IndexedDB, avec repli en mémoire) ----------
const store = (() => {
  let dbp = null, mem = new Map(), ok = true;
  const open = () => (dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open('grenier-terrain', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const run = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction('kv', mode); const q = fn(t.objectStore('kv')); t.oncomplete = () => res(q?.result); t.onerror = () => rej(t.error); }); };
  return {
    get persistent() { return ok; },
    async get(k) { try { return await run('readonly', (s) => s.get(k)); } catch { ok = false; return mem.get(k); } },
    async set(k, v) { try { await run('readwrite', (s) => s.put(v, k)); } catch { ok = false; mem.set(k, v); } },
    async del(k) { try { await run('readwrite', (s) => s.delete(k)); } catch { mem.delete(k); } },
  };
})();

// ---------- état ----------
const st = { token: null, me: null, members: [], items: [], queue: [], asof: null, quality: 'A', chosen: null, syncing: false, lastSync: null };
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* navigation privée */ } };

async function api(method, url, body) {
  const r = await fetch('/api' + url, { method, headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(st.token ? { Authorization: `Bearer ${st.token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch { /* rien */ }
  if (!r.ok) { const e = new Error(json?.message || `Erreur ${r.status}`); e.status = r.status; throw e; }
  return json;
}
const isNetErr = (e) => !e.status; // pas de réponse du serveur

function setMsg(el, kind, text) { $(el).innerHTML = text ? `<div class="msg ${kind}">${esc(text)}</div>` : ''; }
function showNet() {
  const on = navigator.onLine;
  $('#net').innerHTML = `<span class="dot ${on ? '' : 'off'}"></span> ${on ? 'En ligne' : 'Hors ligne'}`;
}

// ---------- navigation ----------
function tab(name) {
  $$('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== name));
  $$('[role=tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  if (name === 'membres') renderMembers();
  if (name === 'attente') renderQueue();
  if (name === 'paiement') preparePay();
  window.scrollTo(0, 0);
}
$$('[role=tab]').forEach((b) => b.addEventListener('click', () => tab(b.dataset.tab)));

// ---------- connexion et données de base ----------
async function loadCache() {
  st.members = (await store.get('members')) || [];
  st.items = (await store.get('items')) || [];
  st.me = (await store.get('me')) || null;
  st.queue = (await store.get('queue')) || [];
  st.asof = (await store.get('asof')) || null;
  st.lastSync = (await store.get('lastSync')) || null;
}
async function refreshData() {
  const [me, members, items] = await Promise.all([api('GET', '/me'), api('GET', '/members'), api('GET', '/items?kind=mp')]);
  // les membres créés hors ligne et pas encore envoyés restent visibles
  const local = st.members.filter((m) => String(m.id).startsWith('tmp-'));
  st.me = me; st.members = [...members, ...local]; st.items = items; st.asof = new Date().toISOString();
  await Promise.all([store.set('me', me), store.set('members', st.members), store.set('items', items), store.set('asof', st.asof)]);
}

async function start() {
  showNet();
  await loadCache();
  st.token = lsGet(TOKEN_KEY);
  if (!st.token) return showLogin();
  if (navigator.onLine) {
    try { await refreshData(); } catch (e) { if (e.status === 401) return showLogin('Votre session a expiré : reconnectez-vous.'); }
  }
  if (!st.me) return showLogin();
  showMain();
  sync();
}
function showLogin(msg) {
  $('#v-login').hidden = false; $('#v-main').hidden = true; $('#logout').hidden = true;
  setMsg('#login-msg', 'err', msg || '');
  if (st.queue.length) setMsg('#login-msg', 'warn', `${st.queue.length} saisie(s) attendent sur ce téléphone : reconnectez-vous pour les envoyer.`);
}
$('#f-login').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  setMsg('#login-msg', '', '');
  try {
    const r = await api('POST', '/auth/login', { email: $('#l-email').value, password: $('#l-pw').value });
    st.token = r.token; lsSet(TOKEN_KEY, r.token);
    await refreshData();
    showMain(); sync();
  } catch (e) { setMsg('#login-msg', 'err', isNetErr(e) ? 'Pas de connexion au serveur Grenier. La première connexion doit se faire avec le réseau.' : e.message); }
});
$('#logout').addEventListener('click', async () => {
  if (st.queue.length && !confirm(`${st.queue.length} saisie(s) ne sont pas encore envoyées. Elles resteront sur ce téléphone. Quitter quand même ?`)) return;
  try { await api('POST', '/auth/logout'); } catch { /* hors ligne */ }
  st.token = null; lsSet(TOKEN_KEY, null); await store.del('me'); st.me = null;
  showLogin();
});

function role() { return st.me?.user?.role; }
const canDeliver = () => ['owner', 'manager', 'coop_agent', 'storekeeper'].includes(role());
const canPay = () => ['owner', 'manager', 'accountant', 'coop_agent'].includes(role());

function showMain() {
  $('#v-login').hidden = true; $('#v-main').hidden = false; $('#logout').hidden = false;
  $('#who').textContent = `${st.me.user.name} · ${st.me.company.name}`;
  $('#tab-paiement').hidden = !canPay();
  if (!st.me.company.features?.coop) setMsg('#global-msg', 'warn', "Le module coopérative n'est pas inclus dans l'offre de cette entreprise.");
  else if (!canDeliver()) setMsg('#global-msg', 'warn', 'Votre rôle ne permet pas de saisir des livraisons.');
  else if (!store.persistent) setMsg('#global-msg', 'warn', "Ce navigateur ne garde pas les données (navigation privée ?) : les saisies hors ligne seraient perdues à la fermeture.");
  fillItems(); resetDelivery(); updateCount();
  tab(canDeliver() ? 'livraison' : canPay() ? 'paiement' : 'membres');
}

// ---------- livraison ----------
function fillItems() {
  $('#d-item').innerHTML = st.items.map((i) => `<option value="${i.id}">${esc(i.name)} (${esc(i.unit)})</option>`).join('') || '<option value="">Aucune matière première : créez-la dans Grenier</option>';
  onItem();
}
function onItem() {
  const it = st.items.find((i) => String(i.id) === $('#d-item').value);
  $('#d-unit').textContent = it ? `en ${it.unit}` : '';
  if (it && it.ref_price) $('#d-price').value = it.ref_price;
  total();
}
function total() {
  const q = num($('#d-qty').value), p = num($('#d-price').value);
  $('#d-total').textContent = Number.isFinite(q) && Number.isFinite(p) ? fcfa(q * p) : '—';
}
$('#d-item').addEventListener('change', onItem);
$('#d-qty').addEventListener('input', total);
$('#d-price').addEventListener('input', total);
$$('.seg button').forEach((b) => b.addEventListener('click', () => { st.quality = b.dataset.q; $$('.seg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }));

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function memberMatches(q, limit = 8) {
  const n = norm(q).trim();
  const act = st.members.filter((m) => m.active !== false);
  return (n ? act.filter((m) => norm(m.name + ' ' + (m.village || '') + ' ' + (m.phone || '')).includes(n)) : act).slice(0, limit);
}
function renderMemberPicker() {
  const q = $('#d-member-q').value;
  $('#d-member-list').innerHTML = q.trim() ? memberMatches(q).map((m) => `<li><button type="button" data-id="${esc(m.id)}"><span><strong>${esc(m.name)}</strong><br><span class="small muted">${esc(m.village || '')}</span></span>${String(m.id).startsWith('tmp-') ? '<span class="pill warn">nouveau</span>' : ''}</button></li>`).join('') || '<li class="muted small" style="padding:10px 4px">Aucun membre trouvé.</li>' : '';
}
$('#d-member-q').addEventListener('input', renderMemberPicker);
$('#d-member-list').addEventListener('click', (ev) => {
  const b = ev.target.closest('button[data-id]'); if (!b) return;
  chooseMember(st.members.find((m) => String(m.id) === b.dataset.id));
});
function chooseMember(m) {
  st.chosen = m;
  $('#d-member-chosen').hidden = !m;
  if (m) $('#d-member-chosen').innerHTML = `Membre : <strong>${esc(m.name)}</strong> ${m.village ? '· ' + esc(m.village) : ''} <button type="button" class="btn sec small" id="btn-change" style="margin-left:8px">Changer</button>`;
  $('#d-member-q').value = ''; $('#d-member-list').innerHTML = '';
  $('#d-member-q').hidden = !!m;
}
$('#d-member-chosen').addEventListener('click', (ev) => { if (ev.target.id === 'btn-change') { chooseMember(null); $('#d-member-q').focus(); } });

function resetDelivery() {
  chooseMember(null);
  $('#d-qty').value = ''; $('#d-note').value = ''; $('#d-date').value = todayIso(); $('#d-date').max = todayIso();
  st.quality = 'A'; $$('.seg button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.q === 'A')));
  onItem(); setMsg('#del-msg', '', '');
}

$('#f-del').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const it = st.items.find((i) => String(i.id) === $('#d-item').value);
  const qty = num($('#d-qty').value), price = Math.round(num($('#d-price').value)), date = $('#d-date').value;
  if (!st.chosen) return setMsg('#del-msg', 'err', 'Choisissez le membre.');
  if (!it) return setMsg('#del-msg', 'err', 'Choisissez le produit livré.');
  if (!(qty > 0)) return setMsg('#del-msg', 'err', 'La quantité doit être supérieure à 0.');
  if (!(price >= 0)) return setMsg('#del-msg', 'err', 'Indiquez le prix unitaire.');
  if (!date || date > todayIso()) return setMsg('#del-msg', 'err', 'La date ne peut pas être dans le futur.');
  const entry = {
    type: 'delivery', client_ref: uuid(), created_at: new Date().toISOString(),
    payload: { member_id: st.chosen.id, item_id: it.id, delivered_on: date, qty, unit_price: price, quality: st.quality, note: $('#d-note').value || undefined },
    label: { member: st.chosen.name, village: st.chosen.village, item: it.name, unit: it.unit, amount: Math.round(qty * price) },
  };
  st.queue.push(entry); await store.set('queue', st.queue); updateCount();
  showReceipt(entry);
  sync();
});
function showReceipt(e) {
  const p = e.payload, l = e.label;
  $('#recu-body').innerHTML = `<p class="small muted">${esc(st.me.company.name)} · reçu provisoire</p>
    <p><strong>${esc(l.member)}</strong>${l.village ? ' · ' + esc(l.village) : ''}</p>
    <table><tbody>
      <tr><th>Date</th><td>${frDate(p.delivered_on)}</td></tr>
      <tr><th>Produit</th><td>${esc(l.item)}</td></tr>
      <tr><th>Quantité</th><td class="num">${nf.format(p.qty)} ${esc(l.unit)} · qualité ${p.quality}</td></tr>
      <tr><th>Prix</th><td class="num">${fcfa(p.unit_price)} / ${esc(l.unit)}</td></tr>
      <tr><th>Montant</th><td class="num"><strong>${fcfa(l.amount)}</strong></td></tr>
    </tbody></table>
    <p class="small muted" id="recu-state">${navigator.onLine ? 'Envoi en cours…' : 'Hors ligne : sera envoyée au retour du réseau.'}</p>`;
  $$('[data-panel]').forEach((x) => (x.hidden = x.dataset.panel !== 'recu'));
}
$('#btn-next').addEventListener('click', () => { resetDelivery(); tab('livraison'); });

// ---------- nouveau membre (possible hors ligne) ----------
$('#btn-new-member').addEventListener('click', () => { $('#f-mem').reset(); $$('[data-panel]').forEach((x) => (x.hidden = x.dataset.panel !== 'nouveau-membre')); $('#m-name').focus(); });
$('#btn-mem-cancel').addEventListener('click', () => tab('livraison'));
$('#f-mem').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const name = $('#m-name').value.trim(); if (!name) return;
  const ref = uuid(), tmp = 'tmp-' + ref;
  const m = { id: tmp, name, village: $('#m-village').value.trim() || null, phone: $('#m-phone').value.trim() || null, group_name: $('#m-group').value.trim() || null, active: true, balance: 0 };
  st.members.push(m);
  st.queue.push({ type: 'member', client_ref: ref, tmp_id: tmp, created_at: new Date().toISOString(), payload: { name: m.name, village: m.village, phone: m.phone, group_name: m.group_name }, label: { member: m.name, village: m.village } });
  await Promise.all([store.set('members', st.members), store.set('queue', st.queue)]);
  updateCount(); tab('livraison'); chooseMember(m); sync();
});

// ---------- synchronisation ----------
function updateCount() {
  const errs = st.queue.filter((q) => q.error).length;
  $('#pending-count').textContent = st.queue.length;
  $('#pending-count').className = 'pill' + (errs ? ' bad' : st.queue.length ? ' warn' : ' ok');
}
async function sync() {
  if (st.syncing || !st.token || !navigator.onLine) return;
  st.syncing = true;
  let sent = 0, stop = false;
  try {
    for (const e of [...st.queue]) {
      if (stop) break;
      if (e.error) continue; // refusée : attend une décision de l'utilisateur
      try {
        if (e.type === 'member') {
          const r = await api('POST', '/members', { ...e.payload, client_ref: e.client_ref });
          // remplace l'identifiant provisoire partout
          st.members = st.members.map((m) => (m.id === e.tmp_id ? { ...m, ...r } : m));
          st.queue.forEach((q) => { if (q.type === 'delivery' && q.payload.member_id === e.tmp_id) q.payload.member_id = r.id; });
        } else if (e.type === 'delivery') {
          if (String(e.payload.member_id).startsWith('tmp-')) continue; // membre pas encore créé
          await api('POST', '/deliveries', { ...e.payload, client_ref: e.client_ref });
        }
        st.queue = st.queue.filter((q) => q !== e); sent++;
      } catch (err) {
        if (isNetErr(err)) stop = true;
        else if (err.status === 401) { stop = true; showLogin('Votre session a expiré : reconnectez-vous pour envoyer les saisies.'); }
        else { e.error = err.message; }
      }
      await store.set('queue', st.queue);
    }
    if (sent) { try { await refreshData(); } catch { /* sera fait plus tard */ } }
    if (!stop) { st.lastSync = new Date().toISOString(); await store.set('lastSync', st.lastSync); }
  } finally {
    st.syncing = false; updateCount();
    const rs = $('#recu-state'); if (rs && sent) rs.textContent = 'Envoyée au serveur. Le membre reçoit un SMS si les SMS sont activés.';
    if (!$('[data-panel=attente]').hidden) renderQueue();
  }
}
window.addEventListener('online', () => { showNet(); sync(); });
window.addEventListener('offline', showNet);
setInterval(sync, 60000);

function renderQueue() {
  $('#sync-info').textContent = (st.lastSync ? `Dernier envoi réussi : ${new Date(st.lastSync).toLocaleString('fr-FR')}. ` : '') + (navigator.onLine ? '' : 'Hors ligne : les saisies partiront au retour du réseau.');
  $('#q-list').innerHTML = st.queue.length ? st.queue.map((e, i) => `<li style="padding:10px 4px">
      <div><strong>${e.type === 'member' ? 'Nouveau membre' : 'Livraison'}</strong> · ${esc(e.label.member)}${e.type === 'delivery' ? ` · ${nf.format(e.payload.qty)} ${esc(e.label.unit)} ${esc(e.label.item)} · ${fcfa(e.label.amount)}` : ''}</div>
      <div class="small muted">Saisie le ${new Date(e.created_at).toLocaleString('fr-FR')}</div>
      ${e.error ? `<div class="msg err">Refusée par le serveur : ${esc(e.error)}</div><div class="row"><button class="btn sec small" data-retry="${i}">Réessayer</button><button class="btn danger small" data-drop="${i}">Supprimer cette saisie</button></div>` : ''}
    </li>`).join('') : '<li class="muted" style="padding:10px 4px">Tout est envoyé.</li>';
}
$('#q-list').addEventListener('click', async (ev) => {
  const r = ev.target.closest('[data-retry]'), d = ev.target.closest('[data-drop]');
  if (r) { delete st.queue[+r.dataset.retry].error; await store.set('queue', st.queue); sync(); renderQueue(); }
  if (d && confirm('Supprimer définitivement cette saisie du téléphone ?')) { st.queue.splice(+d.dataset.drop, 1); await store.set('queue', st.queue); updateCount(); renderQueue(); }
});
$('#btn-sync').addEventListener('click', async () => { if (!navigator.onLine) return setMsg('#global-msg', 'warn', 'Hors ligne : impossible d\'envoyer pour le moment.'); await sync(); renderQueue(); });

// ---------- membres ----------
function renderMembers() {
  const list = memberMatches($('#m-q').value, 200);
  $('#m-asof').textContent = st.asof ? `Soldes au ${new Date(st.asof).toLocaleString('fr-FR')} (hors saisies en attente).` : '';
  $('#m-list').innerHTML = list.map((m) => `<li><button type="button" data-id="${esc(m.id)}"><span><strong>${esc(m.name)}</strong><br><span class="small muted">${esc(m.village || '')}</span></span>
    <span class="num ${m.balance < 0 ? 'pill bad' : ''}">${m.balance < 0 ? 'doit ' + fcfa(-m.balance) : fcfa(m.balance)}</span></button></li>`).join('');
  $('#m-detail').innerHTML = '';
}
$('#m-q').addEventListener('input', renderMembers);
$('#m-list').addEventListener('click', async (ev) => {
  const b = ev.target.closest('button[data-id]'); if (!b) return;
  const m = st.members.find((x) => String(x.id) === b.dataset.id);
  if (String(m.id).startsWith('tmp-') || !navigator.onLine) { $('#m-detail').innerHTML = `<div class="msg warn">${esc(m.name)} : le détail des livraisons s'affiche avec une connexion.</div>`; return; }
  try {
    const d = await api('GET', `/members/${m.id}`);
    $('#m-detail').innerHTML = `<h3 style="margin-top:14px">${esc(d.member.name)}</h3>
      <p>Livré : <strong>${fcfa(d.totals.amount)}</strong> · Payé : <strong>${fcfa(d.totals.paid)}</strong> · Solde : <strong>${fcfa(d.totals.balance)}</strong></p>
      <div class="scroll"><table><thead><tr><th>Date</th><th>Produit</th><th class="right">Qté</th><th class="right">Montant</th></tr></thead><tbody>
      ${d.deliveries.slice(0, 15).map((x) => `<tr><td>${frDate(x.delivered_on)}</td><td>${esc(x.item.name)}</td><td class="right num">${nf.format(x.qty)} ${esc(x.item.unit)}</td><td class="right num">${fcfa(x.amount)}</td></tr>`).join('')}
      </tbody></table></div>`;
    $('#m-detail').scrollIntoView({ behavior: 'smooth' });
  } catch (e) { $('#m-detail').innerHTML = `<div class="msg err">${esc(e.message)}</div>`; }
});

// ---------- paiement (en ligne uniquement) ----------
function preparePay() {
  $('#p-member').innerHTML = '<option value="">Choisir…</option>' + st.members.filter((m) => !String(m.id).startsWith('tmp-')).sort((a, b) => b.balance - a.balance)
    .map((m) => `<option value="${m.id}">${esc(m.name)} — dû ${fcfa(Math.max(m.balance, 0))}</option>`).join('');
  $('#p-adv-wrap').hidden = !['owner', 'manager'].includes(role());
  $('#p-balance').textContent = ''; setMsg('#pay-msg', '', '');
  st.payRef = uuid();
  onMethod();
}
function onMethod() { $('#p-ref-wrap').hidden = $('#p-method').value === 'Espèces'; }
$('#p-method').addEventListener('change', onMethod);
$('#p-member').addEventListener('change', () => {
  const m = st.members.find((x) => String(x.id) === $('#p-member').value);
  $('#p-balance').textContent = m ? `Dû à ${m.name} : ${fcfa(m.balance)} (au ${new Date(st.asof).toLocaleString('fr-FR')})` : '';
  if (m && m.balance > 0) $('#p-amount').value = m.balance;
});
$('#f-pay').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (!navigator.onLine) return setMsg('#pay-msg', 'err', 'Pas de connexion : le paiement ne peut pas être enregistré maintenant.');
  const member_id = Number($('#p-member').value), amount = Math.round(num($('#p-amount').value)), method = $('#p-method').value, reference = $('#p-ref').value.trim();
  if (!member_id) return setMsg('#pay-msg', 'err', 'Choisissez le membre.');
  if (!(amount > 0)) return setMsg('#pay-msg', 'err', 'Indiquez le montant.');
  if (method !== 'Espèces' && !reference) return setMsg('#pay-msg', 'err', 'Indiquez la référence de la transaction mobile money (elle figure dans le SMS de confirmation).');
  try {
    const p = await api('POST', '/payouts', { member_id, amount, method, reference: reference || undefined, paid_on: todayIso(), advance: $('#p-adv').checked || undefined, client_ref: st.payRef });
    setMsg('#pay-msg', 'ok', `Paiement enregistré : reçu ${p.number}, ${fcfa(p.amount)} à ${p.member.name}.`);
    $('#f-pay').reset(); await refreshData(); preparePay();
    setMsg('#pay-msg', 'ok', `Paiement enregistré : reçu ${p.number}, ${fcfa(p.amount)} à ${p.member.name}.`);
  } catch (e) { setMsg('#pay-msg', 'err', isNetErr(e) ? 'Connexion perdue : vérifiez dans la liste des paiements avant de recommencer.' : e.message); }
});

// ---------- application installable et hors ligne ----------
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/terrain/sw.js', { scope: '/terrain/' }).catch(() => {});
start();
