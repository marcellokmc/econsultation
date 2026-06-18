import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/notification.dart';
import '../providers/notification_provider.dart';
import '../theme/app_theme.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        flexibleSpace: Container(decoration: AppDecorations.gradientPrimary),
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        title: const Text('Notifications'),
        actions: [
          Consumer<NotificationProvider>(
            builder: (_, notif, _) => notif.unreadCount > 0
                ? TextButton(
                    onPressed: notif.markAllRead,
                    child: const Text(
                      'Tout lire',
                      style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          fontSize: 13),
                    ),
                  )
                : const SizedBox.shrink(),
          ),
        ],
      ),
      body: Consumer<NotificationProvider>(
        builder: (_, notif, _) {
          final items = notif.all;
          if (items.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_none_rounded,
                      size: 56, color: AppColors.textHint),
                  SizedBox(height: 12),
                  Text('Aucune notification',
                      style: TextStyle(
                          color: AppColors.textSecondary, fontSize: 15)),
                ],
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (_, i) => _NotificationTile(
              notification: items[i],
              onTap: () => notif.markAsRead(items[i].id),
            ),
          );
        },
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final AppNotification notification;
  final VoidCallback onTap;

  const _NotificationTile({
    required this.notification,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isUnread = !notification.isRead;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isUnread
              ? AppColors.primaryLight
              : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border(
            left: BorderSide(
              color: _typeColor(notification.type),
              width: 3,
            ),
          ),
          boxShadow: isUnread
              ? [
                  const BoxShadow(
                    color: Color(0x0F1A6FDB),
                    blurRadius: 12,
                    offset: Offset(0, 3),
                  )
                ]
              : null,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: _typeColor(notification.type).withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                _typeIcon(notification.type),
                color: _typeColor(notification.type),
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          notification.title,
                          style: TextStyle(
                            fontWeight: isUnread
                                ? FontWeight.w700
                                : FontWeight.w600,
                            fontSize: 14,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      if (isUnread)
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    notification.message,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _formatRelative(notification.createdAt),
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textHint,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _typeColor(NotificationType type) {
    switch (type) {
      case NotificationType.appointmentConfirmed:
        return AppColors.success;
      case NotificationType.appointmentRefused:
        return AppColors.warning;
      case NotificationType.appointmentCancelled:
        return AppColors.error;
      case NotificationType.newAppointment:
        return AppColors.primary;
    }
  }

  IconData _typeIcon(NotificationType type) {
    switch (type) {
      case NotificationType.appointmentConfirmed:
        return Icons.check_circle_outline_rounded;
      case NotificationType.appointmentRefused:
        return Icons.block_rounded;
      case NotificationType.appointmentCancelled:
        return Icons.cancel_outlined;
      case NotificationType.newAppointment:
        return Icons.event_note_rounded;
    }
  }

  String _formatRelative(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'À l\'instant';
    if (diff.inMinutes < 60) return 'Il y a ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'Il y a ${diff.inHours} h';
    if (diff.inDays == 1) return 'Hier';
    return 'Il y a ${diff.inDays} jours';
  }
}
