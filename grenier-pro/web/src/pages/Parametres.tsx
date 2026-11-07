import { useEffect, useState } from 'preact/hooks';
import { api, can, session, useApi, ROLE_LABEL, type Role, type User } from '../lib/api';
import { frDate, frDateTime, today } from '../lib/format';
import { t } from '../lib/i18n';
import { navigate, useLocation } from '../lib/router';
import { Badge, Field, FormError, Loading, Modal, PageHead, Tabs, toast, useForm } from '../ui/kit';
import { settingsTabs } from './settings-extensions';

type Tab = string;

export function Parametres() {
  const { query } = useLocation();
  const p = session.profile!;
  const role = p.user.role;
  const tabs: [Tab, string][] = [['entreprise', t('Entreprise')]];
  if (can.admin(role)) tabs.push(['equipe', t('Équipe')], ['licence', p.company.edition === 'local' ? t('Licence') : t('Abonnement')], ['sauvegarde', t('Sauvegarde')]);
  if (can.correct(role)) tabs.push(['sms', t('SMS')], ['trace', t('Traçabilité en ligne')]);
  for (const x of settingsTabs) if (x.show(p)) tabs.push([x.key, t(x.label)]);
  if (can.correct(role)) tabs.push(['journal', t('Journal')]);
  tabs.push(['compte', t('Mon compte')]);
  const tab = tabs.some(([k]) => k === query.get('onglet')) ? query.get('onglet')! : 'entreprise';
  const ext = settingsTabs.find((x) => x.key === tab);
  return (
    <>
      <PageHead title={t('Paramètres')} sub={t('Informations imprimées sur les factures et les étiquettes, équipe, licence, sauvegardes et services en ligne.')} />
      <Tabs tabs={tabs} value={tab} onChange={(k) => navigate(`/parametres?onglet=${k}`, true)} />
      {tab === 'entreprise' && <Entreprise />}
      {tab === 'equipe' && <Equipe />}
      {tab === 'licence' && <Licence />}
      {tab === 'sauvegarde' && <Sauvegarde />}
      {tab === 'sms' && <Sms />}
      {tab === 'trace' && <TraceEnLigne />}
      {tab === 'journal' && <Journal />}
      {tab === 'compte' && <Compte />}
      {ext && <ext.render />}
    </>
  );
}

function Entreprise() {
  const c = session.profile!.company;
  const admin = can.admin(session.profile!.user.role);
  const f = useForm({ name: c.name, phone: c.phone ?? '', address: c.address ?? '', email: c.email ?? '', vat_rate: String(c.vat_rate), ifu: c.ifu ?? '', rccm: c.rccm ?? '' });
  const save = () => f.submit(async () => { await api.put('/settings', { ...f.v, email: f.v.email || null }); await session.refresh(); toast.ok(t('Paramètres enregistrés.')); });
  return (
    <div class="card" style={{ maxWidth: 760 }}>
      <fieldset disabled={!admin} style={{ border: 0, padding: 0, margin: 0 }}>
        <div class="row"><Field label={t("Nom de l'entreprise")} name="name" form={f} required maxLength={120} /><Field label={t('Téléphone')} name="phone" form={f} maxLength={30} /></div>
        <div class="row"><Field label={t('Adresse')} name="address" form={f} maxLength={200} /><Field label={t('E-mail')} name="email" type="email" form={f} /></div>
        <div class="row"><Field label={t('TVA appliquée (%)')} name="vat_rate" form={f} inputMode="decimal" hint={t('Taux standard au Burkina Faso : 18 %.')} /><Field label="IFU" name="ifu" form={f} maxLength={40} /><Field label="RCCM" name="rccm" form={f} maxLength={60} /></div>
      </fieldset>
      <FormError error={f.error} />
      {admin ? <button class="btn" disabled={f.busy} onClick={save}>{t('Enregistrer')}</button> : <p class="muted small">{t('Seul le propriétaire peut modifier ces informations.')}</p>}
    </div>
  );
}

function Equipe() {
  const { data, error, reload } = useApi<User[]>('/users');
  const me = session.profile!.user;
  const f = useForm({ name: '', email: '', password: '', role: 'storekeeper' as Role });
  const [reset, setReset] = useState<User | null>(null);
  const update = async (u: User, body: Partial<User> & { password?: string }) => { try { await api.put(`/users/${u.id}`, body); toast.ok(t('Utilisateur modifié.')); reload(); } catch (e) { toast.err((e as Error).message); } };
  return (
    <>
      <div class="card">
        <h2>{t('Équipe')}</h2>
        {!data ? <Loading error={error} /> : (
          <div class="tablewrap"><table>
            <thead><tr><th>{t('Nom')}</th><th>{t('E-mail')}</th><th>{t('Rôle')}</th><th>{t('État')}</th><th /></tr></thead>
            <tbody>{data.map((u) => (
              <tr key={u.id} class={u.active ? '' : 'dim'}>
                <td>{u.name}</td><td>{u.email}</td>
                <td><select value={u.role} disabled={u.id === me.id} aria-label={t('Rôle de {n}', { n: u.name })} onChange={(e) => update(u, { role: (e.target as HTMLSelectElement).value as Role })}>{(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option value={r} key={r}>{t(ROLE_LABEL[r])}</option>)}</select></td>
                <td>{u.active ? <Badge kind="ok">{t('Actif')}</Badge> : <Badge>{t('Désactivé')}</Badge>}</td>
                <td class="actions-cell">{u.id !== me.id && <><button class="btn ghost" onClick={() => setReset(u)}>{t('Nouveau mot de passe')}</button><button class="btn ghost" onClick={() => update(u, { active: !u.active })}>{u.active ? t('Désactiver') : t('Réactiver')}</button></>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
      <div class="card" style={{ maxWidth: 760 }}>
        <h2>{t('Ajouter un utilisateur')}</h2>
        <div class="row"><Field label={t('Nom')} name="name" form={f} required maxLength={120} /><Field label={t('E-mail')} name="email" type="email" form={f} required /></div>
        <div class="row"><Field label={t('Mot de passe provisoire')} name="password" form={f} required minLength={8} hint={t('8 caractères au moins ; à changer par la personne.')} />
          <Field label={t('Rôle')} name="role" form={f}>{(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option value={r} key={r}>{t(ROLE_LABEL[r])}</option>)}</Field></div>
        <p class="small muted">{t('Gérant : tout sauf les paramètres et l’équipe. Magasinier : stock, production, livraisons. Comptable : clients, factures, paiements. Agent coopérative : membres, livraisons, paiements.')}</p>
        <FormError error={f.error} />
        <button class="btn" disabled={f.busy} onClick={() => f.submit(async () => { await api.post('/users', f.v); toast.ok(t('Utilisateur ajouté.')); f.setV({ name: '', email: '', password: '', role: 'storekeeper' }); reload(); })}>{t('Ajouter')}</button>
      </div>
      {reset && <ResetDialog u={reset} onClose={() => setReset(null)} onDone={() => { setReset(null); reload(); }} />}
    </>
  );
}
function ResetDialog({ u, onClose, onDone }: { u: User; onClose: () => void; onDone: () => void }) {
  const f = useForm({ password: '' });
  return (
    <Modal title={t('Nouveau mot de passe pour {n}', { n: u.name })} onClose={onClose} footer={<><button class="btn sec" onClick={onClose}>{t('Annuler')}</button>
      <button class="btn" disabled={f.busy} onClick={() => f.submit(async () => { await api.put(`/users/${u.id}`, f.v); toast.ok(t('Mot de passe changé ; ses sessions ouvertes sont fermées.')); onDone(); })}>{t('Enregistrer')}</button></>}>
      <Field label={t('Mot de passe provisoire')} name="password" form={f} required minLength={8} />
      <FormError error={f.error} />
    </Modal>
  );
}

function Compte() {
  const me = session.profile!.user;
  const f = useForm({ password: '', confirm: '' });
  return (
    <div class="card" style={{ maxWidth: 520 }}>
      <h2>{me.name}</h2><p class="muted">{me.email} · {t(ROLE_LABEL[me.role])}</p>
      <h3>{t('Changer mon mot de passe')}</h3>
      <Field label={t('Nouveau mot de passe')} name="password" type="password" form={f} minLength={8} autoComplete="new-password" />
      <Field label={t('Confirmer')} name="confirm" type="password" form={f} autoComplete="new-password" />
      <FormError error={f.error} />
      <button class="btn" disabled={f.busy} onClick={() => f.submit(async () => {
        if (f.v.password !== f.v.confirm) { f.setError(t('Les deux mots de passe ne correspondent pas.')); return; }
        await api.post('/me/password', { password: f.v.password }); toast.ok(t('Mot de passe changé.')); f.setV({ password: '', confirm: '' });
      })}>{t('Enregistrer')}</button>
    </div>
  );
}

const LIC: Record<string, (s: any) => [string, string]> = {
  licence: (s) => ['ok', t("Licence valide — {c}, offre {p}{e}.", { c: s.client, p: s.plan, e: s.expires ? t(", jusqu'au {d}", { d: frDate(s.expires) }) : t(', sans date de fin') })],
  licence_expiree: (s) => ['err', t('Licence expirée le {d} : Grenier est en lecture seule. Collez la nouvelle licence ci-dessous.', { d: frDate(s.expires) })],
  essai: (s) => ['warn', t("Période d'essai jusqu'au {d}. Collez votre licence pour continuer après cette date.", { d: frDate(s.trial_ends) })],
  essai_termine: (s) => ['err', t("Période d'essai terminée le {d} : Grenier est en lecture seule. Collez votre licence ci-dessous.", { d: frDate(s.trial_ends) })],
  hebergee: () => ['ok', t("Version hébergée : l'abonnement est géré par votre prestataire.")],
  sans_controle: () => ['ok', t('Aucun contrôle de licence sur cette installation (démonstration).')],
};
function Licence() {
  const { data, error, reload } = useApi<any>('/licence');
  const c = session.profile!.company;
  const f = useForm({ text: '' });
  if (!data) return <Loading error={error} />;
  const [k, txt] = (LIC[data.state] ?? (() => ['warn', data.state]))(data);
  return (
    <div class="card" style={{ maxWidth: 760 }}>
      <p>{t('Offre')} <b>{c.plan_label}</b>{c.paid_until && <> · {t("jusqu'au {d}", { d: frDate(c.paid_until) })}</>}</p>
      <div class={`msg ${k}`}>{txt}</div>
      {data.error && <div class="msg err">{t('Licence enregistrée refusée')} : {data.error}</div>}
      {!['hebergee', 'sans_controle'].includes(data.state) && <>
        <Field label={t('Coller la licence reçue')} name="text" type="textarea" form={f} />
        <FormError error={f.error} />
        <button class="btn" disabled={f.busy} onClick={() => f.submit(async () => { await api.post('/licence', { text: f.v.text }); f.set('text', ''); await session.refresh(); reload(); toast.ok(t('Licence enregistrée.')); })}>{t('Enregistrer la licence')}</button>
      </>}
    </div>
  );
}

function Sauvegarde() {
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      const r = await api.raw('/backup');
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement('a'); a.href = url; a.download = `grenier-sauvegarde-${today()}.db`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) { toast.err((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div class="card" style={{ maxWidth: 760 }}>
      <p>{t('Grenier sauvegarde vos données automatiquement chaque jour (30 jours conservés). Une copie sur le même ordinateur ne protège pas d’une panne ou d’un vol : téléchargez aussi une copie chaque semaine et gardez-la ailleurs (clé USB, e-mail), ou activez la sauvegarde en ligne.')}</p>
      <button class="btn" disabled={busy} onClick={download}>{t('Télécharger une sauvegarde')}</button>
    </div>
  );
}

const SMS_STATE: Record<string, [string, '' | 'ok' | 'warn' | 'bad']> = { pending: ['En attente', 'warn'], retry: ['Nouvel essai', 'warn'], sent: ['Envoyé', 'ok'], failed: ['Échec', 'bad'], journal: ['Préparé (pas de passerelle)', ''] };
function Sms() {
  const { data, error, reload } = useApi<any>('/messages');
  const c = session.profile!.company;
  const admin = can.admin(session.profile!.user.role);
  const toggle = async (on: boolean) => { try { await api.put('/settings', { sms_enabled: on }); await session.refresh(); toast.ok(on ? t('SMS activés.') : t('SMS coupés.')); } catch (e) { toast.err((e as Error).message); } };
  if (!data) return <Loading error={error} />;
  return (
    <div class="card">
      <h2>{t('Reçus par SMS aux membres')}</h2>
      <label class="check"><input type="checkbox" checked={c.sms_enabled} disabled={!admin} onChange={(e) => toggle((e.target as HTMLInputElement).checked)} />{t('Envoyer un SMS au membre à chaque livraison, paiement et annulation')}</label>
      <p class="muted small">{data.provider === 'journal' ? t("Aucune passerelle SMS n'est configurée : les messages sont préparés ici mais pas envoyés (voir le guide de mise en service).") : t('Passerelle : {p}.', { p: data.provider })}</p>
      <p><button class="btn sec" onClick={async () => { const r = await api.post('/messages/flush'); toast.ok(t('{n} message(s) envoyé(s).', { n: r.sent })); reload(); }}>{t('Envoyer les messages en attente')}</button></p>
      <div class="tablewrap"><table><thead><tr><th>{t('Date')}</th><th>{t('Numéro')}</th><th>{t('Message')}</th><th>{t('État')}</th><th /></tr></thead>
        <tbody>{data.items.map((m: any) => { const [l, k] = SMS_STATE[m.status] ?? [m.status, '']; return (
          <tr key={m.id}><td class="num">{frDateTime(m.created_at)}</td><td class="num">{m.to_phone}</td><td class="small">{m.body}{m.error && <div class="msg err">{m.error}</div>}</td><td><Badge kind={k}>{t(l)}</Badge></td>
            <td>{m.status === 'failed' && <button class="btn ghost" onClick={async () => { await api.post(`/messages/${m.id}/retry`); await api.post('/messages/flush'); reload(); }}>{t('Réessayer')}</button>}</td></tr>); })}
          {!data.items.length && <tr><td colspan={5} class="muted">{t('Aucun message.')}</td></tr>}</tbody></table></div>
    </div>
  );
}

function TraceEnLigne() {
  const { data: s, error, reload } = useApi<any>('/registry/status');
  const admin = can.admin(session.profile!.user.role);
  const f = useForm({ url: '', key: '' });
  if (!s) return <Loading error={error} />;
  return (
    <div class="card" style={{ maxWidth: 820 }}>
      <h2>{t('QR codes vérifiables en ligne')}</h2>
      <p class="muted">{t('Les QR imprimés pointent vers une page de vérification que tout client peut ouvrir avec son téléphone (« Lot authentique », date limite, villages d’origine — jamais les noms des producteurs ni les prix).')}</p>
      {s.hosted ? (s.public_url ? <div class="msg ok">{t('Version hébergée : les QR pointent vers {u}. Aucune liaison nécessaire.', { u: s.public_url })}</div> : <div class="msg warn">{t('Version hébergée sans adresse publique : définissez GRENIER_PUBLIC_URL sur le serveur.')}</div>) : <>
        {s.connected
          ? <div class="msg ok">{t('Relié à {u} (identifiant {s}). Lots publiés : {p} · en attente : {w}.', { u: s.url, s: s.slug, p: s.published, w: s.pending })}{s.last_ok && ` ${t('Dernier envoi réussi : {d}.', { d: frDateTime(s.last_ok) })}`}</div>
          : <div class="msg warn">{t('Non relié : les QR contiennent seulement le texte du lot (lisible sans internet, mais pas vérifiable).')}</div>}
        {s.last_error && <div class="msg warn">{t('Dernière erreur : {e} (normal sans internet ; nouvel essai toutes les 10 minutes).', { e: s.last_error })}</div>}
        {admin && <>
          <div class="row"><Field label={t('Adresse du registre')} name="url" type="url" form={f} placeholder="https://grenier.exemple.bf" /><Field label={t('Clé du registre')} name="key" form={f} hint={t('Fournie par votre prestataire.')} autoComplete="off" /></div>
          <FormError error={f.error} />
          <div class="actions"><button class="btn" disabled={f.busy} onClick={() => f.submit(async () => { const r = await api.post('/registry/connect', f.v); f.setV({ url: '', key: '' }); await session.refresh(); reload(); toast.ok(t('Relié au registre (identifiant {s}).', { s: r.slug })); })}>{t('Relier au registre')}</button>
            {s.connected && <button class="btn sec" onClick={async () => { const r = await api.post('/registry/publish'); reload(); toast.ok(t('{n} lot(s) publié(s).', { n: r.published })); }}>{t('Publier maintenant')}</button>}</div>
          <p class="small muted">{t('Après la liaison, réimprimez les étiquettes des lots en stock : les anciennes restent lisibles mais ne sont pas vérifiables en ligne.')}</p>
        </>}
      </>}
    </div>
  );
}

function Journal() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [more, setMore] = useState(true);
  const load = async (before?: number) => { const r = await api.get<any[]>('/audit', { before }); setRows((x) => [...(before ? x ?? [] : []), ...r]); setMore(r.length === 100); };
  useEffect(() => { load(); }, []);
  if (rows === null) return <Loading />;
  const detail = (s: string | null) => { if (!s) return ''; try { return Object.entries(JSON.parse(s)).map(([k, v]) => `${k} : ${v}`).join(' · '); } catch { return s; } };
  return (
    <div class="card">
      <h2>{t('Journal des actions')}</h2>
      <p class="muted small">{t('Qui a fait quoi, et quand. Le journal ne peut pas être modifié depuis l’application.')}</p>
      <div class="tablewrap"><table><thead><tr><th>{t('Date')}</th><th>{t('Utilisateur')}</th><th>{t('Action')}</th><th>{t('Détail')}</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td class="num">{frDateTime(r.at)}</td><td>{r.user_name ?? '—'}</td><td><b>{t(r.action)}</b>{r.entity_id ? <span class="muted"> #{r.entity_id}</span> : null}</td><td class="small">{detail(r.detail)}</td></tr>)}</tbody></table></div>
      {more && <p><button class="btn sec" onClick={() => load(rows[rows.length - 1]?.id)}>{t('Afficher plus ancien')}</button></p>}
    </div>
  );
}
