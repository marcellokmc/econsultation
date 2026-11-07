// Grenier en ligne : sauvegarde chiffrée, consultation à distance, restauration, page /distant.
import { useEffect, useState } from 'preact/hooks';
import { api, can, session, useApi } from '../lib/api';
import { fcfa, frDateTime, qty } from '../lib/format';
import { t } from '../lib/i18n';
import { Badge, Field, FormError, Loading, Modal, toast, useForm } from '../ui/kit';

type Status = { connected: boolean; url: string | null; slug: string | null; hosted: boolean; backup_enabled: boolean; last_backup: string | null; last_backup_error: string | null; last_snapshot: string | null; snapshot_error: string | null; remote_set: boolean; ussd_enabled: boolean };

export function CloudPanel() {
  const { data: s, error, reload } = useApi<Status>('/cloud/status');
  const [code, setCode] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const admin = can.admin(session.profile!.user.role);
  const remote = useForm({ code: '' });
  if (!s) return <Loading error={error} />;
  if (s.hosted) return <div class="card"><h2>{t('Sauvegarde')}</h2><p>{t('Version hébergée : vos données sont sur le serveur de votre prestataire, qui en assure les sauvegardes.')}</p></div>;
  return (
    <>
      <div class="card" style={{ maxWidth: 820 }}>
        <h2>{t('Sauvegarde en ligne')} {s.backup_enabled ? <Badge kind="ok">{t('Activée')}</Badge> : <Badge>{t('Désactivée')}</Badge>}</h2>
        <p class="muted">{t('Chaque jour, une copie de vos données est chiffrée sur cet ordinateur puis envoyée au serveur. Le serveur ne peut pas la lire. En cas de panne ou de vol du PC, vous restaurez tout sur un nouveau PC avec la clé et le code de récupération.')}</p>
        {!s.connected ? <div class="msg warn">{t("Reliez d'abord Grenier au serveur en ligne (section « Traçabilité en ligne » ci-dessus : adresse + clé).")}</div> : <>
          {s.backup_enabled && <p>{t('Dernière sauvegarde en ligne')} : <b>{s.last_backup ? frDateTime(s.last_backup) : t('pas encore')}</b></p>}
          {s.last_backup_error && <div class="msg warn">{t('Dernière erreur : {e}. Nouvel essai automatique.', { e: s.last_backup_error })}</div>}
          {admin && <div class="actions">
            {!s.backup_enabled ? <button class="btn" onClick={async () => { try { const r = await api.post<{ code: string }>('/cloud/backup/enable'); setCode(r.code); reload(); } catch (e) { toast.err((e as Error).message); } }}>{t('Activer la sauvegarde en ligne')}</button> : <>
              <button class="btn" onClick={async () => { try { await api.post('/cloud/backup/now'); toast.ok(t('Sauvegarde envoyée.')); reload(); } catch (e) { toast.err((e as Error).message); } }}>{t('Sauvegarder maintenant')}</button>
              <button class="btn sec" onClick={() => setShow(true)}>{t('Revoir le code de récupération')}</button>
              <button class="btn ghost" onClick={async () => { if (confirm(t('Arrêter la sauvegarde en ligne ? Les sauvegardes déjà envoyées restent sur le serveur.'))) { await api.post('/cloud/backup/disable'); reload(); } }}>{t('Désactiver')}</button>
            </>}
          </div>}
        </>}
      </div>
      <div class="card" style={{ maxWidth: 820 }}>
        <h2>{t('Consultation à distance')} {s.remote_set ? <Badge kind="ok">{t('Activée')}</Badge> : <Badge>{t('Désactivée')}</Badge>}</h2>
        <p class="muted">{t('Consultez vos chiffres clés (ventes, stock, sommes dues aux membres, alertes) depuis votre téléphone, où que vous soyez. Le résumé est mis à jour toutes les 15 minutes quand internet est disponible.')}</p>
        {s.connected && s.remote_set && <p>{t('Adresse')} : <a href={`${s.url}/distant`} target="_blank" rel="noopener">{s.url}/distant</a> · {t('identifiant')} <b class="mono">{s.slug}</b>{s.last_snapshot && <> · {t('dernier envoi')} {frDateTime(s.last_snapshot)}</>}</p>}
        {s.snapshot_error && <div class="msg warn">{s.snapshot_error}</div>}
        {s.connected && admin && <>
          <Field label={s.remote_set ? t("Changer le code d'accès") : t("Choisir un code d'accès (6 caractères au moins)")} name="code" type="password" form={remote} autoComplete="new-password" />
          <FormError error={remote.error} />
          <div class="actions">
            <button class="btn" disabled={remote.busy} onClick={() => remote.submit(async () => { await api.post('/cloud/remote', remote.v); remote.set('code', ''); toast.ok(t('Consultation à distance activée.')); reload(); })}>{t('Enregistrer le code')}</button>
            {s.remote_set && <button class="btn sec" onClick={async () => { await api.post('/cloud/snapshot/now'); toast.ok(t('Résumé envoyé.')); reload(); }}>{t('Envoyer le résumé maintenant')}</button>}
          </div>
        </>}
      </div>
      {code && <RecoveryCode code={code} onClose={() => setCode(null)} />}
      {show && <ShowRecovery onClose={() => setShow(false)} />}
    </>
  );
}

function RecoveryCode({ code, onClose }: { code: string; onClose: () => void }) {
  const [ok, setOk] = useState(false);
  return (
    <Modal title={t('Code de récupération')} onClose={() => { if (ok) onClose(); }} footer={<button class="btn" disabled={!ok} onClick={onClose}>{t("J'ai noté le code")}</button>}>
      <div class="msg warn">{t('Notez ce code sur papier et rangez-le en lieu sûr, hors de l’ordinateur. Sans lui, personne — ni vous ni votre prestataire — ne pourra restaurer les sauvegardes en ligne.')}</div>
      <p class="big mono" style={{ textAlign: 'center', letterSpacing: 1, fontSize: 22 }}>{code}</p>
      <label class="check"><input type="checkbox" checked={ok} onChange={(e) => setOk((e.target as HTMLInputElement).checked)} />{t("J'ai noté le code et je l'ai rangé en lieu sûr")}</label>
    </Modal>
  );
}
function ShowRecovery({ onClose }: { onClose: () => void }) {
  const f = useForm({ password: '' });
  const [code, setCode] = useState<string | null>(null);
  return (
    <Modal title={t('Code de récupération')} onClose={onClose} footer={code ? <button class="btn" onClick={onClose}>{t('Fermer')}</button> : <><button class="btn sec" onClick={onClose}>{t('Annuler')}</button>
      <button class="btn" disabled={f.busy} onClick={() => f.submit(async () => setCode((await api.post<{ code: string }>('/cloud/recovery', f.v)).code))}>{t('Afficher')}</button></>}>
      {code ? <p class="big mono" style={{ textAlign: 'center', fontSize: 22 }}>{code}</p> : <><Field label={t('Votre mot de passe')} name="password" type="password" form={f} required /><FormError error={f.error} /></>}
    </Modal>
  );
}

/** Formulaire de restauration (installation neuve). */
export function RestoreForm({ onCancel }: { onCancel: () => void }) {
  const f = useForm({ url: '', key: '', code: '' });
  const [done, setDone] = useState<string | null>(null);
  if (done) return <div><h1>{t('Restauration terminée')}</h1><div class="msg ok">{t('Les données de la sauvegarde du {d} ont été restaurées.', { d: frDateTime(done) })}</div><p>{t('Grenier redémarre : fermez la fenêtre noire de Grenier si elle est encore ouverte, relancez Grenier, puis connectez-vous avec vos identifiants habituels.')}</p></div>;
  return (
    <form onSubmit={(e) => { e.preventDefault(); f.submit(async () => { const r = await api.post<{ backup_date: string }>('/public/cloud-restore', f.v); setDone(r.backup_date); }); }}>
      <h1>{t('Restaurer mes données')}</h1>
      <p class="muted">{t('Récupérez la dernière sauvegarde en ligne sur ce nouvel ordinateur.')}</p>
      <Field label={t('Adresse du serveur en ligne')} name="url" type="url" form={f} required placeholder="https://grenier.exemple.bf" />
      <Field label={t('Clé du compte')} name="key" form={f} required autoComplete="off" />
      <Field label={t('Code de récupération')} name="code" form={f} required autoComplete="off" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" />
      <FormError error={f.error} />
      <div class="row"><button class="btn" disabled={f.busy}>{f.busy ? t('Restauration…') : t('Restaurer')}</button><button type="button" class="btn sec" onClick={onCancel}>{t('Retour')}</button></div>
    </form>
  );
}

type Summary = { company: { name: string }; generated_at: string; received_at: string; dashboard: any; stock: { name: string; unit: string; stock: number; low: boolean; value: number; kind: string }[]; coop: any };
/** Page publique /distant : le propriétaire consulte le résumé de son installation depuis son téléphone. */
export function Distant() {
  const [tok, setTok] = useState<string | null>(() => { try { return sessionStorage.getItem('grenier.distant'); } catch { return null; } });
  const [d, setD] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const f = useForm({ slug: '', code: '' });
  useEffect(() => {
    if (!tok) return;
    fetch('/api/public/remote/summary', { headers: { 'X-Remote-Token': tok } }).then(async (r) => {
      const j = await r.json(); if (r.ok) setD(j); else { setErr(j.message); if (r.status === 401) { setTok(null); try { sessionStorage.removeItem('grenier.distant'); } catch { /* */ } } }
    }).catch(() => setErr(t('Pas de connexion.')));
  }, [tok]);
  if (!tok) return (
    <div class="authwrap"><form class="authcard" onSubmit={(e) => { e.preventDefault(); f.submit(async () => { const r = await api.post<{ token: string }>('/public/remote/login', f.v); try { sessionStorage.setItem('grenier.distant', r.token); } catch { /* */ } setTok(r.token); }); }}>
      <h1>{t('Consultation à distance')}</h1><p class="muted">{t('Les chiffres clés de votre entreprise, depuis votre téléphone.')}</p>
      <Field label={t('Identifiant')} name="slug" form={f} required autoComplete="username" />
      <Field label={t("Code d'accès")} name="code" type="password" form={f} required autoComplete="current-password" />
      <FormError error={f.error ?? err} />
      <button class="btn block" disabled={f.busy}>{t('Consulter')}</button>
    </form></div>
  );
  if (!d) return <div class="authwrap"><div class="authcard">{err ? <div class="msg err">{err}</div> : <Loading />}</div></div>;
  const db = d.dashboard;
  return (
    <main class="main" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div class="pagehead"><div><h1>{d.company.name}</h1><p>{t('Situation au {d}', { d: frDateTime(d.generated_at) })}</p></div>
        <button class="btn sec" onClick={() => { try { sessionStorage.removeItem('grenier.distant'); } catch { /* */ } setTok(null); setD(null); }}>{t('Quitter')}</button></div>
      <div class="kpis">
        <div class="kpi"><b>{fcfa(db.sales_month_ttc)}</b><span>{t('Ventes du mois (TTC)')}</span></div>
        <div class="kpi"><b>{fcfa(db.receivables)}</b><span>{t('À encaisser')}{db.late_count ? ` · ${t('dont {n} en retard', { n: db.late_count })}` : ''}</span></div>
        <div class="kpi"><b>{fcfa(db.stock_value)}</b><span>{t('Valeur du stock')}</span></div>
        <div class="kpi"><b>{fcfa(db.owed_to_members)}</b><span>{t('Dû aux membres')}</span></div>
      </div>
      {db.alerts?.length > 0 && <div class="card"><h2>{t('À surveiller')}</h2><ul class="alerts">{db.alerts.map((a: any, i: number) => <li key={i}>{a.message}</li>)}</ul></div>}
      <div class="card"><h2>{t('Stock')}</h2><table><tbody>{d.stock.map((s) => <tr key={s.name}><td>{s.name}</td><td class="right num">{qty(s.stock, s.unit)}</td><td>{s.low ? <Badge kind="warn">{t('Stock bas')}</Badge> : ''}</td></tr>)}</tbody></table></div>
      {d.coop && <div class="card"><h2>{t('Coopérative (30 derniers jours)')}</h2><p>{t('{n} membres ont livré', { n: d.coop.active_members })} · {t('Valeur livrée')} {fcfa(d.coop.delivered_amount)} · {t('Payé')} {fcfa(d.coop.paid_amount)}</p></div>}
    </main>
  );
}
