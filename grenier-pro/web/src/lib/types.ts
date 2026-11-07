// Types des données renvoyées par l'API.
export type Kind = 'mp' | 'emb' | 'pf';
export interface Item { id: number; name: string; kind: Kind; unit: string; code: string; alert_qty: number; ref_price: number; shelf_days: number; stock: number; stock_value: number; low_stock: boolean; filiere?: string | null }
export interface Lot {
  id: number; item_id: number; code: string; received_on: string; qty_initial: number; qty_remaining: number; unit_cost: number; expires_on: string | null;
  origin_type: 'supplier' | 'member' | 'production'; member_id: number | null; supplier_name: string | null; production_id: number | null;
  public_token?: string; quality_status?: string | null; pledge_id?: number | null;
  item: { id: number; name: string; kind: Kind; unit: string; code: string } | null; member: { id: number; name: string; village: string | null } | null;
}
export interface Movement { id: number; type: string; qty: number; reference: string | null; note: string | null; occurred_on: string; item: { name: string; unit: string }; lot: { code: string } }
export interface Production { id: number; produced_on: string; qty: number; expires_on: string | null; operator: string | null; extra_cost: number; total_cost: number; note: string | null; item: Item; lot: Lot; inputs: { id: number; qty: number; item: { name: string; unit: string; kind: Kind }; lot: { code: string } }[] }
export interface Customer { id: number; name: string; type: string | null; phone: string | null; address: string | null; ifu: string | null; invoiced: number; outstanding: number }
export type PayStatus = 'open' | 'partial' | 'late' | 'paid' | 'cancelled';
export interface Invoice {
  id: number; number: string; issued_on: string; due_on: string | null; vat_rate: number; total_ht: number; total_vat: number; total_ttc: number; status: string; note: string | null;
  paid_amount: number; balance: number; payment_status: PayStatus; customer: Customer;
  lines?: { id: number; name: string; unit: string; qty: number; unit_price: number; line_total: number; lots: { qty: number; lot: { code: string } }[] }[];
  payments?: { id: number; paid_on: string; amount: number; method: string; reference: string | null }[];
}
export interface Member { id: number; name: string; village: string | null; phone: string | null; group_name: string | null; joined_on: string | null; active: boolean; delivered_qty: number; delivered_amount: number; paid_amount: number; balance: number }
export interface Delivery { id: number; delivered_on: string; qty: number; unit_price: number; amount: number; quality: string; note: string | null; status: string; cancel_reason: string | null; client_ref?: string | null; member: { id: number; name: string; village: string | null }; item: { id: number; name: string; unit: string }; lot: { id: number; code: string } }
export interface Payout { id: number; number: string; paid_on: string; amount: number; method: string; note: string | null; kind: string; reference: string | null; status: string; cancel_reason: string | null; member: { id: number; name: string; village: string | null; phone?: string | null } }

export const KIND_LABEL: Record<Kind, string> = { mp: 'Matière première', emb: 'Emballage', pf: 'Produit fini' };
export const MOVE_LABEL: Record<string, string> = { entree: 'Entrée', conso: 'Consommation', prod: 'Production', vente: 'Vente', perte: 'Retrait', annulation: 'Annulation' };
export const PAY_LABEL: Record<PayStatus, [string, '' | 'ok' | 'warn' | 'bad' | 'info']> = {
  open: ['À encaisser', 'info'], partial: ['Partiellement réglée', 'warn'], late: ['En retard', 'bad'], paid: ['Payée', 'ok'], cancelled: ['Annulée', ''],
};
export const PAY_METHODS = ['Espèces', 'Orange Money', 'Moov Money', 'Coris Money', 'Virement', 'Chèque'];
export const UNITS = ['kg', 'g', 'L', 'pièce', 'pot', 'sachet', 'bouteille', 'carton', 'sac', 'tonne'];
