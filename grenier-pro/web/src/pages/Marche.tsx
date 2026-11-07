// Marché : offres de vente, demandes d'achat, mises en relation, observatoire des prix.
// Deux usages : dans l'application (entreprise connectée) et en page publique /marche (acheteurs sans compte).
import { useState } from 'preact/hooks';
import { api, can, session, useApi } from '../lib/api';
import { fcfa, frDate, frDateTime, monthLabel, num, today } from '../lib/format';
import { t } from '../lib/i18n';
import type { Item } from '../lib/types';
import { Badge, Chips, Empty, Field, FormError, Loading, Modal, PageHead, Tabs, toast, useForm } from '../ui/kit';

type Offer = { id: number; seller: string; region: string | null; product: string; filiere: string | null; qty: number; unit: string; price: number | null; quality: string | null; certifications: string | null; available_on: string | null; phone: string; description: string | null; created_at: string; expires_on: string; status?: string };
type Req = { id: number; buyer: string; phone?: string; region: string | null; product: string; filiere: string | null; qty: number | null; unit: string | null; price_max: number | null; description: string | null; created_at: string };
type Browse = { offers: Offer[]; requests: Req[]; filieres: Record<string, string> };
type Price = { filiere: string; label: string; period: string; price: number; qty: number; sources: number };

function OfferCard({ o, filieres, onContact }: { o: Offer; filieres: Record<string, string>; onContact?: () => void }) {
  return (
    <div class="card" style={{ marginBottom: 10 }}>
      <div class="pagehead" style={{ marginBottom: 4 }}><div><h3 style={{ margin: 0 }}>{o.product} — {num(o.qty)} {o.unit}</h3>
        <p class="small">{o.seller}{o.region && ` · ${o.region}`}{o.filiere && ` · ${filieres[o.filiere] ?? o.filiere}`}</p></div>
        {o.price ? <b class="num">{fcfa(o.price)} / {o.unit}</b> : <span class="muted small">{t('Prix à discuter')}</span>}</div>
      {(o.quality || o.certifications) && <p class="small">{[o.quality, o.certifications].filter(Boolean).join(' · ')}</p>}
      {o.description && <p class="small">{o.description}</p>}
      <p class="small muted">{o.available_on ? t('Disponible le {d}', { d: frDate(o.available_on) }) + ' · ' : ''}{t('Publiée le {d}', { d: frDate(o.created_at) })}</p>
      <div class="actions"><a class="btn sec small" href={`tel:${o.phone.replace(/\s/g, '')}`} data-external>{t('Appeler')} {o.phone}</a>{onContact && <button class="btn small" onClick={onContact}>{t('Je suis intéressé')}</button>}</div>
    </div>
  );
}

function BrowseView({ pub }: { pub?: boolean }) {
  const [filiere, setFiliere] = useState('');
  const [q, setQ] = useState('');
  const { data, error } = useApi<Browse>(pub ? '/public/market' : '/market/browse', { filiere, q });
  const [contact, setContact] = useState<Offer | null>(null);
  const [kind, setKind] = useState<'offers' | 'requests'>('offers');
  if (!data) return <Loading error={error} />;
  return (
    <>
      <div class="toolbar">
        <input type="search" placeholder={t('Produit, région…')} value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} aria-label={t('Rechercher')} />
        <select value={filiere} onChange={(e) => setFiliere((e.target as HTMLSelectElement).value)} aria-label={t('Filière')} style={{ maxWidth: 220 }}><option value="">{t('Toutes les filières')}</option>{Object.entries(data.filieres).map(([k, l]) => <option value={k} key={k}>{t(l)}</option>)}</select>
      </div>
      <Chips items={[['offers', t('Offres de vente ({n})', { n: data.offers.length })], ['requests', t("Demandes d'achat ({n})", { n: data.requests.length })]]} value={kind} onChange={setKind} />
      {kind === 'offers' ? (!data.offers.length ? <Empty title={t('Aucune offre pour le moment.')} /> : data.offers.map((o) => <OfferCard key={o.id} o={o} filieres={data.filieres} onContact={pub ? () => setContact(o) : undefined} />))
        : (!data.requests.length ? <Empty title={t("Aucune demande d'achat pour le moment.")} /> : data.requests.map((r) => (
          <div class="card" key={r.id} style={{ marginBottom: 10 }}><h3 style={{ margin: 0 }}>{t('Recherche')} : {r.product}{r.qty ? ` — ${num(r.qty)} ${r.unit ?? ''}` : ''}</h3>
            <p class="small">{r.buyer}{r.region && ` · ${r.region}`}{r.price_max ? ` · ${t('jusqu’à {p}', { p: fcfa(r.price_max) })}` : ''}</p>{r.description && <p class="small">{r.description}</p>}
            <p class="small muted">{t('Publiée le {d}', { d: frDate(r.created_at) })}</p>
            {r.phone && <a class="btn sec small" href={`tel:${r.phone.replace(/\s/g, '')}`} data-external>{t('Appeler')} {r.phone}</a>}</div>)))}
      {contact && <ContactDialog o={contact} onClose={() => setContact(null)} />}
    </>
  );
}

function ContactDialog({ o, onClose }: { o: Offer; onClose: () => void }) {
  const f = useForm({ name: '', phone: '', message: '' });
  return (
    <Modal title={t('Contacter {s}', { s: o.seller })} onClose={onClose} footer={<><button class="btn sec" onClick={onClose}>{t('Annuler')}</button>
      <button class="btn" disabled={f.busy} onClick={() => f.submit(async () => { await api.post('/public/market/contacts', { ...f.v, offer_id: o.id }); toast.ok(t('Message envoyé : le vendeur vous rappellera.')); onClose(); })}>{t('Envoyer')}</button></>}>
      <p class="muted">{o.product} — {num(o.qty)} {o.unit}</p>
      <Field label={t('Votre nom ou entreprise')} name="name" form={f} required maxLength={120} />
      <Field label={t('Votre téléphone')} name="phone" type="tel" form={f} required maxLength={30} />
      <Field label={t('Message')} name="message" type="textarea" form={f} />
      <FormError error={f.error} />
    </Modal>
  );
}

function Prices({ pub }: { pub?: boolean }) {
  const { data, error } = useApi<Price[]>(pub ? '/public/market/prices' : '/market/prices');
  if (!data) return <Loading error={error} />;
  const byF = new Map<string, Price[]>();
  data.forEach((p) => byF.set(p.label, [...(byF.get(p.label) ?? []), p]));
  return (
    <div class="card"><h2>{t("Prix d'achat moyens aux producteurs")}</h2>
      <p class="muted small">{t('Moyennes pondérées des achats enregistrés dans Grenier par les coopératives et unités qui partagent leurs prix (au moins 2 sources par filière).')}</p>
      {!data.length ? <Empty title={t('Pas encore assez de données publiées.')} /> : (
        <table><thead><tr><th>{t('Filière')}</th><th>{t('Mois')}</th><th class="right">{t('Prix moyen')}</th><th class="right">{t('Volume')}</th><th class="right">{t('Sources')}</th></tr></thead>
          <tbody>{[...byF].flatMap(([label, rows]) => rows.map((p) => <tr key={label + p.period}><td>{t(label)}</td><td>{monthLabel(p.period)} {p.period.slice(0, 4)}</td><td class="right num">{fcfa(p.price)}</td><td class="right num">{num(Math.round(p.qty))}</td><td class="right num">{p.sources}</td></tr>))}</tbody></table>
      )}
    </div>
  );
}

function Mine() {
  const { data, error, reload } = useApi<{ offers: Offer[]; contacts: { id: number; name: string; phone: string; message: string | null; created_at: string; product: string }[] }>('/market/mine');
  const [open, setOpen] = useState(false);
  if (!data) return <Loading error={error} />;
  return (
    <>
      <p><button class="btn" onClick={() => setOpen(true)}>{t('Publier une offre de vente')}</button></p>
      <div class="card"><h2>{t('Acheteurs intéressés')}</h2>
        {!data.contacts.length ? <p class="muted">{t('Aucun contact pour le moment.')}</p> : <table><tbody>{data.contacts.map((c) => <tr key={c.id}><td class="num">{frDateTime(c.created_at)}</td><td><b>{c.name}</b> · <a href={`tel:${c.phone.replace(/\s/g, '')}`} data-external>{c.phone}</a><span class="sub">{c.product}{c.message && ` — ${c.message}`}</span></td></tr>)}</tbody></table>}
      </div>
      <div class="card"><h2>{t('Mes offres')}</h2>
        {!data.offers.length ? <p class="muted">{t('Aucune offre publiée.')}</p> : <table><tbody>{data.offers.map((o) => <tr key={o.id}><td>{o.product} — {num(o.qty)} {o.unit}{o.price ? ` · ${fcfa(o.price)}` : ''}<span class="sub">{t("Jusqu'au {d}", { d: frDate(o.expires_on) })}</span></td>
          <td>{o.status === 'active' && o.expires_on >= today() ? <Badge kind="ok">{t('En ligne')}</Badge> : <Badge>{t('Retirée')}</Badge>}</td>
          <td class="actions-cell">{o.status === 'active' && <button class="btn ghost" onClick={async () => { await api.post(`/market/offers/${o.id}/close`); toast.ok(t('Offre retirée.')); reload(); }}>{t('Retirer')}</button>}</td></tr>)}</tbody></table>}
      </div>
      {open && <OfferDialog onClose={() => setOpen(false)} onDone={() => { setOpen(false); reload(); }} />}
    </>
  );
}

function OfferDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { data: items } = useApi<Item[]>('/items');
  const c = session.profile!.company;
  const f = useForm({ product: '', filiere: '', qty: '', unit: 'kg', price: '', quality: '', certifications: '', available_on: today(), region: '', phone: c.phone ?? '', description: '', days: '60' });
  const fromItem = (id: string) => { const i = items?.find((x) => String(x.id) === id); if (!i) return; f.setV({ ...f.v, product: i.name, unit: i.unit, qty: String(i.stock), filiere: i.filiere ?? '', price: i.ref_price ? String(i.ref_price) : '' }); };
  return (
    <Modal wide title={t('Publier une offre de vente')} onClose={onClose} footer={<><button class="btn sec" onClick={onClose}>{t('Annuler')}</button>
      <button class="btn" disabled={f.busy} onClick={() => f.submit(async () => { await api.post('/market/offers', { ...f.v, qty: Number(String(f.v.qty).replace(',', '.')), price: f.v.price ? Number(f.v.price) : null, filiere: f.v.filiere || null, days: Number(f.v.days) }); toast.ok(t('Offre publiée sur le marché.')); onDone(); })}>{t('Publier')}</button></>}>
      <label class="f"><span>{t('À partir du stock (facultatif)')}</span><select onChange={(e) => fromItem((e.target as HTMLSelectElement).value)}><option value="">{t('Choisir un article…')}</option>{(items ?? []).filter((i) => i.stock > 0).map((i) => <option value={i.id} key={i.id}>{i.name} — {num(i.stock)} {i.unit}</option>)}</select></label>
      <div class="row"><Field label={t('Produit')} name="product" form={f} required maxLength={120} />
        <Field label={t('Filière')} name="filiere" form={f}><option value="">—</option>{Object.entries({ karite: 'Karité', sesame: 'Sésame', cajou: 'Cajou (anacarde)', mangue: 'Mangue', arachide: 'Arachide', mais: 'Maïs', sorgho: 'Sorgho / mil', riz: 'Riz', soja: 'Soja', niebe: 'Niébé', lait: 'Lait', miel: 'Miel', moringa: 'Moringa', hibiscus: 'Bissap (hibiscus)', autre: 'Autre' }).map(([k, l]) => <option value={k} key={k}>{t(l)}</option>)}</Field></div>
      <div class="row"><Field label={t('Quantité')} name="qty" form={f} required inputMode="decimal" /><Field label={t('Unité')} name="unit" form={f} required maxLength={20} /><Field label={t('Prix par unité (FCFA)')} name="price" form={f} inputMode="numeric" hint={t('Vide : à discuter.')} /></div>
      <div class="row"><Field label={t('Qualité')} name="quality" form={f} maxLength={80} placeholder={t('Grade A, sec, trié…')} /><Field label={t('Certifications')} name="certifications" form={f} maxLength={120} placeholder={t('Bio, commerce équitable…')} /></div>
      <div class="row"><Field label={t('Région ou localité')} name="region" form={f} maxLength={80} /><Field label={t('Téléphone de contact')} name="phone" type="tel" form={f} required maxLength={30} /><Field label={t('Disponible le')} name="available_on" type="date" form={f} /></div>
      <Field label={t('Description')} name="description" type="textarea" form={f} />
      <Field label={t('Durée de publication')} name="days" form={f}><option value="30">{t('30 jours')}</option><option value="60">{t('60 jours')}</option><option value="90">{t('90 jours')}</option></Field>
      <p class="small muted">{t('L’offre est visible publiquement (nom de l’entreprise, produit, téléphone de contact).')}</p>
      <FormError error={f.error} />
    </Modal>
  );
}

function ShareToggle() {
  const { data, reload } = useApi<{ enabled: boolean; mine: { filiere: string; period: string; avg_price: number; qty: number }[] }>('/market/share');
  if (!data || !can.admin(session.profile!.user.role)) return null;
  return (
    <div class="card"><h2>{t("Partager mes prix d'achat avec l'observatoire")} {data.enabled ? <Badge kind="ok">{t('Activé')}</Badge> : <Badge>{t('Désactivé')}</Badge>}</h2>
      <p class="muted small">{t('Seules des moyennes par filière et par mois sont envoyées (jamais les noms des membres, ni les quantités par membre). Elles ne sont publiées que mêlées à celles d’au moins une autre source. Les articles doivent avoir une filière (Stock → Modifier).')}</p>
      {data.mine.length > 0 && <p class="small">{data.mine.map((m) => `${m.filiere} ${m.period} : ${fcfa(m.avg_price)}`).join(' · ')}</p>}
      <button class="btn sec" onClick={async () => { try { await api.post('/market/share', { enabled: !data.enabled }); reload(); } catch (e) { toast.err((e as Error).message); } }}>{data.enabled ? t('Arrêter le partage') : t('Partager mes prix')}</button>
    </div>
  );
}

export function Marche() {
  const [tab, setTab] = useState<'browse' | 'mine' | 'prices'>('browse');
  const role = session.profile!.user.role;
  const tabs: [typeof tab, string][] = [['browse', t('Le marché')]];
  if (can.correct(role) || role === 'accountant') tabs.push(['mine', t('Mes offres et contacts')]);
  tabs.push(['prices', t('Prix du marché')]);
  return (
    <>
      <PageHead title={t('Marché')} sub={t('Vendez vos produits aux acheteurs (transformateurs, exportateurs, cantines…) et suivez les prix payés aux producteurs.')} />
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'browse' && <BrowseView />}
      {tab === 'mine' && <Mine />}
      {tab === 'prices' && <><Prices /><ShareToggle /></>}
    </>
  );
}

/** Page publique /marche : acheteurs sans compte. */
export function MarchePublic() {
  const [tab, setTab] = useState<'browse' | 'request' | 'prices'>('browse');
  return (
    <main class="main" style={{ maxWidth: 960, margin: '0 auto' }}>
      <PageHead title={t('Marché Grenier')} sub={t('Produits agricoles et transformés proposés par des coopératives et unités de transformation. Contactez directement les vendeurs.')} />
      <Tabs tabs={[['browse', t('Offres et demandes')], ['request', t("Publier une demande d'achat")], ['prices', t('Prix du marché')]]} value={tab} onChange={setTab} />
      {tab === 'browse' && <BrowseView pub />}
      {tab === 'request' && <RequestForm onDone={() => setTab('browse')} />}
      {tab === 'prices' && <Prices pub />}
    </main>
  );
}
function RequestForm({ onDone }: { onDone: () => void }) {
  const f = useForm({ buyer: '', phone: '', product: '', qty: '', unit: 'tonne', price_max: '', region: '', description: '' });
  return (
    <div class="card" style={{ maxWidth: 720 }}>
      <div class="row"><Field label={t('Votre nom ou entreprise')} name="buyer" form={f} required maxLength={120} /><Field label={t('Téléphone')} name="phone" type="tel" form={f} required maxLength={30} /></div>
      <Field label={t('Produit recherché')} name="product" form={f} required maxLength={120} />
      <div class="row"><Field label={t('Quantité')} name="qty" form={f} inputMode="decimal" /><Field label={t('Unité')} name="unit" form={f} maxLength={20} /><Field label={t('Prix maximum (FCFA par unité)')} name="price_max" form={f} inputMode="numeric" /></div>
      <Field label={t('Région de livraison')} name="region" form={f} maxLength={80} />
      <Field label={t('Précisions')} name="description" type="textarea" form={f} />
      <p class="small muted">{t('Votre demande et votre nom seront visibles publiquement pendant 60 jours ; votre numéro n’est communiqué qu’aux vendeurs.')}</p>
      <FormError error={f.error} />
      <button class="btn" disabled={f.busy} onClick={() => f.submit(async () => { await api.post('/public/market/requests', { ...f.v, qty: f.v.qty ? Number(f.v.qty.replace(',', '.')) : null, price_max: f.v.price_max ? Number(f.v.price_max) : null }); toast.ok(t('Demande publiée.')); onDone(); })}>{t('Publier la demande')}</button>
    </div>
  );
}
