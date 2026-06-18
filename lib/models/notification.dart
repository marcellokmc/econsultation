enum NotificationType {
  appointmentConfirmed,
  appointmentRefused,
  appointmentCancelled,
  newAppointment,
}

class AppNotification {
  final String id;
  final String title;
  final String message;
  final NotificationType type;
  final DateTime createdAt;
  bool isRead;
  final String? appointmentId;

  AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.createdAt,
    this.isRead = false,
    this.appointmentId,
  });
}
