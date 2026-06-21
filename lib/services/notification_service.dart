import '../models/appointment.dart';

// Stub — flutter_local_notifications retiré pour compatibilité build Android.
// Les appels sont conservés dans le code pour ne pas casser les imports.
class NotificationService {
  static Future<void> init() async {}

  static Future<void> showRdvConfirmed(Appointment appointment) async {}

  static Future<void> showRdvCancelled(Appointment appointment) async {}

  static Future<void> showCriticalAlert(
      String patientName, double temperature) async {}

  static Future<void> showDailySummary(int rdvCount) async {}
}
