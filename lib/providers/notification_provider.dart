import 'package:flutter/foundation.dart';
import '../models/notification.dart';

class NotificationProvider extends ChangeNotifier {
  final List<AppNotification> _notifications = [
    AppNotification(
      id: 'n1',
      title: 'Bienvenue sur eConsultation',
      message: 'Votre compte est prêt. Vous pouvez prendre vos premiers rendez-vous.',
      type: NotificationType.newAppointment,
      createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      isRead: false,
    ),
    AppNotification(
      id: 'n2',
      title: 'Rappel',
      message: 'Pensez à compléter votre profil médical pour un meilleur suivi.',
      type: NotificationType.appointmentConfirmed,
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
      isRead: true,
    ),
  ];

  List<AppNotification> get all => List.unmodifiable(_notifications);

  List<AppNotification> get unread =>
      _notifications.where((n) => !n.isRead).toList();

  int get unreadCount => _notifications.where((n) => !n.isRead).length;

  void addNotification(AppNotification notification) {
    _notifications.insert(0, notification);
    notifyListeners();
  }

  void markAsRead(String id) {
    final index = _notifications.indexWhere((n) => n.id == id);
    if (index != -1 && !_notifications[index].isRead) {
      _notifications[index].isRead = true;
      notifyListeners();
    }
  }

  void markAllRead() {
    bool changed = false;
    for (final n in _notifications) {
      if (!n.isRead) {
        n.isRead = true;
        changed = true;
      }
    }
    if (changed) notifyListeners();
  }
}
