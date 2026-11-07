import { useApi, session } from '../lib/api';
import { fcfa, monthLabel, short } from '../lib/format';
import { t } from '../lib/i18n';
import { Bars, Icon, Loading, PageHead } from '../ui/kit';

type Dash = {
  sales_month_ttc: number; sales_month_count: number; receivables: number; late_count: number; stock_value: number;
  owed_to_members: number; advances_to_members?: number; sales_monthly: { month: string; ht: number }[];
  alerts: { type: string; message: string; lot?: string }[];
};

export function Accueil() {
  const { data, error } = useApi<Dash>('/dashboard');
  const p = session.profile!;
  if (!data) return <Loading error={error} />;
  return (
    <>
      <PageHead title={t('Accueil')} sub={t("Vue d'ensemble de {name}.", { name: p.company.name })} />
      <div class="kpis">
        <div class="kpi"><b>{fcfa(data.sales_month_ttc)}</b><span>{t('Ventes du mois (TTC)')} · {t('{n} facture(s)', { n: data.sales_month_count })}</span></div>
        <div class="kpi"><b>{fcfa(data.receivables)}</b><span>{t('À encaisser')}{data.late_count ? ` · ${t('dont {n} en retard', { n: data.late_count })}` : ''}</span></div>
        <div class="kpi"><b>{fcfa(data.stock_value)}</b><span>{t('Valeur du stock')}</span></div>
        {p.company.features.coop && <div class="kpi"><b>{fcfa(data.owed_to_members)}</b><span>{t('Dû aux membres de la coopérative')}{data.advances_to_members ? ` · ${t('avances : {m}', { m: fcfa(data.advances_to_members) })}` : ''}</span></div>}
      </div>
      <div class="grid3">
        <div class="card">
          <h2>{t('Ventes HT sur 6 mois')}</h2>
          <Bars data={data.sales_monthly.map((m) => ({ label: monthLabel(m.month), value: m.ht, text: short(m.ht) }))} />
        </div>
        <div class="card">
          <h2>{t('À surveiller')}</h2>
          {data.alerts.length ? (
            <ul class="alerts">
              {data.alerts.map((a, i) => <li key={i}><span style={{ color: a.type === 'expired' || a.type === 'late_invoice' ? 'var(--red)' : 'var(--ochre)' }}><Icon name="warn" /></span>
                <span>{a.message}{a.lot && <> · <a href={`/tracabilite/${encodeURIComponent(a.lot)}`}>{t('Voir')}</a></>}</span></li>)}
            </ul>
          ) : <p class="muted">{t('Rien à signaler.')}</p>}
        </div>
      </div>
    </>
  );
}
