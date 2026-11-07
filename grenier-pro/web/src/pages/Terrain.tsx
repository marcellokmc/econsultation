// Collecte terrain : livraisons des membres saisies sur téléphone, avec ou sans connexion.
// Les saisies attendent sur l'appareil (IndexedDB) et partent dès que le serveur répond ; chacune porte une
// référence unique (client_ref), donc un envoi répété ne crée jamais de doublon.
import { useEffect, useRef, useState } from 'preact/hooks';
import { api, ApiError, session, type Profile } from '../lib/api';
import { fcfa, frDate, num, parseNum, today, uid } from '../lib/format';
import { t, useLang } from '../lib/i18n';
import { store } from '../lib/offline';
import type { Item, Member } from '../lib/types';
import { Field, FormError, Icon, Tabs, toast, useForm } from '../ui/kit';

type QMember = { type: 'member'; client_ref: string; tmp_id: string; created_at: string; payload: Record<string, unknown>; label: { member: string; village?: string | null }; error?: string };
type QDelivery = { type: 'delivery'; client_ref: string; created_at: string; payload: { member_id: number | string; item_id: number; delivered_on: string; qty: number; unit_price: number; quality: string; note?: string }; label: { member: string; village?: string | null; item: string; unit: string; amount: number }; error?: string };
type Q = QMember | QDelivery;
type TMember = Omit<Member, 'id'> & { id: number | string };

const canDeliver = (p: Profile) => ['owner', 'manager', 'coop_agent', 'storekeeper'].includes(p.user.role);
const canPay = (p: Profile) => ['owner', 'manager', 'accountant', 'coop_agent'].includes(p.user.role);
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function Terrain({ offline }: { offline: boolean }) {
  useLang();
  const [me, setMe] = useState<Profile | null>(session.profile);
  const [members, setMembers] = useState<TMember[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [queue, setQueue] = useState<Q[]>([]);
  const [asof, setAsof] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine && !offline);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<'livraison' | 'membres' | 'attente' | 'paiement'>('livraison');
  const [receipt, setReceipt] = useState<QDelivery | null>(null);
  const qref = useRef<Q[]>([]); qref.current = queue;
  const syncing = useRef(false);

  const saveQueue = async (q: Q[]) => { setQueue(q); qref.current = q; await store.set('queue', q); };
  async function refresh() {
    const [p, ms, its] = await Promise.all([api.get<Profile>('/me'), api.get<Member[]>('/members'), api.get<Item[]>('/items', { kind: 'mp' })]);
    const local = (await store.get<TMember[]>('members') ?? []).filter((m) => String(m.id).startsWith('tmp-'));
    const all = [...ms, ...local], now = new Date().toISOString();
    session.set(p); setMe(p); setMembers(all); setItems(its); setAsof(now); setOnline(true);
    await Promise.all([store.set('me', p), store.set('members', all), store.set('items', its), store.set('asof', now)]);
  }
  async function sync() {
    if (syncing.current || !session.token) return;
    syncing.current = true;
    let sent = 0, stop = false;
    try {
      let q = [...qref.current];
      let ms = await store.get<TMember[]>('members') ?? [];
      for (const e of [...q]) {
        if (stop) break;
        if (e.error) continue;
        try {
          if (e.type === 'member') {
            const r = await api.post<Member>('/members', { ...e.payload, client_ref: e.client_ref });
            ms = ms.map((m) => (m.id === e.tmp_id ? { ...m, ...r } : m));
            q.forEach((x) => { if (x.type === 'delivery' && x.payload.member_id === e.tmp_id) x.payload.member_id = r.id; });
            await store.set('members', ms); setMembers(ms);
          } else {
            if (String(e.payload.member_id).startsWith('tmp-')) continue;
            await api.post('/deliveries', { ...e.payload, client_ref: e.client_ref });
          }
          q = q.filter((x) => x !== e); sent++;
        } catch (err) {
          if (err instanceof ApiError && err.status === 0) { stop = true; setOnline(false); }
          else if (err instanceof ApiError && err.status === 401) { stop = true; }
          else e.error = (err as Error).message;
        }
        await saveQueue(q);
      }
      if (!stop) { await store.set('lastSync', new Date().toISOString()); if (sent) { await refresh().catch(() => {}); toast.ok(t('{n} saisie(s) envoyée(s).', { n: sent })); } }
    } finally { syncing.current = false; }
  }

  useEffect(() => {
    (async () => {
      const [m, ms, its, q, a] = await Promise.all([store.get<Profile>('me'), store.get<TMember[]>('members'), store.get<Item[]>('items'), store.get<Q[]>('queue'), store.get<string>('asof')]);
      if (!session.profile && m) setMe(m);
      setMembers(ms ?? []); setItems(its ?? []); setQueue(q ?? []); qref.current = q ?? []; setAsof(a ?? null);
      if (session.token && navigator.onLine) await refresh().catch(() => setOnline(false));
      setReady(true);
      sync();
    })();
    const on = () => { setOnline(true); refresh().then(sync).catch(() => setOnline(false)); };
    const off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    const h = setInterval(() => { if (navigator.onLine) refresh().then(sync).catch(() => setOnline(false)); }, 60000);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); clearInterval(h); };
  }, []);

  if (!ready) return null;
  if (!me || !session.token) return <TerrainLogin pending={queue.length} onDone={async () => { await refresh(); setReady(true); sync(); }} />;
  const errs = queue.filter((q) => q.error).length;
  const tabs: [typeof tab, string][] = [];
  if (canDeliver(me)) tabs.push(['livraison', t('Livraison')]);
  tabs.push(['membres', t('Membres')], ['attente', `${t('En attente')} (${queue.length})`]);
  if (canPay(me)) tabs.push(['paiement', t('Paiement')]);
  const cur = tabs.some(([k]) => k === tab) ? tab : tabs[0][0];

  return (
    <div>
      <div class="topbar" style={{ display: 'flex' }}>
        <div><b>{t('Grenier Terrain')}</b><div class="small" style={{ opacity: .85 }}>{me.user.name} · {me.company.name}</div></div>
        <span class="sp" />
        <span class="small" style={{ whiteSpace: 'nowrap' }}><span class={`dot${online ? '' : ' off'}`} /> {online ? t('En ligne') : t('Hors ligne')}</span>
        {online && <a href="/" style={{ color: 'inherit' }} class="small">{t('Grenier')}</a>}
      </div>
      <main class="main" style={{ maxWidth: 640, margin: '0 auto' }}>
        {!me.company.features.coop && <div class="msg warn">{t("Le module coopérative n'est pas inclus dans l'offre de cette entreprise.")}</div>}
        {!store.persistent && <div class="msg warn">{t('Ce navigateur ne garde pas les données (navigation privée ?) : les saisies hors ligne seraient perdues à la fermeture.')}</div>}
        {errs > 0 && <div class="msg err">{t('{n} saisie(s) refusée(s) par le serveur : voir « En attente ».', { n: errs })}</div>}
        {receipt ? <Receipt e={receipt} company={me.company.name} pending={queue.some((q) => q.client_ref === receipt.client_ref)} onNext={() => setReceipt(null)} /> : <>
          <Tabs tabs={tabs} value={cur} onChange={setTab} />
          {cur === 'livraison' && <Delivery members={members} items={items} onNewMember={async (m, entry) => { const ms = [...members, m]; setMembers(ms); await store.set('members', ms); await saveQueue([...qref.current, entry]); sync(); }}
            onSave={async (e) => { await saveQueue([...qref.current, e]); setReceipt(e); sync(); }} />}
          {cur === 'membres' && <Members members={members} asof={asof} online={online} />}
          {cur === 'attente' && <Pending queue={queue} online={online} onSync={sync} onChange={saveQueue} />}
          {cur === 'paiement' && <Pay members={members} online={online} me={me} onDone={() => refresh().catch(() => {})} />}
        </>}
      </main>
    </div>
  );
}

function TerrainLogin({ pending, onDone }: { pending: number; onDone: () => Promise<void> }) {
  const f = useForm({ email: '', password: '' });
  return (
    <div class="authwrap"><form class="authcard" onSubmit={(e) => { e.preventDefault(); f.submit(async () => { session.set(await api.post<Profile>('/auth/login', f.v)); await onDone(); }); }}>
      <h1>{t('Grenier Terrain')}</h1>
      <p class="muted">{t('Connectez-vous une fois avec le réseau. Ensuite, les livraisons peuvent être saisies sans connexion : elles partent toutes seules au retour du réseau.')}</p>
      {pending > 0 && <div class="msg warn">{t('{n} saisie(s) attendent sur ce téléphone : reconnectez-vous pour les envoyer.', { n: pending })}</div>}
      <Field label={t('Adresse e-mail')} name="email" type="email" form={f} required autoComplete="username" />
      <Field label={t('Mot de passe')} name="password" type="password" form={f} required autoComplete="current-password" />
      <FormError error={f.error && (f.error.includes('connexion') ? t('Pas de connexion au serveur Grenier. La première connexion doit se faire avec le réseau.') : f.error)} />
      <button class="btn block" disabled={f.busy}>{t('Se connecter')}</button>
    </form></div>
  );
}

function MemberPicker({ members, onPick }: { members: TMember[]; onPick: (m: TMember) => void }) {
  const [q, setQ] = useState('');
  const n = norm(q.trim());
  const list = n ? members.filter((m) => m.active !== false && norm(`${m.name} ${m.village ?? ''} ${m.phone ?? ''}`).includes(n)).slice(0, 8) : [];
  return <>
    <input type="search" placeholder={t('Nom, village ou téléphone…')} value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} aria-label={t('Rechercher un membre')} />
    {n && <ul class="pick" style={{ marginTop: 8 }}>{list.length ? list.map((m) => <li key={m.id}><button type="button" onClick={() => onPick(m)}><span><b>{m.name}</b><span class="sub">{m.village}</span></span>{String(m.id).startsWith('tmp-') && <span class="badge warn">{t('nouveau')}</span>}</button></li>) : <li class="muted" style={{ padding: 12 }}>{t('Aucun membre trouvé.')}</li>}</ul>}
  </>;
}

function Delivery({ members, items, onSave, onNewMember }: { members: TMember[]; items: Item[]; onSave: (e: QDelivery) => Promise<void>; onNewMember: (m: TMember, e: QMember) => Promise<void> }) {
  const [member, setMember] = useState<TMember | null>(null);
  const [adding, setAdding] = useState(false);
  const f = useForm({ item_id: items[0] ? String(items[0].id) : '', qty: '', unit_price: items[0]?.ref_price ? String(items[0].ref_price) : '', quality: 'A', date: today(), note: '' });
  const it = items.find((i) => String(i.id) === f.v.item_id);
  const q = parseNum(f.v.qty), p = parseNum(f.v.unit_price);
  if (adding) return <NewMember onCancel={() => setAdding(false)} onSave={async (m, e) => { await onNewMember(m, e); setMember(m); setAdding(false); }} />;
  const save = () => f.submit(async () => {
    if (!member) return f.setError(t('Choisissez le membre.'));
    if (!it) return f.setError(t('Choisissez le produit livré.'));
    if (!(q > 0)) return f.setError(t('La quantité doit être supérieure à 0.'));
    if (!(p >= 0)) return f.setError(t('Indiquez le prix unitaire.'));
    if (!f.v.date || f.v.date > today()) return f.setError(t('La date ne peut pas être dans le futur.'));
    await onSave({ type: 'delivery', client_ref: uid(), created_at: new Date().toISOString(),
      payload: { member_id: member.id, item_id: it.id, delivered_on: f.v.date, qty: q, unit_price: Math.round(p), quality: f.v.quality, note: f.v.note || undefined },
      label: { member: member.name, village: member.village, item: it.name, unit: it.unit, amount: Math.round(q * p) } });
  });
  return (
    <div class="card">
      <h2>{t('Nouvelle livraison')}</h2>
      <label class="f"><span>{t('Membre')} *</span>
        {member ? <div class="msg ok" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><span><b>{member.name}</b>{member.village && ` · ${member.village}`}</span><button type="button" class="btn sec small" onClick={() => setMember(null)}>{t('Changer')}</button></div>
          : <MemberPicker members={members} onPick={setMember} />}
      </label>
      {!member && <p><button type="button" class="btn sec small" onClick={() => setAdding(true)}><Icon name="plus" size={16} />{t('Nouveau membre')}</button></p>}
      <label class="f"><span>{t('Produit livré')} *</span>
        <select value={f.v.item_id} onChange={(e) => { const id = (e.target as HTMLSelectElement).value; f.set('item_id', id); const x = items.find((i) => String(i.id) === id); if (x?.ref_price) f.set('unit_price', String(x.ref_price)); }}>
          {items.length ? items.map((i) => <option value={i.id} key={i.id}>{i.name} ({i.unit})</option>) : <option value="">{t('Aucune matière première : créez-la dans Grenier')}</option>}
        </select></label>
      <div class="row">
        <Field label={t('Quantité') + (it ? ` (${it.unit})` : '')} name="qty" form={f} inputMode="decimal" placeholder="0" />
        <Field label={t('Prix unitaire (FCFA)')} name="unit_price" form={f} inputMode="numeric" />
      </div>
      <span class="f" style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{t('Qualité')}</span>
      <div class="seg" role="group" aria-label={t('Qualité')}>{['A', 'B', 'C'].map((g) => <button type="button" key={g} aria-pressed={f.v.quality === g} onClick={() => f.set('quality', g)}>{g}</button>)}</div>
      <Field label={t('Date')} name="date" type="date" form={f} max={today()} />
      <Field label={t('Remarque')} name="note" form={f} maxLength={200} />
      <p class="big num" aria-live="polite">{Number.isFinite(q * p) ? fcfa(q * p) : '—'}</p>
      <FormError error={f.error} />
      <button class="btn block" disabled={f.busy} onClick={save}>{t('Enregistrer la livraison')}</button>
    </div>
  );
}

function NewMember({ onSave, onCancel }: { onSave: (m: TMember, e: QMember) => Promise<void>; onCancel: () => void }) {
  const f = useForm({ name: '', village: '', phone: '', group_name: '' });
  return (
    <div class="card"><h2>{t('Nouveau membre')}</h2>
      <Field label={t('Nom et prénom')} name="name" form={f} required maxLength={120} />
      <Field label={t('Village')} name="village" form={f} maxLength={120} />
      <Field label={t('Téléphone')} name="phone" type="tel" form={f} maxLength={30} hint={t('Pour les reçus par SMS.')} />
      <Field label={t('Groupement')} name="group_name" form={f} maxLength={120} />
      <FormError error={f.error} />
      <div class="row"><button class="btn" onClick={() => f.submit(async () => {
        if (!f.v.name.trim()) return f.setError(t('Indiquez le nom.'));
        const ref = uid(), tmp = 'tmp-' + ref;
        const payload = { name: f.v.name.trim(), village: f.v.village || null, phone: f.v.phone || null, group_name: f.v.group_name || null };
        await onSave({ id: tmp, ...payload, joined_on: null, active: true, delivered_qty: 0, delivered_amount: 0, paid_amount: 0, balance: 0 } as TMember,
          { type: 'member', client_ref: ref, tmp_id: tmp, created_at: new Date().toISOString(), payload, label: { member: payload.name, village: payload.village } });
      })}>{t('Ajouter')}</button><button class="btn sec" onClick={onCancel}>{t('Annuler')}</button></div>
    </div>
  );
}

function Receipt({ e, company, pending, onNext }: { e: QDelivery; company: string; pending: boolean; onNext: () => void }) {
  const p = e.payload, l = e.label;
  return (
    <div class="card"><h2>{t('Livraison enregistrée')}</h2>
      <p class="small muted">{company} · {t('reçu provisoire')}</p>
      <p><b>{l.member}</b>{l.village && ` · ${l.village}`}</p>
      <table><tbody>
        <tr><th>{t('Date')}</th><td>{frDate(p.delivered_on)}</td></tr>
        <tr><th>{t('Produit')}</th><td>{l.item}</td></tr>
        <tr><th>{t('Quantité')}</th><td class="num">{num(p.qty)} {l.unit} · {t('qualité {g}', { g: p.quality })}</td></tr>
        <tr><th>{t('Prix')}</th><td class="num">{fcfa(p.unit_price)} / {l.unit}</td></tr>
        <tr><th>{t('Montant')}</th><td class="num"><b>{fcfa(l.amount)}</b></td></tr>
      </tbody></table>
      <p class="small muted">{pending ? t('Pas encore envoyée : elle partira dès que le réseau sera disponible.') : t('Envoyée au serveur. Le membre reçoit un SMS si les SMS sont activés.')}</p>
      <div class="row no-print"><button class="btn" onClick={onNext}>{t('Livraison suivante')}</button><button class="btn sec" onClick={() => window.print()}>{t('Imprimer')}</button></div>
    </div>
  );
}

function Members({ members, asof, online }: { members: TMember[]; asof: string | null; online: boolean }) {
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const n = norm(q.trim());
  const list = members.filter((m) => !n || norm(`${m.name} ${m.village ?? ''}`).includes(n)).slice(0, 200);
  return (
    <div class="card"><h2>{t('Membres')}</h2>
      <input type="search" placeholder={t('Rechercher un membre…')} value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} aria-label={t('Rechercher un membre')} />
      {asof && <p class="small muted">{t('Soldes au {d} (hors saisies en attente).', { d: new Date(asof).toLocaleString('fr-FR') })}</p>}
      <ul class="pick">{list.map((m) => <li key={m.id}><button onClick={async () => {
        if (String(m.id).startsWith('tmp-') || !online) { setDetail({ name: m.name, offline: true }); return; }
        try { setDetail(await api.get(`/members/${m.id}`)); } catch (e) { toast.err((e as Error).message); }
      }}><span><b>{m.name}</b><span class="sub">{m.village}</span></span><span class="num">{m.balance < 0 ? t('doit {m}', { m: fcfa(-m.balance) }) : fcfa(m.balance)}</span></button></li>)}</ul>
      {detail && (detail.offline ? <div class="msg warn">{t('{n} : le détail s’affiche avec une connexion.', { n: detail.name })}</div> : <>
        <h3>{detail.member.name}</h3>
        <p>{t('Livré')} : <b>{fcfa(detail.totals.amount)}</b> · {t('Payé')} : <b>{fcfa(detail.totals.paid)}</b> · {t('Solde')} : <b>{fcfa(detail.totals.balance)}</b></p>
        <table><tbody>{detail.deliveries.slice(0, 15).map((d: any) => <tr key={d.id}><td>{frDate(d.delivered_on)}</td><td>{d.item.name}</td><td class="right num">{num(d.qty)} {d.item.unit}</td><td class="right num">{fcfa(d.amount)}</td></tr>)}</tbody></table>
      </>)}
    </div>
  );
}

function Pending({ queue, online, onSync, onChange }: { queue: Q[]; online: boolean; onSync: () => Promise<void>; onChange: (q: Q[]) => Promise<void> }) {
  return (
    <div class="card"><h2>{t("En attente d'envoi")}</h2>
      {!online && <div class="msg warn">{t('Hors ligne : les saisies partiront au retour du réseau.')}</div>}
      <p><button class="btn" disabled={!online} onClick={onSync}>{t('Envoyer maintenant')}</button></p>
      {!queue.length ? <p class="muted">{t('Tout est envoyé.')}</p> : <ul class="alerts">{queue.map((e, i) => (
        <li key={e.client_ref} style={{ flexDirection: 'column' }}>
          <div><b>{e.type === 'member' ? t('Nouveau membre') : t('Livraison')}</b> · {e.label.member}{e.type === 'delivery' && ` · ${num(e.payload.qty)} ${e.label.unit} ${e.label.item} · ${fcfa(e.label.amount)}`}</div>
          <div class="small muted">{t('Saisie le {d}', { d: new Date(e.created_at).toLocaleString('fr-FR') })}</div>
          {e.error && <><div class="msg err">{t('Refusée par le serveur')} : {e.error}</div>
            <div class="row"><button class="btn sec small" onClick={async () => { const q = [...queue]; delete q[i].error; await onChange(q); onSync(); }}>{t('Réessayer')}</button>
              <button class="btn danger small" onClick={async () => { if (confirm(t('Supprimer définitivement cette saisie du téléphone ?'))) await onChange(queue.filter((_, j) => j !== i)); }}>{t('Supprimer cette saisie')}</button></div></>}
        </li>))}</ul>}
    </div>
  );
}

function Pay({ members, online, me, onDone }: { members: TMember[]; online: boolean; me: Profile; onDone: () => void }) {
  const f = useForm({ member_id: '', amount: '', method: 'Espèces', reference: '', advance: false });
  const [ref, setRef] = useState(uid());
  const [ok, setOk] = useState<string | null>(null);
  const m = members.find((x) => String(x.id) === f.v.member_id);
  const owner = ['owner', 'manager'].includes(me.user.role);
  return (
    <div class="card"><h2>{t('Payer un membre')}</h2>
      <div class="msg warn">{t('Un paiement exige une connexion (pour ne jamais payer deux fois). Le montant ne peut pas dépasser ce qui est dû au membre.')}</div>
      <label class="f"><span>{t('Membre')}</span>
        <select value={f.v.member_id} onChange={(e) => { const id = (e.target as HTMLSelectElement).value; f.set('member_id', id); const x = members.find((y) => String(y.id) === id); if (x && x.balance > 0) f.set('amount', String(x.balance)); }}>
          <option value="">{t('Choisir…')}</option>
          {members.filter((x) => !String(x.id).startsWith('tmp-')).sort((a, b) => b.balance - a.balance).map((x) => <option value={x.id} key={x.id}>{x.name} — {t('dû {m}', { m: fcfa(Math.max(x.balance, 0)) })}</option>)}
        </select></label>
      {m && <p class="muted">{t('Dû à {n} : {m}', { n: m.name, m: fcfa(m.balance) })}</p>}
      <Field label={t('Montant (FCFA)')} name="amount" form={f} inputMode="numeric" />
      <Field label={t('Moyen de paiement')} name="method" form={f}>{['Espèces', 'Orange Money', 'Moov Money', 'Coris Money', 'Virement'].map((x) => <option value={x} key={x}>{t(x)}</option>)}</Field>
      {f.v.method !== 'Espèces' && <Field label={t('Référence de la transaction')} name="reference" form={f} maxLength={80} hint={t('Numéro du SMS de confirmation.')} />}
      {owner && <label class="check"><input type="checkbox" checked={f.v.advance} onChange={(e) => f.set('advance', (e.target as HTMLInputElement).checked)} />{t('Avance (remboursée sur les prochaines livraisons)')}</label>}
      <FormError error={f.error} />
      {ok && <div class="msg ok">{ok}</div>}
      <button class="btn block" disabled={f.busy || !online} onClick={() => f.submit(async () => {
        setOk(null);
        if (!f.v.member_id) return f.setError(t('Choisissez le membre.'));
        const amount = Math.round(parseNum(f.v.amount));
        if (!(amount > 0)) return f.setError(t('Indiquez le montant.'));
        if (f.v.method !== 'Espèces' && !f.v.reference.trim()) return f.setError(t('Indiquez la référence de la transaction mobile money (elle figure dans le SMS de confirmation).'));
        try {
          const p = await api.post<any>('/payouts', { member_id: Number(f.v.member_id), amount, method: f.v.method, reference: f.v.reference || undefined, paid_on: today(), advance: f.v.advance || undefined, client_ref: ref });
          setOk(t('Paiement enregistré : reçu {n}, {m} à {p}.', { n: p.number, m: fcfa(p.amount), p: p.member.name }));
          f.setV({ member_id: '', amount: '', method: 'Espèces', reference: '', advance: false }); setRef(uid()); onDone();
        } catch (e) {
          if (e instanceof ApiError && e.status === 0) throw new Error(t('Connexion perdue : vérifiez la liste des paiements avant de recommencer.'));
          throw e;
        }
      })}>{online ? t('Enregistrer le paiement') : t('Hors ligne')}</button>
    </div>
  );
}
