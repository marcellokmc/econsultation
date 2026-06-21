# Guide de développement — Application eConsultation

> Application Flutter de télémédecine avec espaces Médecin et Patient.  
> Développée dans le cadre du Master e-Santé — Groupe 3.

---

## Table des matières

1. [Prérequis et installation](#1-prérequis-et-installation)
2. [Créer le projet Flutter](#2-créer-le-projet-flutter)
3. [Configurer pubspec.yaml](#3-configurer-pubspecyaml)
4. [Architecture du projet](#4-architecture-du-projet)
5. [Modèles de données](#5-modèles-de-données)
6. [Système de thème](#6-système-de-thème)
7. [Services](#7-services)
8. [Providers (gestion d'état)](#8-providers-gestion-détat)
9. [Widgets réutilisables](#9-widgets-réutilisables)
10. [Écrans d'authentification](#10-écrans-dauthentification)
11. [Écrans Patient](#11-écrans-patient)
12. [Écrans Médecin](#12-écrans-médecin)
13. [Point d'entrée main.dart](#13-point-dentrée-maindart)
14. [Configuration Android](#14-configuration-android)
15. [Tests unitaires](#15-tests-unitaires)
16. [Lancer l'application](#16-lancer-lapplication)
17. [Comptes de démonstration](#17-comptes-de-démonstration)
18. [Fonctionnalités implémentées](#18-fonctionnalités-implémentées)

---

## 1. Prérequis et installation

### Installer Flutter

1. Téléchargez Flutter sur [flutter.dev](https://flutter.dev/docs/get-started/install)
2. Décompressez dans un dossier (ex: `C:\flutter` sur Windows)
3. Ajoutez `C:\flutter\bin` à votre variable `PATH`
4. Vérifiez l'installation :

```bash
flutter doctor
```

Tous les éléments essentiels doivent être cochés ✓. Installez Android Studio si nécessaire.

### IDE recommandé

- **VS Code** avec les extensions Flutter et Dart
- **Android Studio** avec le plugin Flutter

---

## 2. Créer le projet Flutter

```bash
flutter create econsultation
cd econsultation
```

---

## 3. Configurer pubspec.yaml

Remplacez le contenu de `pubspec.yaml` par :

```yaml
name: econsultation
description: "Application de gestion des consultations médicales — Master e-Santé"
publish_to: 'none'

version: 1.0.0+1

environment:
  sdk: ^3.12.1

dependencies:
  flutter:
    sdk: flutter

  # UI
  cupertino_icons: ^1.0.8
  google_fonts: ^6.1.0

  # État
  provider: ^6.0.0

  # Données locales chiffrées
  hive_flutter: ^1.1.0

  # Réseau / FHIR
  http: ^1.2.0
  connectivity_plus: ^6.0.0

  # Sécurité
  local_auth: ^2.3.0
  flutter_secure_storage: ^9.2.2

  # Graphiques
  fl_chart: ^0.69.0

  # Utilitaires
  intl: ^0.19.0
  uuid: ^4.3.3

  # Export PDF
  pdf: ^3.11.1
  printing: ^5.13.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^6.0.0
  flutter_launcher_icons: ^0.14.3

flutter_launcher_icons:
  android: true
  ios: false
  image_path: "assets/icon/logo.png"
  adaptive_icon_background: "#FFFFFF"
  adaptive_icon_foreground: "assets/icon/logo.png"
  min_sdk_android: 21

flutter:
  uses-material-design: true
  assets:
    - assets/icon/
```

Puis :

```bash
flutter pub get
```

---

## 4. Architecture du projet

Structure complète du dossier `lib/` :

```
lib/
├── main.dart
├── models/
│   ├── user.dart
│   ├── patient_profile.dart
│   ├── appointment.dart
│   ├── consultation.dart
│   └── prescription.dart
├── providers/
│   ├── auth_provider.dart
│   ├── data_provider.dart
│   └── notification_provider.dart
├── services/
│   ├── storage_service.dart        # Hive chiffré AES-256
│   ├── biometric_service.dart      # Authentification biométrique
│   ├── fhir_service.dart           # Client FHIR R4 (hapi.fhir.org)
│   ├── sync_service.dart           # Synchronisation offline/online
│   ├── notification_service.dart   # Notifications locales (stub)
│   └── pdf_export_service.dart     # Génération PDF ordonnances
├── theme/
│   └── app_theme.dart
├── utils/
│   └── date_helper.dart
├── widgets/
│   ├── screen_guard.dart           # Masquage écran (RGPD)
│   └── vital_signs_chart.dart      # Graphiques signes vitaux
└── screens/
    ├── splash_screen.dart
    ├── auth/
    │   ├── welcome_screen.dart
    │   └── login_screen.dart
    ├── patient/
    │   ├── patient_home_screen.dart
    │   ├── book_appointment_screen.dart
    │   ├── prescriptions_screen.dart
    │   └── teleconsultation_screen.dart
    ├── doctor/
    │   ├── doctor_home_screen.dart
    │   ├── patients_list_screen.dart
    │   ├── patient_detail_screen.dart
    │   ├── create_consultation_screen.dart
    │   └── consultations_list_screen.dart
    ├── profil_screen.dart
    └── privacy_screen.dart

test/
├── widget_test.dart
├── models/
│   ├── patient_test.dart
│   └── consultation_test.dart
└── services/
    └── storage_service_test.dart
```

---

## 5. Modèles de données

### `lib/models/user.dart`

```dart
enum UserRole { doctor, patient }

class User {
  final String id;
  final String name;
  final String email;
  final String password;
  final UserRole role;
  final String phone;
  final String? specialty;
  final double? rating;
  final int? experienceYears;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.password,
    required this.role,
    required this.phone,
    this.specialty,
    this.rating,
    this.experienceYears,
  });

  bool get isDoctor => role == UserRole.doctor;

  String get initials {
    final clean = name.replaceAll('Dr. ', '').replaceAll('Dr ', '');
    final parts = clean.trim().split(' ');
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    if (parts.isNotEmpty && parts[0].isNotEmpty) return parts[0][0].toUpperCase();
    return 'U';
  }

  String get displayName => name;
}
```

### `lib/models/patient_profile.dart`

```dart
class PatientProfile {
  final String userId;
  final DateTime dateOfBirth;
  final String bloodType;
  final List<String> allergies;
  final List<String> chronicConditions;
  final String? emergencyContact;
  final double? weight;   // en kg
  final double? height;   // en cm
  final String? address;

  PatientProfile({ ... });

  int get age { /* calcul depuis dateOfBirth */ }
  double? get bmi { /* poids / (taille/100)² */ }
  String get bmiCategory { /* Sous-poids / Normal / Surpoids / Obésité */ }
}
```

### `lib/models/appointment.dart`

```dart
enum AppointmentStatus { pending, confirmed, completed, cancelled }

class Appointment {
  final String id;
  final String patientId;
  final String doctorId;
  final DateTime dateTime;
  final String reason;
  AppointmentStatus status;   // mutable
  final int durationMinutes;

  bool get isUpcoming => ...;
  bool get isPast => ...;
  bool get isToday => ...;
}
```

### `lib/models/consultation.dart`

```dart
class Consultation {
  final String id;
  final String patientId;
  final String doctorId;
  final DateTime date;
  final String notes;
  final String diagnosis;
  final String prescription;
  // Signes vitaux (tous optionnels)
  final double? weight;
  final double? temperature;
  final String? bloodPressure;
  final int? heartRate;
}
```

### `lib/models/prescription.dart`

```dart
class Medication {
  final String name;
  final String dosage;
  final String frequency;
  final String duration;
  final String? instructions;

  String get summary => '$name — $dosage, $frequency, $duration';
}

class Prescription {
  final String id;
  final String consultationId;
  final String patientId;
  final String doctorId;
  final DateTime date;
  final List<Medication> medications;
  final String? notes;
}
```

---

## 6. Système de thème

Créez `lib/theme/app_theme.dart` avec :

- `AppColors` : palette complète (primary, accent, background, error, etc.)
- `AppDecorations` : décorations réutilisables (card, gradientPrimary, gradientAccent)
- `AppTheme.lightTheme` : thème Material 3 complet

```dart
class AppColors {
  static const Color primary = Color(0xFF1A6FDB);     // Bleu médecin
  static const Color accent  = Color(0xFF00BFA5);     // Teal patient
  static const Color background = Color(0xFFF5F7FA);
  // ...
}
```

---

## 7. Services

### `lib/services/storage_service.dart` — Stockage chiffré Hive

Gère la persistance locale avec chiffrement AES-256. Utilise `flutter_secure_storage` pour stocker la clé AES dans le keychain de l'appareil.

```dart
class StorageService {
  static Future<void> init() async {
    // Génère ou récupère la clé AES depuis le keychain sécurisé
    // Ouvre deux boxes Hive chiffrées : 'session' et 'settings'
  }

  static Future<void> saveSession(String userId) async { ... }
  static String? getSession() { ... }
  static Future<void> clearSession() async { ... }

  static Future<void> acceptPrivacy() async { ... }
  static bool get isPrivacyAccepted { ... }
  static DateTime? get consentDate { ... }

  static Future<void> clearAll() async { ... } // droit à l'oubli RGPD
}
```

### `lib/services/biometric_service.dart` — Authentification biométrique

```dart
class BiometricService {
  static Future<bool> isAvailable() async {
    // Vérifie que local_auth peut utiliser fingerprint/face ID
  }

  static Future<bool> authenticate() async {
    // Lance l'invite biométrique système
  }
}
```

### `lib/services/fhir_service.dart` — Client FHIR R4

Intégration avec le serveur public FHIR R4 (`https://hapi.fhir.org/baseR4`).

```dart
class FhirService {
  static const _base = 'https://hapi.fhir.org/baseR4';

  static Future<bool> ping() async { ... }
  static Future<List<FhirPatient>> searchPatients({int count = 10}) async { ... }
  static Future<FhirPatient?> getPatient(String id) async { ... }
  static Future<String?> createPatient(User user) async { ... }
}

class FhirPatient {
  final String fhirId, nom, prenom;
  final String? dateNaissance, genre, telephone;

  factory FhirPatient.fromJson(Map<String, dynamic> json) { ... }
  static Map<String, dynamic> fromUser(User user) { ... }
}
```

### `lib/services/sync_service.dart` — Synchronisation offline/online

`ChangeNotifier` qui surveille la connectivité réseau et synchronise les données en attente.

```dart
class SyncService extends ChangeNotifier {
  bool get isOnline => _isOnline;
  bool get isSyncing => _isSyncing;
  int get pendingCount => _pendingCount;
  String get statusLabel => isOnline ? 'Synchronisé' : 'Hors ligne';

  void markPending() { _pendingCount++; notifyListeners(); }
  Future<void> syncNow() async { /* ping FHIR + vide la file */ }
}
```

### `lib/services/pdf_export_service.dart` — Export PDF

Génère une ordonnance PDF avec la librairie `pdf` et la partage via `printing`.

```dart
class PdfExportService {
  static Future<void> sharePrescription({
    required Prescription prescription,
    required User doctor,
    required User patient,
  }) async {
    // Layout A4 : en-tête gradient, infos médecin/patient,
    // tableau médicaments, zone signature, pied de page
    final bytes = await _buildPdf(...);
    await Printing.sharePdf(bytes: bytes, filename: 'ordonnance_$date.pdf');
  }
}
```

### `lib/services/notification_service.dart` — Notifications

```dart
class NotificationService {
  static Future<void> init() async {}
  static Future<void> showRdvConfirmed(Appointment a) async {}
  static Future<void> showRdvCancelled(Appointment a) async {}
  static Future<void> showCriticalAlert(String patient, double temp) async {}
  static Future<void> showDailySummary(int count) async {}
}
```

---

## 8. Providers (gestion d'état)

### `lib/providers/auth_provider.dart`

Gère la connexion, la session persistante, et la liste des utilisateurs.

```dart
class AuthProvider extends ChangeNotifier {
  // Base de données utilisateurs (médecins + patients burkinabè)
  final List<User> _users = [ ... ];

  bool login(String email, String password) {
    // Vérifie les identifiants, sauvegarde la session via StorageService
  }

  bool restoreSession() {
    // Restaure la session depuis Hive au démarrage
  }

  void logout() {
    StorageService.clearSession();
    _currentUser = null;
    notifyListeners();
  }
}
```

### `lib/providers/data_provider.dart`

Gère rendez-vous, consultations, profils et ordonnances. Pré-rempli avec des données de démonstration.

```dart
class DataProvider extends ChangeNotifier {
  // Données initiales : 5 patients, 10 RDV, 5 consultations, 3 ordonnances

  List<Appointment> getAppointmentsForDoctor(String doctorId) { ... }
  List<Appointment> getTodayAppointments(String doctorId) { ... }
  List<Consultation> getConsultationsForPatient(String patientId) { ... }
  List<Prescription> getPrescriptionsForPatient(String patientId) { ... }

  void addAppointment(Appointment a) { ... }
  void updateAppointmentStatus(String id, AppointmentStatus s) { ... }
  void addConsultation(Consultation c) { ... }
}
```

### `lib/providers/notification_provider.dart`

Gère les notifications in-app (compteur de nouvelles notifications).

### `lib/services/sync_service.dart`

Utilisé comme `ChangeNotifierProvider` dans `main.dart` — voir section 7.

---

## 9. Widgets réutilisables

### `lib/widgets/screen_guard.dart` — Masquage écran RGPD

Enveloppe toute l'application. Quand l'app passe en arrière-plan (`inactive`/`hide`), affiche un écran opaque pour protéger les données médicales lors des captures d'écran.

```dart
class ScreenGuard extends StatefulWidget {
  // Utilise AppLifecycleListener pour détecter inactive/resume
  // Affiche un Stack avec overlay bleu + logo quand _obscured = true
}
```

**Intégration dans `MaterialApp.builder` :**
```dart
builder: (context, child) => ScreenGuard(child: child ?? const SizedBox()),
```

### `lib/widgets/vital_signs_chart.dart` — Graphiques signes vitaux

```dart
enum VitalType { heartRate, temperature, weight }

class VitalSignsChart extends StatelessWidget {
  final List<Consultation> consultations;
  final VitalType type;
  // Utilise fl_chart LineChart avec gradient fill
  // Affiche "Pas assez de données" si < 2 points
}
```

---

## 10. Écrans d'authentification

### `lib/screens/splash_screen.dart`

- Animation d'entrée (scale + fade + slide) sur fond dégradé bleu
- Durée : 2.8 secondes
- Navigation : si session Hive présente → home screen ; sinon → `PrivacyScreen` (première fois) ou `WelcomeScreen`

### `lib/screens/privacy_screen.dart` — Consentement RGPD

- Présenté au premier lancement uniquement
- Résumé des données collectées (3 points)
- "Accepter" → sauvegarde la date de consentement dans Hive + navigue vers `WelcomeScreen`
- "Refuser" → ferme l'application

### `lib/screens/auth/welcome_screen.dart`

- Deux cartes de rôle avec animation `Hero` : **Espace Médecin** (bleu) et **Espace Patient** (teal)
- Transition vers `LoginScreen(role: role)`

### `lib/screens/auth/login_screen.dart` — Design wireframe

Écran épuré correspondant au wireframe :

```
┌─────────────────────────────┐
│  ←                          │  Flèche retour (bouton carré)
│                             │
│  Authentification           │  Titre navy bold 28px
│  Espace Médecin             │  Sous-titre gris
│                             │
│  Adresse e-mail             │  Label
│  ┌─────────────────────┐   │
│  │ exemple@email.com   │   │  Champ fond gris (#F2F4F7)
│  └─────────────────────┘   │
│                             │
│  Mot de passe               │
│  ┌─────────────────────┐   │
│  │ ••••••••        👁  │   │  Toggle visibilité
│  └─────────────────────┘   │
│                 Oublié ?   │
│                             │
│  ┌─────────────────────┐   │
│  │      Connexion      │   │  Bouton navy plein
│  └─────────────────────┘   │
│                             │
│  ── Ou utiliser la biométrie ──│
│                             │
│  ┌──────────┐ ┌──────────┐ │
│  │    🖐    │ │    😊    │ │  2 cartes beige côte à côte
│  │ Empreinte│ │  Facial  │ │
│  └──────────┘ └──────────┘ │
│                             │
│  Oublié ? │ Créer un compte│
└─────────────────────────────┘
```

**Fonctionnalités :**
- Pré-remplissage automatique des identifiants de démo
- Authentification biométrique (si session existante + biométrie disponible)
- Gestion des erreurs (bandeau rouge)
- Bouton discret "⚡ Remplir les identifiants de démo"

---

## 11. Écrans Patient

### `lib/screens/patient/patient_home_screen.dart`

Navigation 5 onglets (Material Design 3 `NavigationBar`) :

| # | Onglet | Contenu |
|---|--------|---------|
| 0 | Accueil | Prochain RDV, actions rapides, consultations récentes |
| 1 | Rendez-vous | Liste à venir / passés + bouton "Prendre RDV" |
| 2 | Consultations | Historique des consultations |
| 3 | Ordonnances | Liste des prescriptions + export PDF |
| 4 | Profil | Informations personnelles, RGPD, déconnexion |

### `lib/screens/patient/book_appointment_screen.dart`

Assistant en 3 étapes avec `AnimatedSwitcher` :
1. **Choisir le médecin** — liste avec spécialité et note
2. **Choisir la date et l'heure** — calendrier 8 jours + grille créneaux (créneaux pris exclus)
3. **Motif** — chips prédéfinis + champ texte libre

### `lib/screens/patient/prescriptions_screen.dart`

- Liste des ordonnances avec médicaments détaillés
- Bouton PDF sur chaque ordonnance → `PdfExportService.sharePrescription()`

### `lib/screens/patient/teleconsultation_screen.dart`

Simulation d'une vidéoconsultation :
- Zone vidéo sombre avec `CustomPainter` (grille), avatar médecin centré, badge "EN DIRECT"
- Miniature patient en bas à droite
- Contrôles : micro toggle, caméra toggle, raccrocher (rouge)
- Chat en temps réel : messages médecin (gauche, bleu clair) / patient (droite, vert clair)
- `TextField` + bouton envoyer pour ajouter des messages

### `lib/screens/profil_screen.dart`

Partagé entre médecin et patient :
- `SliverAppBar` avec avatar, nom, badge de rôle
- **Informations personnelles** : email, téléphone, spécialité
- **Confidentialité & RGPD** : date de consentement, chiffrement AES-256, droit à l'oubli
- **Déconnexion** : retour à `WelcomeScreen`
- **"Supprimer mes données"** : `StorageService.clearAll()` + déconnexion

---

## 12. Écrans Médecin

### `lib/screens/doctor/doctor_home_screen.dart`

Navigation 5 onglets :

| # | Onglet | Contenu |
|---|--------|---------|
| 0 | Tableau de bord | Indicateur sync, graphique consultations/semaine, stats, planning |
| 1 | Patients | Liste avec recherche et filtres |
| 2 | Consultations | Historique des consultations |
| 3 | Agenda | Planning complet (aujourd'hui / à venir / historique) |
| 4 | Profil | Même `ProfilScreen` partagé |

**Dashboard :**
```dart
// _SyncIndicator : affiche statut online/offline + compteur données en attente
// _ConsultationsWeekChart : LineChart fl_chart groupant les consultations par semaine
```

### `lib/screens/doctor/patients_list_screen.dart`

- Barre de recherche (nom ou email)
- Filtres : Tous / Récents / Allergies
- `_PatientCard` : avatar coloré, âge, groupe sanguin, dernière visite, pathologies

### `lib/screens/doctor/patient_detail_screen.dart`

Dossier médical complet avec `SliverAppBar` + 3 onglets :
- **Profil** : signes vitaux (grille 2×2), allergies (chips rouges), pathologies (chips orange), contacts
- **Consultations** : `VitalSignsChart(type: VitalType.heartRate)` + liste consultations expandables
- **Rendez-vous** : liste simple

### `lib/screens/doctor/consultations_list_screen.dart`

Liste de toutes les consultations du médecin avec :
- Recherche par nom patient ou diagnostic
- `_ConsultationTile` : fond vert (terminée) ou rouge (critique si temp > 40°C)

### `lib/screens/doctor/create_consultation_screen.dart`

Formulaire de création d'une consultation :
- Champs : notes, diagnostic, prescription, signes vitaux (temp, FC, TA, poids)
- Crée une ordonnance associée avec les médicaments

---

## 13. Point d'entrée main.dart

```dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'providers/auth_provider.dart';
import 'providers/data_provider.dart';
import 'providers/notification_provider.dart';
import 'screens/splash_screen.dart';
import 'services/notification_service.dart';
import 'services/storage_service.dart';
import 'services/sync_service.dart';
import 'theme/app_theme.dart';
import 'widgets/screen_guard.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await StorageService.init();           // Hive chiffré AES-256
  await NotificationService.init();      // Notifications locales
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
  ));
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => DataProvider()),
        ChangeNotifierProvider(create: (_) => NotificationProvider()),
        ChangeNotifierProvider(create: (_) => SyncService()),
      ],
      child: const EConsultationApp(),
    ),
  );
}

class EConsultationApp extends StatelessWidget {
  const EConsultationApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'eConsultation',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const SplashScreen(),
      // ScreenGuard à l'intérieur de MaterialApp pour avoir Directionality
      builder: (context, child) =>
          ScreenGuard(child: child ?? const SizedBox()),
    );
  }
}
```

**Flux de démarrage :**
```
main()
  └── StorageService.init()   → initialise Hive chiffré
  └── NotificationService.init()
  └── runApp(MultiProvider)
       └── SplashScreen (2.8s animation)
            ├── isPrivacyAccepted == false → PrivacyScreen (1ère fois)
            ├── session Hive présente     → DoctorHomeScreen / PatientHomeScreen
            └── sinon                     → WelcomeScreen
```

---

## 14. Configuration Android

### `android/app/build.gradle.kts`

```kotlin
android {
    namespace = "e.sante.econsultation"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "e.sante.econsultation"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }
}
```

> **Note :** `local_auth` nécessite `FlutterFragmentActivity` dans `MainActivity.kt` :
> ```kotlin
> class MainActivity : FlutterFragmentActivity()
> ```

### `android/app/src/main/AndroidManifest.xml`

Permissions requises :
```xml
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.USE_FINGERPRINT" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

---

## 15. Tests unitaires

28 tests répartis dans 4 fichiers :

### `test/models/patient_test.dart` (8 tests)
- `PatientProfile` : calcul âge, calcul IMC (poids/taille²), IMC null si données manquantes
- `User` : initiales (sans préfixe "Dr."), `isDoctor` true/false

### `test/models/consultation_test.dart` (9 tests)
- Détection critique : temp > 40°C, temp < 35°C, temp normale, temp absente
- Données vitales : poids, FC, TA, date non nulle
- Champs obligatoires : diagnostic non vide, ID non vide

### `test/services/storage_service_test.dart` (6 tests)
- `Medication.summary` contient nom/dosage/fréquence/durée
- `instructions` null par défaut, stockées si fournies
- `Prescription` : médicaments non vides, date correcte, IDs corrects

### `test/widget_test.dart` (3 tests smoke)
- Construction de `User`, `PatientProfile`, `Consultation` sans erreur

**Lancer les tests :**
```bash
flutter test
```

---

## 16. Lancer l'application

```bash
# Vérifier la qualité du code
flutter analyze

# Lancer les tests
flutter test

# Lancer sur émulateur Android
flutter emulators --launch Pixel_7
flutter run

# Lancer sur Chrome (web)
flutter run -d chrome
```

> **Première fois :** L'écran RGPD s'affiche. Cliquez "Accepter" pour continuer.

---

## 17. Comptes de démonstration

### Médecins

| Nom | Email | Mot de passe | Spécialité |
|-----|-------|--------------|------------|
| Dr. BADINI Ousmane | `ousmane@medecin.bf` | `doctor123` | Médecin Généraliste |
| Dr. KABORE Issa | `issa@medecin.bf` | `doctor123` | Cardiologue |
| Dr. SAWADOGO Maurice | `maurice@medecin.bf` | `doctor123` | Pédiatre |
| Dr. SAWADOGO Marcel | `marcel@medecin.bf` | `doctor123` | Chirurgien Général |

### Patients

| Nom | Email | Mot de passe |
|-----|-------|--------------|
| NIKIEMA Lebian | `lebian@patient.bf` | `patient123` |
| OUEDRAOGO Moussa | `moussa@patient.bf` | `patient123` |
| BELEM Issa | `belem@patient.bf` | `patient123` |
| DRABO Aïssata | `aissata@patient.bf` | `patient123` |
| NEBIE Souleymane | `souleymane@patient.bf` | `patient123` |

> Les champs de connexion sont pré-remplis automatiquement avec les identifiants de démo.

---

## 18. Fonctionnalités implémentées

### Sécurité (/20)
- ✅ **Stockage chiffré AES-256** : Hive avec clé générée via `flutter_secure_storage`
- ✅ **Authentification biométrique** : empreinte digitale et reconnaissance faciale (`local_auth`)
- ✅ **Session persistante** : restauration automatique au redémarrage
- ✅ **Masquage écran** : overlay opaque quand l'app passe en arrière-plan
- ✅ **Consentement RGPD** : écran de confidentialité au premier lancement
- ✅ **Droit à l'oubli** : "Supprimer mes données" efface toutes les données locales

### Fonctionnalités médicales (/30)
- ✅ **Espace Médecin** : dashboard, liste patients, agenda, consultations
- ✅ **Espace Patient** : accueil, rendez-vous, consultations, ordonnances
- ✅ **Prise de RDV** : assistant 3 étapes (médecin → date/créneau → motif)
- ✅ **Dossier patient** : profil médical complet (signes vitaux, allergies, pathologies)
- ✅ **Création de consultation** : formulaire avec signes vitaux + prescription
- ✅ **Téléconsultation** : interface vidéo simulée avec chat temps réel
- ✅ **Navigation 5 onglets** : Material Design 3 pour médecin et patient
- ✅ **Profil utilisateur** : informations, RGPD, déconnexion

### Bonus implémentés (+5)
- ✅ **FHIR R4** : client REST vers `hapi.fhir.org/baseR4` (recherche, création patients)
- ✅ **Synchronisation offline/online** : `SyncService` avec `connectivity_plus`, indicateur dashboard
- ✅ **Graphiques** : `fl_chart` — signes vitaux (FC/temp/poids) et consultations/semaine
- ✅ **Export PDF** : génération et partage d'ordonnances A4 (`pdf` + `printing`)
- ✅ **Tests unitaires** : 28 tests (modèles + services)
- ✅ **Notifications** : architecture prête (`NotificationService`)

---

## Architecture globale

```
PRÉSENTATION (screens/)
      ↕ context.watch / context.read
ÉTAT (providers/ + services/sync_service.dart)
      ↕ appels de méthodes
DONNÉES (models/ + services/storage_service.dart)
      ↕ Hive (local chiffré) + HTTP (FHIR distant)
STOCKAGE (Hive AES-256 + hapi.fhir.org)
```

**Flux de données typique :**
1. L'utilisateur tape sur un bouton
2. Le widget appelle `context.read<DataProvider>().addAppointment(appt)`
3. Le provider ajoute l'objet et appelle `notifyListeners()`
4. Tous les widgets `context.watch<DataProvider>()` se reconstruisent
5. `SyncService.markPending()` est appelé → l'indicateur dashboard se met à jour

---

*Guide rédigé pour le projet eConsultation — Groupe 3 — Master e-Santé*
