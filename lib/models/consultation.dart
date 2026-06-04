class Consultation {
  final String id;
  final String appointmentId;
  final String patientId;
  final String doctorId;
  final DateTime date;
  final String notes;
  final String diagnosis;
  final String prescription;
  final double? weight;
  final double? temperature;
  final String? bloodPressure;
  final int? heartRate;

  Consultation({
    required this.id,
    required this.appointmentId,
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
