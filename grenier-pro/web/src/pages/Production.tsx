import { useState } from 'preact/hooks';
import { api, can, session, useApi } from '../lib/api';
import { addDays, fcfa, frDate, parseNum, qty, today, uid } from '../lib/format';
import { t } from '../lib/i18n';
import type { Item, Production as Prod } from '../lib/types';
import { Empty, Field, FormError, Icon, Loading, Modal, PageHead, toast, useForm } from '../ui/kit';

export function Production() {
  const [open, setOpen] = useState(false);
  const { data, error, reload } = useApi<Prod[]>('/productions');
  const role = session.profile!.user.role;
  return (
    <>
      <PageHead title={t('Production')} sub={t('Chaque production consomme des lots de matières (les plus anciens d’abord) et crée un lot de produit fini.')}>
        {can.stock(role) && <button class="btn" onClick={() => setOpen(true)}>{t('Nouvelle production')}</button>}
      </PageHead>
      <div class="card">
        {!data ? <Loading error={error} /> : !data.length ? <Empty title={t('Aucune production')}>{t('Enregistrez une production pour obtenir un lot de produit fini et son étiquette QR.')}</Empty> : (
          <div class="tablewrap"><table>
            <thead><tr><th>{t('Date')}</th><th>{t('Produit')}</th><th>{t('Lot')}</th><th class="right">{t('Quantité')}</th><th class="right">{t('Coût unitaire')}</th><th>{t('Opérateur')}</th><th /></tr></thead>
            <tbody>{data.map((p) => (
              <tr key={p.id}>
                <td>{frDate(p.produced_on)}</td>
                <td><b>{p.item.name}</b><span class="sub">{p.inputs.map((i) => `${qty(i.qty, i.item.unit)} ${i.item.name}`).join(' · ')}</span></td>
                <td class="mono">{p.lot.code}</td>
                <td class="right num">{qty(p.qty, p.item.unit)}</td>
                <td class="right num">{fcfa(p.total_cost / p.qty)}</td>
                <td>{p.operator ?? '—'}</td>
                <td class="actions-cell"><a class="btn ghost" href={`/tracabilite/${encodeURIComponent(p.lot.code)}`}>{t('Tracer')}</a><a class="btn ghost" href={`/etiquettes?lots=${encodeURIComponent(p.lot.code)}`}>{t('Étiquettes')}</a></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
      {open && <ProductionDialog onClose={() => setOpen(false)} onDone={() => { setOpen(false); reload(); }} />}
    </>
  );
}

type Line = { key: string; item_id: string; qty: string };
function ProductionDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { data: items } = useApi<Item[]>('/items');
  const f = useForm({ item_id: '', produced_on: today(), qty: '', expires_on: '', operator: '', extra_cost: '', note: '' });
  const [lines, setLines] = useState<Line[]>([{ key: uid(), item_id: '', qty: '' }, { key: uid(), item_id: '', qty: '' }]);
  const pf = (items ?? []).filter((i) => i.kind === 'pf'), inputs = (items ?? []).filter((i) => i.kind !== 'pf');
  const product = pf.find((i) => String(i.id) === f.v.item_id);
  const estimate = lines.reduce((s, l) => { const it = inputs.find((i) => String(i.id) === l.item_id); const q = parseNum(l.qty); return s + (it && q > 0 ? q * (it.stock > 0 ? it.stock_value / it.stock : it.ref_price) : 0); }, parseNum(f.v.extra_cost || '0') || 0);
  const pq = parseNum(f.v.qty);
  const setLine = (k: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === k ? { ...l, ...patch } : l)));
  const chooseProduct = (id: string) => { f.set('item_id', id); const p = pf.find((i) => String(i.id) === id); if (p?.shelf_days) f.set('expires_on', addDays(f.v.produced_on, p.shelf_days)); };
  const save = () => f.submit(async () => {
    const used = lines.filter((l) => l.item_id && l.qty).map((l) => ({ item_id: Number(l.item_id), qty: parseNum(l.qty) }));
    const p = await api.post<Prod>('/productions', { ...f.v, qty: parseNum(f.v.qty), extra_cost: parseNum(f.v.extra_cost || '0') || 0, expires_on: f.v.expires_on || null, inputs: used });
    toast.ok(t('Lot {code} produit.', { code: p.lot.code })); onDone();
  });
  return (
    <Modal wide title={t('Nouvelle production')} onClose={onClose} footer={<><button class="btn sec" onClick={onClose}>{t('Annuler')}</button><button class="btn" disabled={f.busy} onClick={save}>{t('Enregistrer la production')}</button></>}>
      <div class="row">
        <Field label={t('Date de production')} name="produced_on" type="date" form={f} required max={today()} />
        <label class={`f${f.errors.item_id ? ' err' : ''}`}><span>{t('Produit fabriqué')} *</span>
          <select value={f.v.item_id} onChange={(e) => chooseProduct((e.target as HTMLSelectElement).value)}><option value="">{t('Choisir…')}</option>{pf.map((i) => <option value={i.id} key={i.id}>{i.name}</option>)}</select></label>
      </div>
      <div class="row">
        <Field label={t('Quantité produite') + (product ? ` (${product.unit})` : '')} name="qty" form={f} required inputMode="decimal" />
        <Field label={t('Date limite de consommation')} name="expires_on" type="date" form={f} />
      </div>
      <div class="row">
        <Field label={t('Opérateur')} name="operator" form={f} maxLength={80} />
        <Field label={t('Frais annexes (FCFA)')} name="extra_cost" form={f} inputMode="numeric" hint={t('Énergie, main-d’œuvre, transport…')} />
      </div>
      <h3>{t('Intrants utilisés')}</h3>
      <div class="lines">
        {lines.map((l) => (
          <div class="line two" key={l.key}>
            <label class="f"><span>{t('Matière ou emballage')}</span>
              <select value={l.item_id} onChange={(e) => setLine(l.key, { item_id: (e.target as HTMLSelectElement).value })}><option value="">{t('Choisir…')}</option>
                {inputs.map((i) => <option value={i.id} key={i.id}>{i.name} — {t('{q} en stock', { q: qty(i.stock, i.unit) })}</option>)}</select></label>
            <label class="f"><span>{t('Quantité')}</span><input inputMode="decimal" value={l.qty} onInput={(e) => setLine(l.key, { qty: (e.target as HTMLInputElement).value })} /></label>
            <button class="btn ghost" style={{ marginBottom: 12 }} aria-label={t('Retirer la ligne')} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}><Icon name="trash" /></button>
          </div>
        ))}
        <button class="btn sec small" onClick={() => setLines((ls) => [...ls, { key: uid(), item_id: '', qty: '' }])}><Icon name="plus" size={16} />{t('Ajouter une ligne')}</button>
      </div>
      <p class="muted small">{t('Les lots les plus anciens sont consommés en premier. Le coût de revient exact est calculé à l’enregistrement.')}</p>
      {estimate > 0 && pq > 0 && <p>{t('Coût de revient estimé')} : <b class="num">{fcfa(estimate / pq)}</b> / {product?.unit ?? t('unité')}</p>}
      <FormError error={f.error} />
    </Modal>
  );
}
