// Modules ajoutés au menu et aux routes (Qualité, Crédit, Marché…). Chaque module déclare son entrée de menu et ses pages.
import type { Profile } from '../lib/api';
import { Qualite } from './Qualite';

export type NavItem = { href: string; label: string; icon: string; show: (p: Profile) => boolean };
export type PageModule = { nav?: NavItem; routes: [string, (p: Record<string, string>) => any][] };

export const pages: PageModule[] = [
  { nav: { href: '/qualite', label: 'Qualité', icon: 'quality', show: () => true }, routes: [['/qualite', () => <Qualite />]] },
];
