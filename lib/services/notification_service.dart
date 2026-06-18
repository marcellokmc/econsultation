import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart' show Color;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../models/appointment.dart';

class NotificationService {
  static final _plugin = FlutterLocalNotificationsPlugin();
  static bool _initialized = false;

  static Future<void> init() async {
    if (_initialized) return;

    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    await _plugin.initialize(
      const InitializationSettings(android: android, iOS: ios),
    );

    // Demande les permissions sur Android 13+
    await _plugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();

    _initialized = true;
  }

  static const _rdvChannel = AndroidNotificationDetails(
    'rdv_channel',
    'Rappels rendez-vous',
    channelDescription: 'Notifications pour vos rendez-vous médicaux',
    importance: Importance.high,
    priority: Priority.high,
    icon: '@mipmap/ic_launcher',
  );

  static const _alertChannel = AndroidNotificationDetails(
    'alert_channel',
    'Alertes médicales',
    channelDescription: 'Alertes pour situations médicales urgentes',
    importance: Importance.max,
    priority: Priority.max,
    icon: '@mipmap/ic_launcher',
    color: Color(0xFFD32F2F),
  );

  // Rappel de RDV immédiat (simulé — en prod, on planifierait à l'heure)
  static Future<void> showRdvConfirmed(Appointment appointment) async {
    if (!_initialized) return;
    try {
      await _plugin.show(
        appointment.id.hashCode,
        'Rendez-vous confirmé',
        'Votre RDV est confirmé pour le ${_fmt(appointment.dateTime)}',
        const NotificationDetails(android: _rdvChannel),
      );
    } catch (e) {
      if (kDebugMode) debugPrint('[Notif] showRdvConfirmed error: $e');
    }
  }

  // Alerte RDV annulé
  static Future<void> showRdvCancelled(Appointment appointment) async {
    if (!_initialized) return;
    try {
      await _plugin.show(
        appointment.id.hashCode + 1,
        'Rendez-vous annulé',
        'Votre RDV du ${_fmt(appointment.dateTime)} a été annulé.',
        const NotificationDetails(android: _rdvChannel),
      );
    } catch (e) {
      if (kDebugMode) debugPrint('[Notif] showRdvCancelled error: $e');
    }
  }

  // Alerte température critique
  static Future<void> showCriticalAlert(
      String patientName, double temperature) async {
    if (!_initialized) return;
    try {
      await _plugin.show(
        patientName.hashCode,
        'Alerte médicale — $patientName',
        'Température critique : ${temperature.toStringAsFixed(1)}°C',
        const NotificationDetails(android: _alertChannel),
      );
    } catch (e) {
      if (kDebugMode) debugPrint('[Notif] showCriticalAlert error: $e');
    }
  }

  // Résumé quotidien des RDV
  static Future<void> showDailySummary(int rdvCount) async {
    if (!_initialized || rdvCount == 0) return;
    try {
      await _plugin.show(
        99999,
        'Planning du jour',
        'Vous avez $rdvCount rendez-vous aujourd\'hui.',
        const NotificationDetails(android: _rdvChannel),
      );
    } catch (e) {
      if (kDebugMode) debugPrint('[Notif] showDailySummary error: $e');
    }
  }

  static String _fmt(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')} à ${d.hour.toString().padLeft(2, '0')}h${d.minute.toString().padLeft(2, '0')}';
}
