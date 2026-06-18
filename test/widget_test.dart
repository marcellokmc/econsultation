// Test de fumée — vérifie que les providers se construisent sans erreur.
// Le test d'intégration complet (avec Hive + SyncService) doit être lancé
// sur émulateur via `flutter test integration_test/`.
import 'package:flutter_test/flutter_test.dart';

import 'package:econsultation/models/user.dart';
import 'package:econsultation/models/patient_profile.dart';
import 'package:econsultation/models/consultation.dart';

void main() {
  group('Smoke tests — modèles de base', () {
    test('User se construit correctement', () {
      final u = User(
        id: 'u1',
        name: 'Dr. Test',
        email: 'test@bf',
        password: 'pass',
        role: UserRole.doctor,
        phone: '70000000',
      );
      expect(u.id, 'u1');
      expect(u.isDoctor, isTrue);
    });

    test('PatientProfile se construit correctement', () {
      final p = PatientProfile(
        userId: 'pat1',
        dateOfBirth: DateTime(1990, 1, 1),
        bloodType: 'O+',
        allergies: ['Pénicilline'],
        chronicConditions: ['Diabète'],
      );
      expect(p.userId, 'pat1');
      expect(p.allergies, contains('Pénicilline'));
    });

    test('Consultation se construit correctement', () {
      final c = Consultation(
        id: 'c1',
        patientId: 'pat1',
        doctorId: 'doc1',
        date: DateTime.now(),
        notes: 'RAS',
        diagnosis: 'Bonne santé',
        prescription: '',
      );
      expect(c.id, 'c1');
      expect(c.temperature, isNull);
    });
  });
}
