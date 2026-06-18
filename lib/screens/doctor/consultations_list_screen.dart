import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/consultation.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_provider.dart';
import '../../theme/app_theme.dart';
import '../../utils/date_helper.dart';
import 'patient_detail_screen.dart';

class ConsultationsListScreen extends StatefulWidget {
  const ConsultationsListScreen({super.key});

  @override
  State<ConsultationsListScreen> createState() =>
      _ConsultationsListScreenState();
}

class _ConsultationsListScreenState extends State<ConsultationsListScreen> {
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final data = context.watch<DataProvider>();
    final doctorId = auth.currentUser!.id;
    final all = data.getConsultationsForDoctor(doctorId);

    final filtered = _search.isEmpty
        ? all
        : all.where((c) {
            final patient = auth.getUserById(c.patientId);
            final name = patient?.name.toLowerCase() ?? '';
            return name.contains(_search.toLowerCase()) ||
                c.diagnosis.toLowerCase().contains(_search.toLowerCase());
          }).toList()
      ..sort((a, b) => b.date.compareTo(a.date));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        flexibleSpace: Container(decoration: AppDecorations.gradientPrimary),
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        title: Text('Consultations (${all.length})'),
      ),
      body: Column(
        children: [
          // ── Barre de recherche ─────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              onChanged: (v) => setState(() => _search = v),
              style: const TextStyle(fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Rechercher par patient ou diagnostic…',
                hintStyle: const TextStyle(
                    color: AppColors.textHint, fontSize: 13),
                prefixIcon: const Icon(Icons.search_rounded,
                    color: AppColors.textHint, size: 20),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.divider),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.divider),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide:
                      const BorderSide(color: AppColors.primary, width: 1.5),
                ),
                contentPadding: const EdgeInsets.symmetric(
                    horizontal: 14, vertical: 12),
              ),
            ),
          ),

          // ── Liste ─────────────────────────────────────────────────────
          if (filtered.isEmpty)
            Expanded(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.medical_services_outlined,
                        size: 56, color: AppColors.textHint),
                    const SizedBox(height: 12),
                    Text(
                      _search.isEmpty
                          ? 'Aucune consultation enregistrée'
                          : 'Aucun résultat pour "$_search"',
                      style: const TextStyle(color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 80),
                itemCount: filtered.length,
                itemBuilder: (_, i) => _ConsultationTile(
                  consultation: filtered[i],
                  onTap: () {
                    final patient =
                        auth.getUserById(filtered[i].patientId);
                    if (patient != null) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => PatientDetailScreen(
                              patientId: filtered[i].patientId),
                        ),
                      );
                    }
                  },
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _ConsultationTile extends StatelessWidget {
  final Consultation consultation;
  final VoidCallback onTap;

  const _ConsultationTile({
    required this.consultation,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = consultation;
    final auth = context.read<AuthProvider>();
    final patient = auth.getUserById(c.patientId);
    final isCritical = c.temperature != null &&
        (c.temperature! > 40.0 || c.temperature! < 35.0);

    // Couleur de fond selon criticité / situation
    final bgColor = isCritical
        ? Colors.red.shade50
        : Colors.green.shade50;
    final borderColor = isCritical ? AppColors.error : AppColors.success;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(14),
          border: Border(left: BorderSide(color: borderColor, width: 4)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              // Avatar patient
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.avatarColor(c.patientId),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    patient?.initials ?? '?',
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 14),
                  ),
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
                            patient?.name ?? 'Patient inconnu',
                            style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 14,
                                color: AppColors.textPrimary),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: isCritical
                                ? AppColors.errorLight
                                : const Color(0xFFE8F5E9),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            isCritical ? 'Critique' : 'Terminée',
                            style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: borderColor),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      c.diagnosis,
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.textSecondary),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.calendar_today_rounded,
                            size: 11, color: AppColors.textHint),
                        const SizedBox(width: 4),
                        Text(DateHelper.formatShort(c.date),
                            style: const TextStyle(
                                fontSize: 11, color: AppColors.textHint)),
                        if (c.temperature != null) ...[
                          const SizedBox(width: 12),
                          Icon(Icons.thermostat_rounded,
                              size: 11, color: borderColor),
                          const SizedBox(width: 4),
                          Text('${c.temperature}°C',
                              style: TextStyle(
                                  fontSize: 11,
                                  color: borderColor,
                                  fontWeight: FontWeight.w600)),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded,
                  color: AppColors.textHint, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}
