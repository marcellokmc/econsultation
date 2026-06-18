import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/prescription.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_provider.dart';
import '../../services/pdf_export_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/date_helper.dart';

// Écran listant toutes les ordonnances du patient connecté
class PrescriptionsScreen extends StatelessWidget {
  const PrescriptionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final patientId = context.read<AuthProvider>().currentUser!.id;
    final prescriptions =
        context.watch<DataProvider>().getPrescriptionsForPatient(patientId);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        flexibleSpace: Container(decoration: AppDecorations.gradientPrimary),
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        title: Text('Mes ordonnances (${prescriptions.length})'),
      ),
      body: prescriptions.isEmpty
          ? const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.medication_outlined,
                      size: 56, color: AppColors.textHint),
                  SizedBox(height: 12),
                  Text('Aucune ordonnance',
                      style: TextStyle(
                          color: AppColors.textSecondary, fontSize: 15)),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: prescriptions.length,
              itemBuilder: (_, i) => _PrescriptionCard(
                  prescription: prescriptions[i]),
            ),
    );
  }
}

// ─── Carte ordonnance ─────────────────────────────────────────────────────────

class _PrescriptionCard extends StatefulWidget {
  final Prescription prescription;
  const _PrescriptionCard({required this.prescription});

  @override
  State<_PrescriptionCard> createState() => _PrescriptionCardState();
}

class _PrescriptionCardState extends State<_PrescriptionCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final p = widget.prescription;
    final doctor = auth.getUserById(p.doctorId);
    final patient = auth.currentUser!;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: AppDecorations.card.copyWith(
        border: Border(left: BorderSide(color: AppColors.accent, width: 3)),
      ),
      child: Column(
        children: [
          // ─── En-tête ──────────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    // Badge date
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: AppColors.accentLight,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        DateHelper.formatShort(p.date),
                        style: const TextStyle(
                            color: AppColors.accentDark,
                            fontSize: 11,
                            fontWeight: FontWeight.w600),
                      ),
                    ),
                    const Spacer(),
                    if (doctor != null)
                      Text(
                        doctor.name,
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.textSecondary),
                      ),
                    const SizedBox(width: 8),
                    // Bouton export PDF
                    GestureDetector(
                      onTap: () => PdfExportService.sharePrescription(
                        prescription: p,
                        doctor: doctor ?? patient,
                        patient: patient,
                      ),
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: AppColors.errorLight,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.picture_as_pdf_rounded,
                            color: AppColors.error, size: 18),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // Nombre de médicaments
                Row(
                  children: [
                    const Icon(Icons.medication_rounded,
                        color: AppColors.accent, size: 16),
                    const SizedBox(width: 6),
                    Text(
                      '${p.medications.length} médicament${p.medications.length > 1 ? 's' : ''}',
                      style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                          fontSize: 14),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                // Aperçu du premier médicament
                Text(
                  p.medications.first.summary,
                  style: const TextStyle(
                      fontSize: 12, color: AppColors.textSecondary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (p.medications.length > 1)
                  Text(
                    '+ ${p.medications.length - 1} autre(s)…',
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.textHint),
                  ),
              ],
            ),
          ),

          // ─── Bouton dérouler ──────────────────────────────────────────────
          InkWell(
            onTap: () => setState(() => _expanded = !_expanded),
            child: Container(
              padding:
                  const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
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
                    _expanded
                        ? 'Masquer les détails'
                        : 'Voir l\'ordonnance complète',
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

          // ─── Détail médicaments ───────────────────────────────────────────
          if (_expanded)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                borderRadius: BorderRadius.vertical(
                    bottom: Radius.circular(16)),
              ),
              child: Column(
                children: p.medications
                    .map((med) => _MedicationDetail(medication: med))
                    .toList(),
              ),
            ),
        ],
      ),
    );
  }
}

// ─── Détail d'un médicament ───────────────────────────────────────────────────

class _MedicationDetail extends StatelessWidget {
  final Medication medication;
  const _MedicationDetail({required this.medication});

  @override
  Widget build(BuildContext context) {
    final m = medication;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.accentLight,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            m.name,
            style: const TextStyle(
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
                fontSize: 14),
          ),
          const SizedBox(height: 6),
          _DetailRow(icon: Icons.schedule_outlined, text: '${m.dosage} — ${m.frequency}'),
          _DetailRow(icon: Icons.timer_outlined, text: 'Durée : ${m.duration}'),
          if (m.instructions != null)
            _DetailRow(
              icon: Icons.info_outline_rounded,
              text: m.instructions!,
              color: AppColors.warning,
            ),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color color;
  const _DetailRow({
    required this.icon,
    required this.text,
    this.color = AppColors.accentDark,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 6),
          Expanded(
            child: Text(text,
                style: TextStyle(
                    fontSize: 12, color: color, height: 1.4)),
          ),
        ],
      ),
    );
  }
}
