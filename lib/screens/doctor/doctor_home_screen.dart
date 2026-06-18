import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/appointment.dart';
import '../../models/consultation.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_provider.dart';
import '../../providers/notification_provider.dart';
import '../../services/sync_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/date_helper.dart';
import '../auth/welcome_screen.dart';
import '../notifications_screen.dart';
import '../profil_screen.dart';
import '../teleconsultation_screen.dart';
import 'consultations_list_screen.dart';
import 'create_consultation_screen.dart';
import 'patients_list_screen.dart';

class DoctorHomeScreen extends StatefulWidget {
  const DoctorHomeScreen({super.key});

  @override
  State<DoctorHomeScreen> createState() => _DoctorHomeScreenState();
}

class _DoctorHomeScreenState extends State<DoctorHomeScreen> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final doctorId = context.read<AuthProvider>().currentUser!.id;
    return Scaffold(
      body: IndexedStack(
        index: _tab,
        children: [
          _DashboardTab(doctorId: doctorId),
          const PatientsListScreen(),
          const ConsultationsListScreen(),
          _AgendaTab(doctorId: doctorId),
          const ProfilScreen(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard_rounded),
            label: 'Tableau de bord',
          ),
          NavigationDestination(
            icon: Icon(Icons.people_outline_rounded),
            selectedIcon: Icon(Icons.people_rounded),
            label: 'Patients',
          ),
          NavigationDestination(
            icon: Icon(Icons.medical_services_outlined),
            selectedIcon: Icon(Icons.medical_services_rounded),
            label: 'Consultations',
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_month_outlined),
            selectedIcon: Icon(Icons.calendar_month_rounded),
            label: 'Agenda',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded),
            label: 'Profil',
          ),
        ],
      ),
    );
  }
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

class _DashboardTab extends StatelessWidget {
  final String doctorId;
  const _DashboardTab({required this.doctorId});

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final data = context.watch<DataProvider>();
    final doctor = auth.currentUser!;
    final todayAppts = data.getTodayAppointments(doctorId);
    final patientIds = data.getPatientIdsForDoctor(doctorId);
    final allAppts = data.getAppointmentsForDoctor(doctorId);
    final upcoming = allAppts.where((a) => a.isUpcoming && !a.isToday).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        flexibleSpace: Container(decoration: AppDecorations.gradientPrimary),
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        toolbarHeight: 72,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Bonjour,',
                style: TextStyle(
                    fontSize: 12,
                    color: Colors.white.withValues(alpha: 0.75))),
            Text(doctor.name,
                style: const TextStyle(
                    fontSize: 17, fontWeight: FontWeight.w700)),
          ],
        ),
        actions: [
          const _NotificationBell(),
          GestureDetector(
            onTap: () => _confirmLogout(context),
            child: Container(
              width: 38,
              height: 38,
              margin: const EdgeInsets.only(right: 14),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  doctor.initials,
                  style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 14),
                ),
              ),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Date
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.calendar_today_rounded,
                    size: 14, color: AppColors.primary),
                const SizedBox(width: 6),
                Text(
                  DateHelper.formatFull(DateTime.now()),
                  style: const TextStyle(
                      color: AppColors.primary,
                      fontSize: 12,
                      fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          // Stats
          Row(
            children: [
              Expanded(
                  child: _StatCard(
                icon: Icons.people_rounded,
                label: 'Patients',
                value: patientIds.length.toString(),
                color: AppColors.primary,
              )),
              const SizedBox(width: 12),
              Expanded(
                  child: _StatCard(
                icon: Icons.today_rounded,
                label: "Aujourd'hui",
                value: todayAppts.length.toString(),
                color: AppColors.accent,
              )),
              const SizedBox(width: 12),
              Expanded(
                  child: _StatCard(
                icon: Icons.upcoming_rounded,
                label: 'À venir',
                value: upcoming.length.toString(),
                color: const Color(0xFF7C4DFF),
              )),
            ],
          ),
          const SizedBox(height: 16),
          // Indicateur synchronisation FHIR
          const _SyncIndicator(),
          const SizedBox(height: 16),
          // Graphique consultations par semaine
          _ConsultationsWeekChart(
            consultations: data.getConsultationsForDoctor(doctorId),
          ),
          const SizedBox(height: 24),
          // Today's schedule
          _SectionHeader(
            title: "Planning d'aujourd'hui",
            badge: '${todayAppts.length} RDV',
          ),
          const SizedBox(height: 12),
          if (todayAppts.isEmpty)
            _EmptyState(
                icon: Icons.event_available_rounded,
                message: "Aucune consultation aujourd'hui")
          else
            ...todayAppts.map((a) => AppointmentTile(
                appointment: a,
                showPatientName: true,
                showActions: true)),
          if (upcoming.isNotEmpty) ...[
            const SizedBox(height: 24),
            _SectionHeader(
                title: 'Prochains rendez-vous',
                badge: '${upcoming.length}'),
            const SizedBox(height: 12),
            ...upcoming.take(3).map((a) =>
                AppointmentTile(appointment: a, showPatientName: true)),
          ],
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  void _confirmLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Déconnexion'),
        content: const Text('Voulez-vous vous déconnecter ?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annuler')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error),
            onPressed: () {
              Navigator.pop(ctx);
              context.read<AuthProvider>().logout();
              Navigator.pushAndRemoveUntil(
                context,
                MaterialPageRoute(
                    builder: (_) => const WelcomeScreen()),
                (_) => false,
              );
            },
            child: const Text('Déconnecter'),
          ),
        ],
      ),
    );
  }
}

// ─── Agenda Tab ───────────────────────────────────────────────────────────────

class _AgendaTab extends StatelessWidget {
  final String doctorId;
  const _AgendaTab({required this.doctorId});

  @override
  Widget build(BuildContext context) {
    final data = context.watch<DataProvider>();
    final all = data.getAppointmentsForDoctor(doctorId);
    final today = all
        .where((a) =>
            a.isToday &&
            a.status != AppointmentStatus.cancelled &&
            a.status != AppointmentStatus.refused)
        .toList();
    final upcoming = all.where((a) => a.isUpcoming && !a.isToday).toList();
    final past = all.where((a) => a.isPast && !a.isToday).toList()
      ..sort((a, b) => b.dateTime.compareTo(a.dateTime));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        flexibleSpace: Container(decoration: AppDecorations.gradientPrimary),
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        title: const Text('Agenda'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (today.isNotEmpty) ...[
            _SectionHeader(title: "Aujourd'hui", badge: '${today.length}'),
            const SizedBox(height: 12),
            ...today.map((a) => AppointmentTile(
                appointment: a,
                showPatientName: true,
                showActions: true)),
            const SizedBox(height: 20),
          ],
          if (upcoming.isNotEmpty) ...[
            _SectionHeader(title: 'À venir', badge: '${upcoming.length}'),
            const SizedBox(height: 12),
            ...upcoming.map((a) => AppointmentTile(
                appointment: a,
                showPatientName: true,
                showActions: true)),
            const SizedBox(height: 20),
          ],
          if (past.isNotEmpty) ...[
            _SectionHeader(title: 'Historique', badge: '${past.length}'),
            const SizedBox(height: 12),
            ...past.map((a) =>
                AppointmentTile(appointment: a, showPatientName: true)),
          ],
          if (today.isEmpty && upcoming.isEmpty && past.isEmpty)
            _EmptyState(
                icon: Icons.event_note_rounded,
                message: 'Aucun rendez-vous'),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

// ─── Shared Widgets ───────────────────────────────────────────────────────────

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
      decoration: AppDecorations.card,
      child: Column(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 10),
          Text(value,
              style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: color)),
          const SizedBox(height: 2),
          Text(label,
              style: const TextStyle(
                  fontSize: 11, color: AppColors.textSecondary),
              textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final String? badge;
  const _SectionHeader({required this.title, this.badge});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium),
        if (badge != null) ...[
          const SizedBox(width: 8),
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(badge!,
                style: const TextStyle(
                    color: AppColors.primary,
                    fontSize: 11,
                    fontWeight: FontWeight.w600)),
          ),
        ],
      ],
    );
  }
}

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String message;
  const _EmptyState({required this.icon, required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: AppDecorations.card,
      child: Column(
        children: [
          Icon(icon, size: 40, color: AppColors.textHint),
          const SizedBox(height: 10),
          Text(message,
              style: const TextStyle(color: AppColors.textSecondary),
              textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

class _NotificationBell extends StatelessWidget {
  const _NotificationBell();

  @override
  Widget build(BuildContext context) {
    return Consumer<NotificationProvider>(
      builder: (context, notif, _) {
        final count = notif.unreadCount;
        return Stack(
          clipBehavior: Clip.none,
          children: [
            IconButton(
              icon: const Icon(Icons.notifications_outlined, size: 24),
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) => const NotificationsScreen()),
              ),
            ),
            if (count > 0)
              Positioned(
                top: 6,
                right: 6,
                child: Container(
                  width: 16,
                  height: 16,
                  decoration: const BoxDecoration(
                    color: AppColors.error,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      count > 9 ? '9+' : '$count',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

// AppointmentTile est public car importé par patient_detail_screen
class AppointmentTile extends StatelessWidget {
  final Appointment appointment;
  final bool showPatientName;
  final bool showActions;

  const AppointmentTile({
    super.key,
    required this.appointment,
    this.showPatientName = false,
    this.showActions = false,
  });

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final data = context.read<DataProvider>();
    final patient =
        showPatientName ? auth.getUserById(appointment.patientId) : null;
    final statusColor = appointmentStatusColor(appointment.status);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: AppDecorations.card.copyWith(
        border: Border(
            left: BorderSide(color: statusColor, width: 3)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            // Heure et date
            Column(
              children: [
                Text(
                  DateHelper.formatTime(appointment.dateTime),
                  style: TextStyle(
                      fontWeight: FontWeight.w800,
                      color: statusColor,
                      fontSize: 15),
                ),
                Text(
                  DateHelper.formatDate(appointment.dateTime)
                      .substring(0, 5),
                  style: const TextStyle(
                      fontSize: 10, color: AppColors.textHint),
                ),
              ],
            ),
            const SizedBox(width: 14),
            // Avatar patient
            if (patient != null)
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: AppColors.avatarColor(patient.id),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(patient.initials,
                      style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 13)),
                ),
              ),
            if (patient != null) const SizedBox(width: 10),
            // Informations
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (patient != null)
                    Text(patient.name,
                        style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                            color: AppColors.textPrimary)),
                  Text(appointment.reason,
                      style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      AppointmentStatusBadge(status: appointment.status),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '${appointment.durationMinutes} min',
                          style: const TextStyle(
                              fontSize: 10,
                              color: AppColors.textSecondary),
                        ),
                      ),
                    ],
                  ),
                  // Note de refus si présente
                  if (appointment.refusalNote != null &&
                      appointment.refusalNote!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        'Motif : ${appointment.refusalNote}',
                        style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.error,
                            fontStyle: FontStyle.italic),
                      ),
                    ),
                ],
              ),
            ),
            // Menu actions pour le médecin
            if (showActions) _ActionsMenu(appointment: appointment, data: data),
          ],
        ),
      ),
    );
  }
}

// Menu contextuel avec les actions possibles selon le statut du RDV
class _ActionsMenu extends StatelessWidget {
  final Appointment appointment;
  final DataProvider data;
  const _ActionsMenu({required this.appointment, required this.data});

  @override
  Widget build(BuildContext context) {
    final s = appointment.status;

    // Pas d'actions pour les RDV terminés, annulés ou refusés
    if (s == AppointmentStatus.completed ||
        s == AppointmentStatus.cancelled ||
        s == AppointmentStatus.refused) {
      return const SizedBox.shrink();
    }

    return PopupMenuButton<String>(
      icon: const Icon(Icons.more_vert, color: AppColors.textHint, size: 20),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      onSelected: (val) => _handleAction(context, val),
      itemBuilder: (_) => [
        // Confirmer — uniquement pour les RDV en attente
        if (s == AppointmentStatus.pending)
          const PopupMenuItem(
            value: 'confirm',
            child: Row(children: [
              Icon(Icons.check_circle_outline, color: AppColors.success, size: 18),
              SizedBox(width: 8),
              Text('Confirmer'),
            ]),
          ),
        // Démarrer la consultation — pour les RDV confirmés d'aujourd'hui
        if (s == AppointmentStatus.confirmed && appointment.isToday)
          const PopupMenuItem(
            value: 'consult',
            child: Row(children: [
              Icon(Icons.medical_services_outlined,
                  color: AppColors.primary, size: 18),
              SizedBox(width: 8),
              Text('Démarrer la consultation'),
            ]),
          ),
        // Téléconsultation — pour les RDV confirmés d'aujourd'hui
        if (s == AppointmentStatus.confirmed && appointment.isToday)
          const PopupMenuItem(
            value: 'teleconsult',
            child: Row(children: [
              Icon(Icons.video_call_rounded,
                  color: AppColors.accent, size: 18),
              SizedBox(width: 8),
              Text('Téléconsultation'),
            ]),
          ),
        // Refuser — uniquement pour les RDV en attente
        if (s == AppointmentStatus.pending)
          const PopupMenuItem(
            value: 'refuse',
            child: Row(children: [
              Icon(Icons.block_rounded, color: AppColors.warning, size: 18),
              SizedBox(width: 8),
              Text('Refuser'),
            ]),
          ),
        // Annuler — pour en attente et confirmé
        const PopupMenuItem(
          value: 'cancel',
          child: Row(children: [
            Icon(Icons.cancel_outlined, color: AppColors.error, size: 18),
            SizedBox(width: 8),
            Text('Annuler'),
          ]),
        ),
      ],
    );
  }

  void _handleAction(BuildContext context, String action) {
    final notif = context.read<NotificationProvider>();
    switch (action) {
      case 'confirm':
        data.updateAppointmentStatus(
            appointment.id, AppointmentStatus.confirmed,
            notificationProvider: notif);
      case 'cancel':
        data.updateAppointmentStatus(
            appointment.id, AppointmentStatus.cancelled,
            notificationProvider: notif);
      case 'consult':
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => CreateConsultationScreen(
              appointment: appointment,
              patientId: appointment.patientId,
            ),
          ),
        );
      case 'teleconsult':
        final auth = context.read<AuthProvider>();
        final doctor = auth.getUserById(appointment.doctorId);
        final patient = auth.getUserById(appointment.patientId);
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => TeleconsultationScreen(
              doctor: doctor,
              patient: patient,
            ),
          ),
        );
      case 'refuse':
        // Demande un motif avant de refuser
        _showRefuseDialog(context);
    }
  }

  void _showRefuseDialog(BuildContext context) {
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Refuser le rendez-vous'),
        content: TextField(
          controller: ctrl,
          decoration: const InputDecoration(
            labelText: 'Motif du refus (optionnel)',
            hintText: 'Ex : Indisponibilité, conflit d\'horaire…',
          ),
          maxLines: 2,
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annuler')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.warning),
            onPressed: () {
              final notif = context.read<NotificationProvider>();
              Navigator.pop(ctx);
              data.updateAppointmentStatus(
                appointment.id,
                AppointmentStatus.refused,
                note: ctrl.text.trim().isEmpty ? null : ctrl.text.trim(),
                notificationProvider: notif,
              );
            },
            child: const Text('Refuser'),
          ),
        ],
      ),
    );
  }
}

// ─── Badges et couleurs de statut ─────────────────────────────────────────────

// Fonction publique utilisée aussi dans patient_detail_screen
Color appointmentStatusColor(AppointmentStatus s) {
  switch (s) {
    case AppointmentStatus.pending:
      return AppColors.warning;
    case AppointmentStatus.confirmed:
      return AppColors.success;
    case AppointmentStatus.refused:
      return AppColors.warning;
    case AppointmentStatus.completed:
      return AppColors.textHint;
    case AppointmentStatus.cancelled:
      return AppColors.error;
  }
}

String appointmentStatusLabel(AppointmentStatus s) {
  switch (s) {
    case AppointmentStatus.pending:
      return 'En attente';
    case AppointmentStatus.confirmed:
      return 'Confirmé';
    case AppointmentStatus.refused:
      return 'Refusé';
    case AppointmentStatus.completed:
      return 'Terminé';
    case AppointmentStatus.cancelled:
      return 'Annulé';
  }
}

// ─── Sync Indicator ───────────────────────────────────────────────────────────

class _SyncIndicator extends StatelessWidget {
  const _SyncIndicator();

  @override
  Widget build(BuildContext context) {
    final sync = context.watch<SyncService>();
    final isOnline = sync.isOnline;
    final isSyncing = sync.isSyncing;

    final color = isSyncing
        ? AppColors.warning
        : isOnline
            ? AppColors.success
            : AppColors.error;
    final icon = isSyncing
        ? Icons.sync_rounded
        : isOnline
            ? Icons.wifi_rounded
            : Icons.wifi_off_rounded;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: AppDecorations.card,
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 16),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isOnline ? 'Serveur FHIR' : 'Mode hors-ligne',
                  style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                      color: AppColors.textPrimary),
                ),
                Text(
                  sync.statusLabel,
                  style: const TextStyle(
                      fontSize: 11, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
          if (sync.pendingCount > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: AppColors.errorLight,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '${sync.pendingCount} en attente',
                style: const TextStyle(
                    fontSize: 10,
                    color: AppColors.error,
                    fontWeight: FontWeight.w600),
              ),
            ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () => context.read<SyncService>().syncNow(),
            child: Icon(Icons.refresh_rounded, color: color, size: 20),
          ),
        ],
      ),
    );
  }
}

// ─── Consultations Week Chart ─────────────────────────────────────────────────

class _ConsultationsWeekChart extends StatelessWidget {
  final List<Consultation> consultations;
  const _ConsultationsWeekChart({required this.consultations});

  @override
  Widget build(BuildContext context) {
    // Regroupe les consultations par semaine sur les 8 dernières semaines
    final now = DateTime.now();
    final weeks = List.generate(8, (i) {
      final weekStart = now.subtract(Duration(days: now.weekday - 1 + (7 * (7 - i))));
      final weekEnd = weekStart.add(const Duration(days: 6));
      final count = consultations.where((c) {
        return c.date.isAfter(weekStart.subtract(const Duration(days: 1))) &&
            c.date.isBefore(weekEnd.add(const Duration(days: 1)));
      }).length;
      return FlSpot(i.toDouble(), count.toDouble());
    });

    final maxY = weeks.map((s) => s.y).fold(0.0, (a, b) => a > b ? a : b);
    final chartMax = maxY < 3 ? 5.0 : maxY + 2;

    return Container(
      padding: const EdgeInsets.fromLTRB(12, 14, 16, 10),
      decoration: AppDecorations.card,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.bar_chart_rounded, color: AppColors.primary, size: 18),
              SizedBox(width: 8),
              Text(
                'Activité consultations (8 semaines)',
                style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: AppColors.textPrimary),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 110,
            child: LineChart(
              LineChartData(
                minY: 0,
                maxY: chartMax,
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  getDrawingHorizontalLine: (_) => const FlLine(
                    color: AppColors.divider,
                    strokeWidth: 1,
                  ),
                ),
                borderData: FlBorderData(show: false),
                titlesData: FlTitlesData(
                  leftTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 22,
                      interval: 1,
                      getTitlesWidget: (val, _) {
                        final weekNum = 7 - (7 - val.toInt());
                        if (val.toInt() % 2 != 0) {
                          return const SizedBox.shrink();
                        }
                        return Text(
                          'S${weekNum + 1}',
                          style: const TextStyle(
                              fontSize: 9, color: AppColors.textHint),
                        );
                      },
                    ),
                  ),
                ),
                lineBarsData: [
                  LineChartBarData(
                    spots: weeks,
                    isCurved: true,
                    color: AppColors.primary,
                    barWidth: 2.5,
                    dotData: const FlDotData(show: true),
                    belowBarData: BarAreaData(
                      show: true,
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          AppColors.primary.withValues(alpha: 0.2),
                          AppColors.primary.withValues(alpha: 0.0),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class AppointmentStatusBadge extends StatelessWidget {
  final AppointmentStatus status;
  const AppointmentStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final color = appointmentStatusColor(status);
    final label = appointmentStatusLabel(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(label,
          style: TextStyle(
              color: color,
              fontSize: 10,
              fontWeight: FontWeight.w600)),
    );
  }
}
