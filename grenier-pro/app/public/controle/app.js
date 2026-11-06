// Grenier Contrôle : corrections (annulations motivées), avances, journal, SMS, registre de traçabilité, licence.
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });
const fcfa = (n) => `${nf.format(Math.round(n || 0))} FCFA`;
const frDate = (s) => (s ? s.slice(0, 10).split('-').reverse().join('/') : '');
const frDateTime = (s) => { if (!s) return ''; const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z'); return isNaN(d) ? s : d.toLocaleString('fr-FR'); };
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
let token = null; try { token = localStorage.getItem('grenier.token'); } catch { /* rien */ }
let me = null, auditBefore = null;

async function api(method, url, body) {
  const r = await fetch('/api' + url, { method, headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch { /* rien */ }
  if (!r.ok) { const e = new Error(json?.message || `Erreur ${r.status}`); e.status = r.status; throw e; }
  return json;
}
const msg = (kind, text) => { $('#msg').innerHTML = text ? `<div class="msg ${kind}">${esc(text)}</div>` : ''; if (text) $('#msg').scrollIntoView({ block: 'nearest' }); };
const isOwner = () => me?.user.role === 'owner';

function tab(name) {
  $$('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== name));
  $$('[role=tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  msg('', '');
  ({ corrections: loadCorrections, avance: loadAdvance, journal: () => loadAudit(true), sms: loadSms, trace: loadTrace, licence: loadLicence })[name]?.();
}
$$('[role=tab]').forEach((b) => b.addEventListener('click', () => tab(b.dataset.tab)));

// ---------- annulation motivée ----------
function askReason(title, text) {
  return new Promise((resolve) => {
    const dlg = $('#dlg');
    $('#dlg-title').textContent = title; $('#dlg-text').textContent = text; $('#dlg-reason').value = ''; $('#dlg-msg').innerHTML = '';
    const done = () => { dlg.removeEventListener('close', done); resolve(dlg.returnValue === 'ok' ? $('#dlg-reason').value.trim() : null); };
    dlg.addEventListener('close', done);
    dlg.showModal();
  });
}
$('#dlg-ok').addEventListener('click', (ev) => {
  if ($('#dlg-reason').value.trim().length < 3) { ev.preventDefault(); $('#dlg-msg').innerHTML = '<div class="msg err">Indiquez un motif (3 caractères au moins).</div>'; }
});

async function loadCorrections() {
  if (!me.company.features?.coop) { $('#t-del').innerHTML = '<tr><td colspan="7" class="muted">Module coopérative non inclus dans votre offre.</td></tr>'; $('#t-pay').innerHTML = ''; return; }
  const [dels, pays] = await Promise.all([api('GET', '/deliveries?all=1'), api('GET', '/payouts?all=1')]);
  $('#t-del').innerHTML = dels.map((d) => `<tr class="${d.status === 'cancelled' ? 'cancelled' : ''}">
    <td>${frDate(d.delivered_on)}</td><td>${esc(d.member?.name)}</td><td>${esc(d.item?.name)}</td><td class="right num">${nf.format(d.qty)} ${esc(d.item?.unit)}</td>
    <td class="right num">${fcfa(d.amount)}</td><td><code>${esc(d.lot?.code)}</code></td>
    <td class="keep">${d.status === 'cancelled' ? `<span class="pill bad" title="${esc(d.cancel_reason)}">annulée</span><div class="small muted">${esc(d.cancel_reason)}</div>` : `<button class="btn sec small" data-cancel-del="${d.id}" data-label="${esc(`${d.member?.name} · ${nf.format(d.qty)} ${d.item?.unit} ${d.item?.name} du ${frDate(d.delivered_on)}`)}">Annuler</button>`}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">Aucune livraison.</td></tr>';
  $('#t-pay').innerHTML = pays.map((p) => `<tr class="${p.status === 'cancelled' ? 'cancelled' : ''}">
    <td>${esc(p.number)}${p.kind === 'avance' ? ' <span class="pill warn">avance</span>' : ''}</td><td>${frDate(p.paid_on)}</td><td>${esc(p.member?.name)}</td><td>${esc(p.method)}${p.reference ? `<div class="small muted">${esc(p.reference)}</div>` : ''}</td>
    <td class="right num">${fcfa(p.amount)}</td>
    <td class="keep">${p.status === 'cancelled' ? `<span class="pill bad">annulé</span><div class="small muted">${esc(p.cancel_reason)}</div>` : `<button class="btn sec small" data-cancel-pay="${p.id}" data-label="${esc(`Reçu ${p.number} · ${fcfa(p.amount)} à ${p.member?.name}`)}">Annuler</button>`}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Aucun paiement.</td></tr>';
}
document.addEventListener('click', async (ev) => {
  const d = ev.target.closest('[data-cancel-del]'), p = ev.target.closest('[data-cancel-pay]');
  if (!d && !p) return;
  const reason = await askReason(d ? 'Annuler la livraison' : 'Annuler le paiement', (d || p).dataset.label);
  if (!reason) return;
  try {
    await api('POST', d ? `/deliveries/${d.dataset.cancelDel}/cancel` : `/payouts/${p.dataset.cancelPay}/cancel`, { reason });
    await loadCorrections(); msg('ok', 'Annulation enregistrée dans le journal.');
  } catch (e) { msg('err', e.message); }
});

// ---------- avances ----------
async function loadAdvance() {
  if (!me.company.features?.coop) return msg('warn', 'Module coopérative non inclus dans votre offre.');
  const members = await api('GET', '/members');
  $('#a-member').innerHTML = '<option value="">Choisir…</option>' + members.filter((m) => m.active).map((m) => `<option value="${m.id}" data-b="${m.balance}">${esc(m.name)}${m.village ? ' — ' + esc(m.village) : ''}</option>`).join('');
  $('#t-adv').innerHTML = members.filter((m) => m.balance < 0).sort((a, b) => a.balance - b.balance).map((m) => `<tr><td>${esc(m.name)}</td><td>${esc(m.village)}</td><td class="right num">${fcfa(-m.balance)}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Aucun membre ne doit d\'argent.</td></tr>';
}
$('#a-member').addEventListener('change', () => {
  const o = $('#a-member').selectedOptions[0]; const b = Number(o?.dataset.b);
  $('#a-balance').textContent = o?.value ? (b >= 0 ? `Dû au membre aujourd'hui : ${fcfa(b)}` : `Le membre doit déjà ${fcfa(-b)} à la coopérative.`) : '';
});
$('#f-adv').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const amount = Math.round(Number(String($('#a-amount').value).replace(/\s/g, '')));
  if (!$('#a-member').value) return msg('err', 'Choisissez le membre.');
  if (!(amount > 0)) return msg('err', 'Indiquez le montant.');
  try {
    const p = await api('POST', '/payouts', { member_id: Number($('#a-member').value), amount, method: $('#a-method').value, reference: $('#a-ref').value || undefined, note: $('#a-note').value || undefined, paid_on: todayIso(), advance: true });
    $('#f-adv').reset(); $('#a-balance').textContent = ''; await loadAdvance();
    msg('ok', `Avance enregistrée : reçu ${p.number}, ${fcfa(p.amount)} à ${p.member.name}.`);
  } catch (e) { msg('err', e.message); }
});

// ---------- journal ----------
async function loadAudit(reset) {
  if (reset) { auditBefore = null; $('#t-audit').innerHTML = ''; }
  const rows = await api('GET', '/audit' + (auditBefore ? `?before=${auditBefore}` : ''));
  if (rows.length) auditBefore = rows[rows.length - 1].id;
  $('#more-audit').hidden = rows.length < 100;
  const detail = (s) => { if (!s) return ''; try { return Object.entries(JSON.parse(s)).map(([k, v]) => `${k} : ${v}`).join(' · '); } catch { return s; } };
  $('#t-audit').insertAdjacentHTML('beforeend', rows.map((r) => `<tr><td class="num">${frDateTime(r.at)}</td><td>${esc(r.user_name || '—')}</td><td><strong>${esc(r.action)}</strong>${r.entity_id ? ` <span class="muted">#${r.entity_id}</span>` : ''}</td><td class="small">${esc(detail(r.detail))}</td></tr>`).join('') || (reset ? '<tr><td colspan="4" class="muted">Journal vide.</td></tr>' : ''));
}
$('#more-audit').addEventListener('click', () => loadAudit(false));

// ---------- SMS ----------
const SMS_STATE = { pending: ['En attente', 'warn'], retry: ['Nouvel essai', 'warn'], sent: ['Envoyé', 'ok'], failed: ['Échec', 'bad'], journal: ['Non envoyé (aucune passerelle)', ''] };
async function loadSms() {
  const r = await api('GET', '/messages');
  $('#sms-on').checked = !!me.company.sms_enabled; $('#sms-on').disabled = !isOwner();
  $('#sms-provider').textContent = r.provider === 'journal'
    ? "Aucune passerelle SMS n'est configurée : les messages sont préparés et gardés ici, mais pas envoyés. Configurez une passerelle dans reglages.json (voir docs/MISE-EN-SERVICE.md)."
    : `Passerelle : ${r.provider}.` + (isOwner() ? '' : ' Seul le propriétaire peut activer ou couper les SMS.');
  $('#sms-kpis').innerHTML = Object.entries(SMS_STATE).filter(([k]) => r.counts[k]).map(([k, [l]]) => `<div class="kpi"><div class="big num">${r.counts[k]}</div><div class="small muted">${l}</div></div>`).join('');
  $('#t-sms').innerHTML = r.items.map((m) => { const [l, c] = SMS_STATE[m.status] || [m.status, '']; return `<tr><td class="num">${frDateTime(m.created_at)}</td><td class="num">${esc(m.to_phone)}</td><td class="small">${esc(m.body)}${m.error ? `<div class="msg err">${esc(m.error)}</div>` : ''}</td><td><span class="pill ${c}">${l}</span></td><td>${m.status === 'failed' ? `<button class="btn sec small" data-retry="${m.id}">Réessayer</button>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="5" class="muted">Aucun message.</td></tr>';
}
$('#sms-on').addEventListener('change', async () => {
  try { await api('PUT', '/settings', { sms_enabled: $('#sms-on').checked }); me = await api('GET', '/me'); msg('ok', $('#sms-on').checked ? 'SMS activés.' : 'SMS coupés.'); }
  catch (e) { msg('err', e.message); $('#sms-on').checked = !$('#sms-on').checked; }
});
$('#sms-flush').addEventListener('click', async () => { try { const r = await api('POST', '/messages/flush'); await loadSms(); msg('ok', `${r.sent} message(s) envoyé(s).`); } catch (e) { msg('err', e.message); } });
$('#t-sms').addEventListener('click', async (ev) => { const b = ev.target.closest('[data-retry]'); if (!b) return; await api('POST', `/messages/${b.dataset.retry}/retry`); await api('POST', '/messages/flush'); loadSms(); });

// ---------- registre de traçabilité ----------
async function loadTrace() {
  const s = await api('GET', '/registry/status');
  if (s.hosted) {
    $('#trace-status').innerHTML = s.public_url ? `<div class="msg ok">Version hébergée : les QR pointent directement vers <code>${esc(s.public_url)}</code>. Aucune liaison n'est nécessaire.</div>` : '<div class="msg warn">Version hébergée sans adresse publique : définissez GRENIER_PUBLIC_URL sur le serveur pour rendre les QR vérifiables.</div>';
    $('#f-trace').hidden = true; return;
  }
  $('#trace-status').innerHTML = s.connected
    ? `<div class="msg ok">Relié à <code>${esc(s.url)}</code> (identifiant <strong>${esc(s.slug)}</strong>). Lots publiés : ${s.published} · en attente : ${s.pending}${s.last_ok ? ` · dernier envoi réussi : ${frDateTime(s.last_ok)}` : ''}.</div>${s.last_error ? `<div class="msg warn">Dernière erreur : ${esc(s.last_error)} (normal sans internet ; un nouvel essai a lieu toutes les 10 minutes).</div>` : ''}`
    : '<div class="msg warn">Non relié : les QR contiennent seulement le texte du lot (lisible sans internet, mais pas vérifiable).</div>';
  if (s.url) $('#tr-url').value = s.url;
  $('#f-trace').hidden = false;
  $('#tr-publish').hidden = !s.connected;
  $$('#f-trace input, #f-trace button[type=submit]').forEach((x) => (x.disabled = !isOwner()));
}
$('#f-trace').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  try { const r = await api('POST', '/registry/connect', { url: $('#tr-url').value.trim(), key: $('#tr-key').value.trim() }); $('#tr-key').value = ''; me = await api('GET', '/me'); await loadTrace(); msg('ok', `Relié au registre (identifiant ${r.slug}). Publication des lots en cours.`); }
  catch (e) { msg('err', e.message); }
});
$('#tr-publish').addEventListener('click', async () => { try { const r = await api('POST', '/registry/publish'); await loadTrace(); msg('ok', `${r.published} lot(s) publié(s).`); } catch (e) { msg('err', e.message); } });

// ---------- licence ----------
const LIC = {
  licence: (s) => ['ok', `Licence valide — ${s.client}, offre ${s.plan}${s.expires ? `, jusqu'au ${frDate(s.expires)}` : ', sans date de fin'}.`],
  licence_expiree: (s) => ['err', `Licence expirée le ${frDate(s.expires)} : Grenier est en lecture seule. Collez la nouvelle licence ci-dessous.`],
  essai: (s) => ['warn', `Période d'essai jusqu'au ${frDate(s.trial_ends)}. Collez votre licence pour continuer après cette date.`],
  essai_termine: (s) => ['err', `Période d'essai terminée le ${frDate(s.trial_ends)} : Grenier est en lecture seule. Collez votre licence ci-dessous.`],
  hebergee: () => ['ok', "Version hébergée : l'abonnement est géré par votre prestataire, aucune licence à saisir."],
  sans_controle: () => ['ok', 'Aucun contrôle de licence sur cette installation.'],
};
async function loadLicence() {
  const s = await api('GET', '/licence');
  const [k, t] = (LIC[s.state] || (() => ['warn', s.state]))(s);
  $('#lic-status').innerHTML = `<div class="msg ${k}">${esc(t)}</div>${s.error ? `<div class="msg err">Licence enregistrée refusée : ${esc(s.error)}</div>` : ''}`;
  $('#f-lic').hidden = ['hebergee', 'sans_controle'].includes(s.state);
}
$('#f-lic').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  try { await api('POST', '/licence', { text: $('#lic-text').value }); $('#lic-text').value = ''; await loadLicence(); msg('ok', 'Licence enregistrée.'); }
  catch (e) { msg('err', e.message); }
});

// ---------- démarrage ----------
(async () => {
  if (!token) { $('#gate').innerHTML = '<div class="card"><h1>Connexion requise</h1><p>Connectez-vous d\'abord à Grenier, puis revenez sur cette page.</p><p><a class="btn" href="/">Aller à Grenier</a></p></div>'; return; }
  try { me = await api('GET', '/me'); }
  catch (e) { $('#gate').innerHTML = `<div class="card"><h1>Session expirée</h1><p>${esc(e.message)}</p><p><a class="btn" href="/">Se reconnecter</a></p></div>`; return; }
  if (!['owner', 'manager'].includes(me.user.role)) { $('#gate').innerHTML = '<div class="card"><h1>Accès réservé</h1><p>Cette page est réservée au propriétaire et au gérant.</p><p><a class="btn" href="/">Retour à Grenier</a></p></div>'; return; }
  $('#who').textContent = `${me.user.name} · ${me.company.name}`;
  $('#tab-licence').hidden = !isOwner();
  $('#main').hidden = false;
  const t = location.hash.slice(1);
  tab($$('[role=tab]').some((b) => b.dataset.tab === t && !b.hidden) ? t : 'corrections');
  if (!me.company.writable) msg('err', "Abonnement ou licence expiré : l'application est en lecture seule." + (isOwner() ? ' Ouvrez l\'onglet Licence.' : ''));
})();
