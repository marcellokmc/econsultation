import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/patient_profile.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_provider.dart';
import '../../theme/app_theme.dart';
import '../../utils/date_helper.dart';
import 'add_edit_patient_screen.dart';
import 'patient_detail_screen.dart';

class PatientsListScreen extends StatefulWidget {
  const PatientsListScreen({super.key});

  @override
  State<PatientsListScreen> createState() => _PatientsListScreenState();
}

class _PatientsListScreenState extends State<PatientsListScreen> {
  String _query = '';
  String _filter = 'Tous';

  final _filters = ['Tous', 'Récents', 'Allergies'];

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final data = context.watch<DataProvider>();
    final allPatients = auth.patients;

    var filtered = allPatients.where((p) {
      final matchQuery =
          p.name.toLowerCase().contains(_query.toLowerCase()) ||
              p.email.toLowerCase().contains(_query.toLowerCase());
      if (!matchQuery) return false;

      if (_filter == 'Allergies') {
        final profile = data.getProfileByUserId(p.id);
        return profile != null && profile.allergies.isNotEmpty;
      }
      return true;
    }).toList();

    if (_filter == 'Récents') {
      filtered.sort((a, b) {
        final ca = data.getConsultationsForPatient(a.id);
        final cb = data.getConsultationsForPatient(b.id);
        if (ca.isEmpty && cb.isEmpty) return 0;
        if (ca.isEmpty) return 1;
        if (cb.isEmpty) return -1;
        return cb.first.date.compareTo(ca.first.date);
      });
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        flexibleSpace: Container(decoration: AppDecorations.gradientPrimary),
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        title: Text('Patients (${allPatients.length})'),
      ),
      // FAB pour créer un nouveau patient
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openAddPatient(context),
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.person_add_rounded, color: Colors.white),
      ),
      body: Column(
        children: [
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
            child: Column(
              children: [
                TextField(
                  onChanged: (v) => setState(() => _query = v),
                  decoration: const InputDecoration(
                    hintText: 'Rechercher un patient…',
                    prefixIcon: Icon(Icons.search_rounded,
                        color: AppColors.textHint, size: 20),
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  height: 32,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _filters.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 8),
                    itemBuilder: (_, i) {
                      final f = _filters[i];
                      final sel = f == _filter;
                      return GestureDetector(
                        onTap: () => setState(() => _filter = f),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(
                            color: sel
                                ? AppColors.primary
                                : AppColors.background,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: sel
                                  ? AppColors.primary
                                  : AppColors.divider,
                            ),
                          ),
                          child: Text(
                            f,
                            style: TextStyle(
                              color: sel
                                  ? Colors.white
                                  : AppColors.textSecondary,
                              fontSize: 12,
                              fontWeight: sel
                                  ? FontWeight.w600
                                  : FontWeight.w400,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: filtered.isEmpty
                ? const Center(
                    child: Text('Aucun patient trouvé',
                        style: TextStyle(color: AppColors.textSecondary)))
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                    itemCount: filtered.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (ctx, i) {
                      final patient = filtered[i];
                      final profile = data.getProfileByUserId(patient.id);
                      final consultations =
                          data.getConsultationsForPatient(patient.id);
                      final lastVisit = consultations.isNotEmpty
                          ? consultations.first.date
                          : null;

                      return GestureDetector(
                        // Tap → détail patient
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => PatientDetailScreen(
                                patientId: patient.id),
                          ),
                        ),
                        // Appui long → menu éditer / supprimer
                        onLongPress: () =>
                            _showPatientActions(context, patient.id),
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: AppDecorations.card,
                          child: Row(
                            children: [
                              Container(
                                width: 50,
                                height: 50,
                                decoration: BoxDecoration(
                                  color: AppColors.avatarColor(patient.id),
                                  shape: BoxShape.circle,
                                ),
                                child: Center(
                                  child: Text(
                                    patient.initials,
                                    style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w700,
                                        fontSize: 17),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    Text(patient.name,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                            fontSize: 15,
                                            color: AppColors.textPrimary)),
                                    const SizedBox(height: 3),
                                    if (profile != null)
                                      Text(
                                        [
                                          '${profile.age} ans',
                                          'Gr. ${profile.bloodType}',
                                          if (profile.sexe != null)
                                            profile.sexe!.label,
                                        ].join('  •  '),
                                        style: const TextStyle(
                                            color: AppColors.textSecondary,
                                            fontSize: 12),
                                      ),
                                    if (lastVisit != null) ...[
                                      const SizedBox(height: 3),
                                      Text(
                                        'Dernière visite : ${DateHelper.formatShort(lastVisit)}',
                                        style: const TextStyle(
                                            color: AppColors.textHint,
                                            fontSize: 11),
                                      ),
                                    ],
                                    if (profile != null &&
                                        profile.chronicConditions
                                            .isNotEmpty) ...[
                                      const SizedBox(height: 6),
                                      Wrap(
                                        spacing: 6,
                                        children: profile.chronicConditions
                                            .take(2)
                                            .map((c) => Container(
                                                  padding: const EdgeInsets
                                                      .symmetric(
                                                      horizontal: 7,
                                                      vertical: 2),
                                                  decoration: BoxDecoration(
                                                    color: AppColors
                                                        .warningLight,
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                            10),
                                                  ),
                                                  child: Text(c,
                                                      style:
                                                          const TextStyle(
                                                              fontSize: 10,
                                                              color: AppColors
                                                                  .warning,
                                                              fontWeight:
                                                                  FontWeight
                                                                      .w500)),
                                                ))
                                            .toList(),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              Column(
                                children: [
                                  Text(
                                    '${consultations.length}',
                                    style: const TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.w800,
                                        color: AppColors.primary),
                                  ),
                                  const Text('consult.',
                                      style: TextStyle(
                                          fontSize: 10,
                                          color: AppColors.textHint)),
                                ],
                              ),
                              const SizedBox(width: 4),
                              const Icon(Icons.chevron_right_rounded,
                                  color: AppColors.textHint, size: 20),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  void _openAddPatient(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
          builder: (_) => const AddEditPatientScreen()),
    );
  }

  // Menu contextuel : éditer ou supprimer un patient
  void _showPatientActions(BuildContext context, String patientId) {
    final auth = context.read<AuthProvider>();
    final data = context.read<DataProvider>();
    final patient = auth.getUserById(patientId);
    final profile = data.getProfileByUserId(patientId);

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                  color: AppColors.divider,
                  borderRadius: BorderRadius.circular(2)),
            ),
            const SizedBox(height: 16),
            Text(patient?.name ?? '',
                style: const TextStyle(
                    fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.edit_outlined, color: AppColors.primary),
              title: const Text('Modifier le patient'),
              onTap: () {
                Navigator.pop(ctx);
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => AddEditPatientScreen(
                        patient: patient, profile: profile),
                  ),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.delete_outline_rounded,
                  color: AppColors.error),
              title: const Text('Supprimer le patient',
                  style: TextStyle(color: AppColors.error)),
              onTap: () {
                Navigator.pop(ctx);
                _confirmDelete(context, patientId, patient?.name ?? '');
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  // Demande confirmation avant suppression définitive
  void _confirmDelete(
      BuildContext context, String patientId, String name) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Supprimer le patient'),
        content: Text(
            'Supprimer $name ? Cette action est irréversible.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annuler')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error),
            onPressed: () {
              Navigator.pop(ctx);
              context.read<AuthProvider>().deleteUser(patientId);
              context.read<DataProvider>().deleteProfile(patientId);
            },
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
  }
}
