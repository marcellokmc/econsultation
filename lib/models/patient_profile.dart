// Sexe du patient tel que requis dans la fiche patient
enum Sexe { masculin, feminin, autre }

extension SexeLabel on Sexe {
  String get label {
    switch (this) {
      case Sexe.masculin:
        return 'Masculin';
      case Sexe.feminin:
        return 'Féminin';
      case Sexe.autre:
        return 'Autre';
    }
  }
}

class PatientProfile {
  final String userId;
  final DateTime dateOfBirth;
  final Sexe? sexe;
  final String bloodType;
  final List<String> allergies;
  final List<String> chronicConditions;
  final String? emergencyContact;
  final double? weight;
  final double? height;
  final String? address;

  PatientProfile({
    required this.userId,
    required this.dateOfBirth,
    required this.bloodType,
    this.sexe,
    this.allergies = const [],
    this.chronicConditions = const [],
    this.emergencyContact,
    this.weight,
    this.height,
    this.address,
  });

  int get age {
    final now = DateTime.now();
    int a = now.year - dateOfBirth.year;
    if (now.month < dateOfBirth.month ||
        (now.month == dateOfBirth.month && now.day < dateOfBirth.day)) {
      a--;
    }
    return a;
  }

  double? get bmi {
    if (weight == null || height == null || height! <= 0) return null;
    final hm = height! / 100;
    return weight! / (hm * hm);
  }

  String get bmiCategory {
    final b = bmi;
    if (b == null) return 'N/A';
    if (b < 18.5) return 'Sous-poids';
    if (b < 25) return 'Normal';
    if (b < 30) return 'Surpoids';
    return 'Obésité';
  }

  // Permet de créer une copie modifiée du profil (utilisé dans le formulaire d'édition)
  PatientProfile copyWith({
    DateTime? dateOfBirth,
    Sexe? sexe,
    String? bloodType,
    List<String>? allergies,
    List<String>? chronicConditions,
    String? emergencyContact,
    double? weight,
    double? height,
    String? address,
  }) {
    return PatientProfile(
      userId: userId,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      sexe: sexe ?? this.sexe,
      bloodType: bloodType ?? this.bloodType,
      allergies: allergies ?? this.allergies,
      chronicConditions: chronicConditions ?? this.chronicConditions,
      emergencyContact: emergencyContact ?? this.emergencyContact,
      weight: weight ?? this.weight,
      height: height ?? this.height,
      address: address ?? this.address,
    );
  }
}
