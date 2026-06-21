import 'package:flutter/material.dart';
import '../models/appointment.dart';
import '../models/consultation.dart';
import '../models/notification.dart';
import '../models/patient_profile.dart';
import '../models/prescription.dart';
import 'notification_provider.dart';

class DataProvider extends ChangeNotifier {
  final List<PatientProfile> _profiles = [];
  final List<Appointment> _appointments = [];
  final List<Consultation> _consultations = [];
  final List<Prescription> _prescriptions = [];

  DataProvider() {
    _init();
  }

  void _init() {
    // ── PROFILS PATIENTS (contexte burkinabè) ──────────────────────────────────
    _profiles.addAll([
      PatientProfile(
        userId: 'pat1',
        dateOfBirth: DateTime(1998, 4, 12),
        sexe: Sexe.masculin,
        bloodType: 'O+',
        allergies: ['Quinine injectable'],
        chronicConditions: ['Paludisme récurrent', 'Hypertension légère'],
        emergencyContact: 'Mariam NIKIEMA (mère) — 70 12 34 56 78',
        weight: 68.0,
        height: 172.0,
        address: 'Quartier Paspanga, Secteur 12, Ouagadougou',
      ),
      PatientProfile(
        userId: 'pat2',
        dateOfBirth: DateTime(1985, 7, 3),
        sexe: Sexe.masculin,
        bloodType: 'A+',
        allergies: ['Ampicilline'],
        chronicConditions: ['Hypertension artérielle stade 2', 'Colopathie fonctionnelle'],
        emergencyContact: 'Fatimata OUEDRAOGO (épouse) — 76 23 45 67 89',
        weight: 84.0,
        height: 176.0,
        address: 'Secteur 22, Bobo-Dioulasso',
      ),
      PatientProfile(
        userId: 'pat3',
        dateOfBirth: DateTime(1965, 11, 20),
        sexe: Sexe.masculin,
        bloodType: 'SS',
        allergies: ['Sulfonamides', 'Cotrimoxazole'],
        chronicConditions: ['Drépanocytose SS homozygote', 'Diabète type 2'],
        emergencyContact: 'Aminata BELEM (fille) — 65 34 56 78 90',
        weight: 60.0,
        height: 166.0,
        address: 'Quartier Zogona, Ouagadougou',
      ),
      PatientProfile(
        userId: 'pat4',
        dateOfBirth: DateTime(2000, 9, 15),
        sexe: Sexe.feminin,
        bloodType: 'B+',
        allergies: [],
        chronicConditions: ['Asthme bronchique modéré', 'Antécédent fièvre typhoïde'],
        emergencyContact: 'Kassoum DRABO (père) — 74 45 67 89 01',
        weight: 54.0,
        height: 162.0,
        address: 'Secteur 8, Koudougou',
      ),
      PatientProfile(
        userId: 'pat5',
        dateOfBirth: DateTime(1970, 3, 8),
        sexe: Sexe.masculin,
        bloodType: 'O-',
        allergies: ['Ibuprofène', 'Diclofénac'],
        chronicConditions: ['Ulcère gastro-duodénal', 'Paludisme récurrent'],
        emergencyContact: 'Rasmata NEBIE (épouse) — 70 56 78 90 12',
        weight: 79.0,
        height: 175.0,
        address: 'Quartier Pissy, Ouagadougou',
      ),
    ]);

    final today = DateTime.now();
    final d = DateTime(today.year, today.month, today.day);

    // ── RENDEZ-VOUS ────────────────────────────────────────────────────────────
    _appointments.addAll([
      // --- Aujourd'hui ---
      Appointment(
        id: 'apt1',
        patientId: 'pat1',
        doctorId: 'doc1',
        dateTime: DateTime(d.year, d.month, d.day, 8, 0),
        reason: 'Fièvre et frissons — suspicion paludisme',
        status: AppointmentStatus.confirmed,
      ),
      Appointment(
        id: 'apt2',
        patientId: 'pat2',
        doctorId: 'doc1',
        dateTime: DateTime(d.year, d.month, d.day, 9, 30),
        reason: 'Contrôle tension artérielle mensuel',
        status: AppointmentStatus.confirmed,
      ),
      Appointment(
        id: 'apt3',
        patientId: 'pat3',
        doctorId: 'doc1',
        dateTime: DateTime(d.year, d.month, d.day, 11, 0),
        reason: 'Crise douloureuse — drépanocytose',
        status: AppointmentStatus.pending,
      ),
      Appointment(
        id: 'apt4',
        patientId: 'pat4',
        doctorId: 'doc1',
        dateTime: DateTime(d.year, d.month, d.day, 14, 30),
        reason: 'Renouvellement ordonnance asthme + spirométrie',
        status: AppointmentStatus.pending,
      ),
      Appointment(
        id: 'apt5',
        patientId: 'pat5',
        doctorId: 'doc1',
        dateTime: DateTime(d.year, d.month, d.day, 16, 0),
        reason: 'Douleurs épigastriques — suivi ulcère',
        status: AppointmentStatus.confirmed,
      ),
      // --- À venir ---
      Appointment(
        id: 'apt6',
        patientId: 'pat1',
        doctorId: 'doc1',
        dateTime: d.add(const Duration(days: 2)),
        reason: 'Résultats TDR paludisme et NFS',
        status: AppointmentStatus.confirmed,
      ),
      Appointment(
        id: 'apt7',
        patientId: 'pat2',
        doctorId: 'doc2',
        dateTime: d.add(const Duration(days: 4)),
        reason: 'Consultation cardiologie — HTA résistante',
        status: AppointmentStatus.confirmed,
      ),
      Appointment(
        id: 'apt8',
        patientId: 'pat4',
        doctorId: 'doc4',
        dateTime: d.add(const Duration(days: 3)),
        reason: 'Consultation chirurgie — appendicite suspectée',
        status: AppointmentStatus.confirmed,
      ),
      Appointment(
        id: 'apt9',
        patientId: 'pat1',
        doctorId: 'doc1',
        dateTime: d.add(const Duration(days: 7)),
        reason: 'Bilan sanguin complet + glycémie',
        status: AppointmentStatus.pending,
      ),
      Appointment(
        id: 'apt10',
        patientId: 'pat3',
        doctorId: 'doc1',
        dateTime: d.add(const Duration(days: 14)),
        reason: 'Suivi hématologie — NFS + électrophorèse Hb',
        status: AppointmentStatus.confirmed,
      ),
      // --- Passés ---
      Appointment(
        id: 'apt11',
        patientId: 'pat1',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 5)),
        reason: 'Paludisme simple — contrôle J3 Coartem',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt12',
        patientId: 'pat2',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 10)),
        reason: 'Douleurs abdominales — côlon irritable',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt13',
        patientId: 'pat1',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 18)),
        reason: 'Fièvre persistante — bilan infectieux',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt14',
        patientId: 'pat5',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 22)),
        reason: 'Douleurs gastriques nocturnes',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt15',
        patientId: 'pat3',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 35)),
        reason: 'Crise drépanocytaire — suivi hématologie',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt16',
        patientId: 'pat1',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 42)),
        reason: 'Suivi hypertension + paludisme grave',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt17',
        patientId: 'pat4',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 55)),
        reason: 'Crise d\'asthme nocturne',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt18',
        patientId: 'pat1',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 70)),
        reason: 'Consultation de routine — suivi annuel',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt19',
        patientId: 'pat2',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 80)),
        reason: 'Contrôle HTA + bilan lipidique',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt20',
        patientId: 'pat1',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 95)),
        reason: 'Paludisme sévère — post-hospitalisation',
        status: AppointmentStatus.completed,
      ),
    ]);

    // ── CONSULTATIONS (riches — pour les graphiques et l'historique) ───────────
    _consultations.addAll([
      // NIKIEMA Lebian (pat1) — 6 consultations pour le graphique signes vitaux
      Consultation(
        id: 'con1',
        appointmentId: 'apt20',
        patientId: 'pat1',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 95)),
        notes: 'Sortie d\'hospitalisation pour paludisme grave avec anémie sévère. Hb 6.8 g/dL à l\'entrée, remontée à 9.2 g/dL après transfusion. Apyrétique depuis 48h. Splénomégalie modérée persistante. Suivi rapproché recommandé.',
        diagnosis: 'Paludisme grave à P. falciparum — convalescence post-transfusion',
        prescription: 'Artésunate oral 200mg — 1 cp/jour, 3 jours\nAcide folique 5mg — 1 cp/jour, 4 semaines\nFer + acide ascorbique — 1 cp 2x/jour, 1 mois\nMoustiquaire imprégnée obligatoire',
        weight: 65.0,
        temperature: 37.2,
        bloodPressure: '118/74',
        heartRate: 92,
      ),
      Consultation(
        id: 'con2',
        appointmentId: 'apt18',
        patientId: 'pat1',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 70)),
        notes: 'Consultation de routine. Pas de fièvre depuis 6 semaines. TA légèrement élevée à 138/88. NFS : Hb 11.8 g/dL. TDR paludisme négatif. Patient reprend le sport progressivement. Compliance au traitement antihypertenseur satisfaisante.',
        diagnosis: 'Suivi annuel — HTA légère et convalescence paludisme',
        prescription: 'Amlodipine 5mg — 1 cp/jour le matin\nRégime hyposodé < 5g/jour\nActivité physique 30 min/jour\nContrôle TA dans 4 semaines',
        weight: 67.0,
        temperature: 36.9,
        bloodPressure: '138/88',
        heartRate: 80,
      ),
      Consultation(
        id: 'con3',
        appointmentId: 'apt16',
        patientId: 'pat1',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 42)),
        notes: 'Récidive paludisme confirmée TDR+. Fièvre à 39.2°C, frissons, céphalées intenses depuis 48h. Pas de signes de gravité (conscience normale, pas de convulsions, diurèse conservée). TA élevée à 148/92 malgré traitement.',
        diagnosis: 'Paludisme simple à P. falciparum + HTA non contrôlée',
        prescription: 'Artéméther-Luméfantrine (Coartem 80/480mg) — 4 cp à H0, H8, H24, H36, H48, H60\nParacétamol 1000mg — 3x/jour si fièvre, 3 jours\nAmlodipine 10mg — 1 cp/jour (augmentation dose)\nRamipril 5mg — 1 cp/jour le soir\nContrôle dans 72h',
        weight: 67.5,
        temperature: 39.2,
        bloodPressure: '148/92',
        heartRate: 108,
      ),
      Consultation(
        id: 'con4',
        appointmentId: 'apt13',
        patientId: 'pat1',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 18)),
        notes: 'Fièvre persistante 3 jours. TDR paludisme négatif. NFS : hyperleucocytose 12.400/mm³. Gorge rouge, amygdales hypertrophiées avec dépôts blanchâtres. Pas d\'adénopathies cervicales. Douleurs à la déglutition. ECBU normal.',
        diagnosis: 'Angine bactérienne (streptocoque probable)',
        prescription: 'Amoxicilline 1000mg — 2 cp/jour pendant 7 jours\nParacétamol 500mg — 3x/jour si fièvre\nGargarismes antiseptiques — 3x/jour\nContrôle si pas d\'amélioration à 48h',
        weight: 67.0,
        temperature: 38.6,
        bloodPressure: '132/84',
        heartRate: 96,
      ),
      Consultation(
        id: 'con5',
        appointmentId: 'apt11',
        patientId: 'pat1',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 5)),
        notes: 'Contrôle J3 traitement Coartem pour paludisme simple. Apyrétique depuis 36h (T° 36.7°C). Céphalées résiduelles légères. Asthénie persistante. TDR de contrôle positif résiduel (normal à J3). Bon appétit. TA améliorée sous traitement.',
        diagnosis: 'Paludisme simple — bonne évolution sous Coartem',
        prescription: 'Compléter les 6 prises de Coartem\nParacétamol 500mg — si douleurs résiduelles\nAlimenter normalement, hydratation ++ (2L/jour)\nMoustiquaire imprégnée et protection anti-moustiques',
        weight: 68.0,
        temperature: 36.7,
        bloodPressure: '128/80',
        heartRate: 82,
      ),
      // OUEDRAOGO Moussa (pat2)
      Consultation(
        id: 'con6',
        appointmentId: 'apt12',
        patientId: 'pat2',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 10)),
        notes: 'Douleurs abdominales diffuses depuis 3 semaines. Alternance diarrhée/constipation, ballonnements post-prandiaux. Pas de sang dans les selles. Stress professionnel important. Echo abdominale normale. Coproculture négative.',
        diagnosis: 'Syndrome de l\'intestin irritable (colopathie fonctionnelle)',
        prescription: 'Mébévérine 200mg — 1 gél. 2x/jour avant repas, 4 semaines\nSmectite (Diosmectite) — 1 sachet 3x/jour, 2 semaines\nRégime sans résidus — éviter légumineuses, lait entier\nGestion du stress recommandée',
        weight: 84.0,
        temperature: 37.0,
        bloodPressure: '155/98',
        heartRate: 84,
      ),
      Consultation(
        id: 'con7',
        appointmentId: 'apt19',
        patientId: 'pat2',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 80)),
        notes: 'Contrôle HTA. TA à 158/96 malgré traitement. Bilan lipidique : LDL 1.82 g/L, HDL 0.38 g/L. Glycémie à jeun 1.10 g/L. Poids stable. Officier de police — stress professionnel élevé. Tabagisme actif 10 cig/jour.',
        diagnosis: 'HTA stade 2 non contrôlée + dyslipidémie + tabagisme',
        prescription: 'Losartan 100mg — 1 cp/jour le matin (relai Amlodipine)\nHydrochlorothiazide 25mg — 1 cp/jour\nAtorvastatin 20mg — 1 cp/jour le soir\nArrêt tabac conseillé fortement\nBilan cardio dans 1 mois',
        weight: 85.0,
        temperature: 36.8,
        bloodPressure: '158/96',
        heartRate: 88,
      ),
      // BELEM Issa (pat3) — drépanocytose
      Consultation(
        id: 'con8',
        appointmentId: 'apt15',
        patientId: 'pat3',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 35)),
        notes: 'Crise vaso-occlusive depuis 48h. Douleurs osseuses intenses aux membres inférieurs et lombaires. Fièvre à 38.8°C. Pâleur conjonctivale. NFS : Hb 7.2 g/dL, réticulocytes 12%. Hémoglobine S à 85%. Pas de séquestration splénique à l\'écho.',
        diagnosis: 'Crise drépanocytaire vaso-occlusive — Drépanocytose SS',
        prescription: 'Paracétamol 1000mg — 4x/jour, espacer 6h\nTramadol 50mg — 2x/jour si douleur sévère\nHydroxycarbamide 500mg — 1 cp/jour (traitement de fond)\nAcide folique 5mg — 1 cp/jour\nHydratation 3L/jour — hospitalisation si aggravation',
        weight: 60.0,
        temperature: 38.8,
        bloodPressure: '105/65',
        heartRate: 104,
      ),
      // DRABO Aïssata (pat4) — asthme
      Consultation(
        id: 'con9',
        appointmentId: 'apt17',
        patientId: 'pat4',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 55)),
        notes: 'Crise d\'asthme nocturne depuis 2 nuits. Sifflement expiratoire bilatéral, dyspnée à l\'effort modéré. DEP 62% de la valeur théorique. Facteur déclenchant : fumée de bois (cuisine). Saison des pluies (moisissures).',
        diagnosis: 'Asthme bronchique modéré — crise légère à modérée',
        prescription: 'Salbutamol (Ventoline) 100µg — 2 bouffées si crise, max 4x/jour\nBéclométasone 250µg — 2 bouffées 2x/jour (traitement de fond)\nÉviter fumée de bois et poussières\nContrôle DEP dans 4 semaines',
        weight: 54.0,
        temperature: 37.1,
        bloodPressure: '108/68',
        heartRate: 98,
      ),
      // NEBIE Souleymane (pat5) — ulcère
      Consultation(
        id: 'con10',
        appointmentId: 'apt14',
        patientId: 'pat5',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 22)),
        notes: 'Douleurs épigastriques nocturnes depuis 3 semaines, soulagées par l\'alimentation. Pyrosis fréquent. ATCD de prise prolongée de diclofénac pour lombalgies. Test rapide H. pylori positif.',
        diagnosis: 'Ulcère gastro-duodénal à H. pylori',
        prescription: 'Oméprazole 20mg — 1 cp/jour à jeun, 4 semaines\nAmoxicilline 1000mg — 2x/jour, 7 jours (triple thérapie)\nClarithromycine 500mg — 2x/jour, 7 jours\nÉviter AINS, alcool, café\nContrôle dans 4 semaines',
        weight: 79.0,
        temperature: 37.0,
        bloodPressure: '122/78',
        heartRate: 74,
      ),
    ]);

    // ── ORDONNANCES ────────────────────────────────────────────────────────────
    _prescriptions.addAll([
      // NIKIEMA Lebian — paludisme grave (con1)
      Prescription(
        id: 'presc1',
        consultationId: 'con1',
        patientId: 'pat1',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 95)),
        medications: [
          Medication(
            name: 'Artésunate oral 200mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour',
            duration: '3 jours',
            instructions: 'Traitement de relais post-hospitalisation',
          ),
          Medication(
            name: 'Acide folique 5mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour',
            duration: '4 semaines',
            instructions: 'Prendre le matin au petit-déjeuner',
          ),
          Medication(
            name: 'Fer + Vitamine C',
            dosage: '1 comprimé',
            frequency: '2 fois par jour',
            duration: '1 mois',
            instructions: 'Prendre aux repas — éviter avec thé ou café',
          ),
        ],
      ),
      // NIKIEMA Lebian — HTA + paludisme (con3)
      Prescription(
        id: 'presc2',
        consultationId: 'con3',
        patientId: 'pat1',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 42)),
        medications: [
          Medication(
            name: 'Artéméther-Luméfantrine (Coartem 80/480mg)',
            dosage: '4 comprimés',
            frequency: 'Prises à H0, H8, H24, H36, H48, H60',
            duration: '3 jours (6 prises au total)',
            instructions: 'Prendre avec un repas gras pour meilleure absorption',
          ),
          Medication(
            name: 'Paracétamol 1000mg',
            dosage: '1 comprimé',
            frequency: '3 fois par jour',
            duration: '3 jours si fièvre',
            instructions: 'Ne pas dépasser 4g/jour — espacer de 6h',
          ),
          Medication(
            name: 'Amlodipine 10mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour',
            duration: '3 mois',
            instructions: 'Prendre le matin à heure fixe',
          ),
          Medication(
            name: 'Ramipril 5mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour',
            duration: '3 mois',
            instructions: 'Prendre le soir — surveiller la tension régulièrement',
          ),
        ],
      ),
      // NIKIEMA Lebian — angine (con4)
      Prescription(
        id: 'presc3',
        consultationId: 'con4',
        patientId: 'pat1',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 18)),
        medications: [
          Medication(
            name: 'Amoxicilline 1000mg',
            dosage: '1 comprimé',
            frequency: '2 fois par jour',
            duration: '7 jours',
            instructions: 'Terminer le traitement même si amélioration',
          ),
          Medication(
            name: 'Paracétamol 500mg',
            dosage: '1 à 2 comprimés',
            frequency: '3 fois par jour si douleur',
            duration: '5 jours max',
            instructions: 'Ne pas dépasser 3g/jour',
          ),
        ],
      ),
      // OUEDRAOGO Moussa — colopathie (con6)
      Prescription(
        id: 'presc4',
        consultationId: 'con6',
        patientId: 'pat2',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 10)),
        medications: [
          Medication(
            name: 'Mébévérine 200mg',
            dosage: '1 gélule',
            frequency: '2 fois par jour (matin et soir)',
            duration: '4 semaines',
            instructions: 'Prendre 20 min avant les repas',
          ),
          Medication(
            name: 'Smectite (Diosmectite)',
            dosage: '1 sachet',
            frequency: '3 fois par jour',
            duration: '2 semaines',
            instructions: 'Délayer dans un demi-verre d\'eau entre les repas',
          ),
        ],
      ),
      // BELEM Issa — drépanocytose (con8)
      Prescription(
        id: 'presc5',
        consultationId: 'con8',
        patientId: 'pat3',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 35)),
        medications: [
          Medication(
            name: 'Hydroxycarbamide (Hydroxyurée) 500mg',
            dosage: '1 gélule',
            frequency: '1 fois par jour',
            duration: '3 mois (traitement de fond)',
            instructions: 'NFS mensuelle obligatoire — arrêter si GB < 2000/mm³',
          ),
          Medication(
            name: 'Acide folique 5mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour',
            duration: '3 mois',
            instructions: 'Prendre le matin',
          ),
          Medication(
            name: 'Tramadol 50mg',
            dosage: '1 gélule',
            frequency: '2 fois par jour si douleur intense',
            duration: '5 jours en crise',
            instructions: 'Ne pas conduire — éviter l\'alcool',
          ),
        ],
      ),
      // DRABO Aïssata — asthme (con9)
      Prescription(
        id: 'presc6',
        consultationId: 'con9',
        patientId: 'pat4',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 55)),
        medications: [
          Medication(
            name: 'Salbutamol (Ventoline) 100µg',
            dosage: '2 bouffées',
            frequency: 'À la demande en cas de crise — max 4x/jour',
            duration: 'Traitement de crise (selon besoin)',
            instructions: 'Inhaler lentement, retenir l\'air 10 secondes',
          ),
          Medication(
            name: 'Béclométasone 250µg',
            dosage: '2 bouffées',
            frequency: '2 fois par jour (matin et soir)',
            duration: '3 mois (traitement de fond)',
            instructions: 'Se rincer la bouche après chaque utilisation',
          ),
        ],
      ),
      // NEBIE Souleymane — ulcère (con10)
      Prescription(
        id: 'presc7',
        consultationId: 'con10',
        patientId: 'pat5',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 22)),
        medications: [
          Medication(
            name: 'Oméprazole 20mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour',
            duration: '4 semaines',
            instructions: 'Prendre à jeun, 30 min avant le petit-déjeuner',
          ),
          Medication(
            name: 'Amoxicilline 1000mg',
            dosage: '1 comprimé',
            frequency: '2 fois par jour',
            duration: '7 jours',
            instructions: 'Triple thérapie anti-H. pylori — ne jamais interrompre',
          ),
          Medication(
            name: 'Clarithromycine 500mg',
            dosage: '1 comprimé',
            frequency: '2 fois par jour',
            duration: '7 jours',
            instructions: 'Prendre aux repas pour limiter les nausées',
          ),
        ],
      ),
    ]);
  }

  // ─── Getters ────────────────────────────────────────────────────────────────

  List<PatientProfile> get profiles => List.unmodifiable(_profiles);
  List<Appointment> get appointments => List.unmodifiable(_appointments);
  List<Consultation> get consultations => List.unmodifiable(_consultations);
  List<Prescription> get prescriptions => List.unmodifiable(_prescriptions);

  // ─── Profils ────────────────────────────────────────────────────────────────

  PatientProfile? getProfileByUserId(String userId) {
    final m = _profiles.where((p) => p.userId == userId);
    return m.isEmpty ? null : m.first;
  }

  // Ajoute le profil médical d'un nouveau patient
  void addProfile(PatientProfile profile) {
    _profiles.add(profile);
    notifyListeners();
  }

  // Met à jour le profil médical d'un patient existant
  void updateProfile(PatientProfile updated) {
    final idx = _profiles.indexWhere((p) => p.userId == updated.userId);
    if (idx >= 0) {
      _profiles[idx] = updated;
      notifyListeners();
    }
  }

  // Supprime le profil médical (appelé lors de la suppression d'un patient)
  void deleteProfile(String userId) {
    _profiles.removeWhere((p) => p.userId == userId);
    notifyListeners();
  }

  // ─── Rendez-vous ────────────────────────────────────────────────────────────

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
          a.status != AppointmentStatus.cancelled &&
          a.status != AppointmentStatus.refused;
    }).toList();
    list.sort((a, b) => a.dateTime.compareTo(b.dateTime));
    return list;
  }

  void addAppointment(Appointment appointment) {
    _appointments.add(appointment);
    notifyListeners();
  }

  // Met à jour le statut d'un RDV avec un motif optionnel (refus, report)
  void updateAppointmentStatus(
    String id,
    AppointmentStatus status, {
    String? note,
    NotificationProvider? notificationProvider,
  }) {
    final idx = _appointments.indexWhere((a) => a.id == id);
    if (idx >= 0) {
      _appointments[idx].status = status;
      if (note != null) _appointments[idx].refusalNote = note;
      _triggerNotification(status, id, note, notificationProvider);
      notifyListeners();
    }
  }

  void _triggerNotification(
    AppointmentStatus status,
    String appointmentId,
    String? note,
    NotificationProvider? notif,
  ) {
    if (notif == null) return;
    final ts = DateTime.now().millisecondsSinceEpoch.toString();
    switch (status) {
      case AppointmentStatus.confirmed:
        notif.addNotification(AppNotification(
          id: ts,
          title: 'Rendez-vous confirmé',
          message: 'Votre rendez-vous a été confirmé par le médecin.',
          type: NotificationType.appointmentConfirmed,
          createdAt: DateTime.now(),
          appointmentId: appointmentId,
        ));
      case AppointmentStatus.refused:
        notif.addNotification(AppNotification(
          id: ts,
          title: 'Rendez-vous refusé',
          message: note != null && note.isNotEmpty
              ? 'Motif : $note'
              : 'Votre rendez-vous a été refusé par le médecin.',
          type: NotificationType.appointmentRefused,
          createdAt: DateTime.now(),
          appointmentId: appointmentId,
        ));
      case AppointmentStatus.cancelled:
        notif.addNotification(AppNotification(
          id: ts,
          title: 'Rendez-vous annulé',
          message: 'Un rendez-vous a été annulé.',
          type: NotificationType.appointmentCancelled,
          createdAt: DateTime.now(),
          appointmentId: appointmentId,
        ));
      default:
        break;
    }
  }

  Set<String> getTakenSlots(String doctorId, DateTime date) {
    return _appointments.where((a) {
      return a.doctorId == doctorId &&
          a.dateTime.year == date.year &&
          a.dateTime.month == date.month &&
          a.dateTime.day == date.day &&
          a.status != AppointmentStatus.cancelled &&
          a.status != AppointmentStatus.refused;
    }).map((a) {
      return '${a.dateTime.hour.toString().padLeft(2, '0')}:${a.dateTime.minute.toString().padLeft(2, '0')}';
    }).toSet();
  }

  Set<String> getPatientIdsForDoctor(String doctorId) {
    return _appointments
        .where((a) => a.doctorId == doctorId)
        .map((a) => a.patientId)
        .toSet();
  }

  // ─── Consultations ──────────────────────────────────────────────────────────

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

  // Enregistre une nouvelle consultation (et marque le RDV comme terminé si applicable)
  void addConsultation(Consultation consultation) {
    _consultations.add(consultation);
    // Marquer le rendez-vous associé comme terminé
    if (consultation.appointmentId != null) {
      final idx = _appointments.indexWhere(
        (a) => a.id == consultation.appointmentId,
      );
      if (idx >= 0) {
        _appointments[idx].status = AppointmentStatus.completed;
      }
    }
    notifyListeners();
  }

  // ─── Ordonnances ────────────────────────────────────────────────────────────

  List<Prescription> getPrescriptionsForPatient(String patientId) {
    final list = _prescriptions.where((p) => p.patientId == patientId).toList();
    list.sort((a, b) => b.date.compareTo(a.date));
    return list;
  }

  Prescription? getPrescriptionByConsultationId(String consultationId) {
    final m = _prescriptions.where((p) => p.consultationId == consultationId);
    return m.isEmpty ? null : m.first;
  }

  void addPrescription(Prescription prescription) {
    _prescriptions.add(prescription);
    notifyListeners();
  }
}
