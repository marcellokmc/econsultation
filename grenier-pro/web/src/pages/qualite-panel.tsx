// Panneau « Qualité » de la fiche d'un lot : statut, contrôles, analyses, blocage.
import { useState } from 'preact/hooks';
import { api, can, session, useApi } from '../lib/api';
import { t } from '../lib/i18n';
import type { Lot } from '../lib/types';
import { Badge } from '../ui/kit';
import { CheckDialog, CheckRow, LabDialog, LabTable, StatusDialog, type Check, type Lab } from './Qualite';

export function QualityPanel({ lot }: { lot: Lot }) {
  const checks = useApi<Check[]>('/quality/checks', { lot_id: lot.id });
  const labs = useApi<Lab[]>('/quality/lab', { lot_id: lot.id });
  const [dlg, setDlg] = useState<null | 'check' | 'lab' | 'status'>(null);
  const [status, setStatus] = useState(lot.quality_status ?? null);
  const role = session.profile!.user.role;
  const done = () => { setDlg(null); checks.reload(); labs.reload(); };
  const checkers = ['owner', 'manager', 'storekeeper', 'coop_agent'].includes(role);
  return (
    <div class="card">
      <div class="pagehead" style={{ marginBottom: 8 }}>
        <div><h2>{t('Qualité')} {status === 'bloque' ? <Badge kind="bad">{t('Lot bloqué')}</Badge> : <Badge kind="ok">{t('Utilisable')}</Badge>}</h2>
          {status === 'bloque' && (lot as any).quality_note && <p>{(lot as any).quality_note}</p>}</div>
        <div class="actions no-print">
          {checkers && <><button class="btn sec small" onClick={() => setDlg('check')}>{t('Nouveau contrôle')}</button><button class="btn sec small" onClick={() => setDlg('lab')}>{t('Résultat de laboratoire')}</button></>}
          {can.correct(role) && <button class={`btn small ${status === 'bloque' ? '' : 'danger'}`} onClick={() => setDlg('status')}>{status === 'bloque' ? t('Libérer') : t('Bloquer')}</button>}
        </div>
      </div>
      {checks.data && checks.data.length > 0 && <div class="tablewrap"><table><thead><tr><th>{t('Date')}</th><th>{t('Liste')}</th><th>{t('Lot')}</th><th>{t('Résultat')}</th><th>{t('Par')}</th><th /></tr></thead><tbody>{checks.data.map((c) => <CheckRow key={c.id} c={c} />)}</tbody></table></div>}
      {labs.data && labs.data.length > 0 && <><h3 style={{ marginTop: 14 }}>{t('Analyses de laboratoire')}</h3><LabTable rows={labs.data} /></>}
      {checks.data?.length === 0 && labs.data?.length === 0 && <p class="muted">{t('Aucun contrôle ni analyse pour ce lot.')}</p>}
      {dlg === 'check' && <CheckDialog lotId={lot.id} onClose={() => setDlg(null)} onDone={async () => { done(); setStatus((await api.get<Lot>(`/lots/${lot.id}`)).quality_status ?? null); }} />}
      {dlg === 'lab' && <LabDialog lotId={lot.id} onClose={() => setDlg(null)} onDone={async () => { done(); setStatus((await api.get<Lot>(`/lots/${lot.id}`)).quality_status ?? null); }} />}
      {dlg === 'status' && <StatusDialog lot={{ ...lot, quality_status: status }} onClose={() => setDlg(null)} onDone={() => { setDlg(null); setStatus(status === 'bloque' ? null : 'bloque'); }} />}
    </div>
  );
}
