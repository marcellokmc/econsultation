# Offre commerciale — Grenier Pro

> Les prix sont des **hypothèses de départ** à valider auprès de 5 prospects réels, puis à ajuster selon vos coûts
> (temps de mise en service, support, éventuel hébergement).

## 1. Promesse
**« Savoir d'où vient chaque produit, ce qu'il rapporte et ce qu'on doit à chaque producteur. »**
Une seule application pour le stock, la production, la facturation, la traçabilité par QR code et la coopérative —
en français, en FCFA, avec TVA, IFU/RCCM, paiements Orange Money / Moov Money et reçus imprimables.
**Elle fonctionne sans internet**, sur un ordinateur du bureau : un atout décisif en zone où la connexion est instable.

## 2. Deux façons de vendre
| | **A. Installé chez le client** (`GRENIER_MODE=local`) | **B. Hébergé par vous** (`GRENIER_MODE=saas`) |
|---|---|---|
| Principe | Vous installez Grenier sur le PC du client (10 minutes) | Le client se connecte à votre serveur par internet |
| Internet | Non nécessaire | Nécessaire |
| Revenu | Licence + mise en service + maintenance annuelle | Abonnement mensuel |
| Données | Chez le client (sauvegarde à sa charge, vous l'aidez) | Chez vous (vous êtes responsable de la sécurité et des sauvegardes) |
| Effort pour vous | Installation, formation, support à distance | Serveur, HTTPS, surveillance, sauvegardes |
| Idéal pour | Coopératives, unités rurales, clients méfiants envers le « cloud » | Entreprises bien connectées, plusieurs sites |

Recommandation : **commencez par A**, plus simple à lancer et sans coûts de serveur ; ajoutez B quand vous aurez des clients connectés.

## 3. Offres *(hypothèses)*
| | **Starter** | **Pro** | **Coopérative** |
|---|---|---|---|
| Public | Petite unité de transformation | Entreprise + approvisionnement par une coopérative | Coopérative ou union |
| Utilisateurs | 3 | 10 | 25 |
| Stock, production, factures, traçabilité QR | ✔ | ✔ | ✔ |
| Module coopérative (membres, livraisons, paiements, reçus) | — | ✔ | ✔ |
| Abonnement mensuel (mode B) | 15 000 FCFA | 35 000 FCFA | 60 000 FCFA |
| Licence + mise en service (mode A, paiement unique) | 150 000 FCFA | 300 000 FCFA | 450 000 FCFA |
| Maintenance annuelle (mode A) | 15 % de la licence | 15 % | 15 % |

La mise en service comprend : installation, paramétrage de l'entreprise, création des articles et des membres, reprise des stocks, formation de l'équipe (½ à 1 jour), étiquettes QR prêtes à imprimer.
Services à la carte : formation complémentaire, saisie de l'historique, rapports pour un bailleur, personnalisation.

## 4. Démonstration en 15 minutes (lancer `Demarrer-Grenier-DEMO.bat`)
1. **Accueil** : ventes, à encaisser, stock, dû aux membres, alertes (date limite, stock bas).
2. **Coopérative → Nouvelle livraison** d'un membre, puis **Payer** : reçu imprimable avec le montant en lettres.
3. **Production** : choisir les intrants, voir le coût de revient, obtenir le lot et son **étiquette QR**.
4. **Facture** : la sortie de stock se fait par date limite ; la facture mentionne les lots.
5. **Scanner le QR avec un téléphone** : *le moment fort.* Sans site web, il affiche les informations du lot.
6. **Traçabilité** : ouvrir une matière première et montrer les clients concernés — le « rappel de lot » en 3 clics.

## 5. Objections
- *« On a Excel. »* → Excel ne dit pas quel lot est parti chez quel client et ne bloque pas la vente d'un lot périmé.
- *« Pas d'internet fiable. »* → Grenier tourne en local, sans internet.
- *« Et si mon ordinateur tombe en panne ? »* → Sauvegarde automatique quotidienne + téléchargement d'une copie ; restauration en 4 gestes (voir LISEZ-MOI).
- *« Et si vous disparaissez ? »* → Les données sont dans un fichier standard (SQLite) lisible sans Grenier ; clause de réversibilité au contrat.
- *« C'est cher. »* → Comparer au temps de saisie économisé et au coût d'un rappel de lot ou d'une certification perdue.

## 6. Plan pour les 90 premiers jours
1. **Semaines 1-2** : essai sur un PC Windows réel (voir « Non vérifié » dans GUIDE-ADMIN), fiche de prix, supports de démonstration.
2. **Semaines 3-4** : présenter à 10 prospects (coopératives, transformateurs, projets/ONG). Objectif : 3 pilotes.
3. **Semaines 5-10** : 2 à 3 pilotes à prix réduit contre témoignage ; suivi hebdomadaire.
4. **Semaines 11-13** : transformer les pilotes en clients payants, fixer les prix d'après ce qui est accepté.

Indicateurs : démonstrations, pilotes lancés, taux pilote → payant, tickets de support par client, jours avant la première facture saisie.

## 7. Contrat et conformité (à faire valider par un juriste)
- **Contrat** : objet, licence (durée, nombre d'utilisateurs, sites), prix, maintenance et niveau de support, sauvegardes (responsabilité du client en mode A), réversibilité, limitation de responsabilité, confidentialité, droit applicable.
- **Données personnelles** : noms, téléphones et montants de producteurs. Vérifier les obligations de la loi burkinabè sur la protection des données personnelles et les formalités auprès de l'autorité compétente (CIL) ; le client est responsable du traitement, vous êtes prestataire.
- **Facturation** : les factures portent les mentions usuelles (IFU, RCCM, TVA, montant en lettres), **mais** vérifiez auprès de l'administration fiscale si un système de facturation électronique certifié est exigé pour vos clients : le cas échéant, c'est un développement supplémentaire à chiffrer.
