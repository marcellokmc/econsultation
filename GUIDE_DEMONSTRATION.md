# Guide de démonstration — eConsultation
### Groupe 3 — Master e-Santé

---

## Comptes de connexion

| Rôle | Nom | Email | Mot de passe |
|------|-----|-------|--------------|
| **Médecin** | Dr. SAWADOGO Marcel | `marcel@medecin.bf` | `doctor123` |
| **Patient** | NIKIEMA Lebian | `lebian@patient.bf` | `patient123` |

> Les champs sont pré-remplis automatiquement. Appuyez sur **"Connexion"** directement.

---

## Démo 1 — Sécurité & RGPD

### Premier lancement
1. Démarrez l'application → écran **RGPD** s'affiche
2. Lisez les 3 points de collecte de données
3. Cliquez **"Accepter"** → date de consentement enregistrée en mémoire chiffrée

### Authentification
1. Sur l'écran de bienvenue → choisissez **Espace Médecin**
2. Observez l'écran de connexion : champs gris sans bordure, bouton bleu marine
3. Connectez-vous avec les identifiants pré-remplis

### Masquage écran (RGPD)
1. Une fois connecté, appuyez sur le bouton **Accueil** du téléphone
2. → L'application affiche un écran bleu opaque avec le logo (protection des données médicales)
3. Revenez dans l'app → les données réapparaissent

### Biométrie (si disponible sur l'appareil)
1. Déconnectez-vous → retour à l'accueil
2. Reconnectez-vous une première fois avec email/mot de passe
3. Déconnectez-vous → l'écran login affiche maintenant les **deux cartes biométriques** (beige)
4. Cliquez "Empreinte digitale" → invite biométrique système

---

## Démo 2 — Espace Médecin

### Tableau de bord (onglet 1)
1. Connectez-vous en tant que **médecin** (`marcel@medecin.bf`)
2. Observez le **dashboard** :
   - **Indicateur de synchronisation** (en haut) : icône WiFi vert + "Synchronisé"
   - **Graphique consultations/semaine** : courbe des 5 dernières semaines
   - **Statistiques** : patients total, rendez-vous aujourd'hui, à venir
   - **Planning du jour** : liste des RDV avec statut (confirmé/en attente)

### Liste des patients (onglet 2)
1. Allez sur l'onglet **Patients**
2. Tapez "NIK" dans la barre de recherche → filtre en temps réel
3. Cliquez sur un patient → **dossier médical complet** :
   - **Onglet Profil** : groupe sanguin, allergies (chips rouges), pathologies chroniques (chips orange), poids/taille/IMC
   - **Onglet Consultations** : graphique de fréquence cardiaque (fl_chart) + historique
   - **Onglet Rendez-vous** : liste des RDV passés et à venir

### Créer une consultation
1. Dans le dossier patient → bouton **"+"** (flottant)
2. Remplissez : notes cliniques, diagnostic, prescription
3. Ajoutez les signes vitaux : température, fréquence cardiaque, tension, poids
4. Validez → la consultation apparaît dans la liste et le graphique se met à jour

### Consultations (onglet 3)
1. Allez sur l'onglet **Consultations**
2. Les consultations avec température > 40°C apparaissent en **rouge** (alerte critique)
3. Les consultations terminées normalement sont en **vert**

### Agenda (onglet 4)
1. Visualisez les RDV groupés : Aujourd'hui / À venir / Historique
2. Cliquez sur un RDV confirmé d'aujourd'hui → option **Téléconsultation**

### Profil & RGPD (onglet 5)
1. Allez sur l'onglet **Profil**
2. Observez la **date de consentement RGPD** enregistrée
3. Mention du **chiffrement AES-256** des données locales
4. Bouton **"Supprimer mes données"** → dialogue de confirmation → efface tout (droit à l'oubli)

---

## Démo 3 — Espace Patient

### Tableau de bord patient (onglet 1)
1. Déconnectez-vous → choisissez **Espace Patient**
2. Connectez-vous avec `lebian@patient.bf` / `patient123`
3. Observez :
   - **Prochain rendez-vous** avec date, heure, médecin et bouton "Rejoindre" (téléconsultation)
   - **Actions rapides** : Prendre RDV, Ordonnances
   - **Consultations récentes** avec diagnostic

### Prise de rendez-vous (onglet 2)
1. Allez sur **Rendez-vous** → bouton **"+"**
2. **Étape 1** : sélectionnez le Dr. BADINI
3. **Étape 2** : choisissez une date dans les 8 prochains jours → les créneaux déjà pris sont grisés
4. **Étape 3** : choisissez un motif (chip) ou écrivez le vôtre
5. Confirmez → le RDV apparaît dans la liste

### Ordonnances & PDF (onglet 4)
1. Allez sur l'onglet **Ordonnances**
2. Observez les ordonnances avec le détail des médicaments (posologie, durée)
3. Cliquez l'**icône PDF** → génération d'un document A4 et partage

### Téléconsultation
1. Sur l'onglet Accueil → bouton **"Rejoindre"** sur le prochain RDV
2. Observez l'interface de téléconsultation :
   - Zone vidéo sombre avec le médecin (avatar) et badge **"EN DIRECT"**
   - Miniature patient en bas à droite
   - **Contrôles** : micro (toggle), caméra (toggle), raccrocher (rouge)
   - **Chat** : messages du médecin à gauche (bleu) / patient à droite (vert)
3. Tapez un message dans le champ texte → envoyer

---

## Démo 4 — Fonctionnalités avancées

### FHIR R4 (standard international)
- Le service FHIR se connecte à `hapi.fhir.org/baseR4` (serveur public FHIR R4)
- Fonctions implémentées : `ping()`, `searchPatients()`, `getPatient()`, `createPatient()`
- L'indicateur de synchronisation dans le dashboard affiche l'état de la connexion FHIR

### Synchronisation offline/online
1. Coupez le WiFi de l'émulateur (paramètres → Mode avion)
2. Revenez dans l'app → l'indicateur affiche **"Hors ligne"** avec icône grise
3. Réactivez le WiFi → indicateur repasse à **"Synchronisé"** automatiquement

### Graphiques (fl_chart)
- **Dashboard médecin** : courbe du nombre de consultations par semaine (5 dernières semaines)
- **Dossier patient** → onglet Consultations : courbe de la **fréquence cardiaque** dans le temps

### Export PDF
1. Patient → onglet Ordonnances
2. Icône PDF → génère un document A4 avec :
   - En-tête gradient avec nom du médecin et spécialité
   - Tableau des médicaments (nom, dosage, fréquence, durée)
   - Zone de signature
   - Pied de page "eConsultation"

---

## Résumé des points couverts

| Critère | Fonctionnalité | Où le voir |
|---------|---------------|------------|
| **Sécurité** | Hive AES-256 | Profil → "Chiffrement AES-256 des données" |
| **Sécurité** | Biométrie | Écran de connexion → cartes beige |
| **Sécurité** | Masquage écran | Mettre l'app en arrière-plan |
| **RGPD** | Consentement | Premier lancement |
| **RGPD** | Droit à l'oubli | Profil → "Supprimer mes données" |
| **FHIR R4** | Client REST | Indicateur dashboard (connexion hapi.fhir.org) |
| **Offline** | Sync service | Couper WiFi → indicateur change |
| **Graphiques** | fl_chart | Dashboard médecin + dossier patient |
| **PDF** | Export ordonnance | Patient → Ordonnances → icône PDF |
| **Téléconsultation** | Interface vidéo + chat | Patient → Accueil → "Rejoindre" |
| **Navigation** | 5 onglets MD3 | Home médecin et patient |
| **Tests** | 28 tests unitaires | `flutter test` dans le terminal |
