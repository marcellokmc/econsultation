import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/appointment.dart';
import '../../models/consultation.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_provider.dart';
import '../../theme/app_theme.dart';
import '../../utils/date_helper.dart';
import '../auth/welcome_screen.dart';
import 'book_appointment_screen.dart';

class PatientHomeScreen extends StatefulWidget {
  const PatientHomeScreen({super.key});

  @override
  State<PatientHomeScreen> createState() => _PatientHomeScreenState();
}

class _PatientHomeScreenState extends State<PatientHomeScreen> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final patientId = context.read<AuthProvider>().currentUser!.id;
    return Scaffold(
      body: IndexedStack(
        index: _tab,
        children: [
          _AccueilTab(patientId: patientId),
          _RdvTab(patientId: patientId),
          _ConsultationsTab(patientId: patientId),
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
              icon: Icon(Icons.home_outlined),
              activeIcon: Icon(Icons.home_rounded),
              label: 'Accueil',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.event_outlined),
              activeIcon: Icon(Icons.event_rounded),
              label: 'Rendez-vous',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.history_outlined),
              activeIcon: Icon(Icons.history_rounded),
              label: 'Consultations',
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Accueil Tab ─────────────────────────────────────────────────────────────

class _AccueilTab extends StatelessWidget {
  final String patientId;
  const _AccueilTab({required this.patientId});

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final data = context.watch<DataProvider>();
    final patient = auth.currentUser!;
    final allAppts = data.getAppointmentsForPatient(patientId);
    final upcoming = allAppts.where((a) => a.isUpcoming).toList()
      ..sort((a, b) => a.dateTime.compareTo(b.dateTime));
    final nextAppt = upcoming.isNotEmpty ? upcoming.first : null;
    final consultations = data.getConsultationsForPatient(patientId);

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
            Text(patient.name,
                style: const TextStyle(
                    fontSize: 17, fontWeight: FontWeight.w700)),
          ],
        ),
        actions: [
          IconButton(
              icon: const Icon(Icons.notifications_outlined, size: 24),
              onPressed: () {}),
          GestureDetector(
            onTap: () => _confirmLogout(context),
            child: Container(
              width: 38,
              height: 38,
              margin: const EdgeInsets.only(right: 14),
              decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  shape: BoxShape.circle),
              child: Center(
                child: Text(patient.initials,
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 14)),
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
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
                color: AppColors.primaryLight,
                borderRadius: BorderRadius.circular(20)),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.calendar_today_rounded,
                    size: 14, color: AppColors.primary),
                const SizedBox(width: 6),
                Text(DateHelper.formatFull(DateTime.now()),
                    style: const TextStyle(
                        color: AppColors.primary,
                        fontSize: 12,
                        fontWeight: FontWeight.w500)),
              ],
            ),
          ),
          const SizedBox(height: 20),
          // Next appointment hero card
          if (nextAppt != null)
            _NextAppointmentCard(appointment: nextAppt, auth: auth)
          else
            _NoAppointmentCard(
                onBook: () => _goToBook(context)),
          const SizedBox(height: 20),
          // Quick actions
          Row(
            children: [
              Expanded(
                  child: _QuickAction(
                icon: Icons.add_circle_outline_rounded,
                label: 'Prendre\nun RDV',
                color: AppColors.primary,
                onTap: () => _goToBook(context),
              )),
              const SizedBox(width: 12),
              Expanded(
                  child: _QuickAction(
                icon: Icons.medication_outlined,
                label: 'Mes\nordonnances',
                color: AppColors.accent,
                onTap: () {},
              )),
              const SizedBox(width: 12),
              Expanded(
                  child: _QuickAction(
                icon: Icons.science_outlined,
                label: 'Mes\nrésultats',
                color: const Color(0xFF7C4DFF),
                onTap: () {},
              )),
            ],
          ),
          const SizedBox(height: 24),
          // Recent consultations
          if (consultations.isNotEmpty) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Consultations récentes',
                    style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                        color: AppColors.textPrimary)),
                TextButton(
                    onPressed: () {},
                    child: const Text('Voir tout',
                        style: TextStyle(fontSize: 12))),
              ],
            ),
            const SizedBox(height: 8),
            ...consultations.take(2).map((c) => _RecentConsultCard(c)),
          ],
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  void _goToBook(BuildContext context) {
    Navigator.push(context,
        MaterialPageRoute(builder: (_) => const BookAppointmentScreen()));
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
            style:
                ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () {
              Navigator.pop(ctx);
              context.read<AuthProvider>().logout();
              Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (_) => const WelcomeScreen()),
                  (_) => false);
            },
            child: const Text('Déconnecter'),
          ),
        ],
      ),
    );
  }
}

class _NextAppointmentCard extends StatelessWidget {
  final Appointment appointment;
  final AuthProvider auth;
  const _NextAppointmentCard(
      {required this.appointment, required this.auth});

  @override
  Widget build(BuildContext context) {
    final doctor = auth.getUserById(appointment.doctorId);
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: AppDecorations.gradientAccent.copyWith(
        borderRadius: const BorderRadius.all(Radius.circular(20)),
        boxShadow: [
          BoxShadow(
              color: AppColors.accent.withValues(alpha: 0.3),
              blurRadius: 16,
              offset: const Offset(0, 6)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.event_available_rounded,
                  color: Colors.white70, size: 14),
              const SizedBox(width: 6),
              const Text('Prochain rendez-vous',
                  style: TextStyle(
                      color: Colors.white70,
                      fontSize: 12,
                      fontWeight: FontWeight.w500)),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(20)),
                child: const Text('Confirmé',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              if (doctor != null)
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      shape: BoxShape.circle),
                  child: Center(
                    child: Text(doctor.initials,
                        style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 16)),
                  ),
                ),
              if (doctor != null) const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (doctor != null)
                      Text(doctor.name,
                          style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize: 15)),
                    if (doctor?.specialty != null)
                      Text(doctor!.specialty!,
                          style: const TextStyle(
                              color: Colors.white70, fontSize: 12)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10)),
            child: Row(
              children: [
                const Icon(Icons.access_time_rounded,
                    color: Colors.white, size: 16),
                const SizedBox(width: 6),
                Text(
                  '${DateHelper.formatFull(appointment.dateTime)}  •  ${DateHelper.formatTime(appointment.dateTime)}',
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 38,
                  decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10)),
                  child: const Center(
                    child: Text('Rejoindre',
                        style: TextStyle(
                            color: AppColors.accentDark,
                            fontWeight: FontWeight.w700,
                            fontSize: 13)),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              GestureDetector(
                onTap: () {
                  context
                      .read<DataProvider>()
                      .updateAppointmentStatus(
                          appointment.id, AppointmentStatus.cancelled);
                },
                child: Container(
                  height: 38,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10)),
                  child: const Center(
                    child: Text('Annuler',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w500)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _NoAppointmentCard extends StatelessWidget {
  final VoidCallback onBook;
  const _NoAppointmentCard({required this.onBook});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: AppDecorations.card,
      child: Column(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
                color: AppColors.primaryLight,
                shape: BoxShape.circle),
            child: const Icon(Icons.event_available_rounded,
                color: AppColors.primary, size: 28),
          ),
          const SizedBox(height: 12),
          const Text('Aucun rendez-vous prévu',
              style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 15,
                  color: AppColors.textPrimary)),
          const SizedBox(height: 6),
          const Text('Prenez rendez-vous avec un médecin dès maintenant',
              style: TextStyle(
                  color: AppColors.textSecondary, fontSize: 13),
              textAlign: TextAlign.center),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: onBook,
              icon: const Icon(Icons.add_rounded, size: 18),
              label: const Text('Prendre un rendez-vous'),
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _QuickAction(
      {required this.icon,
      required this.label,
      required this.color,
      required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding:
            const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        decoration: AppDecorations.card,
        child: Column(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  shape: BoxShape.circle),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(height: 8),
            Text(label,
                style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w500,
                    height: 1.3),
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

class _RecentConsultCard extends StatelessWidget {
  final Consultation consult;
  const _RecentConsultCard(this.consult);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: AppDecorations.card.copyWith(
          border: Border(
              left: BorderSide(color: AppColors.accent, width: 3))),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(consult.diagnosis,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                        color: AppColors.textPrimary)),
                const SizedBox(height: 3),
                Text(DateHelper.formatShort(consult.date),
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.textHint)),
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded,
              color: AppColors.textHint, size: 18),
        ],
      ),
    );
  }
}

// ─── Rendez-vous Tab ──────────────────────────────────────────────────────────

class _RdvTab extends StatelessWidget {
  final String patientId;
  const _RdvTab({required this.patientId});

  @override
  Widget build(BuildContext context) {
    final data = context.watch<DataProvider>();
    final auth = context.read<AuthProvider>();
    final all = data.getAppointmentsForPatient(patientId);
    final upcoming = all.where((a) => a.isUpcoming).toList()
      ..sort((a, b) => a.dateTime.compareTo(b.dateTime));
    final past = all.where((a) => a.isPast).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        flexibleSpace: Container(decoration: AppDecorations.gradientPrimary),
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        title: const Text('Mes Rendez-vous'),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.push(context,
            MaterialPageRoute(builder: (_) => const BookAppointmentScreen())),
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: const Text('Prendre un RDV',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
        children: [
          if (upcoming.isEmpty && past.isEmpty)
            const Center(
                child: Padding(
              padding: EdgeInsets.only(top: 60),
              child: Text('Aucun rendez-vous',
                  style: TextStyle(color: AppColors.textSecondary)),
            )),
          if (upcoming.isNotEmpty) ...[
            _RdvSectionHeader(title: 'À venir', count: upcoming.length),
            const SizedBox(height: 12),
            ...upcoming.map((a) => _PatientApptCard(
                appointment: a,
                auth: auth,
                data: data,
                showCancel: true)),
            const SizedBox(height: 20),
          ],
          if (past.isNotEmpty) ...[
            _RdvSectionHeader(title: 'Passés', count: past.length),
            const SizedBox(height: 12),
            ...past.map((a) =>
                _PatientApptCard(appointment: a, auth: auth, data: data)),
          ],
        ],
      ),
    );
  }
}

class _RdvSectionHeader extends StatelessWidget {
  final String title;
  final int count;
  const _RdvSectionHeader({required this.title, required this.count});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(title,
            style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 16,
                color: AppColors.textPrimary)),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10)),
          child: Text('$count',
              style: const TextStyle(
                  color: AppColors.primary,
                  fontSize: 11,
                  fontWeight: FontWeight.w600)),
        ),
      ],
    );
  }
}

class _PatientApptCard extends StatelessWidget {
  final Appointment appointment;
  final AuthProvider auth;
  final DataProvider data;
  final bool showCancel;

  const _PatientApptCard({
    required this.appointment,
    required this.auth,
    required this.data,
    this.showCancel = false,
  });

  @override
  Widget build(BuildContext context) {
    final doctor = auth.getUserById(appointment.doctorId);
    final statusColor = _apptStatusColor(appointment.status);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: AppDecorations.card.copyWith(
          border: Border(
              left: BorderSide(color: statusColor, width: 3))),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (doctor != null)
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                  color: AppColors.avatarColor(doctor.id),
                  shape: BoxShape.circle),
              child: Center(
                  child: Text(doctor.initials,
                      style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 14))),
            ),
          if (doctor != null) const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (doctor != null) ...[
                  Text(doctor.name,
                      style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                          color: AppColors.textPrimary)),
                  if (doctor.specialty != null)
                    Text(doctor.specialty!,
                        style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 12)),
                  const SizedBox(height: 6),
                ],
                Row(
                  children: [
                    const Icon(Icons.access_time_rounded,
                        size: 12, color: AppColors.textHint),
                    const SizedBox(width: 4),
                    Text(
                      '${DateHelper.formatDate(appointment.dateTime)}  •  ${DateHelper.formatTime(appointment.dateTime)}',
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.textSecondary),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(appointment.reason,
                    style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                        fontStyle: FontStyle.italic),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _apptStatusBadge(appointment.status),
                    if (showCancel &&
                        appointment.status != AppointmentStatus.cancelled) ...[
                      const Spacer(),
                      GestureDetector(
                        onTap: () => data.updateAppointmentStatus(
                            appointment.id, AppointmentStatus.cancelled),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                              color: AppColors.errorLight,
                              borderRadius: BorderRadius.circular(8)),
                          child: const Text('Annuler',
                              style: TextStyle(
                                  color: AppColors.error,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500)),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Consultations Tab ────────────────────────────────────────────────────────

class _ConsultationsTab extends StatelessWidget {
  final String patientId;
  const _ConsultationsTab({required this.patientId});

  @override
  Widget build(BuildContext context) {
    final data = context.watch<DataProvider>();
    final auth = context.read<AuthProvider>();
    final consultations = data.getConsultationsForPatient(patientId);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        flexibleSpace: Container(decoration: AppDecorations.gradientPrimary),
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        title: Text('Consultations (${consultations.length})'),
      ),
      body: consultations.isEmpty
          ? const Center(
              child: Text('Aucune consultation enregistrée',
                  style: TextStyle(color: AppColors.textSecondary)))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: consultations.length,
              itemBuilder: (_, i) => _PatientConsultCard(
                  consult: consultations[i], auth: auth),
            ),
    );
  }
}

class _PatientConsultCard extends StatefulWidget {
  final Consultation consult;
  final AuthProvider auth;
  const _PatientConsultCard(
      {required this.consult, required this.auth});

  @override
  State<_PatientConsultCard> createState() => _PatientConsultCardState();
}

class _PatientConsultCardState extends State<_PatientConsultCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final c = widget.consult;
    final doctor = widget.auth.getUserById(c.doctorId);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: AppDecorations.card.copyWith(
          border: Border(
              left: BorderSide(color: AppColors.accent, width: 3))),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                          color: AppColors.accentLight,
                          borderRadius: BorderRadius.circular(8)),
                      child: Text(DateHelper.formatShort(c.date),
                          style: const TextStyle(
                              color: AppColors.accentDark,
                              fontSize: 11,
                              fontWeight: FontWeight.w600)),
                    ),
                    const Spacer(),
                    if (doctor != null)
                      Text(doctor.name,
                          style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary)),
                  ],
                ),
                const SizedBox(height: 10),
                Text(c.diagnosis,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                        color: AppColors.textPrimary)),
                const SizedBox(height: 8),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.medication_outlined,
                        size: 14, color: AppColors.accent),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                          c.prescription.split('\n').first,
                          style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis),
                    ),
                  ],
                ),
              ],
            ),
          ),
          InkWell(
            onTap: () => setState(() => _expanded = !_expanded),
            child: Container(
              padding:
                  const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
              decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: const BorderRadius.vertical(
                      bottom: Radius.circular(16))),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                      _expanded
                          ? 'Masquer les détails'
                          : 'Voir l\'ordonnance complète',
                      style: const TextStyle(
                          color: AppColors.primary,
                          fontSize: 12,
                          fontWeight: FontWeight.w500)),
                  Icon(
                      _expanded
                          ? Icons.expand_less_rounded
                          : Icons.expand_more_rounded,
                      color: AppColors.primary,
                      size: 16),
                ],
              ),
            ),
          ),
          if (_expanded)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Divider(),
                  const SizedBox(height: 8),
                  const Text('Ordonnance complète',
                      style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                          color: AppColors.textPrimary)),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                        color: AppColors.accentLight,
                        borderRadius: BorderRadius.circular(8)),
                    child: Text(c.prescription,
                        style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textPrimary,
                            height: 1.7)),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

Color _apptStatusColor(AppointmentStatus s) {
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

Widget _apptStatusBadge(AppointmentStatus s) {
  final color = _apptStatusColor(s);
  String label;
  switch (s) {
    case AppointmentStatus.pending:
      label = 'En attente';
    case AppointmentStatus.confirmed:
      label = 'Confirmé';
    case AppointmentStatus.completed:
      label = 'Terminé';
    case AppointmentStatus.cancelled:
      label = 'Annulé';
  }
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20)),
    child: Text(label,
        style: TextStyle(
            color: color, fontSize: 10, fontWeight: FontWeight.w600)),
  );
}
