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
  // 2.0
  'POST /api/quality/templates': 'Liste de contrôle créée', 'PUT /api/quality/templates/:id': 'Liste de contrôle modifiée',
  'POST /api/quality/checks': 'Contrôle qualité', 'POST /api/quality/lab': 'Analyse de laboratoire', 'POST /api/lots/:id/quality': 'Lot bloqué ou libéré',
  'POST /api/cloud/backup/enable': 'Sauvegarde en ligne activée', 'POST /api/cloud/backup/disable': 'Sauvegarde en ligne désactivée', 'POST /api/cloud/backup/now': 'Sauvegarde en ligne',
  'POST /api/cloud/recovery': 'Code de récupération affiché', 'POST /api/cloud/remote': "Code d'accès à distance changé", 'POST /api/cloud/snapshot/now': 'Résumé envoyé',
  'POST /api/payments/orders': 'Ordre mobile money', 'POST /api/payments/batch': 'Paie de campagne mobile money', 'POST /api/payments/orders/:id/resolve': 'Ordre mobile money résolu à la main',
  'POST /api/payments/ussd': 'USSD activé ou désactivé',
  'POST /api/credit/receipts': "Récépissé d'entrepôt émis", 'POST /api/credit/receipts/:id/close': "Récépissé d'entrepôt clôturé",
  'POST /api/market/offers': 'Offre publiée sur le marché', 'POST /api/market/offers/:id/close': 'Offre retirée du marché', 'POST /api/market/share': 'Partage des prix modifié',
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
