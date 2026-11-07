import { useState } from 'preact/hooks';
import { api, can, session, useApi } from '../lib/api';
import { addDays, fcfa, frDate, num, parseNum, qty, today, uid } from '../lib/format';
import { fcfaEnLettres } from '../lib/lettres';
import { t } from '../lib/i18n';
import { navigate } from '../lib/router';
import { PAY_LABEL, PAY_METHODS, type Customer, type Invoice, type Item } from '../lib/types';
import { Badge, Chips, Empty, Field, FormError, Icon, Loading, Modal, PageHead, Tabs, toast, useForm } from '../ui/kit';

export function Ventes() {
  const [tab, setTab] = useState<'factures' | 'clients'>('factures');
  const [dlg, setDlg] = useState<null | { type: 'client'; c?: Customer } | { type: 'facture'; customerId?: number }>(null);
  const [n, setN] = useState(0);
  const role = session.profile!.user.role;
  return (
    <>
      <PageHead title={t('Ventes et facturation')} sub={t('Les factures sortent le stock par lot, en commençant par la date limite la plus proche.')}>
        {can.sales(role) && <><button class="btn sec" onClick={() => setDlg({ type: 'client' })}>{t('Nouveau client')}</button><button class="btn" onClick={() => setDlg({ type: 'facture' })}>{t('Nouvelle facture')}</button></>}
      </PageHead>
      <Tabs tabs={[['factures', t('Factures')], ['clients', t('Clients')]]} value={tab} onChange={setTab} />
      {tab === 'factures' ? <Factures key={n} /> : <Clients key={n} onEdit={(c) => setDlg({ type: 'client', c })} onInvoice={(c) => setDlg({ type: 'facture', customerId: c.id })} />}
      {dlg?.type === 'client' && <ClientDialog c={dlg.c} onClose={() => setDlg(null)} onDone={() => { setDlg(null); setN((x) => x + 1); }} />}
      {dlg?.type === 'facture' && <FactureDialog customerId={dlg.customerId} onClose={() => setDlg(null)} onDone={(inv) => { setDlg(null); navigate(`/ventes/factures/${inv.id}`); }} />}
    </>
  );
}

function Factures() {
  const [status, setStatus] = useState('');
  const { data, error } = useApi<Invoice[]>('/invoices', { status });
  return (
    <div class="card">
      <Chips items={[['', t('Toutes')], ['open', t('À encaisser')], ['late', t('En retard')], ['paid', t('Payées')], ['cancelled', t('Annulées')]]} value={status} onChange={setStatus} />
      {!data ? <Loading error={error} /> : !data.length ? <Empty title={t('Aucune facture')} /> : (
        <div class="tablewrap"><table>
          <thead><tr><th>{t('N°')}</th><th>{t('Date')}</th><th>{t('Client')}</th><th class="right">{t('Total TTC')}</th><th class="right">{t('Réglé')}</th><th class="right">{t('Reste')}</th><th>{t('État')}</th><th /></tr></thead>
          <tbody>{data.map((i) => { const [l, k] = PAY_LABEL[i.payment_status]; return (
            <tr key={i.id} class={i.status === 'cancelled' ? 'dim' : ''}>
              <td class="mono">{i.number}</td><td>{frDate(i.issued_on)}</td><td>{i.customer.name}</td>
              <td class="right num">{fcfa(i.total_ttc)}</td><td class="right num">{fcfa(i.paid_amount)}</td><td class="right num">{fcfa(i.balance)}</td>
              <td><Badge kind={k}>{t(l)}</Badge></td>
              <td class="actions-cell"><a class="btn ghost" href={`/ventes/factures/${i.id}`}>{t('Ouvrir')}</a></td>
            </tr>
          ); })}</tbody>
        </table></div>
      )}
    </div>
  );
}

function Clients({ onEdit, onInvoice }: { onEdit: (c: Customer) => void; onInvoice: (c: Customer) => void }) {
  const { data, error } = useApi<Customer[]>('/customers');
  const role = session.profile!.user.role;
  if (!data) return <Loading error={error} />;
  return (
    <div class="card">{!data.length ? <Empty title={t('Aucun client')} /> : (
      <div class="tablewrap"><table>
        <thead><tr><th>{t('Client')}</th><th>{t('Type')}</th><th class="right">{t('Total facturé')}</th><th class="right">{t('Reste dû')}</th><th /></tr></thead>
        <tbody>{data.map((c) => (
          <tr key={c.id}><td><b>{c.name}</b>{c.phone && <span class="sub">{c.phone}</span>}</td><td>{c.type ? t(c.type) : '—'}</td>
            <td class="right num">{fcfa(c.invoiced)}</td><td class="right num">{c.outstanding ? <b style={{ color: 'var(--red)' }}>{fcfa(c.outstanding)}</b> : fcfa(0)}</td>
            <td class="actions-cell">{can.sales(role) && <><button class="btn ghost" onClick={() => onInvoice(c)}>{t('Facturer')}</button><button class="btn ghost" onClick={() => onEdit(c)}>{t('Modifier')}</button></>}</td></tr>
        ))}</tbody>
      </table></div>
    )}</div>
  );
}

const TYPES = ['Grossiste', 'Détaillant', 'Supermarché', 'Restaurant', 'Export', 'Institution', 'Particulier', 'Autre'];
function ClientDialog({ c, onClose, onDone }: { c?: Customer; onClose: () => void; onDone: () => void }) {
  const f = useForm({ name: c?.name ?? '', type: c?.type ?? 'Grossiste', phone: c?.phone ?? '', address: c?.address ?? '', ifu: c?.ifu ?? '' });
  const save = () => f.submit(async () => { if (c) await api.put(`/customers/${c.id}`, f.v); else await api.post('/customers', f.v); toast.ok(t('Client enregistré.')); onDone(); });
  return (
    <Modal title={c ? t('Modifier le client') : t('Nouveau client')} onClose={onClose} footer={<><button class="btn sec" onClick={onClose}>{t('Annuler')}</button><button class="btn" disabled={f.busy} onClick={save}>{t('Enregistrer')}</button></>}>
      <Field label={t('Nom du client')} name="name" form={f} required maxLength={120} />
      <div class="row"><Field label={t('Type')} name="type" form={f}>{TYPES.map((x) => <option value={x} key={x}>{t(x)}</option>)}</Field><Field label={t('Téléphone')} name="phone" type="tel" form={f} maxLength={30} /></div>
      <Field label={t('Adresse')} name="address" form={f} maxLength={200} />
      <Field label={t('IFU (facultatif)')} name="ifu" form={f} maxLength={40} />
      <FormError error={f.error} />
    </Modal>
  );
}

type Line = { key: string; item_id: string; qty: string; unit_price: string };
function FactureDialog({ customerId, onClose, onDone }: { customerId?: number; onClose: () => void; onDone: (i: Invoice) => void }) {
  const { data: customers } = useApi<Customer[]>('/customers');
  const { data: items } = useApi<Item[]>('/items', { kind: 'pf' });
  const company = session.profile!.company;
  const f = useForm({ customer_id: customerId ? String(customerId) : '', issued_on: today(), due_on: addDays(today(), 15), vat_enabled: company.vat_rate > 0, paid_amount: '', payment_method: 'Espèces', note: '' });
  const [lines, setLines] = useState<Line[]>([{ key: uid(), item_id: '', qty: '', unit_price: '' }]);
  const setLine = (k: string, p: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === k ? { ...l, ...p } : l)));
  const ht = lines.reduce((s, l) => s + (parseNum(l.qty) > 0 && parseNum(l.unit_price) >= 0 ? Math.round(parseNum(l.qty) * parseNum(l.unit_price)) : 0), 0);
  const vat = f.v.vat_enabled ? Math.round((ht * company.vat_rate) / 100) : 0;
  const save = () => f.submit(async () => {
    const inv = await api.post<Invoice>('/invoices', {
      ...f.v, due_on: f.v.due_on || null, paid_amount: parseNum(f.v.paid_amount || '0') || 0,
      lines: lines.filter((l) => l.item_id).map((l) => ({ item_id: Number(l.item_id), qty: parseNum(l.qty), unit_price: Math.round(parseNum(l.unit_price)) })),
    });
    toast.ok(t('Facture {n} établie.', { n: inv.number })); onDone(inv);
  });
  return (
    <Modal wide title={t('Nouvelle facture')} onClose={onClose} footer={<><button class="btn sec" onClick={onClose}>{t('Annuler')}</button><button class="btn" disabled={f.busy} onClick={save}>{t('Établir la facture')}</button></>}>
      <Field label={t('Client')} name="customer_id" form={f} required><option value="">{t('Choisir…')}</option>{(customers ?? []).map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}</Field>
      <div class="row"><Field label={t('Date')} name="issued_on" type="date" form={f} required max={today()} /><Field label={t('Échéance')} name="due_on" type="date" form={f} /></div>
      <h3>{t('Lignes')}</h3>
      <div class="lines">
        {lines.map((l) => (
          <div class="line" key={l.key}>
            <label class="f"><span>{t('Produit')}</span>
              <select value={l.item_id} onChange={(e) => { const id = (e.target as HTMLSelectElement).value; const it = items?.find((i) => String(i.id) === id); setLine(l.key, { item_id: id, unit_price: it ? String(it.ref_price) : l.unit_price }); }}>
                <option value="">{t('Choisir…')}</option>
                {(items ?? []).map((i) => <option value={i.id} key={i.id} disabled={i.stock <= 0}>{i.name} — {t('{q} en stock', { q: qty(i.stock, i.unit) })}</option>)}
              </select></label>
            <label class="f"><span>{t('Quantité')}</span><input inputMode="decimal" value={l.qty} onInput={(e) => setLine(l.key, { qty: (e.target as HTMLInputElement).value })} /></label>
            <label class="f"><span>{t('Prix unitaire')}</span><input inputMode="numeric" value={l.unit_price} onInput={(e) => setLine(l.key, { unit_price: (e.target as HTMLInputElement).value })} /></label>
            <button class="btn ghost" style={{ marginBottom: 12 }} aria-label={t('Retirer la ligne')} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}><Icon name="trash" /></button>
          </div>
        ))}
        <button class="btn sec small" onClick={() => setLines((ls) => [...ls, { key: uid(), item_id: '', qty: '', unit_price: '' }])}><Icon name="plus" size={16} />{t('Ajouter une ligne')}</button>
      </div>
      <label class="check"><input type="checkbox" checked={f.v.vat_enabled} onChange={(e) => f.set('vat_enabled', (e.target as HTMLInputElement).checked)} />{t('Appliquer la TVA ({r} %)', { r: num(company.vat_rate) })}</label>
      <div class="row">
        <Field label={t('Acompte reçu (FCFA)')} name="paid_amount" form={f} inputMode="numeric" />
        <Field label={t('Mode de règlement')} name="payment_method" form={f}>{PAY_METHODS.map((m) => <option value={m} key={m}>{t(m)}</option>)}</Field>
      </div>
      <Field label={t('Remarque')} name="note" form={f} maxLength={300} />
      <p class="total">{t('Total HT')} {fcfa(ht)} · {t('TVA')} {fcfa(vat)} · {t('Total TTC')} {fcfa(ht + vat)}</p>
      <FormError error={f.error} />
    </Modal>
  );
}

export function FacturePage({ id }: { id: number }) {
  const { data: inv, error, reload } = useApi<Invoice>(`/invoices/${id}`);
  const [pay, setPay] = useState(false);
  const [cancel, setCancel] = useState(false);
  const p = session.profile!;
  const c = p.company;
  if (!inv) return <Loading error={error} />;
  const [l, k] = PAY_LABEL[inv.payment_status];
  return (
    <>
      <PageHead title={t('Facture {n}', { n: inv.number })}>
        <a class="btn ghost" href="/ventes">← {t('Factures')}</a>
        <button class="btn sec" onClick={() => window.print()}><Icon name="print" />{t('Imprimer / PDF')}</button>
        {can.sales(p.user.role) && inv.status !== 'cancelled' && inv.balance > 0 && <button class="btn" onClick={() => setPay(true)}>{t('Encaisser un paiement')}</button>}
        {can.sales(p.user.role) && inv.status !== 'cancelled' && <button class="btn danger" onClick={() => setCancel(true)}>{t('Annuler la facture')}</button>}
      </PageHead>
      <p class="no-print"><Badge kind={k}>{t(l)}</Badge></p>
      <div class="doc">
        <div class="head">
          <div><h2>{c.name}</h2><div>{c.address}</div><div>{[c.phone, c.email].filter(Boolean).join(' · ')}</div><div>{[c.ifu && `IFU : ${c.ifu}`, c.rccm && `RCCM : ${c.rccm}`].filter(Boolean).join(' · ')}</div></div>
          <div class="right"><h2>{inv.status === 'cancelled' ? t('Facture ANNULÉE') : t('Facture')}</h2><div class="mono">{inv.number}</div><div>{t('Date')} : {frDate(inv.issued_on)}</div>{inv.due_on && <div>{t('Échéance')} : {frDate(inv.due_on)}</div>}</div>
        </div>
        <p><b>{t('Facturé à')}</b><br />{inv.customer.name}{inv.customer.address && <><br />{inv.customer.address}</>}{inv.customer.phone && <><br />{inv.customer.phone}</>}{inv.customer.ifu && <><br />IFU : {inv.customer.ifu}</>}</p>
        <table>
          <thead><tr><th>{t('Désignation')}</th><th>{t('Lot(s)')}</th><th class="right">{t('Qté')}</th><th class="right">{t('Prix unitaire')}</th><th class="right">{t('Montant')}</th></tr></thead>
          <tbody>{inv.lines!.map((li) => <tr key={li.id}><td>{li.name}</td><td class="mono">{li.lots.map((x) => x.lot.code).join(', ')}</td><td class="right num">{qty(li.qty, li.unit)}</td><td class="right num">{num(li.unit_price)}</td><td class="right num">{num(li.line_total)}</td></tr>)}</tbody>
        </table>
        <div class="totals">
          <div><span>{t('Total HT')}</span><span class="num">{fcfa(inv.total_ht)}</span></div>
          <div><span>{t('TVA')} {num(inv.vat_rate)} %</span><span class="num">{fcfa(inv.total_vat)}</span></div>
          <div class="grand"><span>{t('Total TTC')}</span><span class="num">{fcfa(inv.total_ttc)}</span></div>
          {inv.paid_amount > 0 && <div><span>{t('Déjà réglé')}</span><span class="num">{fcfa(inv.paid_amount)}</span></div>}
          {inv.status !== 'cancelled' && inv.paid_amount > 0 && <div><b>{t('Reste à payer')}</b><b class="num">{fcfa(inv.balance)}</b></div>}
        </div>
        <p class="words">{t('Arrêtée la présente facture à la somme de {s}.', { s: fcfaEnLettres(inv.total_ttc) })}</p>
        {inv.note && <p>{inv.note}</p>}
        <p class="small" style={{ color: '#555' }}>{t('Les numéros de lot ci-dessus permettent de retrouver l’origine de chaque produit en cas de besoin.')}</p>
      </div>
      {inv.payments!.length > 0 && (
        <div class="card no-print" style={{ marginTop: 16 }}><h2>{t('Encaissements')}</h2>
          <table><thead><tr><th>{t('Date')}</th><th>{t('Mode')}</th><th>{t('Référence')}</th><th class="right">{t('Montant')}</th></tr></thead>
            <tbody>{inv.payments!.map((x) => <tr key={x.id}><td>{frDate(x.paid_on)}</td><td>{t(x.method)}</td><td>{x.reference ?? '—'}</td><td class="right num">{fcfa(x.amount)}</td></tr>)}</tbody></table></div>
      )}
      {pay && <PaiementDialog inv={inv} onClose={() => setPay(false)} onDone={() => { setPay(false); reload(); }} />}
      {cancel && (
        <Modal title={t('Annuler la facture')} onClose={() => setCancel(false)} footer={<><button class="btn sec" onClick={() => setCancel(false)}>{t('Ne rien faire')}</button>
          <button class="btn danger" onClick={async () => { try { await api.post(`/invoices/${inv.id}/cancel`); toast.ok(t('Facture annulée : le stock est remis en place.')); setCancel(false); reload(); } catch (e) { toast.err((e as Error).message); } }}>{t("Confirmer l'annulation")}</button></>}>
          <p>{t('La facture {n} sera annulée et les produits remis en stock dans leurs lots d’origine. Son numéro reste réservé.', { n: inv.number })}</p>
        </Modal>
      )}
    </>
  );
}

function PaiementDialog({ inv, onClose, onDone }: { inv: Invoice; onClose: () => void; onDone: () => void }) {
  const f = useForm({ paid_on: today(), amount: String(inv.balance), method: 'Espèces', reference: '' });
  const save = () => f.submit(async () => { await api.post(`/invoices/${inv.id}/payments`, { ...f.v, amount: Math.round(parseNum(f.v.amount)), reference: f.v.reference || null }); toast.ok(t('Paiement enregistré.')); onDone(); });
  return (
    <Modal title={t('Encaisser un paiement')} onClose={onClose} footer={<><button class="btn sec" onClick={onClose}>{t('Annuler')}</button><button class="btn" disabled={f.busy} onClick={save}>{t('Enregistrer')}</button></>}>
      <p class="muted">{t('Reste à payer')} : <b>{fcfa(inv.balance)}</b></p>
      <div class="row"><Field label={t('Date')} name="paid_on" type="date" form={f} required max={today()} /><Field label={t('Montant (FCFA)')} name="amount" form={f} required inputMode="numeric" /></div>
      <div class="row"><Field label={t('Mode')} name="method" form={f}>{PAY_METHODS.map((m) => <option value={m} key={m}>{t(m)}</option>)}</Field><Field label={t('Référence')} name="reference" form={f} maxLength={80} /></div>
      <FormError error={f.error} />
    </Modal>
  );
}
