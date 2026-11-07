import { api, session, type Profile } from '../lib/api';
import { navigate } from '../lib/router';
import { t } from '../lib/i18n';
import { Field, FormError, useForm } from '../ui/kit';

export function Login() {
  const f = useForm({ email: '', password: '' });
  return (
    <div class="authwrap">
      <form class="authcard" onSubmit={(e) => { e.preventDefault(); f.submit(async () => { session.set(await api.post<Profile>('/auth/login', f.v)); navigate(location.pathname === '/login' ? '/' : location.pathname + location.search, true); }); }}>
        <h1>Grenier</h1>
        <p class="muted">{t('Connectez-vous à votre espace.')}</p>
        <Field label={t('Adresse e-mail')} name="email" type="email" form={f} required autoComplete="username" />
        <Field label={t('Mot de passe')} name="password" type="password" form={f} required autoComplete="current-password" />
        <FormError error={f.error} />
        <button class="btn block" disabled={f.busy}>{t('Se connecter')}</button>
        <p class="small muted">{t('Mot de passe oublié ? Demandez au propriétaire de le réinitialiser (Paramètres → Équipe).')}</p>
        <p class="small"><a href="/terrain" data-external>{t('Collecte terrain (agents)')}</a></p>
      </form>
    </div>
  );
}

export function Setup({ onDone }: { onDone: () => void }) {
  const f = useForm({ company_name: '', name: '', email: '', phone: '', password: '' });
  return (
    <div class="authwrap">
      <form class="authcard" onSubmit={(e) => { e.preventDefault(); f.submit(async () => { session.set(await api.post<Profile>('/auth/register', f.v)); onDone(); navigate('/parametres', true); }); }}>
        <h1>{t('Bienvenue')}</h1>
        <p class="muted">{t('Créez votre espace. Ce compte est celui du propriétaire : notez bien le mot de passe.')}</p>
        <Field label={t("Nom de l'entreprise ou de la coopérative")} name="company_name" form={f} required maxLength={120} />
        <Field label={t('Votre nom')} name="name" form={f} required maxLength={120} />
        <Field label={t('Adresse e-mail')} name="email" type="email" form={f} required />
        <Field label={t('Téléphone')} name="phone" type="tel" form={f} maxLength={30} />
        <Field label={t('Mot de passe')} name="password" type="password" form={f} required minLength={8} hint={t('8 caractères au moins.')} autoComplete="new-password" />
        <FormError error={f.error} />
        <button class="btn block" disabled={f.busy}>{t('Créer mon espace')}</button>
      </form>
    </div>
  );
}
