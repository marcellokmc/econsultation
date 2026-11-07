// Modules ajoutés au menu et aux routes (Qualité, Crédit, Marché…). Chaque module déclare son entrée de menu et ses pages.
import type { Profile } from '../lib/api';
import { Qualite } from './Qualite';
import { Credit, RecepissePage } from './Credit';
import { Marche } from './Marche';

export type NavItem = { href: string; label: string; icon: string; show: (p: Profile) => boolean };
export type PageModule = { nav?: NavItem; routes: [string, (p: Record<string, string>) => any][] };

export const pages: PageModule[] = [
  { nav: { href: '/qualite', label: 'Qualité', icon: 'quality', show: () => true }, routes: [['/qualite', () => <Qualite />]] },
  { nav: { href: '/credit', label: 'Crédit', icon: 'credit', show: (p) => ['owner', 'manager', 'accountant'].includes(p.user.role) },
    routes: [['/credit', () => <Credit />], ['/credit/recepisses/:id', (p) => <RecepissePage id={Number(p.id)} />]] },
  { nav: { href: '/marche', label: 'Marché', icon: 'market', show: () => true }, routes: [['/marche', () => <Marche />]] },
];
