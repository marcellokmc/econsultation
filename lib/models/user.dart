enum UserRole { doctor, patient }

class User {
  final String id;
  final String name;
  final String email;
  final String password;
  final UserRole role;
  final String phone;
  final String? specialty;
  final double? rating;
  final int? experienceYears;

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

  String get initials {
    final clean = name.replaceAll('Dr. ', '').replaceAll('Dr ', '');
    final parts = clean.trim().split(' ');
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    if (parts.isNotEmpty && parts[0].isNotEmpty) return parts[0][0].toUpperCase();
    return 'U';
  }

  String get displayName => name;

  // Copie modifiée sans changer l'id ni le rôle (utilisé lors de l'édition d'un patient)
  User copyWith({
    String? name,
    String? email,
    String? password,
    String? phone,
    String? specialty,
    double? rating,
    int? experienceYears,
  }) {
    return User(
      id: id,
      name: name ?? this.name,
      email: email ?? this.email,
      password: password ?? this.password,
      role: role,
      phone: phone ?? this.phone,
      specialty: specialty ?? this.specialty,
      rating: rating ?? this.rating,
      experienceYears: experienceYears ?? this.experienceYears,
    );
  }
}
