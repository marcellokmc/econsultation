# Guide de développement — Application eConsultation

> Application Flutter de télémédecine avec espaces Médecin et Patient.  
> Ce guide explique comment recréer le projet de zéro, fichier par fichier.

---

## Table des matières

1. [Prérequis et installation](#1-prérequis-et-installation)
2. [Créer le projet Flutter](#2-créer-le-projet-flutter)
3. [Configurer pubspec.yaml](#3-configurer-pubspecyaml)
4. [Architecture du projet](#4-architecture-du-projet)
5. [Étape 1 — Les modèles de données](#5-étape-1--les-modèles-de-données)
6. [Étape 2 — Le système de thème](#6-étape-2--le-système-de-thème)
7. [Étape 3 — Les utilitaires](#7-étape-3--les-utilitaires)
8. [Étape 4 — Les providers (gestion d'état)](#8-étape-4--les-providers-gestion-détat)
9. [Étape 5 — L'écran de démarrage (Splash)](#9-étape-5--lécran-de-démarrage-splash)
10. [Étape 6 — L'écran d'accueil (Welcome)](#10-étape-6--lécran-daccueil-welcome)
11. [Étape 7 — L'écran de connexion (Login)](#11-étape-7--lécran-de-connexion-login)
12. [Étape 8 — Écrans Patient](#12-étape-8--écrans-patient)
13. [Étape 9 — Écrans Médecin](#13-étape-9--écrans-médecin)
14. [Étape 10 — Point d'entrée main.dart](#14-étape-10--point-dentrée-maindart)
15. [Lancer l'application](#15-lancer-lapplication)
16. [Comptes de démonstration](#16-comptes-de-démonstration)

---

## 1. Prérequis et installation

Avant de commencer, installez les outils nécessaires.

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

- **VS Code** avec l'extension Flutter
- **Android Studio** avec le plugin Flutter

---

## 2. Créer le projet Flutter

Ouvrez un terminal dans le dossier où vous voulez créer le projet :

```bash
flutter create econsultation
cd econsultation
```

Cela génère la structure de base. Ouvrez le dossier dans votre IDE.

---

## 3. Configurer pubspec.yaml

Remplacez le contenu de `pubspec.yaml` à la racine du projet par :

```yaml
name: econsultation
description: "A new Flutter project."
publish_to: 'none'

version: 1.0.0+1

environment:
  sdk: ^3.12.1

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.8
  provider: ^6.0.0

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

Puis installez les dépendances :

```bash
flutter pub get
```

> **Note :** La dépendance principale est `provider: ^6.0.0` qui gère l'état de l'application.

---

## 4. Architecture du projet

Voici la structure complète à créer dans le dossier `lib/` :

```
lib/
├── main.dart                          # Point d'entrée
├── models/                            # Modèles de données
│   ├── user.dart
│   ├── patient_profile.dart
│   ├── appointment.dart
│   └── consultation.dart
├── providers/                         # Gestion d'état
│   ├── auth_provider.dart
│   └── data_provider.dart
├── theme/                             # Système de design
│   └── app_theme.dart
├── utils/                             # Utilitaires
│   └── date_helper.dart
└── screens/                           # Écrans de l'application
    ├── splash_screen.dart
    ├── auth/
    │   ├── welcome_screen.dart
    │   └── login_screen.dart
    ├── patient/
    │   ├── patient_home_screen.dart
    │   └── book_appointment_screen.dart
    └── doctor/
        ├── doctor_home_screen.dart
        ├── patients_list_screen.dart
        └── patient_detail_screen.dart
```

Créez tous ces dossiers et fichiers vides avant de commencer à coder.

---

## 5. Étape 1 — Les modèles de données

Les modèles représentent les données de l'application. Ils n'ont aucune dépendance Flutter.

### 5.1 Fichier `lib/models/user.dart`

Ce fichier définit un utilisateur (médecin ou patient).

```dart
enum UserRole { doctor, patient }

class User {
  final String id;
  final String name;
  final String email;
  final String password;
  final UserRole role;
  final String phone;
  final String? specialty;      // Seulement pour les médecins
  final double? rating;         // Note du médecin
  final int? experienceYears;   // Années d'expérience

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

  // Retourne les initiales du nom (ex: "MD" pour "Martin Dupont")
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

**Concepts clés :**
- `enum UserRole` : définit deux rôles possibles
- `final` : les champs sont immuables une fois créés
- `?` (nullable) : `specialty`, `rating`, `experienceYears` sont optionnels
- `get` : propriétés calculées (pas stockées, calculées à la demande)

---

### 5.2 Fichier `lib/models/patient_profile.dart`

Le profil médical d'un patient.

```dart
class PatientProfile {
  final String userId;
  final DateTime dateOfBirth;
  final String bloodType;
  final List<String> allergies;
  final List<String> chronicConditions;
  final String? emergencyContact;
  final double? weight;    // en kg
  final double? height;    // en cm
  final String? address;

  PatientProfile({
    required this.userId,
    required this.dateOfBirth,
    required this.bloodType,
    this.allergies = const [],
    this.chronicConditions = const [],
    this.emergencyContact,
    this.weight,
    this.height,
    this.address,
  });

  // Calcule l'âge à partir de la date de naissance
  int get age {
    final now = DateTime.now();
    int a = now.year - dateOfBirth.year;
    if (now.month < dateOfBirth.month ||
        (now.month == dateOfBirth.month && now.day < dateOfBirth.day)) {
      a--;
    }
    return a;
  }

  // Calcule l'IMC : poids (kg) / taille² (m)
  double? get bmi {
    if (weight == null || height == null || height! <= 0) return null;
    final hm = height! / 100;
    return weight! / (hm * hm);
  }

  // Catégorie IMC en français
  String get bmiCategory {
    final b = bmi;
    if (b == null) return 'N/A';
    if (b < 18.5) return 'Sous-poids';
    if (b < 25) return 'Normal';
    if (b < 30) return 'Surpoids';
    return 'Obésité';
  }
}
```

---

### 5.3 Fichier `lib/models/appointment.dart`

Un rendez-vous médical.

```dart
enum AppointmentStatus { pending, confirmed, completed, cancelled }

class Appointment {
  final String id;
  final String patientId;
  final String doctorId;
  final DateTime dateTime;
  final String reason;
  AppointmentStatus status;       // Mutable (peut changer)
  final int durationMinutes;

  Appointment({
    required this.id,
    required this.patientId,
    required this.doctorId,
    required this.dateTime,
    required this.reason,
    this.status = AppointmentStatus.pending,
    this.durationMinutes = 30,
  });

  bool get isUpcoming =>
      dateTime.isAfter(DateTime.now()) && status != AppointmentStatus.cancelled;

  bool get isPast =>
      dateTime.isBefore(DateTime.now()) ||
      status == AppointmentStatus.completed;

  bool get isToday {
    final now = DateTime.now();
    return dateTime.year == now.year &&
        dateTime.month == now.month &&
        dateTime.day == now.day;
  }
}
```

> **Note :** `status` n'est pas `final` car il doit pouvoir être modifié (ex: confirmer un RDV).

---

### 5.4 Fichier `lib/models/consultation.dart`

Une consultation terminée avec ses notes médicales.

```dart
class Consultation {
  final String id;
  final String appointmentId;
  final String patientId;
  final String doctorId;
  final DateTime date;
  final String notes;
  final String diagnosis;
  final String prescription;
  final double? weight;
  final double? temperature;
  final String? bloodPressure;
  final int? heartRate;

  Consultation({
    required this.id,
    required this.appointmentId,
    required this.patientId,
    required this.doctorId,
    required this.date,
    required this.notes,
    required this.diagnosis,
    required this.prescription,
    this.weight,
    this.temperature,
    this.bloodPressure,
    this.heartRate,
  });
}
```

---

## 6. Étape 2 — Le système de thème

Créez `lib/theme/app_theme.dart`. Ce fichier centralise toutes les couleurs et styles de l'application.

```dart
import 'package:flutter/material.dart';

// ─── Palette de couleurs ──────────────────────────────────────────────────────

class AppColors {
  static const Color primary = Color(0xFF1A6FDB);       // Bleu principal
  static const Color primaryDark = Color(0xFF0D47A1);   // Bleu foncé
  static const Color primaryLight = Color(0xFFE3F2FD);  // Bleu clair
  static const Color accent = Color(0xFF00BFA5);        // Teal (patients)
  static const Color accentDark = Color(0xFF00796B);
  static const Color accentLight = Color(0xFFE0F2F1);
  static const Color background = Color(0xFFF5F7FA);    // Fond gris clair
  static const Color surface = Color(0xFFFFFFFF);
  static const Color success = Color(0xFF00C853);
  static const Color successLight = Color(0xFFE8F5E9);
  static const Color warning = Color(0xFFFF6F00);
  static const Color warningLight = Color(0xFFFFF3E0);
  static const Color error = Color(0xFFD32F2F);
  static const Color errorLight = Color(0xFFFFEBEE);
  static const Color textPrimary = Color(0xFF1C1C3A);
  static const Color textSecondary = Color(0xFF666B8E);
  static const Color textHint = Color(0xFFB0B5C8);
  static const Color divider = Color(0xFFEEF0F7);

  // Génère une couleur d'avatar cohérente basée sur l'ID utilisateur
  static Color avatarColor(String id) {
    const List<Color> palette = [
      Color(0xFF1A6FDB), Color(0xFF7C4DFF), Color(0xFF00BFA5),
      Color(0xFFFF4081), Color(0xFFFF6D00), Color(0xFF00897B),
      Color(0xFFAD1457), Color(0xFF1565C0),
    ];
    final sum = id.codeUnits.fold(0, (a, b) => a + b);
    return palette[sum % palette.length];
  }
}

// ─── Décorations réutilisables ────────────────────────────────────────────────

class AppDecorations {
  // Carte blanche avec ombre subtile
  static BoxDecoration get card => const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.all(Radius.circular(16)),
        boxShadow: [
          BoxShadow(
            color: Color(0x0F1A6FDB),
            blurRadius: 20,
            offset: Offset(0, 4),
          ),
          BoxShadow(
            color: Color(0x051A6FDB),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      );

  // Dégradé bleu (médecins)
  static BoxDecoration get gradientPrimary => const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF1A6FDB), Color(0xFF0D47A1)],
        ),
      );

  // Dégradé teal (patients)
  static BoxDecoration get gradientAccent => const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF00BFA5), Color(0xFF00796B)],
        ),
      );

  static BoxDecoration coloredCard(Color color) => BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: const BorderRadius.all(Radius.circular(12)),
      );
}

// ─── Thème global de l'application ───────────────────────────────────────────

class AppTheme {
  static ThemeData get lightTheme => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primary,
          brightness: Brightness.light,
        ).copyWith(
          primary: AppColors.primary,
          secondary: AppColors.accent,
          surface: AppColors.surface,
        ),
        scaffoldBackgroundColor: AppColors.background,
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          scrolledUnderElevation: 0,
          centerTitle: false,
          titleTextStyle: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
          iconTheme: IconThemeData(color: Colors.white),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: Colors.white,
          selectedItemColor: AppColors.primary,
          unselectedItemColor: AppColors.textHint,
          type: BottomNavigationBarType.fixed,
          elevation: 0,
          selectedLabelStyle: TextStyle(fontWeight: FontWeight.w600, fontSize: 11),
          unselectedLabelStyle: TextStyle(fontSize: 11),
        ),
        cardTheme: const CardThemeData(
          color: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(16)),
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.all(Radius.circular(12)),
            ),
            elevation: 0,
            textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.background,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.divider),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.divider),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.error),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          hintStyle: const TextStyle(color: AppColors.textHint, fontSize: 14),
        ),
        textTheme: const TextTheme(
          headlineLarge: TextStyle(
              fontSize: 26, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
          headlineMedium: TextStyle(
              fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
          titleLarge: TextStyle(
              fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
          titleMedium: TextStyle(
              fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
          titleSmall: TextStyle(
              fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
          bodyLarge: TextStyle(
              fontSize: 16, color: AppColors.textPrimary, height: 1.5),
          bodyMedium: TextStyle(
              fontSize: 14, color: AppColors.textSecondary, height: 1.4),
          bodySmall: TextStyle(
              fontSize: 12, color: AppColors.textHint, height: 1.3),
        ),
        dividerTheme: const DividerThemeData(
          color: AppColors.divider,
          thickness: 1,
          space: 0,
        ),
      );
}
```

---

## 7. Étape 3 — Les utilitaires

Créez `lib/utils/date_helper.dart`. Ce fichier fournit des fonctions de formatage de dates en français.

```dart
class DateHelper {
  static const _months = [
    'jan', 'fév', 'mar', 'avr', 'mai', 'juin',
    'juil', 'août', 'sep', 'oct', 'nov', 'déc',
  ];
  static const _fullMonths = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
  ];
  static const _weekdays = [
    'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche',
  ];
  static const _shortWeekdays = [
    'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM',
  ];

  // "15/06/2025"
  static String formatDate(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';

  // "09:30"
  static String formatTime(DateTime d) =>
      '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';

  // "15 juin. 2025"
  static String formatShort(DateTime d) =>
      '${d.day} ${_months[d.month - 1]}. ${d.year}';

  // "Lundi 15 juin 2025"
  static String formatFull(DateTime d) =>
      '${_weekdays[d.weekday - 1]} ${d.day} ${_fullMonths[d.month - 1]} ${d.year}';

  // "15 juin"
  static String formatDayMonth(DateTime d) =>
      '${d.day} ${_fullMonths[d.month - 1]}';

  // "LUN", "MAR", etc.
  static String weekdayShort(DateTime d) => _shortWeekdays[d.weekday - 1];

  static bool isToday(DateTime d) {
    final now = DateTime.now();
    return d.year == now.year && d.month == now.month && d.day == now.day;
  }

  static bool isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;
}
```

---

## 8. Étape 4 — Les providers (gestion d'état)

Les providers gèrent l'état global de l'application. Ils étendent `ChangeNotifier` de Flutter pour notifier les widgets quand les données changent.

### 8.1 Fichier `lib/providers/auth_provider.dart`

Gère la connexion/déconnexion et la liste des utilisateurs.

```dart
import 'package:flutter/material.dart';
import '../models/user.dart';

class AuthProvider extends ChangeNotifier {
  User? _currentUser;

  User? get currentUser => _currentUser;
  bool get isLoggedIn => _currentUser != null;

  // Base de données utilisateurs simulée (pas de vrai serveur)
  static final List<User> _users = [
    User(
      id: 'doc1',
      name: 'Dr. Martin Dupont',
      email: 'dr.martin@econsult.fr',
      password: 'doctor123',
      role: UserRole.doctor,
      phone: '06 12 34 56 78',
      specialty: 'Médecin Généraliste',
      rating: 4.9,
      experienceYears: 15,
    ),
    User(
      id: 'doc2',
      name: 'Dr. Sophie Bernard',
      email: 'dr.sophie@econsult.fr',
      password: 'doctor123',
      role: UserRole.doctor,
      phone: '06 98 76 54 32',
      specialty: 'Cardiologue',
      rating: 4.8,
      experienceYears: 12,
    ),
    User(
      id: 'doc3',
      name: 'Dr. Pierre Nguyen',
      email: 'dr.pierre@econsult.fr',
      password: 'doctor123',
      role: UserRole.doctor,
      phone: '06 77 88 99 00',
      specialty: 'Pédiatre',
      rating: 4.7,
      experienceYears: 8,
    ),
    User(
      id: 'pat1',
      name: 'Jean Durand',
      email: 'jean.durand@email.fr',
      password: 'patient123',
      role: UserRole.patient,
      phone: '07 11 22 33 44',
    ),
    User(
      id: 'pat2',
      name: 'Marie Lambert',
      email: 'marie.lambert@email.fr',
      password: 'patient123',
      role: UserRole.patient,
      phone: '07 55 66 77 88',
    ),
    User(
      id: 'pat3',
      name: 'Pierre Martin',
      email: 'pierre.martin@email.fr',
      password: 'patient123',
      role: UserRole.patient,
      phone: '06 44 55 66 77',
    ),
    User(
      id: 'pat4',
      name: 'Isabelle Moreau',
      email: 'isabelle.moreau@email.fr',
      password: 'patient123',
      role: UserRole.patient,
      phone: '07 88 99 00 11',
    ),
    User(
      id: 'pat5',
      name: 'François Petit',
      email: 'francois.petit@email.fr',
      password: 'patient123',
      role: UserRole.patient,
      phone: '06 22 33 44 55',
    ),
  ];

  // Vérifie email + mot de passe, connecte l'utilisateur si correct
  bool login(String email, String password) {
    final matches = _users.where(
      (u) =>
          u.email.toLowerCase() == email.toLowerCase().trim() &&
          u.password == password,
    );
    if (matches.isNotEmpty) {
      _currentUser = matches.first;
      notifyListeners(); // Notifie tous les widgets qui écoutent
      return true;
    }
    return false;
  }

  void logout() {
    _currentUser = null;
    notifyListeners();
  }

  List<User> get doctors => _users.where((u) => u.isDoctor).toList();
  List<User> get patients => _users.where((u) => !u.isDoctor).toList();

  User? getUserById(String id) {
    final m = _users.where((u) => u.id == id);
    return m.isEmpty ? null : m.first;
  }
}
```

---

### 8.2 Fichier `lib/providers/data_provider.dart`

Gère les rendez-vous, consultations et profils patients.

```dart
import 'package:flutter/material.dart';
import '../models/appointment.dart';
import '../models/consultation.dart';
import '../models/patient_profile.dart';

class DataProvider extends ChangeNotifier {
  final List<PatientProfile> _profiles = [];
  final List<Appointment> _appointments = [];
  final List<Consultation> _consultations = [];

  DataProvider() {
    _init(); // Initialise avec des données de démonstration
  }

  void _init() {
    // ── Profils patients ──────────────────────────────────────────────────────
    _profiles.addAll([
      PatientProfile(
        userId: 'pat1',
        dateOfBirth: DateTime(1980, 3, 15),
        bloodType: 'A+',
        allergies: ['Pénicilline', 'Aspirine'],
        chronicConditions: ['Hypertension', 'Diabète type 2'],
        emergencyContact: 'Marie Durand — 06 11 22 33 44',
        weight: 82.0,
        height: 178.0,
        address: '12 rue de la Paix, Paris 75002',
      ),
      PatientProfile(
        userId: 'pat2',
        dateOfBirth: DateTime(1993, 7, 22),
        bloodType: 'B-',
        allergies: ['Latex'],
        chronicConditions: [],
        emergencyContact: 'Paul Lambert — 07 22 33 44 55',
        weight: 58.0,
        height: 165.0,
        address: '45 avenue Victor Hugo, Lyon 69002',
      ),
      PatientProfile(
        userId: 'pat3',
        dateOfBirth: DateTime(1958, 11, 8),
        bloodType: 'O+',
        allergies: ['Sulfonamides', 'Codéine'],
        chronicConditions: ['Arthrite rhumatoïde', 'Hypercholestérolémie'],
        emergencyContact: 'Claire Martin — 06 55 44 33 22',
        weight: 76.0,
        height: 172.0,
        address: '8 boulevard des Capucines, Paris 75009',
      ),
      PatientProfile(
        userId: 'pat4',
        dateOfBirth: DateTime(1997, 4, 30),
        bloodType: 'AB+',
        allergies: [],
        chronicConditions: ['Asthme'],
        emergencyContact: 'Jacques Moreau — 07 99 88 77 66',
        weight: 62.0,
        height: 168.0,
        address: '22 rue des Fleurs, Marseille 13001',
      ),
      PatientProfile(
        userId: 'pat5',
        dateOfBirth: DateTime(1970, 9, 14),
        bloodType: 'A-',
        allergies: ['Ibuprofène'],
        chronicConditions: ['Hypothyroïdie'],
        emergencyContact: 'Lucie Petit — 06 33 22 11 00',
        weight: 88.0,
        height: 180.0,
        address: '67 rue Nationale, Lille 59000',
      ),
    ]);

    // ── Rendez-vous (relatifs à aujourd'hui) ──────────────────────────────────
    final today = DateTime.now();
    final d = DateTime(today.year, today.month, today.day);

    _appointments.addAll([
      Appointment(
        id: 'apt1',
        patientId: 'pat1',
        doctorId: 'doc1',
        dateTime: DateTime(d.year, d.month, d.day, 9, 0),
        reason: 'Contrôle tension artérielle',
        status: AppointmentStatus.confirmed,
      ),
      Appointment(
        id: 'apt2',
        patientId: 'pat2',
        doctorId: 'doc1',
        dateTime: DateTime(d.year, d.month, d.day, 10, 30),
        reason: 'Consultation de routine',
        status: AppointmentStatus.confirmed,
      ),
      Appointment(
        id: 'apt3',
        patientId: 'pat3',
        doctorId: 'doc1',
        dateTime: DateTime(d.year, d.month, d.day, 14, 0),
        reason: 'Douleurs articulaires',
        status: AppointmentStatus.pending,
      ),
      Appointment(
        id: 'apt4',
        patientId: 'pat4',
        doctorId: 'doc1',
        dateTime: DateTime(d.year, d.month, d.day, 15, 30),
        reason: 'Renouvellement ordonnance asthme',
        status: AppointmentStatus.pending,
      ),
      Appointment(
        id: 'apt5',
        patientId: 'pat1',
        doctorId: 'doc1',
        dateTime: d.add(const Duration(days: 3)),
        reason: 'Bilan sanguin et contrôle diabète',
        status: AppointmentStatus.confirmed,
      ),
      Appointment(
        id: 'apt6',
        patientId: 'pat5',
        doctorId: 'doc1',
        dateTime: d.add(const Duration(days: 5)),
        reason: 'Contrôle thyroïde — TSH',
        status: AppointmentStatus.pending,
      ),
      Appointment(
        id: 'apt7',
        patientId: 'pat2',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 7)),
        reason: 'Grippe et fièvre',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt8',
        patientId: 'pat5',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 14)),
        reason: 'Contrôle thyroïde — 3 mois',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt9',
        patientId: 'pat3',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 30)),
        reason: 'Arthrite — suivi rhumatologie',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt10',
        patientId: 'pat1',
        doctorId: 'doc2',
        dateTime: d.add(const Duration(days: 10)),
        reason: 'Contrôle cardiaque annuel',
        status: AppointmentStatus.confirmed,
      ),
    ]);

    // ── Consultations passées ─────────────────────────────────────────────────
    _consultations.addAll([
      Consultation(
        id: 'con1',
        appointmentId: 'apt7',
        patientId: 'pat2',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 7)),
        notes: 'Fièvre 38.5°C, toux sèche persistante, fatigue depuis 3 jours. Auscultation normale.',
        diagnosis: 'Grippe saisonnière',
        prescription: 'Doliprane 1000mg — 3x/jour, 5 jours\nTussidrex sirop — 3x/jour\nRepos 3 jours · Hydratation ++',
        weight: 58.5,
        temperature: 38.5,
        bloodPressure: '110/70',
        heartRate: 88,
      ),
      Consultation(
        id: 'con2',
        appointmentId: 'apt8',
        patientId: 'pat5',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 14)),
        notes: 'TSH à 2.8 mUI/L — dans les valeurs normales. Fatigue légèrement améliorée.',
        diagnosis: 'Hypothyroïdie stable sous Levothyrox',
        prescription: 'Levothyrox 75µg — 1 cp/jour à jeun\nContrôle TSH dans 3 mois',
        weight: 87.0,
        temperature: 37.0,
        bloodPressure: '125/80',
        heartRate: 72,
      ),
      Consultation(
        id: 'con3',
        appointmentId: 'apt9',
        patientId: 'pat3',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 30)),
        notes: 'Douleurs bilatérales genoux et mains. Raideur matinale ~45 min.',
        diagnosis: 'Arthrite rhumatoïde — phase active modérée',
        prescription: 'Methotrexate 7.5mg — 1x/semaine (lundi)\nAcide folique 5mg — vendredi\nKinésithérapie — 10 séances',
        weight: 76.5,
        temperature: 37.1,
        bloodPressure: '130/85',
        heartRate: 76,
      ),
      Consultation(
        id: 'con4',
        appointmentId: 'apt_old1',
        patientId: 'pat1',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 45)),
        notes: 'TA à 158/96. Compliance irrégulière au traitement. Stress professionnel important.',
        diagnosis: 'Hypertension artérielle — déséquilibrée',
        prescription: 'Amlodipine 10mg — 1x/jour matin\nRamipril 5mg — 1x/jour soir\nRégime hyposodé < 5g/jour',
        weight: 83.0,
        temperature: 37.0,
        bloodPressure: '158/96',
        heartRate: 82,
      ),
      Consultation(
        id: 'con5',
        appointmentId: 'apt_old2',
        patientId: 'pat1',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 90)),
        notes: 'HbA1c à 7.2% — au-dessus de la cible. Glycémie à jeun : 1.48 g/L.',
        diagnosis: 'Diabète type 2 — contrôle insuffisant',
        prescription: 'Metformine 1000mg — 2x/jour aux repas\nGliclazide 60mg — 1x/jour',
        weight: 84.0,
        temperature: 37.0,
        bloodPressure: '145/90',
        heartRate: 80,
      ),
    ]);
  }

  // ── Getters (lecture seule) ───────────────────────────────────────────────────
  List<PatientProfile> get profiles => List.unmodifiable(_profiles);
  List<Appointment> get appointments => List.unmodifiable(_appointments);
  List<Consultation> get consultations => List.unmodifiable(_consultations);

  PatientProfile? getProfileByUserId(String userId) {
    final m = _profiles.where((p) => p.userId == userId);
    return m.isEmpty ? null : m.first;
  }

  List<Appointment> getAppointmentsForDoctor(String doctorId) {
    final list = _appointments.where((a) => a.doctorId == doctorId).toList();
    list.sort((a, b) => a.dateTime.compareTo(b.dateTime));
    return list;
  }

  List<Appointment> getAppointmentsForPatient(String patientId) {
    final list = _appointments.where((a) => a.patientId == patientId).toList();
    list.sort((a, b) => b.dateTime.compareTo(a.dateTime));
    return list;
  }

  List<Appointment> getTodayAppointments(String doctorId) {
    final now = DateTime.now();
    final list = _appointments.where((a) {
      return a.doctorId == doctorId &&
          a.dateTime.year == now.year &&
          a.dateTime.month == now.month &&
          a.dateTime.day == now.day &&
          a.status != AppointmentStatus.cancelled;
    }).toList();
    list.sort((a, b) => a.dateTime.compareTo(b.dateTime));
    return list;
  }

  List<Consultation> getConsultationsForPatient(String patientId) {
    final list = _consultations.where((c) => c.patientId == patientId).toList();
    list.sort((a, b) => b.date.compareTo(a.date));
    return list;
  }

  List<Consultation> getConsultationsForDoctor(String doctorId) {
    final list = _consultations.where((c) => c.doctorId == doctorId).toList();
    list.sort((a, b) => b.date.compareTo(a.date));
    return list;
  }

  Set<String> getPatientIdsForDoctor(String doctorId) {
    return _appointments
        .where((a) => a.doctorId == doctorId)
        .map((a) => a.patientId)
        .toSet();
  }

  // ── Mutations ─────────────────────────────────────────────────────────────────
  void addAppointment(Appointment appointment) {
    _appointments.add(appointment);
    notifyListeners();
  }

  void updateAppointmentStatus(String id, AppointmentStatus status) {
    final idx = _appointments.indexWhere((a) => a.id == id);
    if (idx >= 0) {
      _appointments[idx].status = status;
      notifyListeners();
    }
  }

  // Retourne les créneaux déjà pris pour un médecin à une date donnée
  Set<String> getTakenSlots(String doctorId, DateTime date) {
    return _appointments.where((a) {
      return a.doctorId == doctorId &&
          a.dateTime.year == date.year &&
          a.dateTime.month == date.month &&
          a.dateTime.day == date.day &&
          a.status != AppointmentStatus.cancelled;
    }).map((a) {
      return '${a.dateTime.hour.toString().padLeft(2, '0')}:${a.dateTime.minute.toString().padLeft(2, '0')}';
    }).toSet();
  }
}
```

---

## 9. Étape 5 — L'écran de démarrage (Splash)

Créez `lib/screens/splash_screen.dart`.

Cet écran s'affiche au démarrage pendant 2.8 secondes avec une animation, puis redirige l'utilisateur.

**Concepts importants :**
- `StatefulWidget` + `SingleTickerProviderStateMixin` : requis pour les animations
- `AnimationController` : contrôle la durée et la progression
- `Tween` + `CurvedAnimation` : définissent les valeurs de début/fin et la courbe
- `ScaleTransition`, `FadeTransition`, `SlideTransition` : widgets d'animation intégrés

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';
import 'auth/welcome_screen.dart';
import 'doctor/doctor_home_screen.dart';
import 'patient/patient_home_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _fadeAnim;
  late Animation<double> _scaleAnim;
  late Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );
    _fadeAnim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
          parent: _ctrl, curve: const Interval(0, 0.6, curve: Curves.easeIn)),
    );
    _scaleAnim = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(
          parent: _ctrl,
          curve: const Interval(0, 0.6, curve: Curves.elasticOut)),
    );
    _slideAnim =
        Tween<Offset>(begin: const Offset(0, 0.4), end: Offset.zero).animate(
      CurvedAnimation(
          parent: _ctrl,
          curve: const Interval(0.4, 1.0, curve: Curves.easeOutCubic)),
    );
    _ctrl.forward();
    Future.delayed(const Duration(milliseconds: 2800), _navigate);
  }

  void _navigate() {
    if (!mounted) return;
    final auth = context.read<AuthProvider>();
    final Widget dest = auth.isLoggedIn
        ? (auth.currentUser!.isDoctor
            ? const DoctorHomeScreen()
            : const PatientHomeScreen())
        : const WelcomeScreen();
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (_, _, _) => dest,
        transitionDuration: const Duration(milliseconds: 500),
        transitionsBuilder: (_, anim, _, child) =>
            FadeTransition(opacity: anim, child: child),
      ),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: AppDecorations.gradientPrimary,
        child: SafeArea(
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ScaleTransition(
                  scale: _scaleAnim,
                  child: FadeTransition(
                    opacity: _fadeAnim,
                    child: Container(
                      width: 108,
                      height: 108,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                        border: Border.all(
                            color: Colors.white.withValues(alpha: 0.3), width: 2),
                      ),
                      child: const Icon(
                        Icons.medical_services_rounded,
                        color: Colors.white,
                        size: 54,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 28),
                SlideTransition(
                  position: _slideAnim,
                  child: FadeTransition(
                    opacity: _fadeAnim,
                    child: Column(
                      children: [
                        const Text(
                          'eConsultation',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 36,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 18, vertical: 7),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                                color: Colors.white.withValues(alpha: 0.2)),
                          ),
                          child: const Text(
                            'Votre santé, notre priorité',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 80),
                FadeTransition(
                  opacity: _fadeAnim,
                  child: const SizedBox(
                    width: 26,
                    height: 26,
                    child: CircularProgressIndicator(
                      color: Colors.white54,
                      strokeWidth: 2.5,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
```

---

## 10. Étape 6 — L'écran d'accueil (Welcome)

Créez `lib/screens/auth/welcome_screen.dart`.

Cet écran propose le choix entre "Espace Médecin" et "Espace Patient".

**Concepts importants :**
- `Hero` animation : l'icône se "déplace" de cet écran vers le LoginScreen
- `PageRouteBuilder` : transition de navigation personnalisée
- Widgets privés (`_RoleCard`, `_Circle`, `_TrustPill`) : widgets internes au fichier

```dart
import 'package:flutter/material.dart';

import '../../models/user.dart';
import '../../theme/app_theme.dart';
import 'login_screen.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _brandFade;
  late Animation<Offset> _cardsSlide;
  late Animation<double> _cardsFade;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 800));

    _brandFade = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
          parent: _ctrl,
          curve: const Interval(0.0, 0.6, curve: Curves.easeOut)),
    );
    _cardsSlide =
        Tween<Offset>(begin: const Offset(0, 0.12), end: Offset.zero)
            .animate(CurvedAnimation(
      parent: _ctrl,
      curve: const Interval(0.3, 1.0, curve: Curves.easeOutCubic),
    ));
    _cardsFade = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
          parent: _ctrl,
          curve: const Interval(0.3, 0.85, curve: Curves.easeOut)),
    );
    _ctrl.forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _navigate(UserRole role) {
    Navigator.push(
      context,
      PageRouteBuilder(
        pageBuilder: (_, _, _) => LoginScreen(role: role),
        transitionDuration: const Duration(milliseconds: 400),
        transitionsBuilder: (_, anim, _, child) => FadeTransition(
          opacity: CurvedAnimation(parent: anim, curve: Curves.easeOut),
          child: SlideTransition(
            position: Tween<Offset>(
                    begin: const Offset(0.03, 0), end: Offset.zero)
                .animate(CurvedAnimation(parent: anim, curve: Curves.easeOutCubic)),
            child: child,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Column(
        children: [
          // Zone dégradée avec logo (occupe l'espace restant)
          Expanded(
            child: FadeTransition(
              opacity: _brandFade,
              child: Stack(
                children: [
                  // Fond dégradé
                  Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [Color(0xFF1A6FDB), Color(0xFF0D47A1)],
                      ),
                      borderRadius:
                          BorderRadius.vertical(bottom: Radius.circular(36)),
                      boxShadow: [
                        BoxShadow(
                          color: Color(0x20000000),
                          blurRadius: 20,
                          offset: Offset(0, 8),
                        ),
                      ],
                    ),
                  ),
                  // Cercles décoratifs
                  Positioned(top: -70, right: -70, child: _Circle(200, 0.07)),
                  Positioned(bottom: 20, left: -60, child: _Circle(160, 0.05)),
                  Positioned(top: 80, right: 40, child: _Circle(55, 0.08)),
                  // Contenu branding
                  SafeArea(
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 82,
                            height: 82,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.18),
                              shape: BoxShape.circle,
                              border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.3),
                                  width: 2),
                            ),
                            child: const Icon(
                              Icons.medical_services_rounded,
                              color: Colors.white,
                              size: 40,
                            ),
                          ),
                          const SizedBox(height: 18),
                          const Text(
                            'eConsultation',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 30,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.4,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Consultation médicale en ligne',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.75),
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 24),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              _TrustPill(icon: Icons.lock_rounded, label: 'Sécurisé'),
                              const SizedBox(width: 10),
                              _TrustPill(icon: Icons.verified_rounded, label: 'Certifié'),
                              const SizedBox(width: 10),
                              _TrustPill(icon: Icons.star_rounded, label: '4.9/5'),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Cartes de sélection du rôle
          SlideTransition(
            position: _cardsSlide,
            child: FadeTransition(
              opacity: _cardsFade,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Choisissez votre espace',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _RoleCard(
                      role: UserRole.doctor,
                      title: 'Espace Médecin',
                      subtitle: 'Gérez vos patients et consultations',
                      icon: Icons.local_hospital_rounded,
                      gradientColors: const [Color(0xFF1A6FDB), Color(0xFF0A3F8A)],
                      onTap: () => _navigate(UserRole.doctor),
                    ),
                    const SizedBox(height: 12),
                    _RoleCard(
                      role: UserRole.patient,
                      title: 'Espace Patient',
                      subtitle: 'Consultez et suivez votre santé',
                      icon: Icons.favorite_rounded,
                      gradientColors: const [Color(0xFF00BFA5), Color(0xFF006B5E)],
                      onTap: () => _navigate(UserRole.patient),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Carte de rôle ────────────────────────────────────────────────────────────

class _RoleCard extends StatelessWidget {
  final UserRole role;
  final String title;
  final String subtitle;
  final IconData icon;
  final List<Color> gradientColors;
  final VoidCallback onTap;

  const _RoleCard({
    required this.role,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.gradientColors,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
            colors: gradientColors,
          ),
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: gradientColors.first.withValues(alpha: 0.35),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          children: [
            Hero(
              tag: 'role_icon_${role.name}',
              child: Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: Colors.white, size: 25),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.2,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.75),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 17),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Widgets helpers ──────────────────────────────────────────────────────────

class _Circle extends StatelessWidget {
  final double size;
  final double opacity;
  const _Circle(this.size, this.opacity);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withValues(alpha: opacity),
        border: Border.all(
            color: Colors.white.withValues(alpha: opacity * 1.8), width: 1.2),
      ),
    );
  }
}

class _TrustPill extends StatelessWidget {
  final IconData icon;
  final String label;
  const _TrustPill({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 12),
          const SizedBox(width: 5),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
```

---

## 11. Étape 7 — L'écran de connexion (Login)

Créez `lib/screens/auth/login_screen.dart`.

Cet écran s'adapte selon le rôle (médecin = bleu, patient = teal).

**Concepts importants :**
- `TextEditingController` : contrôle les champs texte
- `context.read<AuthProvider>()` : accède au provider sans se réabonner
- `Navigator.pushAndRemoveUntil` : navigue et efface tout l'historique
- Widgets privés séparés (`_InputField`, `_GradientButton`, etc.) pour garder le code lisible

> Ce fichier est long (~700 lignes). Copiez directement le fichier `lib/screens/auth/login_screen.dart` du projet de référence.

**Structure du fichier :**
```
LoginScreen (StatefulWidget principal)
├── _loginScreenState
│   ├── Getters de rôle (couleurs, icônes, textes selon doctor/patient)
│   ├── initState() : animations + pré-remplissage des champs
│   └── _login() : appelle AuthProvider.login()
│
├── _DecorCircle    → Cercle décoratif de fond
├── _InputField     → Champ email ou mot de passe
├── _ErrorBanner    → Bandeau d'erreur rouge
├── _GradientButton → Bouton "Se connecter" avec dégradé
├── _SmallDivider   → Séparateur "Accès démo rapide"
└── _DemoCard       → Carte affichant les identifiants pré-remplis
```

---

## 12. Étape 8 — Écrans Patient

### 12.1 `lib/screens/patient/patient_home_screen.dart`

L'écran principal du patient avec 3 onglets : Accueil, Rendez-vous, Consultations.

**Structure :**
```
PatientHomeScreen (StatefulWidget)
└── Scaffold avec BottomNavigationBar (3 onglets)
    ├── IndexedStack (garde les onglets en mémoire)
    │   ├── _AccueilTab
    │   │   ├── AppBar avec nom du patient
    │   │   ├── Date du jour
    │   │   ├── _NextAppointmentCard (prochain RDV) ou _NoAppointmentCard
    │   │   ├── _QuickAction × 3 (Prendre RDV, Ordonnances, Résultats)
    │   │   └── _RecentConsultCard × 2 (consultations récentes)
    │   ├── _RdvTab
    │   │   ├── Section "À venir" avec _PatientApptCard
    │   │   └── Section "Passés" avec _PatientApptCard
    │   └── _ConsultationsTab
    │       └── Liste de _PatientConsultCard (expandable)
    └── FloatingActionButton (dans _RdvTab) → BookAppointmentScreen
```

**Points clés du code :**

```dart
// Dans _AccueilTab — lire les données
final data = context.watch<DataProvider>(); // Se réabonne aux changements
final auth = context.read<AuthProvider>();  // Lecture unique, pas de réabonnement

// Filtrer les RDV à venir
final upcoming = allAppts.where((a) => a.isUpcoming).toList()
  ..sort((a, b) => a.dateTime.compareTo(b.dateTime));

// Dialogue de déconnexion
showDialog(context: context, builder: (ctx) => AlertDialog(...));
```

> Copiez le fichier complet `lib/screens/patient/patient_home_screen.dart`.

---

### 12.2 `lib/screens/patient/book_appointment_screen.dart`

Assistant de prise de rendez-vous en 3 étapes.

**Structure :**
```
BookAppointmentScreen (StatefulWidget)
├── État : _step (0, 1, 2), _selectedDoctorId, _selectedDate, _selectedSlot, _reason
├── _StepIndicator → barre de progression 3 étapes
├── AnimatedSwitcher → change d'étape avec animation
│   ├── Étape 0 : _StepDoctor → liste des médecins à sélectionner
│   ├── Étape 1 : _StepDateTime → calendrier 8 jours + grille créneaux
│   └── Étape 2 : _StepReason → chips de motif + champ texte
└── Boutons "Retour" / "Continuer" / "Confirmer"
```

**Logique de confirmation :**

```dart
void _confirm() {
  // 1. Construire le DateTime complet depuis date + créneau
  final parts = _selectedSlot!.split(':');
  final dt = DateTime(_selectedDate!.year, _selectedDate!.month, _selectedDate!.day,
      int.parse(parts[0]), int.parse(parts[1]));

  // 2. Créer l'objet Appointment
  final appt = Appointment(
    id: 'apt_${DateTime.now().millisecondsSinceEpoch}', // ID unique basé sur timestamp
    patientId: context.read<AuthProvider>().currentUser!.id,
    doctorId: _selectedDoctorId!,
    dateTime: dt,
    reason: finalReason,
    status: AppointmentStatus.pending,
  );

  // 3. Ajouter via DataProvider (déclenche notifyListeners → UI se met à jour)
  context.read<DataProvider>().addAppointment(appt);
  Navigator.pop(context);
}
```

> Copiez le fichier complet `lib/screens/patient/book_appointment_screen.dart`.

---

## 13. Étape 9 — Écrans Médecin

### 13.1 `lib/screens/doctor/doctor_home_screen.dart`

L'écran principal du médecin avec 3 onglets : Tableau de bord, Patients, Agenda.

**Structure :**
```
DoctorHomeScreen (StatefulWidget)
└── Scaffold avec BottomNavigationBar (3 onglets)
    └── IndexedStack
        ├── _DashboardTab
        │   ├── AppBar avec nom du médecin
        │   ├── Date du jour
        │   ├── Statistiques : _StatCard × 3 (Patients, Aujourd'hui, À venir)
        │   ├── Section "Planning d'aujourd'hui" → AppointmentTile
        │   └── Section "Prochains rendez-vous" → AppointmentTile
        ├── PatientsListScreen (écran séparé importé)
        └── _AgendaTab
            └── Sections : Aujourd'hui / À venir / Historique → AppointmentTile
```

**Widgets publics exportés depuis ce fichier :**
- `AppointmentTile` : carte rendez-vous réutilisée dans `PatientDetailScreen`
- `AppointmentStatusBadge` : badge de statut (couleur + texte)

> Copiez le fichier complet `lib/screens/doctor/doctor_home_screen.dart`.

---

### 13.2 `lib/screens/doctor/patients_list_screen.dart`

Liste de tous les patients avec recherche et filtres.

**Fonctionnalités :**
- Barre de recherche par nom ou email
- Filtres : "Tous", "Récents" (triés par dernière consultation), "Allergies"
- Chaque carte patient affiche : nom, âge, groupe sanguin, dernière visite, pathologies chroniques

> Copiez le fichier complet `lib/screens/doctor/patients_list_screen.dart`.

---

### 13.3 `lib/screens/doctor/patient_detail_screen.dart`

Dossier médical complet d'un patient vu par le médecin.

**Structure avec SliverAppBar :**
```
PatientDetailScreen
└── DefaultTabController (3 onglets)
    └── NestedScrollView
        ├── SliverAppBar (expandedHeight: 210)
        │   ├── FlexibleSpaceBar → _PatientHeader (avatar, nom, âge, groupe)
        │   └── TabBar → Profil / Consultations / Rendez-vous
        └── TabBarView
            ├── _ProfileTab
            │   ├── Grille 2×2 signes vitaux (_VitalCard)
            │   ├── Allergies (chips rouges)
            │   ├── Pathologies chroniques (chips orange)
            │   └── Contact + adresse + urgence
            ├── _ConsultationsTab → liste _ConsultationCard (expandable)
            └── _AppointmentsTab → _SimpleApptCard
```

> Copiez le fichier complet `lib/screens/doctor/patient_detail_screen.dart`.

---

## 14. Étape 10 — Point d'entrée main.dart

Créez `lib/main.dart`. C'est le premier fichier exécuté.

```dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'providers/auth_provider.dart';
import 'providers/data_provider.dart';
import 'screens/splash_screen.dart';
import 'theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Force l'orientation portrait uniquement
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);

  // Rend la barre de statut transparente avec icônes blanches
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ),
  );

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => DataProvider()),
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
    );
  }
}
```

**Explication de `MultiProvider` :**

```
MultiProvider
└── Fournit AuthProvider et DataProvider à tous les widgets enfants
    └── EConsultationApp (MaterialApp)
        └── SplashScreen
            └── Tous les écrans peuvent accéder aux providers via context
```

---

## 15. Lancer l'application

Une fois tous les fichiers créés :

```bash
# Vérifier que tout compile
flutter analyze

# Lancer sur un émulateur Android ou un appareil connecté
flutter run

# Lancer sur Chrome (web)
flutter run -d chrome
```

Si des erreurs apparaissent, vérifiez :
1. Que tous les fichiers sont créés dans les bons dossiers
2. Que tous les imports sont corrects (chemins relatifs)
3. Que `flutter pub get` a été exécuté après avoir modifié `pubspec.yaml`

---

## 16. Comptes de démonstration

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Médecin généraliste | `dr.martin@econsult.fr` | `doctor123` |
| Cardiologue | `dr.sophie@econsult.fr` | `doctor123` |
| Pédiatre | `dr.pierre@econsult.fr` | `doctor123` |
| Patient | `jean.durand@email.fr` | `patient123` |
| Patient | `marie.lambert@email.fr` | `patient123` |
| Patient | `pierre.martin@email.fr` | `patient123` |

---

## Résumé de l'architecture

```
COUCHE PRÉSENTATION (screens/)
    ↕ lit et modifie via context.watch/read
COUCHE ÉTAT (providers/)
    ↕ instancie et utilise
COUCHE DONNÉES (models/)
```

**Flux de données :**

1. L'utilisateur interagit avec un widget (appui, saisie)
2. Le widget appelle une méthode du provider (`context.read<X>().methode()`)
3. Le provider modifie ses données et appelle `notifyListeners()`
4. Tous les widgets qui écoutent ce provider avec `context.watch<X>()` se reconstruisent automatiquement

---

*Guide rédigé pour le TP eConsultation — Groupe 3*
