import 'package:flutter_test/flutter_test.dart';

import 'package:econsultation/models/prescription.dart';

// Tests unitaires des modèles liés au service de stockage
// Note : StorageService lui-même requiert Hive (I/O) — les tests d'intégration
// doivent être lancés sur émulateur/appareil. Ces tests couvrent les modèles
// de données que le service persiste.
void main() {
  group('Medication — résumé', () {
    test('summary contient nom, dosage, fréquence et durée', () {
      final med = Medication(
        name: 'Paracétamol 500mg',
        dosage: '1 comprimé',
        frequency: '3 fois par jour',
        duration: '5 jours',
      );
      expect(med.summary, contains('Paracétamol 500mg'));
      expect(med.summary, contains('1 comprimé'));
      expect(med.summary, contains('3 fois par jour'));
      expect(med.summary, contains('5 jours'));
    });

    test('instructions null par défaut', () {
      final med = Medication(
        name: 'Ibuprofène 400mg',
        dosage: '1 comprimé',
        frequency: '2 fois par jour',
        duration: '3 jours',
      );
      expect(med.instructions, isNull);
    });

    test('instructions stockées si fournies', () {
      final med = Medication(
        name: 'Amoxicilline',
        dosage: '500mg',
        frequency: '3 fois par jour',
        duration: '7 jours',
        instructions: 'Prendre pendant les repas',
      );
      expect(med.instructions, 'Prendre pendant les repas');
    });
  });

  group('Prescription — structure', () {
    test('ordonnance contient au moins un médicament', () {
      final rx = Prescription(
        id: 'rx1',
        consultationId: 'c1',
        patientId: 'pat1',
        doctorId: 'doc1',
        date: DateTime(2025, 6, 1),
        medications: [
          Medication(
            name: 'Doliprane 1000mg',
            dosage: '1 comprimé',
            frequency: '3 fois par jour',
            duration: '5 jours',
          ),
        ],
      );
      expect(rx.medications, isNotEmpty);
      expect(rx.medications.length, 1);
    });

    test('date ordonnance correctement stockée', () {
      final date = DateTime(2025, 6, 15);
      final rx = Prescription(
        id: 'rx2',
        consultationId: 'c2',
        patientId: 'pat2',
        doctorId: 'doc2',
        date: date,
        medications: [],
      );
      expect(rx.date, date);
    });

    test('IDs correctement assignés', () {
      final rx = Prescription(
        id: 'rx-abc',
        consultationId: 'cons-123',
        patientId: 'p-456',
        doctorId: 'd-789',
        date: DateTime.now(),
        medications: [],
      );
      expect(rx.id, 'rx-abc');
      expect(rx.consultationId, 'cons-123');
      expect(rx.patientId, 'p-456');
      expect(rx.doctorId, 'd-789');
    });
  });
}
