import { useState } from 'preact/hooks';
import { api, can, session, useApi } from '../lib/api';
import { fcfa, frDate, num, parseNum, qty, today, daysUntil } from '../lib/format';
import { t } from '../lib/i18n';
import { KIND_LABEL, MOVE_LABEL, UNITS, type Item, type Kind, type Lot, type Movement } from '../lib/types';
import { Badge, Chips, Empty, Field, FormError, Loading, Modal, PageHead, Tabs, toast, useForm } from '../ui/kit';

export function lotOrigin(l: Lot) {
  if (l.origin_type === 'member') return l.member ? `${l.member.name}${l.member.village ? ', ' + l.member.village : ''}` : t('Membre');
  if (l.origin_type === 'production') return t('Production');
  return l.supplier_name || t('Fournisseur');
}
export function DlcBadge({ date }: { date: string | null }) {
  if (!date) return <span class="muted">—</span>;
  const d = daysUntil(date);
  return <>{frDate(date)} {d < 0 ? <Badge kind="bad">{t('Périmé')}</Badge> : d <= 30 ? <Badge kind="warn">{t('DLC dans {n} j', { n: d })}</Badge> : <Badge kind="ok">{t('Valide')}</Badge>}</>;
}

export function Stock() {
  const [tab, setTab] = useState<'articles' | 'lots' | 'mouvements'>('articles');
  const [dlg, setDlg] = useState<null | { type: 'item'; item?: Item } | { type: 'entree'; item?: Item } | { type: 'retrait'; lot: Lot }>(null);
  const [n, setN] = useState(0);
  const role = session.profile!.user.role;
  const done = () => { setDlg(null); setN((x) => x + 1); };
  return (
    <>
      <PageHead title={t('Stock')} sub={t('Articles, lots et mouvements. Le stock est tenu par lot pour garder la traçabilité.')}>
        {can.stock(role) && <button class="btn" onClick={() => setDlg({ type: 'entree' })}>{t('Entrée de stock')}</button>}
        {can.items(role) && <button class="btn sec" onClick={() => setDlg({ type: 'item' })}>{t('Nouvel article')}</button>}
      </PageHead>
      <Tabs tabs={[['articles', t('Articles')], ['lots', t('Lots')], ['mouvements', t('Mouvements')]]} value={tab} onChange={setTab} />
      {tab === 'articles' && <Articles key={n} onEdit={(item) => setDlg({ type: 'item', item })} onEntree={(item) => setDlg({ type: 'entree', item })} />}
      {tab === 'lots' && <Lots key={n} onRetrait={(lot) => setDlg({ type: 'retrait', lot })} />}
      {tab === 'mouvements' && <Mouvements key={n} />}
      {dlg?.type === 'item' && <ArticleDialog item={dlg.item} onClose={() => setDlg(null)} onDone={done} />}
      {dlg?.type === 'entree' && <EntreeDialog item={dlg.item} onClose={() => setDlg(null)} onDone={done} />}
      {dlg?.type === 'retrait' && <RetraitDialog lot={dlg.lot} onClose={() => setDlg(null)} onDone={done} />}
    </>
  );
}

function Articles({ onEdit, onEntree }: { onEdit: (i: Item) => void; onEntree: (i: Item) => void }) {
  const [kind, setKind] = useState<'' | Kind>('');
  const { data, error } = useApi<Item[]>('/items', { kind });
  const role = session.profile!.user.role;
  return (
    <div class="card">
      <Chips items={[['', t('Tous')], ['mp', t('Matières premières')], ['emb', t('Emballages')], ['pf', t('Produits finis')]]} value={kind} onChange={setKind} />
      {!data ? <Loading error={error} /> : !data.length ? <Empty title={t('Aucun article')}>{t('Créez vos matières premières, emballages et produits finis.')}</Empty> : (
        <div class="tablewrap"><table>
          <thead><tr><th>{t('Article')}</th><th>{t('Type')}</th><th class="right">{t('Stock')}</th><th class="right">{t('Valeur')}</th><th class="right">{t('Seuil')}</th><th>{t('État')}</th><th /></tr></thead>
          <tbody>{data.map((i) => (
            <tr key={i.id}>
              <td><b>{i.name}</b><span class="sub mono">{i.code}</span></td>
              <td>{t(KIND_LABEL[i.kind])}</td>
              <td class="right num">{qty(i.stock, i.unit)}</td>
              <td class="right num">{fcfa(i.stock_value)}</td>
              <td class="right num">{i.alert_qty ? num(i.alert_qty) : '—'}</td>
              <td>{i.stock <= 0 ? <Badge kind="bad">{t('Rupture')}</Badge> : i.low_stock ? <Badge kind="warn">{t('Stock bas')}</Badge> : <Badge kind="ok">{t('Correct')}</Badge>}</td>
              <td class="actions-cell">
                {i.kind !== 'pf' && can.stock(role) && <button class="btn ghost" onClick={() => onEntree(i)}>{t('Entrée')}</button>}
                {can.items(role) && <button class="btn ghost" onClick={() => onEdit(i)}>{t('Modifier')}</button>}
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}

function Lots({ onRetrait }: { onRetrait: (l: Lot) => void }) {
  const [all, setAll] = useState(false);
  const [q, setQ] = useState('');
  const { data, error } = useApi<Lot[]>('/lots', { in_stock: all ? '0' : '1', q });
  const role = session.profile!.user.role;
  return (
    <div class="card">
      <div class="toolbar">
        <input type="search" placeholder={t('Rechercher un numéro de lot…')} value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} aria-label={t('Rechercher un numéro de lot')} />
        <label class="check"><input type="checkbox" checked={all} onChange={(e) => setAll((e.target as HTMLInputElement).checked)} />{t('Afficher les lots épuisés')}</label>
      </div>
      {!data ? <Loading error={error} /> : !data.length ? <Empty title={t('Aucun lot')} /> : (
        <div class="tablewrap"><table>
          <thead><tr><th>{t('Lot')}</th><th>{t('Article')}</th><th>{t('Date')}</th><th>{t('Origine')}</th><th class="right">{t('Restant / initial')}</th><th>{t('Date limite')}</th><th /></tr></thead>
          <tbody>{data.map((l) => (
            <tr key={l.id} class={l.qty_remaining <= 0 ? 'dim' : ''}>
              <td class="mono">{l.code}{l.quality_status === 'bloque' && <> <Badge kind="bad">{t('Bloqué')}</Badge></>}{l.pledge_id ? <> <Badge kind="info">{t('Gagé')}</Badge></> : null}</td>
              <td>{l.item?.name}</td><td>{frDate(l.received_on)}</td><td>{lotOrigin(l)}</td>
              <td class="right num">{num(l.qty_remaining)} / {qty(l.qty_initial, l.item?.unit)}</td>
              <td><DlcBadge date={l.expires_on} /></td>
              <td class="actions-cell">
                <a class="btn ghost" href={`/tracabilite/${encodeURIComponent(l.code)}`}>{t('Tracer')}</a>
                {can.stock(role) && l.qty_remaining > 0 && <button class="btn ghost" onClick={() => onRetrait(l)}>{t('Retirer')}</button>}
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}

function Mouvements() {
  const { data, error } = useApi<Movement[]>('/movements');
  if (!data) return <Loading error={error} />;
  return (
    <div class="card">{!data.length ? <Empty title={t('Aucun mouvement')} /> : (
      <div class="tablewrap"><table>
        <thead><tr><th>{t('Date')}</th><th>{t('Type')}</th><th>{t('Article')}</th><th>{t('Lot')}</th><th class="right">{t('Quantité')}</th><th>{t('Référence')}</th></tr></thead>
        <tbody>{data.map((m) => (
          <tr key={m.id}><td>{frDate(m.occurred_on)}</td><td>{t(MOVE_LABEL[m.type] ?? m.type)}</td><td>{m.item.name}</td><td class="mono">{m.lot.code}</td>
            <td class="right num" style={{ color: m.qty < 0 ? 'var(--red)' : 'var(--green)' }}>{m.qty > 0 ? '+' : ''}{qty(m.qty, m.item.unit)}</td>
            <td class="mono">{m.reference}{m.note && <span class="sub">{m.note}</span>}</td></tr>
        ))}</tbody>
      </table></div>
    )}</div>
  );
}

const FILIERES = [['', '—'], ['karite', 'Karité'], ['sesame', 'Sésame'], ['cajou', 'Cajou (anacarde)'], ['mangue', 'Mangue'], ['arachide', 'Arachide'], ['mais', 'Maïs'], ['sorgho', 'Sorgho / mil'], ['riz', 'Riz'], ['soja', 'Soja'], ['niebe', 'Niébé'], ['lait', 'Lait'], ['miel', 'Miel'], ['moringa', 'Moringa'], ['hibiscus', 'Bissap (hibiscus)'], ['autre', 'Autre']];

function ArticleDialog({ item, onClose, onDone }: { item?: Item; onClose: () => void; onDone: () => void }) {
  const f = useForm({ name: item?.name ?? '', kind: item?.kind ?? 'mp', unit: item?.unit ?? 'kg', code: item?.code ?? '', alert_qty: item ? String(item.alert_qty) : '', ref_price: item ? String(item.ref_price) : '', shelf_days: item ? String(item.shelf_days) : '', filiere: item?.filiere ?? '' });
  const save = () => f.submit(async () => {
    const body = { ...f.v, alert_qty: f.v.alert_qty || 0, ref_price: f.v.ref_price || 0, shelf_days: f.v.shelf_days || 0, filiere: f.v.filiere || null };
    if (item) await api.put(`/items/${item.id}`, body); else await api.post('/items', body);
    toast.ok(t('Article enregistré.')); onDone();
  });
  return (
    <Modal title={item ? t("Modifier l'article") : t('Nouvel article')} onClose={onClose} footer={<><button class="btn sec" onClick={onClose}>{t('Annuler')}</button><button class="btn" disabled={f.busy} onClick={save}>{t('Enregistrer')}</button></>}>
      <Field label={t('Nom')} name="name" form={f} required maxLength={120} />
      <div class="row">
        <Field label={t('Type')} name="kind" form={f} disabled={!!item}>{(['mp', 'emb', 'pf'] as Kind[]).map((k) => <option value={k} key={k} disabled={!!item && k !== item.kind}>{t(KIND_LABEL[k])}</option>)}</Field>
        <Field label={t('Unité')} name="unit" form={f}>{[...new Set([...UNITS, f.v.unit])].map((u) => <option value={u} key={u}>{u}</option>)}</Field>
      </div>
      <Field label={t("Code de l'article")} name="code" form={f} maxLength={30} hint={t('Début du numéro de lot (ex. BEURRE-KARITE-250G-261011-001). Vide : un code court est généré à partir du nom.')} />
      <div class="row">
        <Field label={t("Seuil d'alerte (stock bas)")} name="alert_qty" form={f} inputMode="decimal" />
        <Field label={t('Prix de référence (FCFA)')} name="ref_price" form={f} inputMode="numeric" hint={t('Prix de vente (produit fini) ou d’achat (le reste).')} />
      </div>
      <div class="row">
        <Field label={t('Durée de conservation (jours)')} name="shelf_days" form={f} inputMode="numeric" />
        <Field label={t('Filière')} name="filiere" form={f} hint={t('Sert aux prix du marché et à l’observatoire.')}>{FILIERES.map(([k, l]) => <option value={k} key={k}>{t(l)}</option>)}</Field>
      </div>
      <FormError error={f.error} />
    </Modal>
  );
}

function EntreeDialog({ item, onClose, onDone }: { item?: Item; onClose: () => void; onDone: () => void }) {
  const { data: items } = useApi<Item[]>('/items');
  const f = useForm({ item_id: item ? String(item.id) : '', qty: '', unit_cost: item ? String(item.ref_price || '') : '', date: today(), supplier_name: '' });
  const list = (items ?? []).filter((i) => i.kind !== 'pf');
  const cur = list.find((i) => String(i.id) === f.v.item_id);
  const save = () => f.submit(async () => {
    const lot = await api.post<Lot>('/stock/receipts', { ...f.v, qty: parseNum(f.v.qty), unit_cost: parseNum(f.v.unit_cost || '0') });
    toast.ok(t('Lot {code} créé.', { code: lot.code })); onDone();
  });
  return (
    <Modal title={t('Entrée de stock')} onClose={onClose} footer={<><button class="btn sec" onClick={onClose}>{t('Annuler')}</button><button class="btn" disabled={f.busy} onClick={save}>{t('Enregistrer')}</button></>}>
      <Field label={t('Article')} name="item_id" form={f} required>
        <option value="">{t('Choisir…')}</option>
        {list.map((i) => <option value={i.id} key={i.id}>{i.name} ({i.unit})</option>)}
      </Field>
      <div class="row">
        <Field label={t('Quantité reçue') + (cur ? ` (${cur.unit})` : '')} name="qty" form={f} required inputMode="decimal" />
        <Field label={t('Coût unitaire (FCFA)')} name="unit_cost" form={f} inputMode="numeric" />
      </div>
      <div class="row">
        <Field label={t('Date de réception')} name="date" type="date" form={f} required max={today()} />
        <Field label={t('Fournisseur ou provenance')} name="supplier_name" form={f} maxLength={120} />
      </div>
      <p class="small muted">{t('Pour les produits livrés par les membres de la coopérative, utilisez « Nouvelle livraison » : l’origine du lot sera rattachée au producteur.')}</p>
      <FormError error={f.error} />
    </Modal>
  );
}

function RetraitDialog({ lot, onClose, onDone }: { lot: Lot; onClose: () => void; onDone: () => void }) {
  const f = useForm({ qty: '', reason: 'Perte', date: today(), note: '' });
  const save = () => f.submit(async () => { await api.post(`/lots/${lot.id}/loss`, { ...f.v, qty: parseNum(f.v.qty) }); toast.ok(t('Retrait enregistré.')); onDone(); });
  return (
    <Modal title={t('Retirer du stock')} onClose={onClose} footer={<><button class="btn sec" onClick={onClose}>{t('Annuler')}</button><button class="btn danger" disabled={f.busy} onClick={save}>{t('Retirer')}</button></>}>
      <p class="muted"><span class="mono">{lot.code}</span> · {lot.item?.name} · {t('{q} disponibles', { q: qty(lot.qty_remaining, lot.item?.unit) })}</p>
      <div class="row">
        <Field label={t('Quantité retirée')} name="qty" form={f} required inputMode="decimal" />
        <Field label={t('Motif')} name="reason" form={f}>{['Perte', 'Casse', 'Péremption', 'Échantillon', 'Non-conformité', "Correction d'inventaire"].map((r) => <option value={r} key={r}>{t(r)}</option>)}</Field>
      </div>
      <Field label={t('Date')} name="date" type="date" form={f} required max={today()} />
      <Field label={t('Remarque')} name="note" form={f} maxLength={200} />
      <FormError error={f.error} />
    </Modal>
  );
}
