import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/appointment.dart';
import '../../models/consultation.dart';
import '../../models/patient_profile.dart';
import '../../models/user.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_provider.dart';
import '../../theme/app_theme.dart';
import '../../utils/date_helper.dart';
import '../../widgets/vital_signs_chart.dart';
import 'add_edit_patient_screen.dart';
import 'create_consultation_screen.dart';
import 'doctor_home_screen.dart' show AppointmentStatusBadge;

class PatientDetailScreen extends StatelessWidget {
  final String patientId;
  const PatientDetailScreen({super.key, required this.patientId});

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final data = context.watch<DataProvider>();
    final patient = auth.getUserById(patientId);
    final profile = data.getProfileByUserId(patientId);

    if (patient == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Patient')),
        body: const Center(child: Text('Patient introuvable')),
      );
    }

    final consultations = data.getConsultationsForPatient(patientId);
    final appointments = data.getAppointmentsForPatient(patientId);
    final doctorId = auth.currentUser!.id;

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: AppColors.background,
        // FAB pour démarrer une nouvelle consultation directe (sans RDV)
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => CreateConsultationScreen(
                patientId: patientId,
              ),
            ),
          ),
          backgroundColor: AppColors.primary,
          icon: const Icon(Icons.medical_services_rounded, color: Colors.white),
          label: const Text('Consultation',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
        ),
        body: NestedScrollView(
          headerSliverBuilder: (ctx, inner) => [
            SliverAppBar(
              expandedHeight: 210,
              pinned: true,
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              surfaceTintColor: Colors.transparent,
              scrolledUnderElevation: 0,
              // Bouton d'édition du patient dans l'app bar
              actions: [
                IconButton(
                  icon: const Icon(Icons.edit_outlined, color: Colors.white),
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => AddEditPatientScreen(
                          patient: patient, profile: profile),
                    ),
                  ),
                ),
              ],
              flexibleSpace: FlexibleSpaceBar(
                collapseMode: CollapseMode.pin,
                background: _PatientHeader(
                    patient: patient, profile: profile),
              ),
              bottom: TabBar(
                indicatorColor: AppColors.accent,
                indicatorWeight: 3,
                labelColor: Colors.white,
                unselectedLabelColor: Colors.white60,
                labelStyle: const TextStyle(
                    fontWeight: FontWeight.w600, fontSize: 13),
                tabs: const [
                  Tab(text: 'Profil'),
                  Tab(text: 'Consultations'),
                  Tab(text: 'Rendez-vous'),
                ],
              ),
            ),
          ],
          body: TabBarView(
            children: [
              _ProfileTab(patient: patient, profile: profile),
              _ConsultationsTab(
                  consultations: consultations,
                  auth: auth,
                  patientId: patientId,
                  doctorId: doctorId),
              _AppointmentsTab(
                  appointments: appointments, auth: auth, data: data),
            ],
          ),
        ),
      ),
    );
  }
}

class _PatientHeader extends StatelessWidget {
  final User patient;
  final PatientProfile? profile;
  const _PatientHeader({required this.patient, required this.profile});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: AppDecorations.gradientPrimary,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 48, 20, 0),
          child: Column(
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: AppColors.avatarColor(patient.id),
                  shape: BoxShape.circle,
                  border: Border.all(
                      color: Colors.white.withValues(alpha: 0.4), width: 3),
                ),
                child: Center(
                  child: Text(patient.initials,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 26,
                          fontWeight: FontWeight.w800)),
                ),
              ),
              const SizedBox(height: 10),
              Text(patient.name,
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (profile != null) ...[
                    _InfoBadge(label: '${profile!.age} ans'),
                    const SizedBox(width: 8),
                    _InfoBadge(
                        label: 'Gr. ${profile!.bloodType}',
                        color: const Color(0xFFE53935)),
                    if (profile!.sexe != null) ...[
                      const SizedBox(width: 8),
                      _InfoBadge(label: profile!.sexe!.label),
                    ],
                    if (profile!.allergies.isNotEmpty) ...[
                      const SizedBox(width: 8),
                      _InfoBadge(
                          label:
                              '${profile!.allergies.length} allergie(s)',
                          color: AppColors.warning),
                    ],
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoBadge extends StatelessWidget {
  final String label;
  final Color color;
  const _InfoBadge(
      {required this.label, this.color = Colors.white});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(12),
        border:
            Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(label,
          style: const TextStyle(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.w500)),
    );
  }
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

class _ProfileTab extends StatelessWidget {
  final User patient;
  final PatientProfile? profile;
  const _ProfileTab({required this.patient, this.profile});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (profile != null) ...[
          // Signes vitaux
          Text('Signes vitaux',
              style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 10),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 2,
            children: [
              _VitalCard(
                icon: Icons.monitor_weight_outlined,
                label: 'Poids',
                value:
                    '${profile!.weight?.toStringAsFixed(1) ?? '--'} kg',
                color: AppColors.primary,
              ),
              _VitalCard(
                icon: Icons.height_rounded,
                label: 'Taille',
                value:
                    '${profile!.height?.toStringAsFixed(0) ?? '--'} cm',
                color: AppColors.accent,
              ),
              _VitalCard(
                icon: Icons.calculate_outlined,
                label: 'IMC',
                value: profile!.bmi?.toStringAsFixed(1) ?? '--',
                subtitle: profile!.bmiCategory,
                color: const Color(0xFF7C4DFF),
              ),
              _VitalCard(
                icon: Icons.bloodtype_outlined,
                label: 'Groupe',
                value: profile!.bloodType,
                color: const Color(0xFFE53935),
              ),
            ],
          ),
          const SizedBox(height: 20),
        ],
        // Allergies
        if (profile != null && profile!.allergies.isNotEmpty) ...[
          Text('Allergies',
              style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: AppDecorations.card,
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: profile!.allergies
                  .map((a) => _Chip(
                      label: a,
                      color: AppColors.error,
                      bgColor: AppColors.errorLight))
                  .toList(),
            ),
          ),
          const SizedBox(height: 16),
        ],
        // Pathologies chroniques
        if (profile != null && profile!.chronicConditions.isNotEmpty) ...[
          Text('Pathologies chroniques',
              style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: AppDecorations.card,
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: profile!.chronicConditions
                  .map((c) => _Chip(
                      label: c,
                      color: AppColors.warning,
                      bgColor: AppColors.warningLight))
                  .toList(),
            ),
          ),
          const SizedBox(height: 16),
        ],
        // Informations personnelles
        Text('Informations personnelles',
            style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: AppDecorations.card,
          child: Column(
            children: [
              _InfoRow(
                  icon: Icons.phone_outlined,
                  label: 'Téléphone',
                  value: patient.phone),
              // Sexe affiché si renseigné
              if (profile?.sexe != null) ...[
                const Divider(height: 20),
                _InfoRow(
                    icon: Icons.wc_outlined,
                    label: 'Sexe',
                    value: profile!.sexe!.label),
              ],
              if (profile?.address != null) ...[
                const Divider(height: 20),
                _InfoRow(
                    icon: Icons.location_on_outlined,
                    label: 'Adresse',
                    value: profile!.address!),
              ],
              if (profile?.emergencyContact != null) ...[
                const Divider(height: 20),
                _InfoRow(
                    icon: Icons.emergency_outlined,
                    label: 'Contact urgence',
                    value: profile!.emergencyContact!),
              ],
            ],
          ),
        ),
        const SizedBox(height: 80), // espace pour le FAB
      ],
    );
  }
}

class _VitalCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final String? subtitle;
  final Color color;

  const _VitalCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: AppDecorations.card,
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(label,
                  style: const TextStyle(
                      fontSize: 10, color: AppColors.textHint)),
              Text(value,
                  style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: color)),
              if (subtitle != null)
                Text(subtitle!,
                    style: const TextStyle(
                        fontSize: 9, color: AppColors.textSecondary)),
            ],
          ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;
  final Color color;
  final Color bgColor;
  const _Chip(
      {required this.label, required this.color, required this.bgColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(label,
          style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w500)),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow(
      {required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: AppColors.primary),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: const TextStyle(
                      fontSize: 11, color: AppColors.textHint)),
              Text(value,
                  style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      ],
    );
  }
}

// ─── Consultations Tab ────────────────────────────────────────────────────────

class _ConsultationsTab extends StatelessWidget {
  final List<Consultation> consultations;
  final AuthProvider auth;
  final String patientId;
  final String doctorId;

  const _ConsultationsTab({
    required this.consultations,
    required this.auth,
    required this.patientId,
    required this.doctorId,
  });

  @override
  Widget build(BuildContext context) {
    if (consultations.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.medical_services_outlined,
                size: 48, color: AppColors.textHint),
            const SizedBox(height: 10),
            const Text('Aucune consultation enregistrée',
                style: TextStyle(color: AppColors.textSecondary)),
            const SizedBox(height: 16),
            TextButton.icon(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => CreateConsultationScreen(
                      patientId: patientId),
                ),
              ),
              icon: const Icon(Icons.add_rounded),
              label: const Text('Nouvelle consultation'),
            ),
          ],
        ),
      );
    }
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: VitalSignsChart(
              consultations: consultations, type: VitalType.heartRate),
        ),
        const SizedBox(height: 4),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 80),
            itemCount: consultations.length,
            itemBuilder: (_, i) =>
                _ConsultationCard(consultation: consultations[i]),
          ),
        ),
      ],
    );
  }
}

class _ConsultationCard extends StatefulWidget {
  final Consultation consultation;
  const _ConsultationCard({required this.consultation});

  @override
  State<_ConsultationCard> createState() => _ConsultationCardState();
}

class _ConsultationCardState extends State<_ConsultationCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final c = widget.consultation;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: AppDecorations.card.copyWith(
        border: Border(
            left: BorderSide(color: AppColors.accent, width: 3)),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(14),
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
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        DateHelper.formatShort(c.date),
                        style: const TextStyle(
                            color: AppColors.accentDark,
                            fontSize: 11,
                            fontWeight: FontWeight.w600),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        c.diagnosis,
                        style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                            color: AppColors.textPrimary),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                // Signes vitaux rapides
                if (c.weight != null ||
                    c.bloodPressure != null ||
                    c.temperature != null)
                  Row(
                    children: [
                      if (c.temperature != null)
                        _MiniVital(
                            icon: Icons.thermostat_rounded,
                            value: '${c.temperature}°C',
                            color: AppColors.error),
                      if (c.bloodPressure != null)
                        _MiniVital(
                            icon: Icons.favorite_border_rounded,
                            value: c.bloodPressure!,
                            color: const Color(0xFFE53935)),
                      if (c.heartRate != null)
                        _MiniVital(
                            icon: Icons.monitor_heart_outlined,
                            value: '${c.heartRate} bpm',
                            color: AppColors.warning),
                      if (c.weight != null)
                        _MiniVital(
                            icon: Icons.monitor_weight_outlined,
                            value: '${c.weight} kg',
                            color: AppColors.primary),
                    ],
                  ),
                const SizedBox(height: 8),
                // Aperçu de la prescription
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.medication_outlined,
                        size: 14, color: AppColors.accent),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        c.prescription.split('\n').first,
                        style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Bouton dérouler détails
          InkWell(
            onTap: () => setState(() => _expanded = !_expanded),
            child: Container(
              padding:
                  const EdgeInsets.symmetric(vertical: 8, horizontal: 14),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.vertical(
                    bottom: _expanded
                        ? Radius.zero
                        : const Radius.circular(16)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    _expanded ? 'Masquer les détails' : 'Voir les détails',
                    style: const TextStyle(
                        color: AppColors.primary,
                        fontSize: 12,
                        fontWeight: FontWeight.w500),
                  ),
                  Icon(
                    _expanded
                        ? Icons.expand_less_rounded
                        : Icons.expand_more_rounded,
                    color: AppColors.primary,
                    size: 16,
                  ),
                ],
              ),
            ),
          ),
          if (_expanded)
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Divider(),
                  const SizedBox(height: 8),
                  const Text('Ordonnance',
                      style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                          fontSize: 13)),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.accentLight,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(c.prescription,
                        style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textPrimary,
                            height: 1.6)),
                  ),
                  const SizedBox(height: 10),
                  const Text('Notes cliniques',
                      style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                          fontSize: 13)),
                  const SizedBox(height: 6),
                  Text(c.notes,
                      style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                          height: 1.5)),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _MiniVital extends StatelessWidget {
  final IconData icon;
  final String value;
  final Color color;
  const _MiniVital(
      {required this.icon, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(value,
              style: TextStyle(
                  fontSize: 11,
                  color: color,
                  fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

// ─── Appointments Tab ─────────────────────────────────────────────────────────

class _AppointmentsTab extends StatelessWidget {
  final List<Appointment> appointments;
  final AuthProvider auth;
  final DataProvider data;
  const _AppointmentsTab(
      {required this.appointments,
      required this.auth,
      required this.data});

  @override
  Widget build(BuildContext context) {
    final upcoming = appointments.where((a) => a.isUpcoming).toList();
    final past = appointments.where((a) => a.isPast).toList();

    if (appointments.isEmpty) {
      return const Center(
          child: Text('Aucun rendez-vous',
              style: TextStyle(color: AppColors.textSecondary)));
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
      children: [
        if (upcoming.isNotEmpty) ...[
          const Text('À venir',
              style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                  fontSize: 14)),
          const SizedBox(height: 10),
          ...upcoming.map((a) => _SimpleApptCard(appointment: a)),
          const SizedBox(height: 16),
        ],
        if (past.isNotEmpty) ...[
          const Text('Passés',
              style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                  fontSize: 14)),
          const SizedBox(height: 10),
          ...past.map((a) => _SimpleApptCard(appointment: a)),
        ],
      ],
    );
  }
}

class _SimpleApptCard extends StatelessWidget {
  final Appointment appointment;
  const _SimpleApptCard({required this.appointment});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: AppDecorations.card,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              children: [
                Text(
                    DateHelper.formatTime(appointment.dateTime),
                    style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                        fontSize: 13)),
                Text(
                    DateHelper.formatDate(appointment.dateTime)
                        .substring(0, 5),
                    style: const TextStyle(
                        fontSize: 10, color: AppColors.textHint)),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(appointment.reason,
                    style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textPrimary),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                AppointmentStatusBadge(status: appointment.status),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
