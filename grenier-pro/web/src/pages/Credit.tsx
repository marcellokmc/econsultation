// Crédit : warrantage (récépissés d'entrepôt) et dossier de crédit.
import { useEffect, useState } from 'preact/hooks';
import { api, can, session, useApi } from '../lib/api';
import { addDays, fcfa, frDate, frDateTime, monthLabel, num, parseNum, qty, today } from '../lib/format';
import { fcfaEnLettres } from '../lib/lettres';
import { t } from '../lib/i18n';
import { navigate } from '../lib/router';
import type { Lot, Member } from '../lib/types';
import { Badge, Empty, Field, FormError, Icon, Loading, Modal, PageHead, Tabs, toast, useForm } from '../ui/kit';

type Receipt = { id: number; number: string; status: 'gage' | 'libere' | 'realise' | 'annule'; status_label: string; lender: string; issued_on: string; loan_due: string; valuation_price: number; value: number; loan_amount: number; loan_rate: number;
  interest_to_date: number; total_due_at_term: number; days_left: number; warehouse: string | null; note: string | null; closed_on: string | null; close_note: string | null; member: Member | null;
  lots: { id: number; code: string; item: string; unit: string; qty: number; qty_remaining: number; received_on: string }[] };
const KIND: Record<string, '' | 'ok' | 'warn' | 'bad' | 'info'> = { gage: 'info', libere: 'ok', realise: 'bad', annule: '' };

export function Credit() {
  const [tab, setTab] = useState<'recepisses' | 'dossier'>('recepisses');
  const [open, setOpen] = useState(false);
  const role = session.profile!.user.role;
  const { data, error, reload } = useApi<Receipt[]>('/credit/receipts');
  return (
    <>
      <PageHead title={t('Crédit')} sub={t('Warrantage : votre stock garantit un prêt sans être vendu au plus bas prix de la récolte. Dossier de crédit : vos chiffres vérifiables pour la banque ou la microfinance.')}>
        {can.correct(role) && tab === 'recepisses' && <button class="btn" onClick={() => setOpen(true)}>{t("Nouveau récépissé d'entrepôt")}</button>}
      </PageHead>
      <Tabs tabs={[['recepisses', t("Récépissés d'entrepôt")], ['dossier', t('Dossier de crédit')]]} value={tab} onChange={setTab} />
      {tab === 'recepisses' && (!data ? <Loading error={error} /> : (
        <div class="card">{!data.length ? <Empty title={t('Aucun récépissé')}>{t('Mettez des lots en garantie pour obtenir un prêt de campagne (warrantage). Les lots gagés restent au magasin mais ne peuvent plus être vendus ni transformés jusqu’au remboursement.')}</Empty> : (
          <div class="tablewrap"><table><thead><tr><th>{t('N°')}</th><th>{t('Prêteur')}</th><th>{t('Lots')}</th><th class="right">{t('Valeur')}</th><th class="right">{t('Prêt')}</th><th>{t('Échéance')}</th><th>{t('État')}</th><th /></tr></thead>
            <tbody>{data.map((r) => <tr key={r.id}><td class="mono">{r.number}</td><td>{r.lender}{r.member && <span class="sub">{r.member.name}</span>}</td><td>{r.lots.map((l) => `${qty(l.qty, l.unit)} ${l.item}`).join(', ')}</td>
              <td class="right num">{fcfa(r.value)}</td><td class="right num">{fcfa(r.loan_amount)}</td>
              <td>{frDate(r.loan_due)}{r.status === 'gage' && r.days_left <= 15 && <> <Badge kind={r.days_left < 0 ? 'bad' : 'warn'}>{r.days_left < 0 ? t('dépassée') : t('dans {n} j', { n: r.days_left })}</Badge></>}</td>
              <td><Badge kind={KIND[r.status]}>{t(r.status_label)}</Badge></td><td class="actions-cell"><a class="btn ghost" href={`/credit/recepisses/${r.id}`}>{t('Ouvrir')}</a></td></tr>)}</tbody></table></div>
        )}</div>
      ))}
      {tab === 'dossier' && <Dossier />}
      {open && <ReceiptDialog onClose={() => setOpen(false)} onDone={(r) => { setOpen(false); reload(); navigate(`/credit/recepisses/${r.id}`); }} />}
    </>
  );
}

function ReceiptDialog({ onClose, onDone }: { onClose: () => void; onDone: (r: Receipt) => void }) {
  const { data: lots } = useApi<Lot[]>('/lots', { in_stock: '1' });
  const { data: members } = useApi<Member[]>('/members');
  const [sel, setSel] = useState<number[]>([]);
  const f = useForm({ lender: '', member_id: '', issued_on: today(), valuation_price: '', loan_amount: '', loan_rate: '12', loan_due: addDays(today(), 180), warehouse: '', note: '' });
  const usable = (lots ?? []).filter((l) => !l.pledge_id && l.quality_status !== 'bloque');
  const chosen = usable.filter((l) => sel.includes(l.id));
  const totalQty = chosen.reduce((s, l) => s + l.qty_remaining, 0);
  const value = totalQty * (parseNum(f.v.valuation_price) || 0);
  return (
    <Modal wide title={t("Nouveau récépissé d'entrepôt")} onClose={onClose} footer={<><button class="btn sec" onClick={onClose}>{t('Annuler')}</button>
      <button class="btn" disabled={f.busy} onClick={() => f.submit(async () => {
        const r = await api.post<Receipt>('/credit/receipts', { ...f.v, member_id: f.v.member_id ? Number(f.v.member_id) : null, valuation_price: parseNum(f.v.valuation_price), loan_amount: Math.round(parseNum(f.v.loan_amount)), loan_rate: parseNum(f.v.loan_rate || '0'), lot_ids: sel });
        toast.ok(t('Récépissé {n} émis : les lots sont gagés.', { n: r.number })); onDone(r);
      })}>{t('Émettre le récépissé')}</button></>}>
      <div class="row"><Field label={t('Prêteur (institution)')} name="lender" form={f} required maxLength={120} placeholder="Caisse populaire…" />
        <Field label={t('Bénéficiaire')} name="member_id" form={f}><option value="">{t("L'entreprise / la coopérative")}</option>{(members ?? []).filter((m) => m.active).map((m) => <option value={m.id} key={m.id}>{m.name}</option>)}</Field></div>
      <h3>{t('Lots mis en garantie')}</h3>
      <div class="lines" style={{ maxHeight: 220, overflowY: 'auto' }}>
        {!usable.length ? <p class="muted">{t('Aucun lot disponible.')}</p> : usable.map((l) => <label class="check" key={l.id} style={{ margin: '4px 0' }}><input type="checkbox" checked={sel.includes(l.id)} onChange={(e) => setSel((e.target as HTMLInputElement).checked ? [...sel, l.id] : sel.filter((x) => x !== l.id))} /><span class="mono">{l.code}</span> {l.item?.name} — {qty(l.qty_remaining, l.item?.unit)}</label>)}
      </div>
      <div class="row"><Field label={t("Prix d'évaluation (FCFA par unité)")} name="valuation_price" form={f} required inputMode="decimal" hint={t('Prix retenu par le prêteur, souvent inférieur au prix du marché.')} />
        <Field label={t('Montant du prêt (FCFA)')} name="loan_amount" form={f} required inputMode="numeric" hint={value ? t('Valeur du stock gagé : {v}', { v: fcfa(value) }) : undefined} /></div>
      <div class="row"><Field label={t('Date')} name="issued_on" type="date" form={f} required max={today()} /><Field label={t('Échéance du prêt')} name="loan_due" type="date" form={f} required /><Field label={t("Taux d'intérêt annuel (%)")} name="loan_rate" form={f} inputMode="decimal" /></div>
      <Field label={t('Magasin')} name="warehouse" form={f} maxLength={120} />
      <Field label={t('Remarque')} name="note" form={f} maxLength={300} />
      <FormError error={f.error} />
    </Modal>
  );
}

export function RecepissePage({ id }: { id: number }) {
  const { data: r, error, reload } = useApi<Receipt>(`/credit/receipts/${id}`);
  const [close, setClose] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const c = session.profile!.company;
  useEffect(() => { if (c.edition === 'saas') api.raw(`/credit/receipts/${id}/qr`).then(async (res) => setQr(URL.createObjectURL(await res.blob()))).catch(() => {}); }, [id]);
  if (!r) return <Loading error={error} />;
  const totalQty = r.lots.reduce((s, l) => s + l.qty, 0);
  return (
    <>
      <PageHead title={t('Récépissé {n}', { n: r.number })}>
        <a class="btn ghost" href="/credit">← {t('Crédit')}</a>
        <button class="btn sec" onClick={() => window.print()}><Icon name="print" />{t('Imprimer')}</button>
        {r.status === 'gage' && can.correct(session.profile!.user.role) && <button class="btn" onClick={() => setClose(true)}>{t('Clôturer')}</button>}
      </PageHead>
      <div class="doc">
        <div class="head"><div><h2>{c.name}</h2><div>{c.address}</div><div>{[c.phone, c.ifu && `IFU ${c.ifu}`, c.rccm && `RCCM ${c.rccm}`].filter(Boolean).join(' · ')}</div></div>
          <div class="right"><h2>{t("Récépissé d'entrepôt")}</h2><div class="mono">{r.number}</div><div>{t('Émis le {d}', { d: frDate(r.issued_on) })}</div><div><b>{t(r.status_label)}</b></div></div></div>
        <table><tbody>
          <tr><th>{t('Déposant')}</th><td>{r.member ? `${r.member.name}${r.member.village ? ', ' + r.member.village : ''}` : c.name}</td></tr>
          <tr><th>{t('Prêteur')}</th><td>{r.lender}</td></tr>
          {r.warehouse && <tr><th>{t('Magasin')}</th><td>{r.warehouse}</td></tr>}
        </tbody></table>
        <h3 style={{ marginTop: 16 }}>{t('Stock gagé')}</h3>
        <table><thead><tr><th>{t('Lot')}</th><th>{t('Produit')}</th><th>{t('Entré le')}</th><th class="right">{t('Quantité')}</th></tr></thead>
          <tbody>{r.lots.map((l) => <tr key={l.id}><td class="mono">{l.code}</td><td>{l.item}</td><td>{frDate(l.received_on)}</td><td class="right num">{qty(l.qty, l.unit)}</td></tr>)}</tbody></table>
        <div class="totals">
          <div><span>{t('Quantité totale')}</span><span class="num">{num(totalQty)} {r.lots[0]?.unit}</span></div>
          <div><span>{t("Prix d'évaluation")}</span><span class="num">{fcfa(r.valuation_price)}</span></div>
          <div><span>{t('Valeur du gage')}</span><span class="num">{fcfa(r.value)}</span></div>
          <div class="grand"><span>{t('Prêt accordé')}</span><span class="num">{fcfa(r.loan_amount)}</span></div>
          <div><span>{t('Taux annuel')}</span><span class="num">{num(r.loan_rate)} %</span></div>
          <div><span>{t('Échéance')}</span><span class="num">{frDate(r.loan_due)}</span></div>
          <div><b>{t('À rembourser à l’échéance')}</b><b class="num">{fcfa(r.total_due_at_term)}</b></div>
        </div>
        <p class="words">{t('Prêt de {s}, garanti par le stock ci-dessus, qui reste au magasin et ne peut être ni vendu ni transformé jusqu’à la mainlevée du prêteur.', { s: fcfaEnLettres(r.loan_amount) })}</p>
        {r.closed_on && <p><b>{t('Clôturé le {d}', { d: frDate(r.closed_on) })}</b> — {r.close_note}</p>}
        {qr && <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><img src={qr} alt={t('QR de vérification du récépissé')} width={110} height={110} /><span class="small">{t('Le prêteur vérifie l’authenticité et l’état de ce récépissé en scannant ce code.')}</span></div>}
        <div class="row" style={{ marginTop: 36 }}><div>{t('Le magasinier')}<br /><br />______________</div><div>{t('Le déposant')}<br /><br />______________</div><div>{t('Le prêteur')}<br /><br />______________</div></div>
      </div>
      {close && <CloseDialog r={r} onClose={() => setClose(false)} onDone={() => { setClose(false); reload(); }} />}
    </>
  );
}

function CloseDialog({ r, onClose, onDone }: { r: Receipt; onClose: () => void; onDone: () => void }) {
  const f = useForm({ status: 'libere', note: '', date: today() });
  return (
    <Modal title={t('Clôturer le récépissé {n}', { n: r.number })} onClose={onClose} footer={<><button class="btn sec" onClick={onClose}>{t('Annuler')}</button>
      <button class={`btn ${f.v.status === 'realise' ? 'danger' : ''}`} disabled={f.busy} onClick={() => f.submit(async () => { await api.post(`/credit/receipts/${r.id}/close`, f.v); toast.ok(t('Récépissé clôturé.')); onDone(); })}>{t('Clôturer')}</button></>}>
      <Field label={t('Issue')} name="status" form={f}>
        <option value="libere">{t('Prêt remboursé : les lots redeviennent disponibles')}</option>
        <option value="realise">{t('Réalisation : le prêteur récupère le stock (il sort du stock)')}</option>
        <option value="annule">{t('Annulation (erreur de saisie)')}</option>
      </Field>
      <Field label={t('Date')} name="date" type="date" form={f} max={today()} />
      <Field label={t('Motif / référence de la mainlevée')} name="note" form={f} required maxLength={300} />
      <FormError error={f.error} />
    </Modal>
  );
}

type Dos = { company: any; generated_at: string; monthly: { month: string; sales_ht: number; purchases_members: number; paid_members: number }[]; totals: Record<string, number>; pledges: { number: string; lender: string; loan_amount: number; loan_due: string; status: string }[] };
function Dossier() {
  const { data: d, error } = useApi<Dos>('/credit/dossier');
  if (!d) return <Loading error={error} />;
  const T = d.totals;
  return (
    <>
      <p class="no-print"><button class="btn" onClick={() => window.print()}><Icon name="print" />{t('Imprimer le dossier')}</button></p>
      <div class="doc">
        <div class="head"><div><h2>{d.company.name}</h2><div>{d.company.address}</div><div>{[d.company.phone, d.company.email].filter(Boolean).join(' · ')}</div><div>{[d.company.ifu && `IFU ${d.company.ifu}`, d.company.rccm && `RCCM ${d.company.rccm}`].filter(Boolean).join(' · ')}</div></div>
          <div class="right"><h2>{t('Dossier de crédit')}</h2><div>{t('12 derniers mois')}</div><div class="small">{t('Extrait de Grenier le {d}', { d: frDateTime(d.generated_at) })}</div></div></div>
        <h3>{t('Synthèse')}</h3>
        <table><tbody>
          <tr><th>{t("Chiffre d'affaires HT")}</th><td class="num">{fcfa(T.sales_ht)} ({t('{n} factures, {c} clients', { n: T.invoices, c: T.customers })})</td></tr>
          <tr><th>{t('Encaissé sur ces factures')}</th><td class="num">{fcfa(T.collected)}</td></tr>
          <tr><th>{t('Créances clients en cours')}</th><td class="num">{fcfa(T.receivables)}{T.late ? ` (${t('dont {n} en retard', { n: T.late })})` : ''}</td></tr>
          <tr><th>{t('Valeur du stock')}</th><td class="num">{fcfa(T.stock_value)}</td></tr>
          <tr><th>{t('Membres actifs / inscrits')}</th><td class="num">{T.active_members} / {T.members}</td></tr>
          <tr><th>{t('Achats aux membres / payés')}</th><td class="num">{fcfa(T.delivered_value)} / {fcfa(T.paid_members)}</td></tr>
          <tr><th>{t('Reste dû aux membres')}</th><td class="num">{fcfa(T.owed_members)}</td></tr>
          <tr><th>{t('Contrôles qualité enregistrés')}</th><td class="num">{T.quality_checks}</td></tr>
        </tbody></table>
        <h3 style={{ marginTop: 16 }}>{t('Évolution mensuelle')}</h3>
        <table><thead><tr><th>{t('Mois')}</th><th class="right">{t('Ventes HT')}</th><th class="right">{t('Achats aux membres')}</th><th class="right">{t('Payé aux membres')}</th></tr></thead>
          <tbody>{d.monthly.map((m) => <tr key={m.month}><td>{monthLabel(m.month)} {m.month.slice(0, 4)}</td><td class="right num">{fcfa(m.sales_ht)}</td><td class="right num">{fcfa(m.purchases_members)}</td><td class="right num">{fcfa(m.paid_members)}</td></tr>)}</tbody></table>
        {d.pledges.length > 0 && <><h3 style={{ marginTop: 16 }}>{t('Crédits warrantage')}</h3>
          <table><tbody>{d.pledges.map((p) => <tr key={p.number}><td class="mono">{p.number}</td><td>{p.lender}</td><td class="num">{fcfa(p.loan_amount)}</td><td>{frDate(p.loan_due)}</td><td>{p.status}</td></tr>)}</tbody></table></>}
        <p class="small" style={{ marginTop: 18, color: '#555' }}>{t('Chiffres issus des opérations enregistrées dans Grenier (factures numérotées sans trou, stock par lot, livraisons et paiements des membres avec reçus). Le détail de chaque opération peut être présenté sur demande.')}</p>
        <div class="row" style={{ marginTop: 30 }}><div>{t('Le responsable')}<br /><br />______________</div></div>
      </div>
    </>
  );
}

type PubR = { company: { name: string; address: string | null; phone: string | null }; number: string; status: string; status_label: string; issued_on: string; loan_due: string; lender: string; closed_on: string | null; holder: string; lots: { code: string; item: string; unit: string; qty: number; still_in_stock: number }[] };
/** Page publique de vérification d'un récépissé (le prêteur scanne le QR). */
export function PublicReceipt({ slug, number, token }: { slug: string; number: string; token: string }) {
  const [d, setD] = useState<PubR | null | false>(null);
  useEffect(() => { api.get<PubR>(`/public/receipt/${encodeURIComponent(slug)}/${encodeURIComponent(number)}/${encodeURIComponent(token)}`).then(setD).catch(() => setD(false)); }, []);
  return (
    <div class="authwrap"><div class="authcard">
      {d === null ? <Loading /> : d === false ? <><h1>{t('Récépissé introuvable')}</h1><p>{t('Ce code ne correspond à aucun récépissé. Le document peut être faux : contactez l’émetteur.')}</p></> : <>
        <p class="muted">{d.company.name}</p><h1>{t("Récépissé d'entrepôt {n}", { n: d.number })}</h1>
        <Badge kind={d.status === 'gage' ? 'ok' : d.status === 'libere' ? 'info' : 'bad'}>{d.status === 'gage' ? t('Authentique — stock toujours gagé') : t(d.status_label)}</Badge>
        <table style={{ marginTop: 14 }}><tbody>
          <tr><th>{t('Déposant')}</th><td>{d.holder}</td></tr><tr><th>{t('Prêteur')}</th><td>{d.lender}</td></tr>
          <tr><th>{t('Émis le')}</th><td>{frDate(d.issued_on)}</td></tr><tr><th>{t('Échéance')}</th><td>{frDate(d.loan_due)}</td></tr>
          {d.closed_on && <tr><th>{t('Clôturé le')}</th><td>{frDate(d.closed_on)}</td></tr>}
          {d.lots.map((l) => <tr key={l.code}><th class="mono">{l.code}</th><td>{qty(l.qty, l.unit)} {l.item} · {t('encore en stock : {q}', { q: qty(l.still_in_stock, l.unit) })}</td></tr>)}
        </tbody></table>
      </>}
      <p class="small muted" style={{ marginTop: 16 }}>{t('Vérification Grenier')}</p>
    </div></div>
  );
}
