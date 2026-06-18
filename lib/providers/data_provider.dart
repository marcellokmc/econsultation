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
    _profiles.addAll([
      PatientProfile(
        userId: 'pat1',
        dateOfBirth: DateTime(1982, 5, 20),
        sexe: Sexe.masculin,
        bloodType: 'O+',
        allergies: ['Pénicilline', 'Aspirine'],
        chronicConditions: ['Hypertension artérielle', 'Diabète type 2'],
        emergencyContact: 'Mariam NIKIEMA — 70 12 34 56 78',
        weight: 78.0,
        height: 175.0,
        address: 'Secteur 15, Ouagadougou, Burkina Faso',
      ),
      PatientProfile(
        userId: 'pat2',
        dateOfBirth: DateTime(1995, 3, 10),
        sexe: Sexe.masculin,
        bloodType: 'A+',
        // Colopathie fonctionnelle — pathologie très fréquente au Burkina
        allergies: ['Ampicilline'],
        chronicConditions: ['Colopathie fonctionnelle'],
        emergencyContact: 'Fatimata OUEDRAOGO — 76 23 45 67 89',
        weight: 68.0,
        height: 172.0,
        address: 'Secteur 22, Bobo-Dioulasso, Burkina Faso',
      ),
      PatientProfile(
        userId: 'pat3',
        dateOfBirth: DateTime(1960, 8, 14),
        sexe: Sexe.masculin,
        bloodType: 'SS', // Drépanocytose homozygote
        allergies: ['Sulfonamides'],
        chronicConditions: ['Drépanocytose SS', 'Diabète type 2'],
        emergencyContact: 'Aminata BELEM — 65 34 56 78 90',
        weight: 62.0,
        height: 168.0,
        address: 'Quartier Zogona, Ouagadougou, Burkina Faso',
      ),
      PatientProfile(
        userId: 'pat4',
        dateOfBirth: DateTime(1999, 11, 5),
        sexe: Sexe.feminin,
        bloodType: 'AB+',
        allergies: [],
        // Typhoïde et asthme — fréquents en zone tropicale
        chronicConditions: ['Asthme bronchique', 'Antécédent de typhoïde'],
        emergencyContact: 'Kassoum DRABO — 74 45 67 89 01',
        weight: 52.0,
        height: 160.0,
        address: 'Secteur 8, Koudougou, Burkina Faso',
      ),
      PatientProfile(
        userId: 'pat5',
        dateOfBirth: DateTime(1973, 1, 28),
        sexe: Sexe.masculin,
        bloodType: 'O-',
        allergies: ['Ibuprofène'],
        // Ulcère gastrique et paludisme récurrent — contexte burkinabè courant
        chronicConditions: ['Ulcère gastro-duodénal', 'Paludisme récurrent'],
        emergencyContact: 'Rasmata NEBIE — 70 56 78 90 12',
        weight: 82.0,
        height: 178.0,
        address: 'Quartier Pissy, Ouagadougou, Burkina Faso',
      ),
    ]);

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
        reason: 'Crise douloureuse — drépanocytose',
        status: AppointmentStatus.pending,
      ),
      Appointment(
        id: 'apt4',
        patientId: 'pat4',
        doctorId: 'doc1',
        dateTime: DateTime(d.year, d.month, d.day, 15, 30),
        reason: 'Renouvellement ordonnance asthme bronchique',
        status: AppointmentStatus.pending,
      ),
      Appointment(
        id: 'apt5',
        patientId: 'pat1',
        doctorId: 'doc1',
        dateTime: d.add(const Duration(days: 3)),
        reason: 'Bilan sanguin — contrôle HTA et diabète',
        status: AppointmentStatus.confirmed,
      ),
      Appointment(
        id: 'apt6',
        patientId: 'pat5',
        doctorId: 'doc1',
        dateTime: d.add(const Duration(days: 5)),
        reason: 'Contrôle ulcère gastrique — suivi',
        status: AppointmentStatus.pending,
      ),
      Appointment(
        id: 'apt7',
        patientId: 'pat2',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 7)),
        reason: 'Douleurs abdominales — côlon irritable',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt8',
        patientId: 'pat5',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 14)),
        reason: 'Douleurs épigastriques — bilan digestif',
        status: AppointmentStatus.completed,
      ),
      Appointment(
        id: 'apt9',
        patientId: 'pat3',
        doctorId: 'doc1',
        dateTime: d.subtract(const Duration(days: 30)),
        reason: 'Crise drépanocytaire — suivi hématologie',
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
      Appointment(
        id: 'apt11',
        patientId: 'pat4',
        doctorId: 'doc4',
        dateTime: d.add(const Duration(days: 2)),
        reason: 'Consultation chirurgie abdominale',
        status: AppointmentStatus.confirmed,
      ),
    ]);

    _consultations.addAll([
      Consultation(
        id: 'con1',
        appointmentId: 'apt7',
        patientId: 'pat2',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 7)),
        notes:
            'Douleurs abdominales diffuses depuis 3 semaines, crampes péri-ombilicales, alternance diarrhée/constipation. Pas de sang dans les selles. Ballonnements importants après les repas. Stress professionnel signalé.',
        diagnosis: 'Colopathie fonctionnelle (syndrome de l\'intestin irritable)',
        prescription:
            'Mébévérine 200mg — 1 gél. matin et soir avant repas\nSmectite — 1 sachet 3x/jour\nRégime sans résidus, éviter légumineuses et lait\nActivité physique régulière recommandée',
        weight: 68.5,
        temperature: 37.1,
        bloodPressure: '118/76',
        heartRate: 78,
      ),
      Consultation(
        id: 'con2',
        appointmentId: 'apt8',
        patientId: 'pat5',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 14)),
        notes:
            'Douleurs épigastriques depuis 1 mois, typiquement à jeun, soulagées par l\'alimentation. Pyrosis fréquent. Pas de vomissements de sang. ATCD de prise prolongée d\'anti-inflammatoires. Test respiratoire H. pylori non disponible localement.',
        diagnosis: 'Ulcère gastro-duodénal — probable H. pylori',
        prescription:
            'Oméprazole 20mg — 1 cp matin à jeun, 4 semaines\nAmoxicilline 1000mg — 2x/jour, 7 jours\nClarithromycine 500mg — 2x/jour, 7 jours\nÉviter aspirine, AINS et alcool\nContrôle dans 4 semaines',
        weight: 82.0,
        temperature: 37.0,
        bloodPressure: '125/80',
        heartRate: 76,
      ),
      Consultation(
        id: 'con3',
        appointmentId: 'apt9',
        patientId: 'pat3',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 30)),
        notes:
            'Crise vaso-occlusive depuis 48h : douleurs osseuses intenses membres inférieurs et lombaires. Fièvre à 38.8°C. Pâleur conjonctivale. Hb 7.2 g/dL à la NFS. Hémoglobine S à 85%. Pas de séquestration splénique.',
        diagnosis: 'Crise drépanocytaire vaso-occlusive (Drépanocytose SS)',
        prescription:
            'Paracétamol 1000mg — 4x/jour, 5 jours\nHydroxycarbamide 500mg — 1 cp/jour (traitement de fond)\nAcide folique 5mg — 1 cp/jour\nHydratation orale ++ (3L/jour)\nHospitalisation si aggravation',
        weight: 62.0,
        temperature: 38.8,
        bloodPressure: '105/65',
        heartRate: 102,
      ),
      Consultation(
        id: 'con4',
        appointmentId: 'apt_old1',
        patientId: 'pat1',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 45)),
        notes:
            'TA à 162/98. Traitement non pris régulièrement. Stress professionnel. Alimentation riche en sel. Pas d\'activité physique.',
        diagnosis: 'Hypertension artérielle — non contrôlée',
        prescription:
            'Amlodipine 10mg — 1 cp/jour matin\nRamipril 5mg — 1 cp/jour soir\nRégime hyposodé < 5g sel/jour\nActivité physique modérée 30 min/jour',
        weight: 78.5,
        temperature: 37.0,
        bloodPressure: '162/98',
        heartRate: 85,
      ),
      Consultation(
        id: 'con5',
        appointmentId: 'apt_old2',
        patientId: 'pat1',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 90)),
        notes:
            'HbA1c 7.8%. Glycémie à jeun : 1.62 g/L. Efforts constatés sur le régime. Pieds sans plaie. Évolution lentement favorable.',
        diagnosis: 'Diabète type 2 — suivi trimestriel',
        prescription:
            'Metformine 1000mg — 2x/jour aux repas\nGlibenclamide 5mg — 1cp/jour le matin\nAutosurveillance 2x/jour\nBilan biologique dans 3 mois',
        weight: 77.0,
        temperature: 37.0,
        bloodPressure: '140/88',
        heartRate: 76,
      ),
    ]);

    // Ordonnances structurées correspondant aux consultations ci-dessus
    _prescriptions.addAll([
      Prescription(
        id: 'presc1',
        consultationId: 'con1',
        patientId: 'pat2',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 7)),
        medications: [
          Medication(
            name: 'Mébévérine 200mg',
            dosage: '1 gélule',
            frequency: '2 fois par jour (matin et soir)',
            duration: '4 semaines',
            instructions: 'Prendre 20 min avant les repas pour effet optimal',
          ),
          Medication(
            name: 'Smectite (Diosmectite)',
            dosage: '1 sachet',
            frequency: '3 fois par jour',
            duration: '2 semaines',
            instructions: 'Délayer dans un demi-verre d\'eau, prendre entre les repas',
          ),
        ],
      ),
      Prescription(
        id: 'presc2',
        consultationId: 'con2',
        patientId: 'pat5',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 14)),
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
            instructions: 'Triple thérapie anti-H. pylori — ne pas interrompre',
          ),
          Medication(
            name: 'Clarithromycine 500mg',
            dosage: '1 comprimé',
            frequency: '2 fois par jour',
            duration: '7 jours',
            instructions: 'Prendre aux repas pour réduire les nausées',
          ),
        ],
      ),
      Prescription(
        id: 'presc3',
        consultationId: 'con3',
        patientId: 'pat3',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 30)),
        medications: [
          Medication(
            name: 'Paracétamol 1000mg',
            dosage: '1 comprimé',
            frequency: '4 fois par jour',
            duration: '5 jours',
            instructions: 'Espacer les prises de 6h — ne pas dépasser 4g/jour',
          ),
          Medication(
            name: 'Hydroxycarbamide (Hydroxyurée) 500mg',
            dosage: '1 gélule',
            frequency: '1 fois par jour',
            duration: '3 mois (traitement de fond)',
            instructions: 'Suivi NFS mensuel obligatoire — consulter si fièvre',
          ),
          Medication(
            name: 'Acide folique 5mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour',
            duration: '3 mois',
            instructions: 'Prendre le matin au petit-déjeuner',
          ),
        ],
      ),
      Prescription(
        id: 'presc4',
        consultationId: 'con4',
        patientId: 'pat1',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 45)),
        medications: [
          Medication(
            name: 'Amlodipine 10mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour',
            duration: '3 mois',
            instructions: 'Prendre le matin',
          ),
          Medication(
            name: 'Ramipril 5mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour',
            duration: '3 mois',
            instructions: 'Prendre le soir',
          ),
        ],
      ),
      Prescription(
        id: 'presc5',
        consultationId: 'con5',
        patientId: 'pat1',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 90)),
        medications: [
          Medication(
            name: 'Metformine 1000mg',
            dosage: '1 comprimé',
            frequency: '2 fois par jour',
            duration: '3 mois',
            instructions: 'Prendre pendant les repas',
          ),
          Medication(
            name: 'Glibenclamide 5mg',
            dosage: '1 comprimé',
            frequency: '1 fois par jour',
            duration: '3 mois',
            instructions: 'Prendre le matin avant le repas',
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
