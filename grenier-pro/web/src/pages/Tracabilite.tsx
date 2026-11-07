import { useEffect, useState } from 'preact/hooks';
import { api, session, useApi } from '../lib/api';
import { frDate, num, qty } from '../lib/format';
import { t } from '../lib/i18n';
import { useLocation } from '../lib/router';
import type { Lot, Production } from '../lib/types';
import { Badge, Chips, Empty, Icon, Loading, PageHead } from '../ui/kit';
import { DlcBadge, lotOrigin } from './Stock';
import { QualityPanel } from './qualite-panel';

export function Tracabilite() {
  const [kind, setKind] = useState<'' | 'pf' | 'mp'>('');
  const [q, setQ] = useState('');
  const { data, error } = useApi<Lot[]>('/lots', { in_stock: '0', kind, q });
  return (
    <>
      <PageHead title={t('Traçabilité par lot')} sub={t('Retrouvez en quelques secondes d’où vient un produit et à qui il a été vendu. Utile pour les acheteurs, les certificateurs et les rappels.')} />
      <div class="card">
        <div class="toolbar">
          <input type="search" placeholder={t('Numéro de lot…')} value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} aria-label={t('Rechercher un numéro de lot')} />
          <Chips items={[['', t('Tous')], ['pf', t('Produits finis')], ['mp', t('Matières et emballages')]]} value={kind} onChange={setKind} />
        </div>
        {!data ? <Loading error={error} /> : !data.length ? <Empty title={t('Aucun lot')} /> : (
          <div class="tablewrap"><table>
            <thead><tr><th>{t('Lot')}</th><th>{t('Article')}</th><th>{t('Date')}</th><th>{t('Origine')}</th><th class="right">{t('Restant / initial')}</th><th>{t('Date limite')}</th><th /></tr></thead>
            <tbody>{data.map((l) => (
              <tr key={l.id}><td class="mono">{l.code}</td><td>{l.item?.name}</td><td>{frDate(l.received_on)}</td><td>{lotOrigin(l)}</td>
                <td class="right num">{num(l.qty_remaining)} / {qty(l.qty_initial, l.item?.unit)}</td><td>{l.expires_on ? frDate(l.expires_on) : '—'}</td>
                <td class="actions-cell"><a class="btn ghost" href={`/tracabilite/${encodeURIComponent(l.code)}`}>{t('Tracer')}</a><a class="btn ghost" href={`/etiquettes?lots=${encodeURIComponent(l.code)}`}>{t('Étiquette')}</a></td></tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}

type Trace = {
  lot: Lot;
  origin: { producers: { member_id: number; name: string; village: string | null; item: string; unit: string; qty: number; lots: { code: string; date: string }[] }[]; suppliers: { name: string; item: string; unit: string; qty: number; lot: string }[] };
  production: { produced_on: string; qty: number; operator: string | null; expires_on: string | null } | null;
  used_in: Production[];
  sales: { invoice: string; date: string; customer: string; lot: string; qty: number; unit: string }[];
};

export function TraceDetail({ code }: { code: string }) {
  const { data, error } = useApi<Trace>(`/trace/${encodeURIComponent(code)}`);
  if (!data) return <Loading error={error} />;
  const { lot } = data, unit = lot.item?.unit;
  return (
    <>
      <PageHead title={t('Lot {code}', { code: lot.code })} sub={lot.item?.name}>
        <a class="btn ghost" href="/tracabilite">← {t('Tous les lots')}</a>
        <a class="btn sec" href={`/etiquettes?lots=${encodeURIComponent(lot.code)}`}>{t('Étiquettes QR')}</a>
        <button class="btn sec" onClick={() => window.print()}><Icon name="print" />{t('Imprimer la fiche')}</button>
      </PageHead>
      <div class="msg info">{t('En cas de rappel, les sections « Origine » et « Distribution » listent les producteurs concernés et les clients à prévenir.')}</div>
      <div class="card"><h2>{t('Origine')}</h2>
        {!data.origin.producers.length && !data.origin.suppliers.length ? <p class="muted">{t('Lot issu d’une production sans intrant tracé.')}</p> : (
          <div class="tablewrap"><table>
            <thead><tr><th>{t('Producteur ou fournisseur')}</th><th>{t('Village')}</th><th>{t('Intrant')}</th><th class="right">{t('Quantité')}</th><th>{t('Lots reçus')}</th></tr></thead>
            <tbody>
              {data.origin.producers.map((p) => <tr key={'m' + p.member_id}><td><a href={`/cooperative/membres/${p.member_id}`}>{p.name}</a></td><td>{p.village ?? '—'}</td><td>{p.item}</td><td class="right num">{qty(p.qty, p.unit)}</td><td class="mono">{p.lots.map((x) => `${x.code} (${frDate(x.date)})`).join(', ')}</td></tr>)}
              {data.origin.suppliers.map((s, i) => <tr key={'s' + i}><td>{s.name}</td><td>—</td><td>{s.item}</td><td class="right num">{qty(s.qty, s.unit)}</td><td class="mono">{s.lot}</td></tr>)}
            </tbody>
          </table></div>
        )}
      </div>
      <div class="card"><h2>{t('Transformation')}</h2>
        {data.production ? (
          <div class="kpis" style={{ marginBottom: 0 }}>
            <div class="kpi"><b>{frDate(data.production.produced_on)}</b><span>{t('Date')}</span></div>
            <div class="kpi"><b>{qty(data.production.qty, unit)}</b><span>{t('Quantité produite')}</span></div>
            <div class="kpi"><b>{data.production.operator ?? '—'}</b><span>{t('Opérateur')}</span></div>
            <div class="kpi"><b>{frDate(data.production.expires_on)}</b><span>{t('Date limite')}</span></div>
          </div>
        ) : data.used_in.length ? (
          <table><thead><tr><th>{t('Date')}</th><th>{t('Produit fini')}</th><th>{t('Lot obtenu')}</th></tr></thead>
            <tbody>{data.used_in.map((p) => <tr key={p.id}><td>{frDate(p.produced_on)}</td><td>{p.item.name}</td><td><a class="mono" href={`/tracabilite/${encodeURIComponent(p.lot.code)}`}>{p.lot.code}</a></td></tr>)}</tbody></table>
        ) : <p class="muted">{t('Ce lot n’a pas encore été transformé.')}</p>}
      </div>
      <div class="card"><h2>{t('Distribution')}</h2>
        {!data.sales.length ? <p class="muted">{t('Aucune vente enregistrée pour ce lot.')}</p> : (
          <div class="tablewrap"><table><thead><tr><th>{t('Facture')}</th><th>{t('Date')}</th><th>{t('Client')}</th><th>{t('Lot')}</th><th class="right">{t('Quantité')}</th></tr></thead>
            <tbody>{data.sales.map((s, i) => <tr key={i}><td class="mono">{s.invoice}</td><td>{frDate(s.date)}</td><td>{s.customer}</td><td class="mono">{s.lot}</td><td class="right num">{qty(s.qty, s.unit)}</td></tr>)}</tbody></table></div>
        )}
      </div>
      <QualityPanel lot={lot} />
      <div class="card"><h2>{t('Stock actuel')}</h2><p>{t('{r} restants sur {i}.', { r: qty(lot.qty_remaining, unit), i: num(lot.qty_initial) })} <DlcBadge date={lot.expires_on} /></p></div>
    </>
  );
}

/** Planche d'étiquettes QR à imprimer : /etiquettes?lots=CODE1,CODE2&n=12 */
export function Etiquettes() {
  const { query } = useLocation();
  const codes = (query.get('lots') ?? '').split(',').filter(Boolean);
  const [copies, setCopies] = useState(Number(query.get('n')) || 6);
  const [lots, setLots] = useState<Lot[] | null>(null);
  const c = session.profile!.company;
  useEffect(() => { Promise.all(codes.map((code) => api.get<Lot[]>('/lots', { in_stock: '0', q: code }).then((r) => r.find((l) => l.code === code)))).then((r) => setLots(r.filter(Boolean) as Lot[])); }, [query.get('lots')]);
  if (!lots) return <Loading />;
  return (
    <>
      <PageHead title={t('Étiquettes QR')} sub={t('Imprimez sur du papier autocollant ; découpez le long des pointillés.')}>
        <label class="small">{t('Exemplaires par lot')} <input type="number" min={1} max={100} value={copies} style={{ width: 90 }} onInput={(e) => setCopies(Math.max(1, Math.min(100, Number((e.target as HTMLInputElement).value) || 1)))} /></label>
        <button class="btn" onClick={() => window.print()}><Icon name="print" />{t('Imprimer')}</button>
      </PageHead>
      {!c.registry_connected && c.edition === 'local' && <div class="msg warn no-print">{t('Ces QR contiennent le texte du lot (lisible sans internet). Pour des QR vérifiables en ligne, reliez Grenier au registre : Paramètres → Traçabilité en ligne.')}</div>}
      <div class="labels">
        {lots.flatMap((l) => Array.from({ length: copies }, (_, i) => (
          <div class="label" key={l.code + i}>
            <img src={`/api/public/qr/${encodeURIComponent(c.slug)}/${encodeURIComponent(l.code)}`} alt={t('QR code du lot {code}', { code: l.code })} />
            <div><b>{l.item?.name}</b><div class="code">{l.code}</div><div class="small">{l.item?.kind === 'pf' ? t('Fabriqué le') : t('Reçu le')} {frDate(l.received_on)}</div>{l.expires_on && <div class="small">{t('DLC')} : {frDate(l.expires_on)}</div>}<div class="small">{c.name}</div></div>
          </div>
        )))}
      </div>
    </>
  );
}

type Pub = { company: { name: string; address: string | null; phone: string | null }; lot: string; product: string; kind: string; date: string; expires_on: string | null; expired: boolean; withdrawn?: boolean; controls?: number; origin: { villages: string[]; producers_count: number } };
export function PublicTrace({ slug, code }: { slug: string; code: string }) {
  const [d, setD] = useState<Pub | null | false>(null);
  useEffect(() => { api.get<Pub>(`/public/trace/${encodeURIComponent(slug)}/${encodeURIComponent(code)}`).then(setD).catch(() => setD(false)); }, [slug, code]);
  return (
    <div class="authwrap"><div class="authcard">
      {d === null ? <Loading /> : d === false ? <><h1>{t('Lot introuvable')}</h1><p>{t('Ce QR code ne correspond à aucun lot connu. Vérifiez l’emballage ou contactez le fabricant.')}</p></> : (
        <>
          <p class="muted">{d.company.name}</p><h1>{d.product}</h1>
          {d.withdrawn ? <Badge kind="bad">{t('Lot RETIRÉ DE LA VENTE — ne pas consommer')}</Badge> : d.expired ? <Badge kind="bad">{t('Lot authentique mais PÉRIMÉ')}</Badge> : <Badge kind="ok">{t('Lot authentique et valide')}</Badge>}
          {!!d.controls && <p class="small muted">{t('{n} contrôle(s) qualité conforme(s).', { n: d.controls })}</p>}
          <table style={{ marginTop: 14 }}><tbody>
            <tr><th>{t('Numéro de lot')}</th><td class="mono">{d.lot}</td></tr>
            <tr><th>{d.kind === 'pf' ? t('Fabriqué le') : t('Reçu le')}</th><td>{frDate(d.date)}</td></tr>
            {d.expires_on && <tr><th>{t('À consommer avant')}</th><td>{frDate(d.expires_on)}</td></tr>}
            {d.origin.villages.length > 0 && <tr><th>{t('Origine')}</th><td>{d.origin.villages.join(', ')}</td></tr>}
            {d.origin.producers_count > 0 && <tr><th>{t('Producteurs')}</th><td>{t('{n} producteur(s) de la coopérative', { n: d.origin.producers_count })}</td></tr>}
            <tr><th>{t('Fabricant')}</th><td>{[d.company.name, d.company.address].filter(Boolean).join(', ')}</td></tr>
            {d.company.phone && <tr><th>{t('Contact')}</th><td>{d.company.phone}</td></tr>}
          </tbody></table>
        </>
      )}
      <p class="small muted" style={{ marginTop: 16 }}>{t('Traçabilité assurée avec Grenier')}</p>
    </div></div>
  );
}
