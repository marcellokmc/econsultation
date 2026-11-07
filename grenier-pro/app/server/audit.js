// Journal des actions : qui a fait quoi et quand (lecture : Contrôle > Journal).
export const AUDIT_LABELS = {
  'POST /api/auth/login': 'Connexion', 'POST /api/auth/register': "Création de l'entreprise", 'POST /api/auth/logout': 'Déconnexion', 'POST /api/me/password': 'Mot de passe changé',
  'POST /api/items': 'Nouvel article', 'PUT /api/items/:id': 'Article modifié',
  'POST /api/stock/receipts': 'Entrée en stock', 'POST /api/lots/:id/loss': 'Perte enregistrée',
  'POST /api/productions': 'Production',
  'POST /api/customers': 'Nouveau client', 'PUT /api/customers/:id': 'Client modifié',
  'POST /api/invoices': 'Nouvelle facture', 'POST /api/invoices/:id/cancel': 'Facture annulée', 'POST /api/invoices/:id/payments': 'Encaissement',
  'POST /api/members': 'Nouveau membre', 'PUT /api/members/:id': 'Membre modifié',
  'POST /api/deliveries': 'Livraison', 'POST /api/deliveries/:id/cancel': 'Livraison ANNULÉE',
  'POST /api/payouts': 'Paiement à un membre', 'POST /api/payouts/:id/cancel': 'Paiement ANNULÉ',
  'PUT /api/settings': 'Paramètres modifiés', 'POST /api/users': 'Nouvel utilisateur', 'PUT /api/users/:id': 'Utilisateur modifié',
  'POST /api/licence': 'Licence enregistrée', 'POST /api/registry/connect': 'Registre de traçabilité relié', 'POST /api/registry/publish': 'Publication des lots',
  'POST /api/messages/flush': 'Envoi des SMS', 'POST /api/messages/:id/retry': 'SMS relancé',
};
const SECRET = /pass|key|cle|token|text|secret/i;
/** Résumé des données envoyées, sans mot de passe, clé ni licence ; 500 caractères au maximum. */
export function auditDetail(body) {
  if (!body || typeof body !== 'object') return null;
  const clean = {};
  for (const [k, v] of Object.entries(body)) {
    if (SECRET.test(k)) clean[k] = '***';
    else if (Array.isArray(v)) clean[k] = `${v.length} ligne(s)`;
    else if (v && typeof v === 'object') continue;
    else clean[k] = v;
  }
  const s = JSON.stringify(clean);
  return s === '{}' ? null : s.slice(0, 500);
}
