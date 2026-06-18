// Modèle ordonnance médicale — requis par le cahier des charges

// Un médicament avec sa posologie dans une ordonnance
class Medication {
  final String name;          // Ex: "Doliprane 1000mg"
  final String dosage;        // Ex: "1 comprimé"
  final String frequency;     // Ex: "3 fois par jour"
  final String duration;      // Ex: "5 jours"
  final String? instructions; // Ex: "Prendre pendant les repas"

  Medication({
    required this.name,
    required this.dosage,
    required this.frequency,
    required this.duration,
    this.instructions,
  });

  // Résumé lisible sur une ligne pour les aperçus
  String get summary => '$name — $dosage, $frequency, $duration';
}

// Ordonnance complète liée à une consultation
class Prescription {
  final String id;
  final String consultationId;
  final String patientId;
  final String doctorId;
  final DateTime date;
  final List<Medication> medications;

  Prescription({
    required this.id,
    required this.consultationId,
    required this.patientId,
    required this.doctorId,
    required this.date,
    required this.medications,
  });
}
