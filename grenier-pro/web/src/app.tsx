// Coquille de l'application : session, menu, routes.
import { useEffect, useState } from 'preact/hooks';
import { session, useSession, can, ROLE_LABEL, api, ApiError, type Profile } from './lib/api';
import { useLocation, match, navigate } from './lib/router';
import { t, useLang, LANGS, setLang, getLang, type Lang } from './lib/i18n';
import { Icon, ToastHost, Loading } from './ui/kit';
import { Login, Setup } from './pages/Auth';
import { Accueil } from './pages/Accueil';
import { Stock } from './pages/Stock';
import { Production } from './pages/Production';
import { Ventes, FacturePage } from './pages/Ventes';
import { Tracabilite, TraceDetail, Etiquettes, PublicTrace } from './pages/Tracabilite';
import { Cooperative, MembrePage, RecuPage } from './pages/Cooperative';
import { Parametres } from './pages/Parametres';
import { Terrain } from './pages/Terrain';
import { Distant } from './pages/Cloud';
import { pages as extraPages } from './pages/extensions';

type NavItem = { href: string; label: string; icon: string; show: (p: Profile) => boolean };
export const NAV: NavItem[] = [
  { href: '/', label: 'Accueil', icon: 'home', show: () => true },
  { href: '/stock', label: 'Stock', icon: 'stock', show: () => true },
  { href: '/production', label: 'Production', icon: 'prod', show: () => true },
  { href: '/ventes', label: 'Ventes', icon: 'sales', show: (p) => can.sales(p.user.role) || can.correct(p.user.role) },
  { href: '/tracabilite', label: 'Traçabilité', icon: 'trace', show: () => true },
  { href: '/cooperative', label: 'Coopérative', icon: 'coop', show: (p) => p.company.features.coop },
  ...extraPages.filter((x) => x.nav).map((x) => x.nav!),
  { href: '/terrain', label: 'Terrain', icon: 'field', show: (p) => p.company.features.coop && (can.coop(p.user.role) || can.payout(p.user.role)) },
  { href: '/parametres', label: 'Paramètres', icon: 'settings', show: () => true },
];

const ROUTES: [string, (p: Record<string, string>) => any][] = [
  ['/', () => <Accueil />],
  ['/stock', () => <Stock />],
  ['/production', () => <Production />],
  ['/ventes', () => <Ventes />],
  ['/ventes/factures/:id', (p) => <FacturePage id={Number(p.id)} />],
  ['/tracabilite', () => <Tracabilite />],
  ['/tracabilite/:code', (p) => <TraceDetail code={p.code} />],
  ['/etiquettes', () => <Etiquettes />],
  ['/cooperative', () => <Cooperative />],
  ['/cooperative/membres/:id', (p) => <MembrePage id={Number(p.id)} />],
  ['/cooperative/recus/:id', (p) => <RecuPage id={Number(p.id)} />],
  ['/parametres', () => <Parametres />],
  ...extraPages.flatMap((x) => x.routes),
];

function NotFound() {
  return <div class="card"><h1>{t('Page introuvable')}</h1><p><a href="/">{t("Retour à l'accueil")}</a></p></div>;
}

function Shell({ profile, children, path }: { profile: Profile; children: any; path: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const items = NAV.filter((n) => n.show(profile));
  const active = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(href + '/'));
  const logout = async () => { try { await api.post('/auth/logout'); } catch { /* hors ligne */ } session.clear(); navigate('/login'); };
  const mobile = items.filter((n) => ['/', '/stock', '/ventes', '/cooperative', '/terrain'].includes(n.href)).slice(0, 4);
  return (
    <div class="shell">
      <aside class={`side${open ? ' open' : ''}`} aria-label={t('Menu')}>
        <div class="band" />
        <div class="brand"><b>Grenier</b><span>{profile.company.name}</span></div>
        <nav class="nav" aria-label={t('Navigation principale')}>
          {items.map((n) => <a class={`navlink${active(n.href) ? ' active' : ''}`} href={n.href} aria-current={active(n.href) ? 'page' : undefined} key={n.href}><Icon name={n.icon} />{t(n.label)}</a>)}
        </nav>
        <div class="side-foot">
          {profile.user.name} · {t(ROLE_LABEL[profile.user.role])}<br />
          {t('Offre')} {profile.company.plan_label}{!profile.company.writable && <><br /><b style={{ color: '#F08A82' }}>{t('Lecture seule')}</b></>}
          <label class="small" style={{ display: 'block', marginTop: 10 }}>{t('Langue')}
            <select value={getLang()} onChange={(e) => setLang((e.target as HTMLSelectElement).value as Lang)}>
              {LANGS.map((l) => <option value={l.code} key={l.code}>{l.label}{l.draft ? ' (brouillon)' : ''}</option>)}
            </select>
          </label>
          <button class="linkbtn" onClick={logout}><Icon name="logout" size={15} />{t('Se déconnecter')}</button>
        </div>
      </aside>
      <div>
        <div class="topbar no-print">
          <button onClick={() => setOpen(true)} aria-label={t('Ouvrir le menu')}><Icon name="menu" size={22} /></button>
          <b>Grenier</b><span class="sp" /><span class="small">{profile.company.name}</span>
        </div>
        {!profile.company.writable && <div class="msg err no-print" style={{ margin: '12px 16px 0', borderRadius: 10 }}>{t("Abonnement ou licence expiré : l'application est en lecture seule.")} {can.admin(profile.user.role) && <a href="/parametres?onglet=licence">{t('Régulariser')}</a>}</div>}
        <main class="main" id="contenu">{children}</main>
        <nav class="bottomnav no-print" aria-label={t('Navigation rapide')}>
          {mobile.map((n) => <a class={active(n.href) ? 'active' : ''} href={n.href} key={n.href}><Icon name={n.icon} size={22} />{t(n.label)}</a>)}
          <button onClick={() => setOpen(true)}><Icon name="more" size={22} />{t('Plus')}</button>
        </nav>
      </div>
    </div>
  );
}

export function App() {
  useLang();
  const profile = useSession();
  const { path } = useLocation();
  const [state, setState] = useState<'loading' | 'ready' | 'offline' | 'setup'>('loading');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const info = await api.get<{ needs_setup: boolean; mode: string }>('/public/info');
        if (info.needs_setup) { setState('setup'); return; }
        await session.restore();
        setState('ready');
      } catch (e) {
        if (e instanceof ApiError && e.status === 0) setState('offline');
        else { setErr((e as Error).message); setState('ready'); }
      }
    })();
  }, []);

  // pages publiques
  const pub = match('/t/:slug/:code', path);
  if (pub) return <PublicTrace slug={pub.slug} code={pub.code} />;
  if (path === '/distant') return <Distant />;
  // la collecte terrain fonctionne sans connexion (données gardées sur le téléphone)
  if (path === '/terrain' && (state === 'offline' || state === 'ready')) return <><Terrain offline={state === 'offline'} /><ToastHost /></>;
  if (state === 'loading') return <div class="authwrap"><div class="authcard"><Loading /></div></div>;
  if (state === 'offline') return <div class="authwrap"><div class="authcard"><h1>Grenier</h1><p>{t('Pas de connexion au serveur Grenier.')}</p><p class="muted">{t('Vérifiez que le poste principal est allumé et que vous êtes sur le même réseau.')}</p><p><a class="btn" href="/terrain" data-external>{t('Ouvrir la collecte terrain')}</a></p></div></div>;
  if (state === 'setup' || path === '/inscription') return <><Setup onDone={() => setState('ready')} /><ToastHost /></>;
  if (!profile) return <><Login /><ToastHost /></>;
  if (path === '/login') { navigate('/', true); return null; }

  let page: any = null;
  for (const [pattern, render] of ROUTES) { const m = match(pattern, path); if (m) { page = render(m); break; } }
  return <>
    <Shell profile={profile} path={path}>{err ? <div class="msg err">{err}</div> : null}{page ?? <NotFound />}</Shell>
    <ToastHost />
  </>;
}
