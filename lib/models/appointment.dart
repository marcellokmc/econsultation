// Tous les statuts possibles d'un rendez-vous (spec: en attente, accepté, refusé, annulé, terminé)
enum AppointmentStatus { pending, confirmed, refused, completed, cancelled }

class Appointment {
  final String id;
  final String patientId;
  final String doctorId;
  final DateTime dateTime;
  final String reason;
  AppointmentStatus status;
  final int durationMinutes;
  // Motif optionnel de refus ou de report, saisi par le médecin
  String? refusalNote;

  Appointment({
    required this.id,
    required this.patientId,
    required this.doctorId,
    required this.dateTime,
    required this.reason,
    this.status = AppointmentStatus.pending,
    this.durationMinutes = 30,
    this.refusalNote,
  });

  // N'est "à venir" que si non refusé/annulé et dans le futur
  bool get isUpcoming =>
      dateTime.isAfter(DateTime.now()) &&
      status != AppointmentStatus.cancelled &&
      status != AppointmentStatus.refused;

  bool get isPast =>
      dateTime.isBefore(DateTime.now()) ||
      status == AppointmentStatus.completed;

  bool get isToday {
    final now = DateTime.now();
    return dateTime.year == now.year &&
        dateTime.month == now.month &&
        dateTime.day == now.day;
  }
}
