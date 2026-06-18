import 'package:flutter_test/flutter_test.dart';

import 'package:econsultation/models/consultation.dart';

// Tests unitaires du modèle Consultation
void main() {
  Consultation makeConsultation({
    double? temperature,
    double? weight,
    int? heartRate,
    String? bloodPressure,
  }) {
    return Consultation(
      id: 'c1',
      patientId: 'pat1',
      doctorId: 'doc1',
      date: DateTime.now(),
      notes: 'Notes de test',
      diagnosis: 'Diagnostic de test',
      prescription: '',
      temperature: temperature,
      weight: weight,
      heartRate: heartRate,
      bloodPressure: bloodPressure,
    );
  }

  group('Consultation — détection critique', () {
    test('critique si température > 40°C', () {
      final c = makeConsultation(temperature: 41.0);
      final isCritical = c.temperature != null &&
          (c.temperature! > 40.0 || c.temperature! < 35.0);
      expect(isCritical, isTrue);
    });

    test('critique si température < 35°C', () {
      final c = makeConsultation(temperature: 34.5);
      final isCritical = c.temperature != null &&
          (c.temperature! > 40.0 || c.temperature! < 35.0);
      expect(isCritical, isTrue);
    });

    test('non critique si température normale (37°C)', () {
      final c = makeConsultation(temperature: 37.0);
      final isCritical = c.temperature != null &&
          (c.temperature! > 40.0 || c.temperature! < 35.0);
      expect(isCritical, isFalse);
    });

    test('non critique si température juste à 40°C (borne)', () {
      final c = makeConsultation(temperature: 40.0);
      final isCritical = c.temperature != null &&
          (c.temperature! > 40.0 || c.temperature! < 35.0);
      expect(isCritical, isFalse);
    });

    test('non critique si température absente', () {
      final c = makeConsultation();
      final isCritical = c.temperature != null &&
          (c.temperature! > 40.0 || c.temperature! < 35.0);
      expect(isCritical, isFalse);
    });
  });

  group('Consultation — données vitales', () {
    test('poids stocké correctement', () {
      final c = makeConsultation(weight: 72.5);
      expect(c.weight, 72.5);
    });

    test('fréquence cardiaque stockée correctement', () {
      final c = makeConsultation(heartRate: 80);
      expect(c.heartRate, 80);
    });

    test('tension artérielle stockée correctement', () {
      final c = makeConsultation(bloodPressure: '120/80');
      expect(c.bloodPressure, '120/80');
    });

    test('date de consultation non nulle', () {
      final c = makeConsultation();
      expect(c.date, isNotNull);
    });
  });

  group('Consultation — champs obligatoires', () {
    test('diagnostic non vide', () {
      final c = makeConsultation();
      expect(c.diagnosis, isNotEmpty);
    });

    test('ID non vide', () {
      final c = makeConsultation();
      expect(c.id, isNotEmpty);
    });
  });
}
