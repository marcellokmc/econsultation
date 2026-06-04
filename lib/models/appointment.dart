enum AppointmentStatus { pending, confirmed, completed, cancelled }

class Appointment {
  final String id;
  final String patientId;
  final String doctorId;
  final DateTime dateTime;
  final String reason;
  AppointmentStatus status;
  final int durationMinutes;

  Appointment({
    required this.id,
    required this.patientId,
    required this.doctorId,
    required this.dateTime,
    required this.reason,
    this.status = AppointmentStatus.pending,
    this.durationMinutes = 30,
  });

  bool get isUpcoming =>
      dateTime.isAfter(DateTime.now()) && status != AppointmentStatus.cancelled;

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
