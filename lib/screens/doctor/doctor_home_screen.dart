import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/appointment.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_provider.dart';
import '../../theme/app_theme.dart';
import '../../utils/date_helper.dart';
import '../auth/welcome_screen.dart';
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
          _AgendaTab(doctorId: doctorId),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
                color: Color(0x12000000),
                blurRadius: 20,
                offset: Offset(0, -4))
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _tab,
          onTap: (i) => setState(() => _tab = i),
          backgroundColor: Colors.transparent,
          elevation: 0,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_outlined),
              activeIcon: Icon(Icons.dashboard_rounded),
              label: 'Tableau de bord',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.people_outline_rounded),
              activeIcon: Icon(Icons.people_rounded),
              label: 'Patients',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.calendar_month_outlined),
              activeIcon: Icon(Icons.calendar_month_rounded),
              label: 'Agenda',
            ),
          ],
        ),
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
          IconButton(
            icon: const Icon(Icons.notifications_outlined, size: 24),
            onPressed: () {},
          ),
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
    final today =
        all.where((a) => a.isToday && a.status != AppointmentStatus.cancelled).toList();
    final upcoming =
        all.where((a) => a.isUpcoming && !a.isToday).toList();
    final past =
        all.where((a) => a.isPast && !a.isToday).toList()
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

// AppointmentTile is public so patient_detail can import it
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
    final statusColor = _statusColor(appointment.status);

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
            // Time
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
            // Avatar
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
            // Info
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
                ],
              ),
            ),
            if (showActions &&
                appointment.status == AppointmentStatus.pending)
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert,
                    color: AppColors.textHint, size: 20),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
                onSelected: (val) {
                  final s = val == 'confirm'
                      ? AppointmentStatus.confirmed
                      : AppointmentStatus.cancelled;
                  data.updateAppointmentStatus(appointment.id, s);
                },
                itemBuilder: (_) => [
                  const PopupMenuItem(
                      value: 'confirm',
                      child: Row(children: [
                        Icon(Icons.check_circle_outline,
                            color: AppColors.success, size: 18),
                        SizedBox(width: 8),
                        Text('Confirmer'),
                      ])),
                  const PopupMenuItem(
                      value: 'cancel',
                      child: Row(children: [
                        Icon(Icons.cancel_outlined,
                            color: AppColors.error, size: 18),
                        SizedBox(width: 8),
                        Text('Annuler'),
                      ])),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

class AppointmentStatusBadge extends StatelessWidget {
  final AppointmentStatus status;
  const AppointmentStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final color = _statusColor(status);
    final label = _statusLabel(status);
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

Color _statusColor(AppointmentStatus s) {
  switch (s) {
    case AppointmentStatus.pending:
      return AppColors.warning;
    case AppointmentStatus.confirmed:
      return AppColors.success;
    case AppointmentStatus.completed:
      return AppColors.textHint;
    case AppointmentStatus.cancelled:
      return AppColors.error;
  }
}

String _statusLabel(AppointmentStatus s) {
  switch (s) {
    case AppointmentStatus.pending:
      return 'En attente';
    case AppointmentStatus.confirmed:
      return 'Confirmé';
    case AppointmentStatus.completed:
      return 'Terminé';
    case AppointmentStatus.cancelled:
      return 'Annulé';
  }
}
