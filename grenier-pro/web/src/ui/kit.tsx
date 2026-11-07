// Composants d'interface réutilisables.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ApiError, onNotice } from '../lib/api';
import { t } from '../lib/i18n';

// ---------- icônes (tracé 24×24, trait) ----------
const P: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  stock: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  prod: 'M3 21V9l6 4V9l6 4V5h3v16zM7 17h2M12 17h2',
  sales: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  trace: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v3M17 20h4',
  coop: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  quality: 'M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6zM9 12l2 2 4-4',
  credit: 'M3 10h18M5 10V20M19 10V20M9 10v10M15 10v10M2 21h20M12 3l9 5H3z',
  market: 'M3 9l1.5-5h15L21 9M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0zM5 13v8h14v-8',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  field: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5',
  logout: 'M9 4H5v16h4M16 8l4 4-4 4M20 12H9',
  menu: 'M3 6h18M3 12h18M3 18h18',
  warn: 'M12 3 2 21h20zM12 10v5M12 18h.01',
  plus: 'M12 5v14M5 12h14',
  print: 'M6 9V3h12v6M6 18H4v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6h-2M6 14h12v7H6z',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
};
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d={P[name] ?? ''} />
    </svg>
  );
}

// ---------- notifications ----------
type Toast = { kind: 'ok' | 'err' | 'warn'; text: string } | null;
let pushToast: (t: Toast) => void = () => {};
export const toast = { ok: (text: string) => pushToast({ kind: 'ok', text }), err: (text: string) => pushToast({ kind: 'err', text }), warn: (text: string) => pushToast({ kind: 'warn', text }) };
onNotice((kind, text) => pushToast({ kind, text }));
export function ToastHost() {
  const [cur, set] = useState<Toast>(null);
  useEffect(() => { pushToast = (x) => { set(x); }; }, []);
  useEffect(() => { if (!cur) return; const h = setTimeout(() => set(null), cur.kind === 'err' ? 7000 : 3500); return () => clearTimeout(h); }, [cur]);
  return cur ? <div class={`toast msg ${cur.kind}`} role={cur.kind === 'err' ? 'alert' : 'status'} onClick={() => set(null)}>{cur.text}</div> : null;
}

// ---------- fenêtre modale ----------
export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ComponentChildren; footer?: ComponentChildren; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const f = ref.current?.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea, button:not(.x)');
    f?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = ''; prev?.focus?.(); };
  }, []);
  return (
    <div class="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <header><h2>{title}</h2><button class="x no-print" onClick={onClose} aria-label={t('Fermer')}>×</button></header>
        {children}
        {footer && <footer class="no-print">{footer}</footer>}
      </div>
    </div>
  );
}

// ---------- formulaires ----------
export type Errors = Record<string, string[] | undefined>;
/** Gestion d'un formulaire : valeurs, erreurs du serveur, envoi. */
export function useForm<T extends Record<string, any>>(initial: T) {
  const [v, setV] = useState<T>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof T, val: any) => setV((x) => ({ ...x, [k]: val }));
  async function submit(fn: () => Promise<void>) {
    setBusy(true); setError(null); setErrors({});
    try { await fn(); }
    catch (e) {
      if (e instanceof ApiError) { setErrors(e.errors ?? {}); setError(e.message); }
      else setError(String((e as Error).message ?? e));
    } finally { setBusy(false); }
  }
  return { v, set, setV, errors, busy, error, setError, submit };
}
/** Autres attributs (maxLength, min, max, inputMode, placeholder, autoComplete…) transmis au champ. */
type FieldProps = { label: string; name: string; form: { v: any; set: (k: any, v: any) => void; errors: Errors }; hint?: string; type?: string; required?: boolean; children?: ComponentChildren; [attr: string]: any };
export function Field({ label, name, form, hint, type = 'text', required, children, ...rest }: FieldProps) {
  const err = form.errors[name]?.[0];
  const id = `f-${name}`;
  const common = { id, name, value: form.v[name] ?? '', 'aria-invalid': err ? true : undefined, required };
  return (
    <label class={`f${err ? ' err' : ''}`} for={id}>
      <span>{label}{required ? ' *' : ''}</span>
      {children
        ? <select {...(common as any)} onChange={(e) => form.set(name, (e.target as HTMLSelectElement).value)}>{children}</select>
        : type === 'textarea'
          ? <textarea {...(common as any)} onInput={(e) => form.set(name, (e.target as HTMLTextAreaElement).value)} />
          : <input {...(rest as any)} {...common} type={type} onInput={(e) => form.set(name, (e.target as HTMLInputElement).value)} />}
      {hint && <small>{hint}</small>}
      {err && <span class="errtxt">{err}</span>}
    </label>
  );
}
export const FormError = ({ error }: { error: string | null }) => (error ? <div class="msg err" role="alert">{error}</div> : null);

// ---------- divers ----------
export function Tabs<K extends string>({ tabs, value, onChange }: { tabs: [K, string][]; value: K; onChange: (k: K) => void }) {
  return (
    <div class="tabs" role="tablist">
      {tabs.map(([k, l]) => <button role="tab" aria-selected={value === k} onClick={() => onChange(k)} key={k}>{l}</button>)}
    </div>
  );
}
export function Chips<K extends string>({ items, value, onChange }: { items: [K, string][]; value: K; onChange: (k: K) => void }) {
  return <div class="chips" role="group">{items.map(([k, l]) => <button aria-pressed={value === k} onClick={() => onChange(k)} key={k}>{l}</button>)}</div>;
}
export const Badge = ({ kind = '', children }: { kind?: '' | 'ok' | 'warn' | 'bad' | 'info'; children: ComponentChildren }) => <span class={`badge ${kind}`}>{children}</span>;
export const Empty = ({ title, children }: { title: string; children?: ComponentChildren }) => <div class="empty"><strong>{title}</strong>{children}</div>;
export const Loading = ({ error }: { error?: string | null }) => (error ? <div class="msg err">{error}</div> : <div class="empty">{t('Chargement…')}</div>);
export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: ComponentChildren }) {
  return <div class="pagehead"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>{children && <div class="actions no-print">{children}</div>}</div>;
}
export function Bars({ data }: { data: { label: string; value: number; text: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div class="bars" role="img" aria-label={data.map((d) => `${d.label} : ${d.text}`).join(', ')}>
      {data.map((d) => <div class="b" key={d.label}><em>{d.value ? d.text : ''}</em><i style={{ height: `${Math.max(1, (d.value / max) * 100)}%` }} /><small>{d.label}</small></div>)}
    </div>
  );
}
/** Confirmation avec motif obligatoire (annulations). */
export function ReasonDialog({ title, text, onConfirm, onClose }: { title: string; text: string; onConfirm: (reason: string) => Promise<void>; onClose: () => void }) {
  const f = useForm({ reason: '' });
  return (
    <Modal title={title} onClose={onClose} footer={<>
      <button class="btn sec" onClick={onClose}>{t('Ne rien faire')}</button>
      <button class="btn danger" disabled={f.busy} onClick={() => f.submit(async () => {
        if (f.v.reason.trim().length < 3) { f.setError(t('Indiquez un motif (3 caractères au moins).')); return; }
        await onConfirm(f.v.reason.trim()); onClose();
      })}>{t("Confirmer l'annulation")}</button>
    </>}>
      <p class="muted">{text}</p>
      <Field label={t('Motif')} name="reason" form={f} required maxLength={200} />
      <FormError error={f.error} />
    </Modal>
  );
}
