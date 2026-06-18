class Consultation {
  final String id;
  // Null pour les consultations sans rendez-vous préalable (consultation directe)
  final String? appointmentId;
  final String patientId;
  final String doctorId;
  final DateTime date;
  final String notes;
  final String diagnosis;
  // Résumé texte de l'ordonnance — le modèle Prescription contient la version structurée
  final String prescription;
  final double? weight;
  final double? temperature;
  final String? bloodPressure;
  final int? heartRate;

  Consultation({
    required this.id,
    this.appointmentId,
    required this.patientId,
    required this.doctorId,
    required this.date,
    required this.notes,
    required this.diagnosis,
    required this.prescription,
    this.weight,
    this.temperature,
    this.bloodPressure,
    this.heartRate,
  });
}
