// Module Qualité : contrôles HACCP, analyses de laboratoire, lots bloqués, listes de contrôle.
import { useState } from 'preact/hooks';
import { api, can, session, useApi } from '../lib/api';
import { frDate, today, uid } from '../lib/format';
import { t } from '../lib/i18n';
import type { Lot } from '../lib/types';
import { Badge, Empty, Field, FormError, Icon, Loading, Modal, PageHead, Tabs, toast, useForm } from '../ui/kit';

export type QItem = { label: string; type: 'ok' | 'num'; critical: boolean; unit?: string; min?: number | null; max?: number | null };
export type Template = { id: number; name: string; scope: string; items: QItem[]; active: boolean };
export type Check = { id: number; template_name: string; done_on: string; result: 'conforme' | 'non_conforme'; note: string | null; user_name: string | null; answers: { label: string; value: any; ok: boolean; unit?: string; critical: boolean }[]; lot: { id: number; code: string } | null };
export type Lab = { id: number; lab: string; analysed_on: string; parameter: string; value: string; unit: string | null; limit_text: string | null; conforme: boolean; reference: string | null; lot: { id: number; code: string } };
const SCOPE: Record<string, string> = { reception: 'Réception', production: 'Production', hygiene: 'Hygiène', autre: 'Autre' };
const CHECKERS = ['owner', 'manager', 'storekeeper', 'coop_agent'];

export function Qualite() {
  const [tab, setTab] = useState<'synthese' | 'controles' | 'labo' | 'listes'>('synthese');
  const [dlg, setDlg] = useState<null | 'check' | 'lab'>(null);
  const [n, setN] = useState(0);
  const role = session.profile!.user.role;
  const done = () => { setDlg(null); setN((x) => x + 1); };
  return (
    <>
      <PageHead title={t('Qualité')} sub={t('Contrôles HACCP, analyses de laboratoire et lots bloqués. Un lot bloqué n’est jamais vendu ni utilisé en production.')}>
        {CHECKERS.includes(role) && <><button class="btn sec" onClick={() => setDlg('lab')}>{t('Résultat de laboratoire')}</button><button class="btn" onClick={() => setDlg('check')}>{t('Nouveau contrôle')}</button></>}
      </PageHead>
      <Tabs tabs={[['synthese', t('Synthèse')], ['controles', t('Contrôles')], ['labo', t('Analyses')], ['listes', t('Listes de contrôle')]]} value={tab} onChange={setTab} />
      {tab === 'synthese' && <Synthese key={n} onCheck={() => setDlg('check')} />}
      {tab === 'controles' && <Controles key={n} />}
      {tab === 'labo' && <Analyses key={n} />}
      {tab === 'listes' && <Listes key={n} />}
      {dlg === 'check' && <CheckDialog onClose={() => setDlg(null)} onDone={done} />}
      {dlg === 'lab' && <LabDialog onClose={() => setDlg(null)} onDone={done} />}
    </>
  );
}

function Synthese({ onCheck }: { onCheck: () => void }) {
  const { data, error, reload } = useApi<{ checks_30d: number; nonconform_30d: number; lab_30d: number; hygiene_today: boolean; blocked: Lot[] }>('/quality/summary');
  const [free, setFree] = useState<Lot | null>(null);
  if (!data) return <Loading error={error} />;
  return (
    <>
      {!data.hygiene_today && <div class="msg warn">{t("Le contrôle d'hygiène du jour n'a pas encore été fait.")} <button class="btn ghost" onClick={onCheck}>{t('Le faire maintenant')}</button></div>}
      <div class="kpis">
        <div class="kpi"><b>{data.checks_30d}</b><span>{t('Contrôles sur 30 jours')}</span></div>
        <div class="kpi"><b>{data.nonconform_30d}</b><span>{t('Non-conformités sur 30 jours')}</span></div>
        <div class="kpi"><b>{data.lab_30d}</b><span>{t('Analyses de laboratoire sur 30 jours')}</span></div>
        <div class="kpi"><b>{data.blocked.length}</b><span>{t('Lots bloqués')}</span></div>
      </div>
      <div class="card"><h2>{t('Lots bloqués')}</h2>
        {!data.blocked.length ? <p class="muted">{t('Aucun lot bloqué.')}</p> : (
          <table><thead><tr><th>{t('Lot')}</th><th>{t('Article')}</th><th>{t('Motif')}</th><th /></tr></thead>
            <tbody>{data.blocked.map((l) => <tr key={l.id}><td><a class="mono" href={`/tracabilite/${encodeURIComponent(l.code)}`}>{l.code}</a></td><td>{l.item?.name}</td><td class="small">{(l as any).quality_note}</td>
              <td class="actions-cell">{can.correct(session.profile!.user.role) && <button class="btn ghost" onClick={() => setFree(l)}>{t('Libérer')}</button>}</td></tr>)}</tbody></table>
        )}
      </div>
      {free && <StatusDialog lot={free} onClose={() => setFree(null)} onDone={() => { setFree(null); reload(); }} />}
    </>
  );
}

export function CheckRow({ c }: { c: Check }) {
  const [open, setOpen] = useState(false);
  return <>
    <tr><td>{frDate(c.done_on)}</td><td>{c.template_name}</td><td>{c.lot ? <a class="mono" href={`/tracabilite/${encodeURIComponent(c.lot.code)}`}>{c.lot.code}</a> : '—'}</td>
      <td>{c.result === 'conforme' ? <Badge kind="ok">{t('Conforme')}</Badge> : <Badge kind="bad">{t('Non conforme')}</Badge>}</td><td>{c.user_name ?? '—'}</td>
      <td class="actions-cell"><button class="btn ghost" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? t('Masquer') : t('Détail')}</button></td></tr>
    {open && <tr><td colspan={6}><ul style={{ margin: 0 }}>{c.answers.map((a) => <li key={a.label} style={{ color: a.ok ? undefined : 'var(--red)' }}>{a.ok ? '✔' : '✖'} {a.label}{typeof a.value === 'number' ? ` : ${a.value}${a.unit ? ' ' + a.unit : ''}` : ''}{a.critical ? ` (${t('critique')})` : ''}</li>)}</ul>{c.note && <p class="small">{c.note}</p>}</td></tr>}
  </>;
}

function Controles() {
  const [only, setOnly] = useState(false);
  const { data, error } = useApi<Check[]>('/quality/checks', { result: only ? 'non_conforme' : '' });
  return (
    <div class="card">
      <label class="check"><input type="checkbox" checked={only} onChange={(e) => setOnly((e.target as HTMLInputElement).checked)} />{t('Seulement les non-conformités')}</label>
      {!data ? <Loading error={error} /> : !data.length ? <Empty title={t('Aucun contrôle')}>{t('Enregistrez les contrôles de réception, de production et d’hygiène : ils constituent votre dossier HACCP.')}</Empty> : (
        <div class="tablewrap"><table><thead><tr><th>{t('Date')}</th><th>{t('Liste')}</th><th>{t('Lot')}</th><th>{t('Résultat')}</th><th>{t('Par')}</th><th /></tr></thead>
          <tbody>{data.map((c) => <CheckRow key={c.id} c={c} />)}</tbody></table></div>
      )}
    </div>
  );
}

export function LabTable({ rows }: { rows: Lab[] }) {
  return <div class="tablewrap"><table><thead><tr><th>{t('Date')}</th><th>{t('Lot')}</th><th>{t('Laboratoire')}</th><th>{t('Paramètre')}</th><th>{t('Résultat')}</th><th>{t('Limite')}</th><th>{t('Verdict')}</th></tr></thead>
    <tbody>{rows.map((r) => <tr key={r.id}><td>{frDate(r.analysed_on)}</td><td><a class="mono" href={`/tracabilite/${encodeURIComponent(r.lot.code)}`}>{r.lot.code}</a></td><td>{r.lab}{r.reference && <span class="sub">{r.reference}</span>}</td><td>{r.parameter}</td>
      <td class="num">{r.value}{r.unit ? ' ' + r.unit : ''}</td><td>{r.limit_text ?? '—'}</td><td>{r.conforme ? <Badge kind="ok">{t('Conforme')}</Badge> : <Badge kind="bad">{t('Hors limite')}</Badge>}</td></tr>)}</tbody></table></div>;
}
function Analyses() {
  const { data, error } = useApi<Lab[]>('/quality/lab');
  if (!data) return <Loading error={error} />;
  return <div class="card">{!data.length ? <Empty title={t('Aucune analyse')}>{t('Saisissez les bulletins d’analyse (aflatoxines, humidité, acidité…) : ils sont rattachés au lot et visibles lors d’un audit.')}</Empty> : <LabTable rows={data} />}</div>;
}

function Listes() {
  const { data, error, reload } = useApi<Template[]>('/quality/templates');
  const [edit, setEdit] = useState<Template | 'new' | null>(null);
  const role = session.profile!.user.role;
  if (!data) return <Loading error={error} />;
  return (
    <>
      {can.correct(role) && <p><button class="btn sec" onClick={() => setEdit('new')}><Icon name="plus" size={16} />{t('Nouvelle liste')}</button></p>}
      {data.map((tp) => (
        <div class="card" key={tp.id}>
          <div class="pagehead" style={{ marginBottom: 6 }}><div><h2>{tp.name}</h2><p>{t(SCOPE[tp.scope] ?? tp.scope)}{!tp.active && <> · <Badge>{t('Désactivée')}</Badge></>}</p></div>
            {can.correct(role) && <button class="btn ghost" onClick={() => setEdit(tp)}>{t('Modifier')}</button>}</div>
          <ul>{tp.items.map((i) => <li key={i.label}>{i.label}{i.type === 'num' && ` (${[i.min != null && `≥ ${i.min}`, i.max != null && `≤ ${i.max}`].filter(Boolean).join(', ') || t('valeur')}${i.unit ? ' ' + i.unit : ''})`}{i.critical && <> <Badge kind="warn">{t('critique')}</Badge></>}</li>)}</ul>
        </div>
      ))}
      {edit && <TemplateDialog tpl={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); reload(); }} />}
    </>
  );
}

function TemplateDialog({ tpl, onClose, onDone }: { tpl?: Template; onClose: () => void; onDone: () => void }) {
  const f = useForm({ name: tpl?.name ?? '', scope: tpl?.scope ?? 'reception', active: tpl?.active ?? true });
  const [items, setItems] = useState<(QItem & { key: string })[]>((tpl?.items ?? [{ label: '', type: 'ok', critical: false }]).map((i) => ({ ...i, key: uid() })));
  const up = (k: string, p: Partial<QItem>) => setItems((xs) => xs.map((x) => (x.key === k ? { ...x, ...p } : x)));
  const save = () => f.submit(async () => {
    const body = { ...f.v, items: items.filter((i) => i.label.trim()).map(({ key, ...i }) => i) };
    if (tpl) await api.put(`/quality/templates/${tpl.id}`, body); else await api.post('/quality/templates', body);
    toast.ok(t('Liste enregistrée.')); onDone();
  });
  return (
    <Modal wide title={tpl ? t('Modifier la liste') : t('Nouvelle liste de contrôle')} onClose={onClose} footer={<><button class="btn sec" onClick={onClose}>{t('Annuler')}</button><button class="btn" disabled={f.busy} onClick={save}>{t('Enregistrer')}</button></>}>
      <div class="row"><Field label={t('Nom de la liste')} name="name" form={f} required maxLength={120} />
        <Field label={t('Étape')} name="scope" form={f}>{Object.entries(SCOPE).map(([k, l]) => <option value={k} key={k}>{t(l)}</option>)}</Field></div>
      {tpl && <label class="check"><input type="checkbox" checked={f.v.active} onChange={(e) => f.set('active', (e.target as HTMLInputElement).checked)} />{t('Liste active')}</label>}
      <h3>{t('Points à contrôler')}</h3>
      <div class="lines">
        {items.map((i) => (
          <div key={i.key} style={{ borderBottom: '1px solid var(--line-2)', paddingBottom: 8, marginBottom: 8 }}>
            <div class="row" style={{ alignItems: 'end' }}>
              <label class="f" style={{ flex: '3 1 240px' }}><span>{t('Intitulé')}</span><input value={i.label} maxLength={160} onInput={(e) => up(i.key, { label: (e.target as HTMLInputElement).value })} /></label>
              <label class="f"><span>{t('Type')}</span><select value={i.type} onChange={(e) => up(i.key, { type: (e.target as HTMLSelectElement).value as 'ok' | 'num' })}><option value="ok">{t('Oui / non')}</option><option value="num">{t('Valeur mesurée')}</option></select></label>
            </div>
            {i.type === 'num' && <div class="row">
              <label class="f"><span>{t('Minimum')}</span><input inputMode="decimal" value={i.min ?? ''} onInput={(e) => up(i.key, { min: (e.target as HTMLInputElement).value === '' ? null : Number((e.target as HTMLInputElement).value.replace(',', '.')) })} /></label>
              <label class="f"><span>{t('Maximum')}</span><input inputMode="decimal" value={i.max ?? ''} onInput={(e) => up(i.key, { max: (e.target as HTMLInputElement).value === '' ? null : Number((e.target as HTMLInputElement).value.replace(',', '.')) })} /></label>
              <label class="f"><span>{t('Unité')}</span><input value={i.unit ?? ''} maxLength={12} onInput={(e) => up(i.key, { unit: (e.target as HTMLInputElement).value })} /></label>
            </div>}
            <div class="row" style={{ alignItems: 'center' }}>
              <label class="check"><input type="checkbox" checked={i.critical} onChange={(e) => up(i.key, { critical: (e.target as HTMLInputElement).checked })} />{t('Point critique (un échec bloque le lot)')}</label>
              <button class="btn ghost" style={{ flex: '0 0 auto' }} onClick={() => setItems((xs) => xs.filter((x) => x.key !== i.key))}><Icon name="trash" />{t('Retirer')}</button>
            </div>
          </div>
        ))}
        <button class="btn sec small" onClick={() => setItems((xs) => [...xs, { key: uid(), label: '', type: 'ok', critical: false }])}><Icon name="plus" size={16} />{t('Ajouter un point')}</button>
      </div>
      <FormError error={f.error} />
    </Modal>
  );
}

/** Choix d'un lot (recherche par numéro). */
function LotSelect({ value, onChange, required }: { value: string; onChange: (id: string) => void; required?: boolean }) {
  const [q, setQ] = useState('');
  const { data } = useApi<Lot[]>('/lots', { in_stock: '1', q });
  return (
    <label class="f"><span>{t('Lot')}{required ? ' *' : ` (${t('facultatif')})`}</span>
      <input type="search" placeholder={t('Filtrer par numéro…')} value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} style={{ marginBottom: 6 }} aria-label={t('Filtrer les lots')} />
      <select value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value)}>
        <option value="">{required ? t('Choisir…') : t('Aucun (contrôle général)')}</option>
        {(data ?? []).map((l) => <option value={l.id} key={l.id}>{l.code} — {l.item?.name}</option>)}
      </select></label>
  );
}

export function CheckDialog({ lotId, onClose, onDone }: { lotId?: number; onClose: () => void; onDone: () => void }) {
  const { data: tpls } = useApi<Template[]>('/quality/templates');
  const f = useForm({ template_id: '', lot_id: lotId ? String(lotId) : '', done_on: today(), note: '' });
  const [ans, setAns] = useState<Record<string, any>>({});
  const tp = tpls?.find((x) => String(x.id) === f.v.template_id);
  const save = () => f.submit(async () => {
    const r = await api.post<Check & { lot_blocked: boolean }>('/quality/checks', { ...f.v, lot_id: f.v.lot_id || null, note: f.v.note || null, answers: tp!.items.map((i) => ({ label: i.label, value: ans[i.label] ?? (i.type === 'ok' ? false : '') })) });
    if (r.lot_blocked) toast.warn(t('Point critique non conforme : le lot est BLOQUÉ.')); else toast.ok(r.result === 'conforme' ? t('Contrôle conforme enregistré.') : t('Non-conformité enregistrée.'));
    onDone();
  });
  return (
    <Modal wide title={t('Nouveau contrôle qualité')} onClose={onClose} footer={<><button class="btn sec" onClick={onClose}>{t('Annuler')}</button><button class="btn" disabled={f.busy || !tp} onClick={save}>{t('Enregistrer le contrôle')}</button></>}>
      <div class="row">
        <Field label={t('Liste de contrôle')} name="template_id" form={f} required><option value="">{t('Choisir…')}</option>{(tpls ?? []).filter((x) => x.active).map((x) => <option value={x.id} key={x.id}>{x.name}</option>)}</Field>
        <Field label={t('Date')} name="done_on" type="date" form={f} required max={today()} />
      </div>
      {!lotId && <LotSelect value={f.v.lot_id} onChange={(v) => f.set('lot_id', v)} />}
      {tp && <div class="lines">{tp.items.map((i) => (
        <div key={i.label} class="row" style={{ alignItems: 'center', borderBottom: '1px solid var(--line-2)', padding: '6px 0' }}>
          <span style={{ flex: '3 1 220px' }}>{i.label}{i.critical && <> <Badge kind="warn">{t('critique')}</Badge></>}{i.type === 'num' && (i.min != null || i.max != null) && <span class="sub">{[i.min != null && `≥ ${i.min}`, i.max != null && `≤ ${i.max}`].filter(Boolean).join(' · ')} {i.unit}</span>}</span>
          {i.type === 'ok'
            ? <div class="seg" style={{ margin: 0 }}><button type="button" aria-pressed={ans[i.label] === true} onClick={() => setAns({ ...ans, [i.label]: true })}>{t('Oui')}</button><button type="button" aria-pressed={ans[i.label] === false} onClick={() => setAns({ ...ans, [i.label]: false })}>{t('Non')}</button></div>
            : <input inputMode="decimal" aria-label={i.label} placeholder={i.unit} value={ans[i.label] ?? ''} onInput={(e) => setAns({ ...ans, [i.label]: (e.target as HTMLInputElement).value })} />}
        </div>
      ))}</div>}
      <Field label={t('Observations')} name="note" type="textarea" form={f} />
      <FormError error={f.error} />
    </Modal>
  );
}

export function LabDialog({ lotId, onClose, onDone }: { lotId?: number; onClose: () => void; onDone: () => void }) {
  const f = useForm({ lot_id: lotId ? String(lotId) : '', lab: '', analysed_on: today(), parameter: '', value: '', unit: '', limit_text: '', conforme: 'true', reference: '', note: '' });
  const save = () => f.submit(async () => {
    const r = await api.post<{ lot_blocked: boolean }>('/quality/lab', { ...f.v, lot_id: Number(f.v.lot_id) || null, conforme: f.v.conforme === 'true' });
    if (r.lot_blocked) toast.warn(t('Analyse hors limite : le lot est BLOQUÉ.')); else toast.ok(t('Analyse enregistrée.'));
    onDone();
  });
  return (
    <Modal title={t('Résultat de laboratoire')} onClose={onClose} footer={<><button class="btn sec" onClick={onClose}>{t('Annuler')}</button><button class="btn" disabled={f.busy} onClick={save}>{t('Enregistrer')}</button></>}>
      {!lotId && <LotSelect value={f.v.lot_id} onChange={(v) => f.set('lot_id', v)} required />}
      <div class="row"><Field label={t('Laboratoire')} name="lab" form={f} required maxLength={120} placeholder="LNSP, LABORATOIRE…" /><Field label={t("Date d'analyse")} name="analysed_on" type="date" form={f} required max={today()} /></div>
      <div class="row"><Field label={t('Paramètre analysé')} name="parameter" form={f} required maxLength={120} placeholder={t('Aflatoxine B1, humidité, acidité…')} /><Field label={t('Résultat')} name="value" form={f} required maxLength={60} /><Field label={t('Unité')} name="unit" form={f} maxLength={20} /></div>
      <div class="row"><Field label={t('Limite réglementaire')} name="limit_text" form={f} maxLength={80} placeholder="≤ 2 µg/kg" />
        <Field label={t('Verdict')} name="conforme" form={f}><option value="true">{t('Conforme')}</option><option value="false">{t('Hors limite (bloque le lot)')}</option></Field></div>
      <Field label={t('Référence du bulletin')} name="reference" form={f} maxLength={80} />
      <FormError error={f.error} />
    </Modal>
  );
}

export function StatusDialog({ lot, onClose, onDone }: { lot: Lot; onClose: () => void; onDone: () => void }) {
  const blocked = lot.quality_status === 'bloque';
  const f = useForm({ note: '' });
  return (
    <Modal title={blocked ? t('Libérer le lot {c}', { c: lot.code }) : t('Bloquer le lot {c}', { c: lot.code })} onClose={onClose} footer={<><button class="btn sec" onClick={onClose}>{t('Annuler')}</button>
      <button class={`btn ${blocked ? '' : 'danger'}`} disabled={f.busy} onClick={() => f.submit(async () => { await api.post(`/lots/${lot.id}/quality`, { status: blocked ? 'ok' : 'bloque', note: f.v.note }); toast.ok(blocked ? t('Lot libéré.') : t('Lot bloqué.')); onDone(); })}>{blocked ? t('Libérer') : t('Bloquer')}</button></>}>
      <p class="muted">{blocked ? t('Le lot pourra de nouveau être vendu et utilisé en production. Indiquez ce qui justifie la libération (contre-analyse, tri…).') : t('Le lot ne pourra plus être vendu ni utilisé en production, et la page publique du QR indiquera qu’il est retiré de la vente.')}</p>
      <Field label={t('Motif')} name="note" form={f} required maxLength={300} />
      <FormError error={f.error} />
    </Modal>
  );
}
