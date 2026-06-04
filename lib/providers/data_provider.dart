import 'package:flutter/material.dart';
import '../models/appointment.dart';
import '../models/consultation.dart';
import '../models/patient_profile.dart';

class DataProvider extends ChangeNotifier {
  final List<PatientProfile> _profiles = [];
  final List<Appointment> _appointments = [];
  final List<Consultation> _consultations = [];

  DataProvider() {
    _init();
  }

  void _init() {
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

    _consultations.addAll([
      Consultation(
        id: 'con1',
        appointmentId: 'apt7',
        patientId: 'pat2',
        doctorId: 'doc1',
        date: d.subtract(const Duration(days: 7)),
        notes:
            'Fièvre 38.5°C, toux sèche persistante, fatigue depuis 3 jours. Auscultation normale. Pas de signes de détresse respiratoire.',
        diagnosis: 'Grippe saisonnière',
        prescription:
            'Doliprane 1000mg — 3x/jour, 5 jours\nTussidrex sirop — 3x/jour\nRepos 3 jours · Hydratation ++',
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
        notes:
            'TSH à 2.8 mUI/L — dans les valeurs normales. Fatigue légèrement améliorée. Prise de poids stabilisée.',
        diagnosis: 'Hypothyroïdie stable sous Levothyrox',
        prescription:
            'Levothyrox 75µg — 1 cp/jour à jeun\nContrôle TSH dans 3 mois',
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
        notes:
            'Douleurs bilatérales genoux et mains. Raideur matinale ~45 min. Légère amélioration sous traitement.',
        diagnosis: 'Arthrite rhumatoïde — phase active modérée',
        prescription:
            'Methotrexate 7.5mg — 1x/semaine (lundi)\nAcide folique 5mg — vendredi\nKétoprofène gel 2x/jour\nKinésithérapie — 10 séances',
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
        notes:
            'TA à 158/96. Compliance irrégulière au traitement. Stress professionnel important. Régime non respecté.',
        diagnosis: 'Hypertension artérielle — déséquilibrée',
        prescription:
            'Amlodipine 10mg — 1x/jour matin\nRamipril 5mg — 1x/jour soir\nRégime hyposodé < 5g/jour\nActivité physique 30 min/jour',
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
        notes:
            'HbA1c à 7.2% — au-dessus de la cible. Glycémie à jeun : 1.48 g/L. Efforts notables sur le régime.',
        diagnosis: 'Diabète type 2 — contrôle insuffisant',
        prescription:
            'Metformine 1000mg — 2x/jour aux repas\nGliclazide 60mg — 1x/jour\nAutosurveillance 2x/jour\nConsultation diabétologue recommandée',
        weight: 84.0,
        temperature: 37.0,
        bloodPressure: '145/90',
        heartRate: 80,
      ),
    ]);
  }

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
