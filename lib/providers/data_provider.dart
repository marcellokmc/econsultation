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
      PatientProfile(
        userId: 'pat6',
        dateOfBirth: DateTime(1992, 5, 14),
        sexe: Sexe.feminin,
        bloodType: 'O+',
        allergies: [],
        chronicConditions: ['Grossesse 3e trimestre', 'Paludisme gestationnel récent'],
        emergencyContact: 'Seydou TRAORE (époux) — 76 11 22 33 44',
        weight: 63.0,
        height: 160.0,
        address: 'Quartier Gounghin, Ouagadougou',
      ),
      PatientProfile(
        userId: 'pat7',
        dateOfBirth: DateTime(1978, 2, 20),
        sexe: Sexe.masculin,
        bloodType: 'A+',
        allergies: ['Sulfonylurées'],
        chronicConditions: ['Diabète type 2 sous insuline', 'HTA stade 2'],
        emergencyContact: 'Rasmata COMPAORE (épouse) — 65 22 33 44 55',
        weight: 91.0,
        height: 174.0,
        address: 'Secteur 15, Ouagadougou',
      ),
      PatientProfile(
        userId: 'pat8',
        dateOfBirth: DateTime(2005, 8, 3),
        sexe: Sexe.feminin,
        bloodType: 'B+',
        allergies: [],
        chronicConditions: ['Malnutrition aiguë modérée (MAM)', 'Paludisme récurrent'],
        emergencyContact: 'Martine SOME (mère) — 70 33 44 55 66',
        weight: 38.0,
        height: 155.0,
        address: 'Village de Léo, Province de la Sissili',
      ),
      PatientProfile(
        userId: 'pat9',
        dateOfBirth: DateTime(1955, 12, 10),
        sexe: Sexe.masculin,
        bloodType: 'AB+',
        allergies: ['AINS', 'Ibuprofène'],
        chronicConditions: ['Insuffisance rénale chronique stade 3', 'HTA essentielle'],
        emergencyContact: 'Fatimata ZONGO (fille) — 76 44 55 66 77',
        weight: 72.0,
        height: 168.0,
        address: 'Quartier Dapoya, Ouagadougou',
      ),
      PatientProfile(
        userId: 'pat10',
        dateOfBirth: DateTime(1988, 3, 25),
        sexe: Sexe.feminin,
        bloodType: 'O+',
        allergies: [],
        chronicConditions: ['Tuberculose pulmonaire active (sous DOTS)', 'Dénutrition légère'],
        emergencyContact: 'Moussa OUATTARA (frère) — 74 55 66 77 88',
        weight: 49.0,
        height: 163.0,
        address: 'Secteur 27, Bobo-Dioulasso',
      ),
      PatientProfile(
        userId: 'pat11',
        dateOfBirth: DateTime(2001, 11, 7),
        sexe: Sexe.masculin,
        bloodType: 'A-',
        allergies: ['Pénicilline'],
        chronicConditions: ['Épilepsie post-méningitique', 'ATCD méningite bactérienne'],
        emergencyContact: 'Ibrahim DAO (père) — 70 66 77 88 99',
        weight: 66.0,
        height: 170.0,
        address: 'Quartier Bilbalogho, Ouagadougou',
      ),
      PatientProfile(
        userId: 'pat12',
        dateOfBirth: DateTime(1975, 6, 18),
        sexe: Sexe.feminin,
        bloodType: 'B+',
        allergies: [],
        chronicConditions: ['Drépanocytose AS (trait)', 'ATCD cancer col utérin stade I traité'],
        emergencyContact: 'Sekou COULIBALY (époux) — 76 77 88 99 00',
        weight: 58.0,
        height: 161.0,
        address: 'Secteur 19, Bobo-Dioulasso',
      ),
      PatientProfile(
        userId: 'pat13',
        dateOfBirth: DateTime(1963, 9, 22),
        sexe: Sexe.masculin,
        bloodType: 'O+',
        allergies: ['Aspirine'],
        chronicConditions: ['BPCO stade 2 (tabagisme 30 PA)', 'Hernie inguinale droite non compliquée'],
        emergencyContact: 'Pascaline BONKOUNGOU (épouse) — 65 88 99 00 11',
        weight: 76.0,
        height: 171.0,
        address: 'Quartier Tampouy, Ouagadougou',
      ),
      PatientProfile(
        userId: 'pat14',
        dateOfBirth: DateTime(1995, 1, 30),
        sexe: Sexe.feminin,
        bloodType: 'AB-',
        allergies: [],
        chronicConditions: ['Diabète gestationnel', 'Grossesse 5e mois'],
        emergencyContact: 'Théodore ILBOUDO (époux) — 74 99 00 11 22',
        weight: 68.0,
        height: 165.0,
        address: 'Quartier Wemtenga, Ouagadougou',
      ),
      PatientProfile(
        userId: 'pat15',
        dateOfBirth: DateTime(1948, 4, 5),
        sexe: Sexe.masculin,
        bloodType: 'O+',
        allergies: [],
        chronicConditions: ['Insuffisance cardiaque FEVG 35%', 'ATCD infarctus du myocarde'],
        emergencyContact: 'Marie-Claire KABORE (épouse) — 70 00 11 22 33',
        weight: 68.0,
        height: 169.0,
        address: 'Secteur 6, Ouagadougou',
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
      // --- Aujourd'hui (nouveaux patients) ---
      Appointment(
        id: 'apt21',
        patientId: 'pat6',
        doctorId: 'doc1',
        dateTime: DateTime(d.year, d.month, d.day, 7, 30),
        reason: 'Suivi grossesse 3e trimestre + résultats bilan prénatal',
        status: AppointmentStatus.confirmed,
      ),
      Appointment(
        id: 'apt22',
        patientId: 'pat7',
        doctorId: 'doc1',
        dateTime: DateTime(d.year, d.month, d.day, 10, 0),
        reason: 'Contrôle glycémie et bilan HTA — diabète type 2',
        status: AppointmentStatus.confirmed,
      ),
      Appointment(
        id: 'apt23',
        patientId: 'pat9',
        doctorId: 'doc2',
        dateTime: DateTime(d.year, d.month, d.day, 9, 0),
        reason: 'Bilan rénal trimestriel — insuffisance rénale chronique',
        status: AppointmentStatus.confirmed,
      ),
      Appointment(
        id: 'apt24',
        patientId: 'pat15',
        doctorId: 'doc2',
        dateTime: DateTime(d.year, d.month, d.day, 11, 30),
        reason: 'Contrôle insuffisance cardiaque — poids et oedèmes',
        status: AppointmentStatus.pending,
      ),
      Appointment(
        id: 'apt25',
        patientId: 'pat8',
        doctorId: 'doc3',
        dateTime: DateTime(d.year, d.month, d.day, 10, 30),
        reason: 'Suivi nutritionnel — bilan malnutrition MAM',
        status: AppointmentStatus.confirmed,
      ),
      // --- À venir (nouveaux patients) ---
      Appointment(
        id: 'apt26',
        patientId: 'pat10',
        doctorId: 'doc1',
        dateTime: d.add(const Duration(days: 3)),
        reason: 'Suivi tuberculose — contrôle observance DOTS mois 2',
        status: AppointmentStatus.confirmed,
      ),
      Appointment(
        id: 'apt27',
        patientId: 'pat11',
        doctorId: 'doc1',
        dateTime: d.add(const Duration(days: 5)),
        reason: 'Contrôle épilepsie post-méningitique — ajustement traitement',
        status: AppointmentStatus.pending,
      ),
      Appointment(
        id: 'apt28',
        patientId: 'pat14',
        doctorId: 'doc1',
        dateTime: d.add(const Duration(days: 2)),
        reason: 'Contrôle glycémie gestationnel — diabète grossesse',
        status: AppointmentStatus.confirmed,
      ),
      Appointment(
        id: 'apt29',
        patientId: 'pat13',
        doctorId: 'doc4',
        dateTime: d.add(const Duration(days: 6)),
        reason: 'Consultation pré-opératoire — hernie inguinale droite',
        status: AppointmentStatus.confirmed,
      ),
      Appointment(
        id: 'apt30',
        patientId: 'pat12',
        doctorId: 'doc1',
        dateTime: d.add(const Duration(days: 4)),
        reason: 'Renouvellement ordonnance drépanocytose + suivi oncologique',
        status: AppointmentStatus.confirmed,
      ),
      Appointment(
        id: 'apt31',
        patientId: 'pat15',
        doctorId: 'doc2',
        dateTime: d.add(const Duration(days: 10)),
        reason: 'ETT de contrôle FEVG — insuffisance cardiaque chronique',
        status: AppointmentStatus.confirmed,
      ),
      Appointment(
        id: 'apt32',
        patientId: 'pat7',
        doctorId: 'doc2',
        dateTime: d.add(const Duration(days: 8)),
        reason: 'Consultation cardiologie — HTA résistante sous bithérapie',
        status: AppointmentStatus.pending,
      ),
      Appointment(
        id: 'apt33',
        patientId: 'pat9',
        doctorId: 'doc2',
        dateTime: d.add(const Duration(days: 14)),
        reason: 'Consultation néphrologie — progression IRC stade 3',
        status: AppointmentStatus.confirmed,
      ),
      Appointment(
        id: 'apt34',
        patientId: 'pat6',
        doctorId: 'doc1',
        dateTime: d.add(const Duration(days: 7)),
        reason: 'Échographie obstétricale 3e trimestre + morphologie',
        status: AppointmentStatus.confirmed,
      ),
      Appointment(
        id: 'apt35',
        patientId: 'pat8',
        doctorId: 'doc3',
        dateTime: d.add(const Duration(days: 12)),
        reason: 'Bilan nutritionnel complet — MUAC + poids',
        status: AppointmentStatus.pending,
      ),
      // --- Passés (nouveaux patients) ---
      Appointment(
        id: 'apt36',
        patientId: 'pat6',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 15)),
        reason: 'Fièvre 39°C pendant grossesse — suspicion paludisme gestationnel',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt37',
        patientId: 'pat7',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 20)),
        reason: 'Contrôle glycémie — HbA1c + fructosamine',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt38',
        patientId: 'pat10',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 45)),
        reason: 'Initiation traitement tuberculose — résultats crachats BK+',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt39',
        patientId: 'pat9',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 30)),
        reason: 'Bilan rénal — créatinine, urée, électrolytes',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt40',
        patientId: 'pat11',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 25)),
        reason: 'Post-méningite — initiation traitement anti-épileptique',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt41',
        patientId: 'pat13',
        doctorId: 'doc4',
        dateTime: d.subtract(const Duration(days: 60)),
        reason: 'Diagnostic et bilan hernie inguinale droite',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt42',
        patientId: 'pat12',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 40)),
        reason: 'Suivi drépanocytose AS + contrôle oncologique col',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt43',
        patientId: 'pat15',
        doctorId: 'doc2',
        dateTime: d.subtract(const Duration(days: 90)),
        reason: 'Diagnostic insuffisance cardiaque post-IDM — ETT initiale',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt44',
        patientId: 'pat14',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 35)),
        reason: 'Dépistage diabète gestationnel — HGPO 75g',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt45',
        patientId: 'pat8',
        doctorId: 'doc3',
        dateTime: d.subtract(const Duration(days: 50)),
        reason: 'Admission malnutrition modérée — poids 36 kg, MUAC < 12 cm',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt46',
        patientId: 'pat7',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 65)),
        reason: 'Première consultation — glycémie 2.8 g/L, TA 165/100',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt47',
        patientId: 'pat6',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 90)),
        reason: 'Confirmation grossesse — echo 1er trimestre + bilan prénatal',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt48',
        patientId: 'pat9',
        doctorId: 'doc2',
        dateTime: d.subtract(const Duration(days: 75)),
        reason: 'Prise en charge IRC — créatinine 250 µmol/L, DFG 28 mL/min',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt49',
        patientId: 'pat15',
        doctorId: 'doc2',
        dateTime: d.subtract(const Duration(days: 60)),
        reason: 'Suivi post-IDM 1 mois — FEVG, traitement médicamenteux',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt50',
        patientId: 'pat10',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 30)),
        reason: 'Résultats BK+ confirmés — adaptation traitement DOTS',
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
      // TRAORE Aminata (pat6) — grossesse + paludisme gestationnel
      Consultation(
        id: 'con11',
        appointmentId: 'apt47',
        patientId: 'pat6',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 90)),
        notes: 'Première visite prénatale. Echo 1er trimestre : grossesse unique intra-utérine, 12 SA. Biométrie normale. NFS, groupe sanguin O+, sérologies TPHA-VDRL, VIH rapide négatif, TDR paludisme négatif. Supplémentation fer et folates débutée. RHD : moustiquaire imprégnée, éviter marché le soir.',
        diagnosis: 'Grossesse 12 SA — suivi prénatal 1er trimestre',
        prescription: 'Fer 200mg + Acide folique 5mg — 1 cp/jour toute la grossesse\nSulfadoxine-Pyriméthamine (Fansidar) 3 cp — dose unique TPI 1\nMoustiquaire imprégnée MIILDA — utilisation systématique\nConsultation mensuelle programmée',
        weight: 58.0,
        temperature: 36.8,
        bloodPressure: '112/70',
        heartRate: 82,
      ),
      Consultation(
        id: 'con12',
        appointmentId: 'apt36',
        patientId: 'pat6',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 15)),
        notes: 'Fièvre à 39.1°C depuis 48h, frissons, céphalées. TDR paludisme positif (P. falciparum). Grossesse 27 SA (6e mois). Pas de signe de gravité maternelle. Mouvements actifs fœtaux conservés. NFS : Hb 10.8 g/dL. Glycémie normale. Artéméther-Luméfantrine sûr après 1er trimestre.',
        diagnosis: 'Paludisme gestationnel simple — P. falciparum (27 SA)',
        prescription: 'Artéméther-Luméfantrine (Coartem) 80/480mg — 4 cp à H0, H8, H24, H36, H48, H60\nParacétamol 500mg — 3x/jour si fièvre, 3 jours\nFer + Acide folique — continuer supplémentation\nSurveillance mouvements fœtaux quotidienne\nRetour immédiat si aggravation ou convulsions',
        weight: 63.0,
        temperature: 39.1,
        bloodPressure: '118/72',
        heartRate: 98,
      ),
      // COMPAORE Rasmane (pat7) — diabète + HTA
      Consultation(
        id: 'con13',
        appointmentId: 'apt46',
        patientId: 'pat7',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 65)),
        notes: 'Patient référé par dispensaire pour hyperglycémie et HTA fortuitement découvertes. Glycémie à jeun : 2.8 g/L, HbA1c 10.2%. TA : 165/102 mmHg. IMC : 30.1 (obésité grade I). Tabagisme 15 cig/jour depuis 20 ans. Polyurie, polydipsie, asthénie depuis 3 mois. ECG normal.',
        diagnosis: 'Diabète type 2 déséquilibré (HbA1c 10.2%) + HTA stade 2 — nouvellement diagnostiqués',
        prescription: 'Metformine 500mg — 1 cp 2x/jour aux repas (titration progressive)\nAmlodipine 5mg — 1 cp/jour le matin\nRégime hypocalorique, hyposodé < 5g/jour\nAuto-surveillance glycémique 2x/jour\nArrêt tabac — consultation addictologie',
        weight: 91.0,
        temperature: 36.9,
        bloodPressure: '165/102',
        heartRate: 88,
      ),
      Consultation(
        id: 'con14',
        appointmentId: 'apt37',
        patientId: 'pat7',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 20)),
        notes: 'Contrôle à 6 semaines. Glycémie à jeun : 1.85 g/L (amélioration). HbA1c 8.4%. TA : 148/92 (encore élevée). Poids -2 kg. Patient partiellement observant. Pas de symptômes hypoglycémiques. Légère diarrhée initiale disparue. Bilan lipidique : LDL 1.78 g/L. Microalbuminurie positive (38 mg/24h).',
        diagnosis: 'Diabète type 2 — amélioration partielle sous Metformine + HTA non contrôlée',
        prescription: 'Metformine 1000mg — 1 cp 2x/jour aux repas\nAmlodipine 10mg — 1 cp/jour (augmentation dose)\nRamipril 5mg — 1 cp/jour le soir (néphroprotecteur)\nBilan créatinine + microalbuminurie dans 4 semaines\nEnseignement diabétique : alimentation, pied diabétique',
        weight: 89.0,
        temperature: 36.7,
        bloodPressure: '148/92',
        heartRate: 84,
      ),
      // SOME Victorine (pat8) — malnutrition + paludisme
      Consultation(
        id: 'con15',
        appointmentId: 'apt45',
        patientId: 'pat8',
        doctorId: 'doc3',
        date: d.subtract(const Duration(days: 50)),
        notes: 'Jeune patiente amenée par sa mère. Poids 36 kg pour 155 cm (IMC 15.0). MUAC 19 cm (malnutrition modérée). Pâleur cutanéo-muqueuse. NFS : Hb 8.4 g/dL (anémie sévère). TDR paludisme positif. Appétit diminué depuis 2 mois — période agricole difficile. Œdèmes absents (kwashiorkor exclu).',
        diagnosis: 'Malnutrition aiguë modérée (MAM) + Paludisme + Anémie sévère',
        prescription: 'Artéméther-Luméfantrine — traitement standard 3 jours\nPlumpyNut (ATPE) — 3 sachets/jour, 8 semaines\nFer + Acide folique — 1 cp/jour, 3 mois\nAlbendazole 400mg — 1 cp dose unique (déparasitage)\nContrôle poids hebdomadaire en CRENAS',
        weight: 36.0,
        temperature: 38.3,
        bloodPressure: '98/62',
        heartRate: 102,
      ),
      // ZONGO Adama (pat9) — IRC + HTA
      Consultation(
        id: 'con16',
        appointmentId: 'apt48',
        patientId: 'pat9',
        doctorId: 'doc2',
        date: d.subtract(const Duration(days: 75)),
        notes: 'Patient adressé par généraliste. Créatinine 250 µmol/L, DFG 28 mL/min/1.73m² (stade G3b). Urée 18 mmol/L. Protéinurie 2+. Potassium 5.1 mmol/L. TA 172/108 malgré bithérapie. HTA depuis 15 ans mal contrôlée. Echo rénale : reins symétriques 9 cm, hyperéchogènes (néphropathie hypertensive).',
        diagnosis: 'Néphropathie hypertensive — IRC stade G3b (DFG 28 mL/min)',
        prescription: 'Ramipril 10mg — 1 cp/jour (néphroprotecteur + antihypertenseur)\nAmlodipine 10mg — 1 cp/jour\nFurosémide 40mg — 1 cp/jour le matin\nRégime hypoprotidique 0.8g/kg/jour, hypokaliémique\nEviter AINS, produits de contraste iodés, aminosides\nBilan mensuel : créatinine, potassium, TA',
        weight: 72.0,
        temperature: 36.6,
        bloodPressure: '172/108',
        heartRate: 76,
      ),
      Consultation(
        id: 'con17',
        appointmentId: 'apt39',
        patientId: 'pat9',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 30)),
        notes: 'Suivi à 6 semaines. Créatinine 238 µmol/L (légère amélioration). DFG 30 mL/min (stable). Potassium 4.8 mmol/L. TA 152/96 (amélioration). Œdèmes MI réduits. Poids -1.5 kg sous furosémide. Patient observant. Pas de symptômes urémiques. NFS : Hb 10.2 g/dL (anémie normochrome).',
        diagnosis: 'IRC stade 3 — stabilisation sous traitement néphroprotecteur',
        prescription: 'Continuer Ramipril 10mg + Amlodipine 10mg + Furosémide 40mg\nVitamines B6/B12 — 1 cp/jour (prévention neuropathie urémique)\nHydratation 1.5L/jour — éviter déshydratation\nConsultation diététicienne recommandée\nBilan rénal + NFS dans 4 semaines',
        weight: 70.5,
        temperature: 36.5,
        bloodPressure: '152/96',
        heartRate: 72,
      ),
      // OUATTARA Mariam (pat10) — tuberculose
      Consultation(
        id: 'con18',
        appointmentId: 'apt38',
        patientId: 'pat10',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 45)),
        notes: 'Toux productive depuis 3 mois, hémoptysies minimes, amaigrissement 8 kg, sueurs nocturnes, fièvre vespérale. Crachats : BAAR +2 (2 frottis positifs). Radiographie thorax : opacités nodulaires apicales bilatérales, caverne lobe supérieur droit. VIH rapide négatif. Xpert MTB/RIF : MTB détecté, rifampicine sensible.',
        diagnosis: 'Tuberculose pulmonaire à microscopie positive (TPM+) — souche sensible',
        prescription: 'Phase initiale 2 mois (RHZE) :\nRifampicine 600mg + Isoniazide 300mg + Pyrazinamide 1500mg + Ethambutol 1200mg — 1x/jour à jeun\nPyridoxine (Vit B6) 25mg — 1 cp/jour (prévention neuropathie)\nEnrôlement programme DOTS — observance directe obligatoire\nNotification TB faite\nBilan hépatique à 2 semaines',
        weight: 49.0,
        temperature: 38.4,
        bloodPressure: '108/68',
        heartRate: 94,
      ),
      Consultation(
        id: 'con19',
        appointmentId: 'apt50',
        patientId: 'pat10',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 30)),
        notes: 'Contrôle J15 phase initiale. Amélioration clinique : toux moins productive, apyrétique, reprise appétit. Poids +2 kg. Transaminases légèrement élevées 2x LSN (surveillance). Crachats contrôle : BAAR +1 (conversion partielle attendue). Observance DOTS confirmée par infirmier communautaire.',
        diagnosis: 'Tuberculose pulmonaire — bonne réponse à la phase initiale',
        prescription: 'Phase de continuation 4 mois (RH) :\nRifampicine 600mg + Isoniazide 300mg — 1x/jour à jeun\nPyridoxine 25mg — continuer tout le traitement\nSupplément nutritionnel — repas complets, protéines ++\nContrôle crachats à 2 mois et 5 mois de traitement\nTransaminases contrôle dans 4 semaines',
        weight: 51.0,
        temperature: 37.0,
        bloodPressure: '110/70',
        heartRate: 82,
      ),
      // DAO Brahima (pat11) — épilepsie post-méningitique
      Consultation(
        id: 'con20',
        appointmentId: 'apt40',
        patientId: 'pat11',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 25)),
        notes: 'Patient avec ATCD méningite bactérienne (H. influenzae) il y a 3 mois. Séquelles : 2 crises convulsives généralisées tonico-cloniques depuis sortie hospit, dernière crise il y a 10 jours. Pas de déficit focal. EEG : décharges épileptiformes temporales droites. IRM indisponible — référé CHU Yalgado.',
        diagnosis: 'Épilepsie post-méningitique — crises tonico-cloniques généralisées',
        prescription: 'Valproate de sodium (Dépakine) 500mg — 1 cp 2x/jour (matin et soir)\nL-Carnitine (Carnitor) 500mg — 1 cp 2x/jour (hépatoprotection)\nEviter conduite, travail en hauteur, baignade seul\nCarnet de crises — noter date, durée, type de crise\nBilan hépatique avant traitement et à 1 mois\nConsultation neurologie CHU Yalgado dans 1 mois',
        weight: 66.0,
        temperature: 36.8,
        bloodPressure: '120/76',
        heartRate: 72,
      ),
      // COULIBALY Fatoumata (pat12) — drépanocytose AS
      Consultation(
        id: 'con21',
        appointmentId: 'apt42',
        patientId: 'pat12',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 40)),
        notes: 'Consultation semestrielle drépanocytose AS. Pas de crise vaso-occlusive depuis 6 mois. Légère asthénie. NFS : Hb 11.2 g/dL, réticulocytes 3%. Contrôle oncologique : frottis cervico-vaginal normal (suivi post-conisation 18 mois). Mammographie normale. Statut vaccinal à jour.',
        diagnosis: 'Drépanocytose AS — suivi stable + contrôle oncologique col négatif',
        prescription: 'Acide folique 5mg — 1 cp/jour (prévention carence)\nPas de fer nécessaire (Hb 11.2 g/dL)\nProchain FCV dans 6 mois\nRappel vaccin grippe + pneumocoque\nEviter déshydratation, effort intense, altitude',
        weight: 58.0,
        temperature: 36.7,
        bloodPressure: '116/72',
        heartRate: 76,
      ),
      // BONKOUNGOU Roger (pat13) — BPCO + hernie
      Consultation(
        id: 'con22',
        appointmentId: 'apt41',
        patientId: 'pat13',
        doctorId: 'doc4',
        date: d.subtract(const Duration(days: 60)),
        notes: 'Masse inguinale droite réductible depuis 1 an, augmentant. Légère gêne à l\'effort. Examen : hernie inguinale directe droite réductible, pas d\'étranglement. Auscultation : sibilants expiratoires bilatéraux (BPCO connue). Tabagisme actif 30 PA. Spirométrie indispensable avant toute anesthésie générale.',
        diagnosis: 'Hernie inguinale directe droite non compliquée — chirurgie programmée',
        prescription: 'Spirométrie pré-opératoire (risque anesthésique BPCO)\nSalbutamol 100µg — 2 bouffées avant effort si dyspnée\nArrêt tabac obligatoire — consultation addictologie\nBilan pré-op : NFS, coag, ECG, radio thorax\nChirurgie sous AL programméé dans 6 semaines si EFR acceptables',
        weight: 76.0,
        temperature: 36.9,
        bloodPressure: '132/82',
        heartRate: 80,
      ),
      // ILBOUDO Germaine (pat14) — diabète gestationnel
      Consultation(
        id: 'con23',
        appointmentId: 'apt44',
        patientId: 'pat14',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 35)),
        notes: 'Dépistage systématique diabète gestationnel à 24 SA. HGPO 75g : glycémie jeun 0.95 g/L, H1 2.10 g/L, H2 1.75 g/L — diabète gestationnel confirmé (critères IADPSG). TA normale. Prise de poids 7 kg (normale). Echo : pas de macrosomie pour l\'instant, liquide amniotique normal.',
        diagnosis: 'Diabète gestationnel (24 SA) — HGPO pathologique',
        prescription: 'Régime diabétique grossesse — consultation diététicienne\nAuto-surveillance glycémique 4x/jour (jeun + H1 post-prandiaux)\nObjectifs : jeun < 0.95 g/L, post-prandial H1 < 1.40 g/L\nInsulino-thérapie si non contrôlé sous régime à 2 semaines\nEcho fœtale mensuelle (surveillance macrosomie)\nAccouchement en maternité de référence',
        weight: 68.0,
        temperature: 36.6,
        bloodPressure: '114/70',
        heartRate: 80,
      ),
      // KABORE Etienne (pat15) — insuffisance cardiaque
      Consultation(
        id: 'con24',
        appointmentId: 'apt43',
        patientId: 'pat15',
        doctorId: 'doc2',
        date: d.subtract(const Duration(days: 90)),
        notes: 'Patient adressé en urgence pour dyspnée à l\'effort NYHA III et œdèmes MI bilatéraux. ATCD IDM il y a 4 mois (pris en charge CHU). ETT : FEVG 35%, dilatation VG, hypokinésie antéro-septale. BNP 1850 pg/mL. Crépitants bibasaux. PAS 100 mmHg. FC 95/min irrégulière (FA chronique).',
        diagnosis: 'Insuffisance cardiaque systolique FEVG 35% post-IDM + FA chronique — NYHA III',
        prescription: 'Bisoprolol 2.5mg — 1 cp/jour le matin (titration progressive)\nRamipril 5mg — 1 cp/jour le soir\nFurosémide 40mg — 1 cp/jour le matin\nSpironolactone 25mg — 1 cp/jour\nWarfarine 5mg — 1 cp/jour à heure fixe (INR cible 2-3)\nRégime hyposodé strict < 3g/jour, restriction hydrique 1.5L/jour\nPesée quotidienne — consulter si +2 kg en 3 jours',
        weight: 74.0,
        temperature: 36.4,
        bloodPressure: '100/65',
        heartRate: 95,
      ),
      Consultation(
        id: 'con25',
        appointmentId: 'apt49',
        patientId: 'pat15',
        doctorId: 'doc2',
        date: d.subtract(const Duration(days: 60)),
        notes: 'Suivi à 1 mois. NYHA II (amélioration). Poids -3 kg. Œdèmes MI résiduels légers. FC 72/min régulière (FA contrôlée sous Bisoprolol). TA 108/68 mmHg. BNP 680 pg/mL (nette amélioration). ETT contrôle : FEVG 40% (amélioration). INR 2.4 (dans cible). Tolérance traitement bonne.',
        diagnosis: 'Insuffisance cardiaque — amélioration clinique et échocardiographique (FEVG 40%)',
        prescription: 'Bisoprolol 5mg — 1 cp/jour (augmentation dose)\nContinuer Ramipril 5mg + Furosémide 40mg + Spironolactone 25mg\nWarfarine — ajuster selon INR hebdomadaire\nRéadaptation cardiaque progressive — marche 20 min/jour\nETT contrôle à 3 mois\nINR dans 2 semaines',
        weight: 68.0,
        temperature: 36.5,
        bloodPressure: '108/68',
        heartRate: 72,
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
      // TRAORE Aminata — grossesse (con11)
      Prescription(
        id: 'presc8',
        consultationId: 'con11',
        patientId: 'pat6',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 90)),
        medications: [
          Medication(
            name: 'Fer 200mg + Acide folique 5mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour',
            duration: 'Toute la grossesse',
            instructions: 'Prendre entre les repas — éviter avec thé ou lait',
          ),
          Medication(
            name: 'Sulfadoxine-Pyriméthamine (Fansidar)',
            dosage: '3 comprimés',
            frequency: 'Dose unique (TPI dose 1)',
            duration: '1 prise',
            instructions: 'Traitement préventif intermittent paludisme grossesse',
          ),
        ],
      ),
      // TRAORE Aminata — paludisme gestationnel (con12)
      Prescription(
        id: 'presc9',
        consultationId: 'con12',
        patientId: 'pat6',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 15)),
        medications: [
          Medication(
            name: 'Artéméther-Luméfantrine (Coartem 80/480mg)',
            dosage: '4 comprimés',
            frequency: 'Prises à H0, H8, H24, H36, H48, H60',
            duration: '3 jours (6 prises)',
            instructions: 'Prendre avec repas gras — sûr après 1er trimestre',
          ),
          Medication(
            name: 'Paracétamol 500mg',
            dosage: '1 à 2 comprimés',
            frequency: '3 fois par jour si fièvre',
            duration: '3 jours',
            instructions: 'Ne pas dépasser 3g/jour pendant la grossesse',
          ),
          Medication(
            name: 'Fer 200mg + Acide folique 5mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour',
            duration: "Jusqu'à l'accouchement",
            instructions: 'Continuer la supplémentation prénatale',
          ),
        ],
      ),
      // COMPAORE Rasmane — initiation traitement (con13)
      Prescription(
        id: 'presc10',
        consultationId: 'con13',
        patientId: 'pat7',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 65)),
        medications: [
          Medication(
            name: 'Metformine 500mg',
            dosage: '1 comprimé',
            frequency: '2 fois par jour aux repas',
            duration: '6 semaines (titration)',
            instructions: 'Commencer à 500mg pour limiter troubles digestifs',
          ),
          Medication(
            name: 'Amlodipine 5mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour le matin',
            duration: '3 mois',
            instructions: 'Prendre à heure fixe — ne pas arrêter brutalement',
          ),
        ],
      ),
      // COMPAORE Rasmane — ajustement (con14)
      Prescription(
        id: 'presc11',
        consultationId: 'con14',
        patientId: 'pat7',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 20)),
        medications: [
          Medication(
            name: 'Metformine 1000mg',
            dosage: '1 comprimé',
            frequency: '2 fois par jour aux repas',
            duration: '3 mois',
            instructions: 'Augmentation de dose — surveiller glycémie à jeun',
          ),
          Medication(
            name: 'Amlodipine 10mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour le matin',
            duration: '3 mois',
            instructions: 'Augmentation de dose — surveiller TA quotidiennement',
          ),
          Medication(
            name: 'Ramipril 5mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour le soir',
            duration: '3 mois',
            instructions: 'Néphroprotecteur — surveiller créatinine dans 4 semaines',
          ),
        ],
      ),
      // SOME Victorine — malnutrition (con15)
      Prescription(
        id: 'presc12',
        consultationId: 'con15',
        patientId: 'pat8',
        doctorId: 'doc3',
        date: d.subtract(const Duration(days: 50)),
        medications: [
          Medication(
            name: 'Plumpynut (ATPE)',
            dosage: '3 sachets',
            frequency: '3 fois par jour',
            duration: '8 semaines',
            instructions: "Aliment thérapeutique prêt à l'emploi — ne pas mélanger à l'eau",
          ),
          Medication(
            name: 'Fer + Acide folique',
            dosage: '1 comprimé',
            frequency: '1 fois par jour',
            duration: '3 mois',
            instructions: "Corriger l'anémie ferriprive — prendre après repas",
          ),
          Medication(
            name: 'Albendazole 400mg',
            dosage: '1 comprimé',
            frequency: 'Dose unique',
            duration: '1 prise',
            instructions: 'Déparasitage — à renouveler dans 3 mois',
          ),
        ],
      ),
      // ZONGO Adama — IRC + HTA (con16)
      Prescription(
        id: 'presc13',
        consultationId: 'con16',
        patientId: 'pat9',
        doctorId: 'doc2',
        date: d.subtract(const Duration(days: 75)),
        medications: [
          Medication(
            name: 'Ramipril 10mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour',
            duration: '3 mois',
            instructions: 'Néphroprotecteur — arrêter si potassium > 5.5 mmol/L',
          ),
          Medication(
            name: 'Amlodipine 10mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour le matin',
            duration: '3 mois',
            instructions: 'Antihypertenseur — surveiller TA quotidiennement',
          ),
          Medication(
            name: 'Furosémide 40mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour le matin',
            duration: '3 mois',
            instructions: 'Diurétique — prendre le matin, peser chaque jour',
          ),
        ],
      ),
      // OUATTARA Mariam — tuberculose phase initiale (con18)
      Prescription(
        id: 'presc14',
        consultationId: 'con18',
        patientId: 'pat10',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 45)),
        medications: [
          Medication(
            name: 'RHZE (Rifampicine 600mg + Isoniazide 300mg + Pyrazinamide 1500mg + Ethambutol 1200mg)',
            dosage: '1 comprimé de chaque',
            frequency: '1 fois par jour à jeun',
            duration: '2 mois (phase initiale)',
            instructions: "Prendre 30 min avant le petit-déjeuner — ne jamais interrompre",
          ),
          Medication(
            name: 'Pyridoxine (Vitamine B6) 25mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour',
            duration: '6 mois',
            instructions: "Prévention neuropathie à l'Isoniazide",
          ),
        ],
      ),
      // DAO Brahima — épilepsie post-méningitique (con20)
      Prescription(
        id: 'presc15',
        consultationId: 'con20',
        patientId: 'pat11',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 25)),
        medications: [
          Medication(
            name: 'Valproate de sodium (Dépakine) 500mg',
            dosage: '1 comprimé',
            frequency: '2 fois par jour (matin et soir)',
            duration: '2 ans minimum',
            instructions: "Ne jamais arrêter brutalement — risque d'état de mal épileptique",
          ),
          Medication(
            name: 'L-Carnitine (Carnitor) 500mg',
            dosage: '1 comprimé',
            frequency: '2 fois par jour',
            duration: '3 mois',
            instructions: 'Protection hépatique sous valproate',
          ),
        ],
      ),
      // KABORE Etienne — insuffisance cardiaque initiale (con24)
      Prescription(
        id: 'presc16',
        consultationId: 'con24',
        patientId: 'pat15',
        doctorId: 'doc2',
        date: d.subtract(const Duration(days: 90)),
        medications: [
          Medication(
            name: 'Bisoprolol 2.5mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour le matin',
            duration: '3 mois (titration)',
            instructions: 'Commencer à faible dose — augmenter progressivement',
          ),
          Medication(
            name: 'Ramipril 5mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour le soir',
            duration: '3 mois',
            instructions: 'IEC cardioprotecteur — surveiller tension et créatinine',
          ),
          Medication(
            name: 'Furosémide 40mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour le matin',
            duration: '3 mois',
            instructions: 'Diurétique — peser chaque matin, limiter eau à 1.5L/jour',
          ),
          Medication(
            name: 'Spironolactone 25mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour',
            duration: '3 mois',
            instructions: 'Anti-aldostérone — surveiller potassium régulièrement',
          ),
          Medication(
            name: 'Warfarine 5mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour à heure fixe',
            duration: 'Traitement à vie (FA)',
            instructions: 'INR cible 2-3 — surveillance INR hebdomadaire puis mensuelle',
          ),
        ],
      ),
      // COULIBALY Fatoumata — drépanocytose AS (con21)
      Prescription(
        id: 'presc17',
        consultationId: 'con21',
        patientId: 'pat12',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 40)),
        medications: [
          Medication(
            name: 'Acide folique 5mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour',
            duration: '6 mois',
            instructions: 'Prévention carence folique — prendre le matin',
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
