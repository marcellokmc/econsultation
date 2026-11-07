// Traduction. Le texte français sert de clé : t('Nouvelle livraison'). Les dictionnaires (src/i18n/*.ts)
// associent ce texte français à sa traduction ; un texte non traduit s'affiche en français.
// Variables : t('{n} membre(s)', { n: 3 }).
import { useEffect, useState } from 'preact/hooks';
import { mos } from '../i18n/mos';
import { dyu } from '../i18n/dyu';
import { ff } from '../i18n/ff';

export type Lang = 'fr' | 'mos' | 'dyu' | 'ff';
const DICTS: Record<Lang, Record<string, string>> = { fr: {}, mos, dyu, ff };
/** Langues proposées : le français, et chaque langue dès que des traductions ont été importées (scripts/textes.mjs). */
export const LANGS: { code: Lang; label: string; draft?: boolean }[] = ([
  { code: 'fr', label: 'Français' },
  { code: 'mos', label: 'Mooré', draft: true },
  { code: 'dyu', label: 'Dioula', draft: true },
  { code: 'ff', label: 'Fulfulde', draft: true },
] as { code: Lang; label: string; draft?: boolean }[]).filter((l) => l.code === 'fr' || Object.keys(DICTS[l.code]).length > 0);
const KEY = 'grenier.lang';

let lang: Lang = (() => { try { return (localStorage.getItem(KEY) as Lang) || 'fr'; } catch { return 'fr'; } })();
if (!LANGS.some((l) => l.code === lang)) lang = 'fr';
const listeners = new Set<() => void>();

export function t(fr: string, vars?: Record<string, string | number>): string {
  let s = DICTS[lang][fr] ?? fr;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
export const getLang = () => lang;
export function setLang(l: Lang) {
  lang = l;
  try { localStorage.setItem(KEY, l); } catch { /* navigation privée */ }
  document.documentElement.lang = l;
  listeners.forEach((f) => f());
}
/** Re-rend le composant quand la langue change. */
export function useLang() {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set((x) => x + 1); listeners.add(f); return () => { listeners.delete(f); }; }, []);
  return lang;
}
