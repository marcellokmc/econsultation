import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../providers/data_provider.dart';
import '../../theme/app_theme.dart';
import '../../utils/date_helper.dart';
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
    final auth = context.read<AuthProvider>();
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
                    padding: const EdgeInsets.all(16),
                    itemCount: filtered.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (ctx, i) {
                      final patient = filtered[i];
                      final profile =
                          data.getProfileByUserId(patient.id);
                      final consultations =
                          data.getConsultationsForPatient(patient.id);
                      final lastVisit = consultations.isNotEmpty
                          ? consultations.first.date
                          : null;
                      final avatarColor =
                          AppColors.avatarColor(patient.id);

                      return GestureDetector(
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => PatientDetailScreen(
                                patientId: patient.id),
                          ),
                        ),
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: AppDecorations.card,
                          child: Row(
                            children: [
                              Container(
                                width: 50,
                                height: 50,
                                decoration: BoxDecoration(
                                  color: avatarColor,
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
                                        '${profile.age} ans  •  Gr. ${profile.bloodType}',
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
}
