// Paiements mobile money aux membres : ordres unitaires, paie de campagne, suivi et résolution manuelle.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { api, can, session, useApi } from '../lib/api';
import { fcfa, frDateTime, parseNum, uid } from '../lib/format';
import { t } from '../lib/i18n';
import type { Member } from '../lib/types';
import { Badge, Empty, Field, FormError, Loading, Modal, toast, useForm } from '../ui/kit';

type Config = { provider: string | null; operators: Record<string, string>; ussd: boolean };
type Order = { id: number; amount: number; operator: string; operator_label: string; phone: string; status: string; provider_ref: string | null; error: string | null; batch: string | null; payout_id: number | null; created_at: string; member: { id: number; name: string; village: string | null } };
const STATUS: Record<string, [string, '' | 'ok' | 'warn' | 'bad' | 'info']> = { en_attente: ['En attente', 'warn'], envoye: ['Envoyé, en attente de confirmation', 'info'], reussi: ['Payé', 'ok'], echoue: ['Échec', 'bad'], annule: ['Annulé', ''] };

export function MobileMoney() {
  const { data: cfg } = useApi<Config>('/payments/config');
  const { data: orders, error, reload } = useApi<Order[]>('/payments/orders');
  const [dlg, setDlg] = useState<null | 'one' | 'batch' | Order>(null);
  const role = session.profile!.user.role;
  // les ordres envoyés se confirment en quelques secondes : rafraîchit tant qu'il en reste
  useEffect(() => { if (!orders?.some((o) => o.status === 'envoye' || o.status === 'en_attente')) return; const h = setTimeout(reload, 4000); return () => clearTimeout(h); }, [orders]);
  if (!cfg || !orders) return <Loading error={error} />;
  return (
    <div class="card">
      <div class="pagehead"><div><h2>{t('Paiements mobile money')}</h2>
        <p class="muted">{t('Le montant est réservé dès l’ordre et n’est enregistré comme payé (reçu, SMS) qu’après confirmation de l’opérateur.')}</p></div>
        {cfg.provider && <div class="actions"><button class="btn sec" onClick={() => setDlg('one')}>{t('Payer un membre')}</button>{can.correct(role) && <button class="btn" onClick={() => setDlg('batch')}>{t('Paie de campagne')}</button>}</div>}
      </div>
      {!cfg.provider && <div class="msg info">{t('Aucun service de paiement mobile n’est configuré : il faut un contrat avec un agrégateur de paiement (voir le guide de mise en service). En attendant, enregistrez les paiements à la main avec la référence de la transaction.')}</div>}
      {cfg.provider === 'simulation' && <div class="msg warn">{t('Mode SIMULATION : aucun argent n’est envoyé. À utiliser pour la formation et les essais.')}</div>}
      {!orders.length ? <Empty title={t('Aucun ordre de paiement')} /> : (
        <div class="tablewrap"><table>
          <thead><tr><th>{t('Date')}</th><th>{t('Membre')}</th><th>{t('Opérateur')}</th><th class="right">{t('Montant')}</th><th>{t('État')}</th><th /></tr></thead>
          <tbody>{orders.map((o) => { const [l, k] = STATUS[o.status] ?? [o.status, '']; return (
            <tr key={o.id}><td class="num">{frDateTime(o.created_at)}</td><td>{o.member.name}<span class="sub">{o.phone}{o.batch && ` · ${o.batch}`}</span></td><td>{o.operator_label}{o.provider_ref && <span class="sub mono">{o.provider_ref}</span>}</td>
              <td class="right num">{fcfa(o.amount)}</td><td><Badge kind={k}>{t(l)}</Badge>{o.error && <span class="sub">{o.error}</span>}</td>
              <td class="actions-cell">{o.payout_id ? <a class="btn ghost" href={`/cooperative/recus/${o.payout_id}`}>{t('Reçu')}</a> : (o.status === 'envoye' || o.status === 'en_attente') && can.correct(role) ? <button class="btn ghost" onClick={() => setDlg(o)}>{t('Résoudre')}</button> : null}</td></tr>
          ); })}</tbody>
        </table></div>
      )}
      {dlg === 'one' && <OrderDialog cfg={cfg} onClose={() => setDlg(null)} onDone={() => { setDlg(null); reload(); }} />}
      {dlg === 'batch' && <BatchDialog cfg={cfg} onClose={() => setDlg(null)} onDone={() => { setDlg(null); reload(); }} />}
      {dlg && typeof dlg === 'object' && <ResolveDialog o={dlg} onClose={() => setDlg(null)} onDone={() => { setDlg(null); reload(); }} />}
    </div>
  );
}

function OrderDialog({ cfg, onClose, onDone }: { cfg: Config; onClose: () => void; onDone: () => void }) {
  const { data: members } = useApi<Member[]>('/members');
  const f = useForm({ member_id: '', amount: '', operator: 'orange', phone: '' });
  const [ref] = useState(uid());
  const m = members?.find((x) => String(x.id) === f.v.member_id);
  useEffect(() => { if (m) { f.set('phone', m.phone ?? ''); if (m.balance > 0) f.set('amount', String(m.balance)); } }, [m?.id]);
  return (
    <Modal title={t('Payer un membre par mobile money')} onClose={onClose} footer={<><button class="btn sec" onClick={onClose}>{t('Annuler')}</button>
      <button class="btn" disabled={f.busy} onClick={() => f.submit(async () => { await api.post('/payments/orders', { member_id: Number(f.v.member_id), amount: Math.round(parseNum(f.v.amount)), operator: f.v.operator, phone: f.v.phone || null, client_ref: ref }); toast.ok(t('Ordre envoyé à l’opérateur.')); onDone(); })}>{t('Envoyer le paiement')}</button></>}>
      <Field label={t('Membre')} name="member_id" form={f} required><option value="">{t('Choisir…')}</option>{(members ?? []).filter((x) => x.active && x.balance > 0).map((x) => <option value={x.id} key={x.id}>{x.name} — {t('dû {m}', { m: fcfa(x.balance) })}</option>)}</Field>
      <div class="row"><Field label={t('Montant (FCFA)')} name="amount" form={f} required inputMode="numeric" /><Field label={t('Opérateur')} name="operator" form={f}>{Object.entries(cfg.operators).map(([k, l]) => <option value={k} key={k}>{l}</option>)}</Field></div>
      <Field label={t('Numéro du membre')} name="phone" type="tel" form={f} hint={t('Le numéro enregistré sur la fiche du membre est proposé.')} />
      <FormError error={f.error} />
    </Modal>
  );
}

function BatchDialog({ cfg, onClose, onDone }: { cfg: Config; onClose: () => void; onDone: () => void }) {
  const { data: members } = useApi<Member[]>('/members');
  const owed = useMemo(() => (members ?? []).filter((m) => m.active && m.balance > 0 && m.phone), [members]);
  const missing = (members ?? []).filter((m) => m.active && m.balance > 0 && !m.phone);
  const [sel, setSel] = useState<Record<number, { on: boolean; operator: string }>>({});
  const f = useForm({ label: `Paie du ${new Date().toLocaleDateString('fr-FR')}` });
  useEffect(() => { setSel(Object.fromEntries(owed.map((m) => [m.id, { on: true, operator: 'orange' }]))); }, [owed.length]);
  const chosen = owed.filter((m) => sel[m.id]?.on);
  const total = chosen.reduce((s, m) => s + m.balance, 0);
  return (
    <Modal wide title={t('Paie de campagne par mobile money')} onClose={onClose} footer={<><button class="btn sec" onClick={onClose}>{t('Annuler')}</button>
      <button class="btn" disabled={f.busy || !chosen.length} onClick={() => f.submit(async () => {
        if (!confirm(t('Envoyer {n} paiements pour un total de {m} ?', { n: chosen.length, m: fcfa(total) }))) return;
        const r = await api.post<{ count: number }>('/payments/batch', { label: f.v.label, orders: chosen.map((m) => ({ member_id: m.id, amount: m.balance, operator: sel[m.id].operator })) });
        toast.ok(t('{n} ordres envoyés.', { n: r.count })); onDone();
      })}>{t('Payer {n} membres — {m}', { n: chosen.length, m: fcfa(total) })}</button></>}>
      <Field label={t('Nom de la paie')} name="label" form={f} required maxLength={80} />
      {missing.length > 0 && <div class="msg warn">{t('{n} membre(s) à payer sans numéro de téléphone : complétez leur fiche ou payez-les à la main.', { n: missing.length })}</div>}
      {!owed.length ? <Empty title={t('Aucun membre à payer.')} /> : (
        <div class="tablewrap"><table><thead><tr><th><input type="checkbox" aria-label={t('Tout sélectionner')} checked={chosen.length === owed.length} onChange={(e) => { const on = (e.target as HTMLInputElement).checked; setSel(Object.fromEntries(owed.map((m) => [m.id, { ...sel[m.id], on }]))); }} /></th><th>{t('Membre')}</th><th>{t('Téléphone')}</th><th>{t('Opérateur')}</th><th class="right">{t('Montant')}</th></tr></thead>
          <tbody>{owed.map((m) => <tr key={m.id}>
            <td><input type="checkbox" aria-label={m.name} checked={!!sel[m.id]?.on} onChange={(e) => setSel({ ...sel, [m.id]: { ...sel[m.id], on: (e.target as HTMLInputElement).checked } })} /></td>
            <td>{m.name}<span class="sub">{m.village}</span></td><td class="num">{m.phone}</td>
            <td><select aria-label={t('Opérateur de {n}', { n: m.name })} value={sel[m.id]?.operator ?? 'orange'} onChange={(e) => setSel({ ...sel, [m.id]: { ...sel[m.id], operator: (e.target as HTMLSelectElement).value } })}>{Object.entries(cfg.operators).map(([k, l]) => <option value={k} key={k}>{l}</option>)}</select></td>
            <td class="right num">{fcfa(m.balance)}</td></tr>)}</tbody></table></div>
      )}
      <FormError error={f.error} />
    </Modal>
  );
}

function ResolveDialog({ o, onClose, onDone }: { o: Order; onClose: () => void; onDone: () => void }) {
  const f = useForm({ status: 'reussi', reference: '', note: '' });
  return (
    <Modal title={t('Résoudre l’ordre de {n}', { n: o.member.name })} onClose={onClose} footer={<><button class="btn sec" onClick={onClose}>{t('Annuler')}</button>
      <button class="btn" disabled={f.busy} onClick={() => f.submit(async () => { await api.post(`/payments/orders/${o.id}/resolve`, { ...f.v, reference: f.v.reference || null }); toast.ok(t('Ordre résolu.')); onDone(); })}>{t('Enregistrer')}</button></>}>
      <p class="muted">{t('À utiliser seulement si l’opérateur n’a pas confirmé : vérifiez d’abord sur le relevé du compte marchand.')} {fcfa(o.amount)} · {o.operator_label} · {o.phone}</p>
      <Field label={t('Résultat')} name="status" form={f}><option value="reussi">{t('L’argent est bien parti (enregistrer le paiement)')}</option><option value="annule">{t('L’argent n’est pas parti (annuler l’ordre)')}</option></Field>
      {f.v.status === 'reussi' && <Field label={t('Référence de la transaction')} name="reference" form={f} required maxLength={80} />}
      <Field label={t('Motif')} name="note" form={f} required maxLength={200} />
      <FormError error={f.error} />
    </Modal>
  );
}

/** Interrupteur USSD (Paramètres → Grenier en ligne). */
export function UssdToggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  const admin = can.admin(session.profile!.user.role);
  return (
    <div class="card" style={{ maxWidth: 820 }}>
      <h2>{t('Solde par USSD (sans smartphone)')} {enabled ? <Badge kind="ok">{t('Activé')}</Badge> : <Badge>{t('Désactivé')}</Badge>}</h2>
      <p class="muted">{t('Les membres composent le code USSD de votre prestataire sur n’importe quel téléphone et consultent leur solde, leurs dernières livraisons et paiements, et les prix d’achat. Leurs nom, numéro et solde sont alors envoyés au serveur en ligne avec le résumé : prévenez les membres (protection des données personnelles).')}</p>
      {admin && <button class="btn sec" onClick={async () => { try { await api.post('/payments/ussd', { enabled: !enabled }); await api.post('/cloud/snapshot/now').catch(() => {}); toast.ok(enabled ? t('USSD désactivé.') : t('USSD activé.')); onChange(); } catch (e) { toast.err((e as Error).message); } }}>{enabled ? t('Désactiver') : t('Activer l’USSD')}</button>}
    </div>
  );
}
