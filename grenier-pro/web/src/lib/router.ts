// Navigation (adresses classiques, sans #) : le serveur renvoie index.html pour toute adresse inconnue.
import { useEffect, useState } from 'preact/hooks';

const subs = new Set<() => void>();
export function navigate(to: string, replace = false) {
  if (to === location.pathname + location.search) return;
  history[replace ? 'replaceState' : 'pushState'](null, '', to);
  subs.forEach((f) => f());
  window.scrollTo(0, 0);
}
window.addEventListener('popstate', () => subs.forEach((f) => f()));

export function useLocation() {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set((x) => x + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  // « /terrain/ » et « /terrain » sont la même page
  return { path: location.pathname.replace(/\/+$/, '') || '/', query: new URLSearchParams(location.search) };
}

/** match('/ventes/factures/:id', '/ventes/factures/12') → { id: '12' } */
export function match(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split('/').filter(Boolean), b = path.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const out: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) out[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return out;
}

/** Intercepte les clics sur les liens internes (<a href="/…">) pour naviguer sans recharger. */
export function interceptLinks() {
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest('a');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (!href || !href.startsWith('/') || href.startsWith('/api/') || href.startsWith('/v/') || a.dataset.external !== undefined) return;
    e.preventDefault();
    navigate(href);
  });
}
