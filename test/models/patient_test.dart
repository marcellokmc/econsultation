import 'package:flutter_test/flutter_test.dart';

import 'package:econsultation/models/patient_profile.dart';
import 'package:econsultation/models/user.dart';

// Tests unitaires du modèle PatientProfile
void main() {
  group('PatientProfile — calcul âge', () {
    test('age calculé correctement depuis dateOfBirth', () {
      final profile = PatientProfile(
        userId: 'p1',
        dateOfBirth: DateTime(1990, 1, 1),
        bloodType: 'O+',
        allergies: [],
        chronicConditions: [],
      );
      final expectedAge = DateTime.now().year - 1990;
      expect(profile.age, expectedAge);
    });

    test('age = 0 pour un bébé né cette année', () {
      final profile = PatientProfile(
        userId: 'p2',
        dateOfBirth: DateTime(DateTime.now().year, 1, 1),
        bloodType: 'A+',
        allergies: [],
        chronicConditions: [],
      );
      expect(profile.age, 0);
    });

    test('BMI calculé correctement (poids/taille²)', () {
      final profile = PatientProfile(
        userId: 'p3',
        dateOfBirth: DateTime(1985, 6, 15),
        bloodType: 'B+',
        allergies: [],
        chronicConditions: [],
        weight: 70.0,
        height: 175.0,
      );
      // IMC = 70 / (1.75²) ≈ 22.86
      expect(profile.bmi, isNotNull);
      expect(profile.bmi!, closeTo(22.86, 0.1));
    });

    test('BMI null si poids ou taille manquant', () {
      final profile = PatientProfile(
        userId: 'p4',
        dateOfBirth: DateTime(1980, 3, 10),
        bloodType: 'AB-',
        allergies: [],
        chronicConditions: [],
        weight: 65.0,
        // height absent
      );
      expect(profile.bmi, isNull);
    });
  });

  group('User — initiales', () {
    test('initiales extraites correctement', () {
      final user = User(
        id: 'u1',
        name: 'Aminata Koné',
        email: 'aminata@test.bf',
        password: '123',
        role: UserRole.patient,
        phone: '70000000',
      );
      expect(user.initials, 'AK');
    });

    test('initiales sans préfixe Dr.', () {
      final user = User(
        id: 'u2',
        name: 'Dr. Mamadou Ouédraogo',
        email: 'mamadou@test.bf',
        password: '123',
        role: UserRole.doctor,
        phone: '71000000',
      );
      expect(user.initials, 'MO');
    });

    test('isDoctor vrai pour rôle médecin', () {
      final user = User(
        id: 'u3',
        name: 'Dr. Test',
        email: 'test@bf',
        password: '123',
        role: UserRole.doctor,
        phone: '72000000',
      );
      expect(user.isDoctor, isTrue);
    });

    test('isDoctor faux pour rôle patient', () {
      final user = User(
        id: 'u4',
        name: 'Patient Test',
        email: 'patient@bf',
        password: '123',
        role: UserRole.patient,
        phone: '73000000',
      );
      expect(user.isDoctor, isFalse);
    });
  });
}
