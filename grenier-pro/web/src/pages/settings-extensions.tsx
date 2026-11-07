// Onglets de paramètres ajoutés par les modules (synchronisation, paiements mobiles…).
import type { Profile } from '../lib/api';

export type SettingsTab = { key: string; label: string; show: (p: Profile) => boolean; render: () => any };
export const settingsTabs: SettingsTab[] = [];
