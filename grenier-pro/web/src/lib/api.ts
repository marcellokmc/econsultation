// Appels à l'API Grenier + session (jeton dans localStorage, même clé que les versions précédentes).
import { useEffect, useState } from 'preact/hooks';

export type Role = 'owner' | 'manager' | 'storekeeper' | 'accountant' | 'coop_agent';
export interface User { id: number; name: string; email: string; role: Role; active: boolean }
export interface Company {
  id: number; name: string; slug: string; address: string | null; phone: string | null; email: string | null; ifu: string | null; rccm: string | null;
  vat_rate: number; trace_base_url: string | null; plan: string; plan_label: string; subscription_status: string; writable: boolean;
  trial_ends_at: string | null; paid_until: string | null; features: { coop: boolean }; sms_enabled: boolean; registry_connected: boolean;
  registry_slug: string | null; edition: 'local' | 'saas';
}
export interface Profile { user: User; company: Company; token?: string }

const TOKEN_KEY = 'grenier.token';
const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string | null) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* rien */ } },
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public errors?: Record<string, string[]>, public code?: string) { super(message); }
}

// ---------- session ----------
let profile: Profile | null = null;
let token: string | null = ls.get(TOKEN_KEY);
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
let notice: ((kind: 'ok' | 'err' | 'warn', text: string) => void) | null = null;
export const onNotice = (f: typeof notice) => { notice = f; };

export const session = {
  get profile() { return profile; },
  get token() { return token; },
  set(p: Profile) { if (p.token) { token = p.token; ls.set(TOKEN_KEY, p.token); } profile = { user: p.user, company: p.company }; emit(); },
  clear() { token = null; profile = null; ls.set(TOKEN_KEY, null); emit(); },
  async restore() {
    if (!token) return null;
    try { session.set(await api.get<Profile>('/me')); } catch (e) { if (e instanceof ApiError && e.status === 401) session.clear(); else throw e; }
    return profile;
  },
  async refresh() { if (token) session.set(await api.get<Profile>('/me')); },
};
export function useSession() {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set((x) => x + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return profile;
}

/** Droits par rôle (le serveur applique les mêmes règles). */
export const can = {
  items: (r?: Role) => r === 'owner' || r === 'manager',
  stock: (r?: Role) => ['owner', 'manager', 'storekeeper'].includes(r as string),
  sales: (r?: Role) => ['owner', 'manager', 'accountant'].includes(r as string),
  coop: (r?: Role) => ['owner', 'manager', 'coop_agent', 'storekeeper'].includes(r as string),
  payout: (r?: Role) => ['owner', 'manager', 'accountant', 'coop_agent'].includes(r as string),
  correct: (r?: Role) => r === 'owner' || r === 'manager',
  admin: (r?: Role) => r === 'owner',
};
export const ROLE_LABEL: Record<Role, string> = { owner: 'Propriétaire', manager: 'Gérant', storekeeper: 'Magasinier', accountant: 'Comptable', coop_agent: 'Agent coopérative' };

// ---------- requêtes ----------
async function request<T>(method: string, url: string, body?: unknown, raw = false): Promise<T> {
  let r: Response;
  try {
    r = await fetch('/api' + url, { method, headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'Pas de connexion au serveur Grenier.');
  }
  if (raw && r.ok) return r as unknown as T;
  const text = await r.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* réponse non JSON */ }
  if (!r.ok) {
    if (r.status === 401 && token && !url.startsWith('/auth/')) { session.clear(); }
    if (r.status === 402) { notice?.('err', json?.message ?? 'Abonnement expiré : lecture seule.'); session.refresh().catch(() => {}); }
    throw new ApiError(r.status, json?.message || `Erreur ${r.status}`, json?.errors, json?.code);
  }
  return json as T;
}
const qs = (q?: Record<string, unknown>) => {
  if (!q) return '';
  const p = Object.entries(q).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return p.length ? '?' + p.join('&') : '';
};
export const api = {
  get: <T = any>(url: string, q?: Record<string, unknown>) => request<T>('GET', url + qs(q)),
  post: <T = any>(url: string, body: unknown = {}) => request<T>('POST', url, body),
  put: <T = any>(url: string, body: unknown) => request<T>('PUT', url, body),
  raw: (url: string) => request<Response>('GET', url, undefined, true),
};

/** Charge des données ; reload() relance. */
export function useApi<T>(url: string | null, q?: Record<string, unknown>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [n, setN] = useState(0);
  const key = url ? url + qs(q) : null;
  useEffect(() => {
    if (!key) return;
    let alive = true;
    setError(null);
    request<T>('GET', key).then((d) => alive && setData(d)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [key, n]);
  return { data, error, loading: !data && !error, reload: () => setN((x) => x + 1), setData };
}
