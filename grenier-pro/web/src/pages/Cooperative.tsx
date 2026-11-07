import { useEffect, useState } from 'preact/hooks';
import { api, can, session, useApi } from '../lib/api';
import { fcfa, frDate, monthLabel, num, parseNum, qty, short, today, uid } from '../lib/format';
import { fcfaEnLettres } from '../lib/lettres';
import { t } from '../lib/i18n';
import { navigate } from '../lib/router';
import { PAY_METHODS, type Delivery, type Item, type Member, type Payout } from '../lib/types';
import { Badge, Bars, Chips, Empty, Field, FormError, Icon, Loading, Modal, PageHead, ReasonDialog, Tabs, toast, useForm } from '../ui/kit';

type Stats = { members_count: number; active_members: number; delivered_qty: number; delivered_amount: number; paid_amount: number; outstanding: number; advances: number; by_village: { village: string; qty: number }[]; monthly: { month: string; qty: number }[]; top_balances: { member_id: number; name: string; village: string | null; balance: number }[] };
type Tab = 'dash' | 'membres' | 'livraisons' | 'paiements' | 'avances';
type Dlg = null | { type: 'membre'; m?: Member } | { type: 'livraison' } | { type: 'paiement'; memberId?: number; advance?: boolean };

export function Cooperative() {
  const [tab, setTab] = useState<Tab>('dash');
  const [dlg, setDlg] = useState<Dlg>(null);
  const [n, setN] = useState(0);
  const role = session.profile!.user.role;
  const done = () => { setDlg(null); setN((x) => x + 1); };
  const tabs: [Tab, string][] = [['dash', t('Tableau de bord')], ['membres', t('Membres')], ['livraisons', t('Livraisons')], ['paiements', t('Paiements')]];
  if (can.correct(role)) tabs.push(['avances', t('Avances')]);
  return (
    <>
      <PageHead title={t('Coopérative')} sub={t('Membres, livraisons et paiements. Chaque livraison alimente le stock et la traçabilité.')}>
        {can.coop(role) && <button class="btn sec" onClick={() => setDlg({ type: 'membre' })}>{t('Nouveau membre')}</button>}
        {can.payout(role) && <button class="btn sec" onClick={() => setDlg({ type: 'paiement' })}>{t('Payer un membre')}</button>}
        {can.coop(role) && <button class="btn" onClick={() => setDlg({ type: 'livraison' })}>{t('Nouvelle livraison')}</button>}
      </PageHead>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'dash' && <Dashboard key={n} onPay={(id) => setDlg({ type: 'paiement', memberId: id })} />}
      {tab === 'membres' && <Membres key={n} onEdit={(m) => setDlg({ type: 'membre', m })} />}
      {tab === 'livraisons' && <Livraisons key={n} />}
      {tab === 'paiements' && <Paiements key={n} />}
      {tab === 'avances' && <Avances key={n} onAdvance={() => setDlg({ type: 'paiement', advance: true })} />}
      {dlg?.type === 'membre' && <MembreDialog m={dlg.m} onClose={() => setDlg(null)} onDone={done} />}
      {dlg?.type === 'livraison' && <LivraisonDialog onClose={() => setDlg(null)} onDone={done} />}
      {dlg?.type === 'paiement' && <PaiementDialog memberId={dlg.memberId} advance={dlg.advance} onClose={() => setDlg(null)} onDone={(p) => { setDlg(null); navigate(`/cooperative/recus/${p.id}`); }} />}
    </>
  );
}

function Dashboard({ onPay }: { onPay: (id: number) => void }) {
  const [days, setDays] = useState('');
  const { data: s, error } = useApi<Stats>('/coop/dashboard', { days });
  const role = session.profile!.user.role;
  if (!s) return <Loading error={error} />;
  const maxV = Math.max(1, ...s.by_village.map((v) => v.qty));
  return (
    <>
      <Chips items={[['', t('Depuis le début')], ['30', t('30 derniers jours')], ['90', t('90 derniers jours')], ['365', t('12 derniers mois')]]} value={days} onChange={setDays} />
      <div class="kpis">
        <div class="kpi"><b>{s.members_count}</b><span>{t('Membres · {n} ont livré sur la période', { n: s.active_members })}</span></div>
        <div class="kpi"><b>{qty(s.delivered_qty)}</b><span>{t('Livrés (toutes unités)')}</span></div>
        <div class="kpi"><b>{fcfa(s.paid_amount)}</b><span>{t('Payé aux membres · valeur livrée {v}', { v: fcfa(s.delivered_amount) })}</span></div>
        <div class="kpi"><b>{fcfa(s.outstanding)}</b><span>{t('Reste à payer (tous membres)')}{s.advances ? ` · ${t('avances : {m}', { m: fcfa(s.advances) })}` : ''}</span></div>
      </div>
      <div class="grid2">
        <div class="card"><h2>{t('Livraisons par mois')}</h2><Bars data={s.monthly.map((m) => ({ label: monthLabel(m.month), value: m.qty, text: short(m.qty) }))} /></div>
        <div class="card"><h2>{t('Livraisons par village')}</h2>
          {s.by_village.length ? s.by_village.map((v) => <div class="hbar" key={v.village}><span>{v.village}</span><i style={{ width: `${Math.max(3, (v.qty / maxV) * 100)}%` }} /><span class="num right">{num(v.qty)}</span></div>) : <p class="muted">{t('Aucune livraison sur la période.')}</p>}
        </div>
      </div>
      <div class="card"><h2>{t('Soldes à payer')}</h2>
        {!s.top_balances.length ? <p class="muted">{t('Tous les membres sont payés.')}</p> : (
          <div class="tablewrap"><table><thead><tr><th>{t('Membre')}</th><th>{t('Village')}</th><th class="right">{t('Reste à payer')}</th><th /></tr></thead>
            <tbody>{s.top_balances.map((m) => <tr key={m.member_id}><td><a href={`/cooperative/membres/${m.member_id}`}>{m.name}</a></td><td>{m.village ?? '—'}</td><td class="right num">{fcfa(m.balance)}</td>
              <td class="actions-cell">{can.payout(role) && <button class="btn ghost" onClick={() => onPay(m.member_id)}>{t('Payer')}</button>}</td></tr>)}</tbody></table></div>
        )}
      </div>
    </>
  );
}

function Membres({ onEdit }: { onEdit: (m: Member) => void }) {
  const [q, setQ] = useState('');
  const { data, error } = useApi<Member[]>('/members', { q });
  const role = session.profile!.user.role;
  return (
    <div class="card">
      <div class="toolbar"><input type="search" placeholder={t('Nom ou village…')} value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} aria-label={t('Rechercher un membre')} /></div>
      {!data ? <Loading error={error} /> : !data.length ? <Empty title={t('Aucun membre')}>{t('Ajoutez les membres de la coopérative pour enregistrer leurs livraisons.')}</Empty> : (
        <div class="tablewrap"><table>
          <thead><tr><th>{t('Membre')}</th><th>{t('Village')}</th><th>{t('Groupement')}</th><th class="right">{t('Livré')}</th><th class="right">{t('Valeur')}</th><th class="right">{t('Solde')}</th><th /></tr></thead>
          <tbody>{data.map((m) => (
            <tr key={m.id} class={m.active ? '' : 'dim'}>
              <td><b>{m.name}</b>{m.phone && <span class="sub">{m.phone}</span>}{!m.active && <Badge>{t('Inactif')}</Badge>}</td><td>{m.village ?? '—'}</td><td>{m.group_name ?? '—'}</td>
              <td class="right num">{num(m.delivered_qty)}</td><td class="right num">{fcfa(m.delivered_amount)}</td>
              <td class="right num">{m.balance < 0 ? <Badge kind="warn">{t('doit {m}', { m: fcfa(-m.balance) })}</Badge> : fcfa(m.balance)}</td>
              <td class="actions-cell"><a class="btn ghost" href={`/cooperative/membres/${m.id}`}>{t('Fiche')}</a>{can.coop(role) && <button class="btn ghost" onClick={() => onEdit(m)}>{t('Modifier')}</button>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}

function Livraisons() {
  const [all, setAll] = useState(false);
  const { data, error, reload } = useApi<Delivery[]>('/deliveries', { all: all ? '1' : '' });
  const [cancel, setCancel] = useState<Delivery | null>(null);
  const role = session.profile!.user.role;
  return (
    <div class="card">
      {can.correct(role) && <label class="check"><input type="checkbox" checked={all} onChange={(e) => setAll((e.target as HTMLInputElement).checked)} />{t('Afficher les livraisons annulées')}</label>}
      {!data ? <Loading error={error} /> : !data.length ? <Empty title={t('Aucune livraison')} /> : (
        <div class="tablewrap"><table>
          <thead><tr><th>{t('Date')}</th><th>{t('Membre')}</th><th>{t('Produit')}</th><th class="right">{t('Quantité')}</th><th class="right">{t('Prix')}</th><th class="right">{t('Montant')}</th><th>{t('Qualité')}</th><th>{t('Lot')}</th><th /></tr></thead>
          <tbody>{data.map((d) => (
            <tr key={d.id} class={d.status === 'cancelled' ? 'dim struck' : ''}>
              <td class="s">{frDate(d.delivered_on)}</td><td class="s">{d.member.name}</td><td class="s">{d.item.name}</td><td class="right num s">{qty(d.qty, d.item.unit)}</td>
              <td class="right num s">{num(d.unit_price)}</td><td class="right num s">{fcfa(d.amount)}</td><td>{t('Grade {g}', { g: d.quality })}</td><td class="mono">{d.lot.code}</td>
              <td class="actions-cell">{d.status === 'cancelled' ? <><Badge kind="bad">{t('Annulée')}</Badge><span class="sub">{d.cancel_reason}</span></> : can.correct(role) ? <button class="btn ghost" onClick={() => setCancel(d)}>{t('Annuler')}</button> : null}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {cancel && <ReasonDialog title={t('Annuler la livraison')} text={`${cancel.member.name} · ${qty(cancel.qty, cancel.item.unit)} ${cancel.item.name} · ${frDate(cancel.delivered_on)}. ${t('Possible tant que le lot n’a pas été utilisé. Le membre est prévenu par SMS si les SMS sont activés.')}`}
        onClose={() => setCancel(null)} onConfirm={async (reason) => { await api.post(`/deliveries/${cancel.id}/cancel`, { reason }); toast.ok(t('Livraison annulée.')); reload(); }} />}
    </div>
  );
}

function Paiements() {
  const [all, setAll] = useState(false);
  const { data, error, reload } = useApi<Payout[]>('/payouts', { all: all ? '1' : '' });
  const [cancel, setCancel] = useState<Payout | null>(null);
  const role = session.profile!.user.role;
  return (
    <div class="card">
      {can.correct(role) && <label class="check"><input type="checkbox" checked={all} onChange={(e) => setAll((e.target as HTMLInputElement).checked)} />{t('Afficher les paiements annulés')}</label>}
      {!data ? <Loading error={error} /> : !data.length ? <Empty title={t('Aucun paiement')}>{t('Les paiements aux membres sont suivis ici, avec un reçu à imprimer.')}</Empty> : (
        <div class="tablewrap"><table>
          <thead><tr><th>{t('Date')}</th><th>{t('N°')}</th><th>{t('Membre')}</th><th>{t('Mode')}</th><th class="right">{t('Montant')}</th><th /></tr></thead>
          <tbody>{data.map((p) => (
            <tr key={p.id} class={p.status === 'cancelled' ? 'dim struck' : ''}>
              <td class="s">{frDate(p.paid_on)}</td><td class="mono">{p.number}{p.kind === 'avance' && <> <Badge kind="warn">{t('avance')}</Badge></>}</td><td class="s">{p.member.name}</td>
              <td>{t(p.method)}{p.reference && <span class="sub">{p.reference}</span>}</td><td class="right num s">{fcfa(p.amount)}</td>
              <td class="actions-cell">{p.status === 'cancelled' ? <><Badge kind="bad">{t('Annulé')}</Badge><span class="sub">{p.cancel_reason}</span></> : <>
                <a class="btn ghost" href={`/cooperative/recus/${p.id}`}>{t('Reçu')}</a>
                {can.correct(role) && <button class="btn ghost" onClick={() => setCancel(p)}>{t('Annuler')}</button>}</>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {cancel && <ReasonDialog title={t('Annuler le paiement')} text={`${t('Reçu')} ${cancel.number} · ${fcfa(cancel.amount)} · ${cancel.member.name}`}
        onClose={() => setCancel(null)} onConfirm={async (reason) => { await api.post(`/payouts/${cancel.id}/cancel`, { reason }); toast.ok(t('Paiement annulé.')); reload(); }} />}
    </div>
  );
}

function Avances({ onAdvance }: { onAdvance: () => void }) {
  const { data, error } = useApi<Member[]>('/members');
  if (!data) return <Loading error={error} />;
  const owing = data.filter((m) => m.balance < 0).sort((a, b) => a.balance - b.balance);
  return (
    <div class="card">
      <div class="pagehead"><div><h2>{t('Avances aux membres')}</h2><p class="muted">{t('Une avance (intrants, urgence…) peut dépasser ce qui est dû au membre. Elle se rembourse sur ses prochaines livraisons.')}</p></div>
        <button class="btn" onClick={onAdvance}>{t('Accorder une avance')}</button></div>
      {!owing.length ? <Empty title={t("Aucun membre ne doit d'argent à la coopérative.")} /> : (
        <table><thead><tr><th>{t('Membre')}</th><th>{t('Village')}</th><th class="right">{t('Doit')}</th></tr></thead>
          <tbody>{owing.map((m) => <tr key={m.id}><td><a href={`/cooperative/membres/${m.id}`}>{m.name}</a></td><td>{m.village ?? '—'}</td><td class="right num">{fcfa(-m.balance)}</td></tr>)}</tbody></table>
      )}
    </div>
  );
}

function MembreDialog({ m, onClose, onDone }: { m?: Member; onClose: () => void; onDone: () => void }) {
  const f = useForm({ name: m?.name ?? '', village: m?.village ?? '', phone: m?.phone ?? '', group_name: m?.group_name ?? '', joined_on: m?.joined_on ?? '', active: m?.active ?? true });
  const save = () => f.submit(async () => { const body = { ...f.v, joined_on: f.v.joined_on || null }; if (m) await api.put(`/members/${m.id}`, body); else await api.post('/members', body); toast.ok(t('Membre enregistré.')); onDone(); });
  return (
    <Modal title={m ? t('Modifier le membre') : t('Nouveau membre')} onClose={onClose} footer={<><button class="btn sec" onClick={onClose}>{t('Annuler')}</button><button class="btn" disabled={f.busy} onClick={save}>{t('Enregistrer')}</button></>}>
      <Field label={t('Nom et prénom')} name="name" form={f} required maxLength={120} />
      <div class="row"><Field label={t('Village ou localité')} name="village" form={f} maxLength={120} /><Field label={t('Téléphone')} name="phone" type="tel" form={f} maxLength={30} hint={t('Pour les reçus par SMS et le solde par USSD.')} /></div>
      <div class="row"><Field label={t('Groupement ou section')} name="group_name" form={f} maxLength={120} /><Field label={t("Date d'adhésion")} name="joined_on" type="date" form={f} max={today()} /></div>
      {m && <label class="check"><input type="checkbox" checked={f.v.active} onChange={(e) => f.set('active', (e.target as HTMLInputElement).checked)} />{t('Membre actif')}</label>}
      <FormError error={f.error} />
    </Modal>
  );
}

function LivraisonDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { data: members } = useApi<Member[]>('/members');
  const { data: items } = useApi<Item[]>('/items', { kind: 'mp' });
  const f = useForm({ delivered_on: today(), member_id: '', item_id: '', qty: '', unit_price: '', quality: 'A', note: '' });
  const [ref] = useState(uid());
  const it = items?.find((i) => String(i.id) === f.v.item_id);
  const amount = parseNum(f.v.qty) * parseNum(f.v.unit_price);
  const save = () => f.submit(async () => {
    const d = await api.post<Delivery>('/deliveries', { ...f.v, qty: parseNum(f.v.qty), unit_price: Math.round(parseNum(f.v.unit_price)), client_ref: ref });
    toast.ok(t('Livraison enregistrée : lot {code}.', { code: d.lot.code })); onDone();
  });
  return (
    <Modal title={t('Nouvelle livraison')} onClose={onClose} footer={<><button class="btn sec" onClick={onClose}>{t('Annuler')}</button><button class="btn" disabled={f.busy} onClick={save}>{t('Enregistrer')}</button></>}>
      <div class="row">
        <Field label={t('Date')} name="delivered_on" type="date" form={f} required max={today()} />
        <Field label={t('Membre')} name="member_id" form={f} required><option value="">{t('Choisir…')}</option>{(members ?? []).filter((m) => m.active).map((m) => <option value={m.id} key={m.id}>{m.name}{m.village ? ` — ${m.village}` : ''}</option>)}</Field>
      </div>
      <label class="f"><span>{t('Produit')} *</span>
        <select value={f.v.item_id} onChange={(e) => { const id = (e.target as HTMLSelectElement).value; f.set('item_id', id); const x = items?.find((i) => String(i.id) === id); if (x?.ref_price) f.set('unit_price', String(x.ref_price)); }}>
          <option value="">{t('Choisir…')}</option>{(items ?? []).map((i) => <option value={i.id} key={i.id}>{i.name}</option>)}</select></label>
      <div class="row">
        <Field label={t('Quantité') + (it ? ` (${it.unit})` : '')} name="qty" form={f} required inputMode="decimal" />
        <Field label={t("Prix d'achat par unité (FCFA)")} name="unit_price" form={f} required inputMode="numeric" />
      </div>
      <Field label={t('Qualité')} name="quality" form={f}><option value="A">{t('Grade A — conforme')}</option><option value="B">{t('Grade B — acceptable')}</option><option value="C">{t('Grade C — déclassé')}</option></Field>
      <Field label={t('Remarque')} name="note" form={f} maxLength={200} />
      <p class="total">{t('Montant')} : {Number.isFinite(amount) ? fcfa(amount) : '—'}</p>
      <FormError error={f.error} />
    </Modal>
  );
}

export function PaiementDialog({ memberId, advance, onClose, onDone }: { memberId?: number; advance?: boolean; onClose: () => void; onDone: (p: Payout) => void }) {
  const { data: members } = useApi<Member[]>('/members');
  const role = session.profile!.user.role;
  const f = useForm({ paid_on: today(), member_id: memberId ? String(memberId) : '', amount: '', method: 'Espèces', reference: '', note: '', advance: !!advance });
  const [ref] = useState(uid());
  const m = members?.find((x) => String(x.id) === f.v.member_id);
  // propose le solde dû quand le membre est choisi (une seule fois par membre)
  useEffect(() => { if (m && m.balance > 0 && !f.v.advance) f.set('amount', String(m.balance)); }, [m?.id]);
  const save = () => f.submit(async () => {
    if (f.v.method !== 'Espèces' && f.v.method !== 'Chèque' && !f.v.reference.trim()) { f.setError(t('Indiquez la référence de la transaction (numéro du SMS de confirmation).')); return; }
    const p = await api.post<Payout>('/payouts', { ...f.v, amount: Math.round(parseNum(f.v.amount)), reference: f.v.reference || null, note: f.v.note || null, advance: f.v.advance || undefined, client_ref: ref });
    toast.ok(t('Paiement enregistré : reçu {n}.', { n: p.number })); onDone(p);
  });
  return (
    <Modal title={f.v.advance ? t('Accorder une avance') : t('Payer un membre')} onClose={onClose} footer={<><button class="btn sec" onClick={onClose}>{t('Annuler')}</button><button class="btn" disabled={f.busy} onClick={save}>{t('Enregistrer le paiement')}</button></>}>
      <div class="row">
        <Field label={t('Date')} name="paid_on" type="date" form={f} required max={today()} />
        <Field label={t('Membre')} name="member_id" form={f} required><option value="">{t('Choisir…')}</option>
          {(members ?? []).filter((x) => x.active).map((x) => <option value={x.id} key={x.id}>{x.name} — {x.balance < 0 ? t('doit {m}', { m: fcfa(-x.balance) }) : t('reste {m}', { m: fcfa(x.balance) })}</option>)}</Field>
      </div>
      {m && <p class="muted">{m.balance >= 0 ? t('Dû à {n} : {m}', { n: m.name, m: fcfa(m.balance) }) : t('{n} doit déjà {m} à la coopérative.', { n: m.name, m: fcfa(-m.balance) })}</p>}
      <div class="row">
        <Field label={t('Montant (FCFA)')} name="amount" form={f} required inputMode="numeric" />
        <Field label={t('Mode de paiement')} name="method" form={f}>{[...PAY_METHODS, 'En nature (intrants)'].map((x) => <option value={x} key={x}>{t(x)}</option>)}</Field>
      </div>
      {f.v.method !== 'Espèces' && <Field label={t('Référence de la transaction')} name="reference" form={f} maxLength={80} hint={t('Numéro figurant dans le SMS de confirmation, ou n° du bon d’intrants.')} />}
      <Field label={t('Remarque')} name="note" form={f} maxLength={200} />
      {can.correct(role) && <label class="check"><input type="checkbox" checked={f.v.advance} onChange={(e) => f.set('advance', (e.target as HTMLInputElement).checked)} />{t('Avance : peut dépasser ce qui est dû (remboursée sur les prochaines livraisons)')}</label>}
      <FormError error={f.error} />
    </Modal>
  );
}

type Detail = { member: Member; deliveries: (Delivery & { item: { name: string; unit: string }; lot: { code: string } })[]; payouts: Payout[]; totals: { qty: number; amount: number; paid: number; balance: number } };
export function MembrePage({ id }: { id: number }) {
  const { data, error, reload } = useApi<Detail>(`/members/${id}`);
  const [pay, setPay] = useState(false);
  const role = session.profile!.user.role;
  if (!data) return <Loading error={error} />;
  const { member: m, totals } = data;
  const ops: { date: string; id: string; label: string; amount: number; href?: string }[] = [
    ...data.deliveries.map((d) => ({ date: d.delivered_on, id: 'd' + d.id, label: t('Livraison de {q} {i} (lot {l})', { q: qty(d.qty, d.item.unit), i: d.item.name, l: d.lot.code }), amount: d.amount })),
    ...data.payouts.map((p) => ({ date: p.paid_on, id: 'p' + p.id, label: `${p.kind === 'avance' ? t('Avance') : t('Paiement')} ${p.number} · ${t(p.method)}`, amount: -p.amount, href: `/cooperative/recus/${p.id}` })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <>
      <PageHead title={m.name} sub={[m.village, m.group_name, m.phone].filter(Boolean).join(' · ')}>
        <a class="btn ghost" href="/cooperative">← {t('Coopérative')}</a>
        <button class="btn sec" onClick={() => window.print()}><Icon name="print" />{t('Imprimer le relevé')}</button>
        {can.payout(role) && <button class="btn" onClick={() => setPay(true)}>{t('Payer')}</button>}
      </PageHead>
      <div class="kpis">
        <div class="kpi"><b>{qty(totals.qty)}</b><span>{t('Livrés')}</span></div>
        <div class="kpi"><b>{fcfa(totals.amount)}</b><span>{t('Valeur livrée')}</span></div>
        <div class="kpi"><b>{fcfa(totals.paid)}</b><span>{t('Payé')}</span></div>
        <div class="kpi"><b>{fcfa(Math.abs(totals.balance))}</b><span>{totals.balance >= 0 ? t('Reste à payer') : t('Doit à la coopérative (avance)')}</span></div>
      </div>
      <div class="card"><h2>{t('Relevé')}</h2>
        {!ops.length ? <p class="muted">{t('Aucune opération.')}</p> : (
          <table><thead><tr><th>{t('Date')}</th><th>{t('Opération')}</th><th class="right">{t('Montant')}</th></tr></thead>
            <tbody>{ops.map((o) => <tr key={o.id}><td>{frDate(o.date)}</td><td>{o.href ? <a href={o.href}>{o.label}</a> : o.label}</td><td class="right num" style={{ color: o.amount < 0 ? 'var(--red)' : undefined }}>{o.amount < 0 ? '−' : ''}{fcfa(Math.abs(o.amount))}</td></tr>)}</tbody></table>
        )}
      </div>
      {pay && <PaiementDialog memberId={m.id} onClose={() => setPay(false)} onDone={(p) => { setPay(false); reload(); navigate(`/cooperative/recus/${p.id}`); }} />}
    </>
  );
}

export function RecuPage({ id }: { id: number }) {
  const { data: p, error } = useApi<Payout>(`/payouts/${id}`);
  const c = session.profile!.company;
  if (!p) return <Loading error={error} />;
  return (
    <>
      <PageHead title={t('Reçu {n}', { n: p.number })}>
        <a class="btn ghost" href={`/cooperative/membres/${p.member.id}`}>← {p.member.name}</a>
        <button class="btn" onClick={() => window.print()}><Icon name="print" />{t('Imprimer')}</button>
      </PageHead>
      <div class="doc" style={{ maxWidth: 620 }}>
        <div class="head"><div><h2>{c.name}</h2><div>{c.address}</div><div>{c.phone}</div></div>
          <div class="right"><h2>{p.status === 'cancelled' ? t('Reçu ANNULÉ') : p.kind === 'avance' ? t("Reçu d'avance") : t('Reçu de paiement')}</h2><div class="mono">{p.number}</div><div>{t('Date')} : {frDate(p.paid_on)}</div></div></div>
        <p><b>{t('Payé à')}</b><br />{p.member.name}{p.member.village && <><br />{p.member.village}</>}</p>
        <table><tbody>
          <tr><th>{t('Montant versé')}</th><td class="num"><b>{fcfa(p.amount)}</b></td></tr>
          <tr><th>{t('Mode de paiement')}</th><td>{t(p.method)}{p.reference && ` · ${t('réf.')} ${p.reference}`}</td></tr>
          {p.note && <tr><th>{t('Remarque')}</th><td>{p.note}</td></tr>}
        </tbody></table>
        <p class="words">{p.kind === 'avance'
          ? t('Reçu la somme de {s} à titre d’avance, remboursable sur les prochaines livraisons.', { s: fcfaEnLettres(p.amount) })
          : t('Reçu la somme de {s}, en règlement des livraisons de produits.', { s: fcfaEnLettres(p.amount) })}</p>
        <div class="row" style={{ marginTop: 40 }}><div>{t('Signature du producteur')} : ______________________</div><div>{t('Pour la coopérative')} : ______________________</div></div>
      </div>
    </>
  );
}
