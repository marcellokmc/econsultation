import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/appointment.dart';
import '../../models/consultation.dart';
import '../../models/prescription.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_provider.dart';
import '../../theme/app_theme.dart';

// Écran de saisie d'une consultation médicale
// [appointment] est optionnel : null = consultation directe sans RDV
class CreateConsultationScreen extends StatefulWidget {
  final Appointment? appointment;
  final String patientId;

  const CreateConsultationScreen({
    super.key,
    this.appointment,
    required this.patientId,
  });

  @override
  State<CreateConsultationScreen> createState() =>
      _CreateConsultationScreenState();
}

class _CreateConsultationScreenState extends State<CreateConsultationScreen> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _motifCtrl;
  final _diagnosisCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  // Signes vitaux (optionnels)
  final _weightCtrl = TextEditingController();
  final _tempCtrl = TextEditingController();
  final _bpCtrl = TextEditingController();
  final _hrCtrl = TextEditingController();

  // Liste dynamique des médicaments à prescrire
  final List<_MedRow> _medications = [];

  bool _saving = false;

  @override
  void initState() {
    super.initState();
    // Pré-remplir le motif depuis le rendez-vous si disponible
    _motifCtrl = TextEditingController(
        text: widget.appointment?.reason ?? '');
    // Commencer avec un médicament vide par défaut
    _medications.add(_MedRow());
  }

  @override
  void dispose() {
    for (final c in [
      _motifCtrl, _diagnosisCtrl, _notesCtrl,
      _weightCtrl, _tempCtrl, _bpCtrl, _hrCtrl,
    ]) {
      c.dispose();
    }
    for (final m in _medications) {
      m.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();
    final data = context.read<DataProvider>();
    final doctor = auth.currentUser!;

    setState(() => _saving = true);

    // Construire les médicaments valides (au moins le nom renseigné)
    final meds = _medications
        .where((m) => m.nameCtrl.text.trim().isNotEmpty)
        .map((m) => Medication(
              name: m.nameCtrl.text.trim(),
              dosage: m.dosageCtrl.text.trim().isEmpty
                  ? 'Selon prescription'
                  : m.dosageCtrl.text.trim(),
              frequency: m.freqCtrl.text.trim().isEmpty
                  ? 'Selon prescription'
                  : m.freqCtrl.text.trim(),
              duration: m.durationCtrl.text.trim().isEmpty
                  ? 'À définir'
                  : m.durationCtrl.text.trim(),
              instructions: m.instrCtrl.text.trim().isEmpty
                  ? null
                  : m.instrCtrl.text.trim(),
            ))
        .toList();

    // Résumé texte de l'ordonnance pour l'affichage compact
    final prescriptionText = meds.isEmpty
        ? 'Aucun médicament prescrit'
        : meds.map((m) => m.summary).join('\n');

    final now = DateTime.now();
    final consultId = 'con_${now.millisecondsSinceEpoch}';

    // Créer la consultation
    final consultation = Consultation(
      id: consultId,
      appointmentId: widget.appointment?.id,
      patientId: widget.patientId,
      doctorId: doctor.id,
      date: now,
      notes: _notesCtrl.text.trim(),
      diagnosis: _diagnosisCtrl.text.trim(),
      prescription: prescriptionText,
      weight: double.tryParse(_weightCtrl.text),
      temperature: double.tryParse(_tempCtrl.text),
      bloodPressure: _bpCtrl.text.trim().isEmpty ? null : _bpCtrl.text.trim(),
      heartRate: int.tryParse(_hrCtrl.text),
    );
    data.addConsultation(consultation);

    // Créer l'ordonnance structurée si des médicaments ont été prescrits
    if (meds.isNotEmpty) {
      final prescription = Prescription(
        id: 'presc_${now.millisecondsSinceEpoch}',
        consultationId: consultId,
        patientId: widget.patientId,
        doctorId: doctor.id,
        date: now,
        medications: meds,
      );
      data.addPrescription(prescription);
    }

    if (mounted) {
      Navigator.pop(context, true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Consultation enregistrée avec succès'),
          backgroundColor: AppColors.success,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final patient = auth.getUserById(widget.patientId);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        flexibleSpace: Container(decoration: AppDecorations.gradientPrimary),
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Nouvelle consultation'),
            if (patient != null)
              Text(
                patient.name,
                style: const TextStyle(
                    fontSize: 12, fontWeight: FontWeight.w400),
              ),
          ],
        ),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // ─── Motif ──────────────────────────────────────────────────────
            _SectionHeader(title: 'Motif de la visite'),
            const SizedBox(height: 12),
            TextFormField(
              controller: _motifCtrl,
              decoration: const InputDecoration(
                labelText: 'Motif',
                prefixIcon: Icon(Icons.assignment_outlined,
                    size: 20, color: AppColors.textHint),
              ),
            ),

            // ─── Signes vitaux ───────────────────────────────────────────────
            const SizedBox(height: 24),
            _SectionHeader(title: 'Signes vitaux (optionnel)'),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _VitalField(
                    ctrl: _weightCtrl,
                    label: 'Poids (kg)',
                    icon: Icons.monitor_weight_outlined,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _VitalField(
                    ctrl: _tempCtrl,
                    label: 'Temp. (°C)',
                    icon: Icons.thermostat_rounded,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _VitalField(
                    ctrl: _bpCtrl,
                    label: 'Tension (ex: 120/80)',
                    icon: Icons.favorite_border_rounded,
                    isNumeric: false,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _VitalField(
                    ctrl: _hrCtrl,
                    label: 'Fréq. cardiaque (bpm)',
                    icon: Icons.monitor_heart_outlined,
                  ),
                ),
              ],
            ),

            // ─── Diagnostic ──────────────────────────────────────────────────
            const SizedBox(height: 24),
            _SectionHeader(title: 'Diagnostic'),
            const SizedBox(height: 12),
            TextFormField(
              controller: _diagnosisCtrl,
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Le diagnostic est requis' : null,
              decoration: const InputDecoration(
                labelText: 'Diagnostic',
                prefixIcon: Icon(Icons.medical_services_outlined,
                    size: 20, color: AppColors.textHint),
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _notesCtrl,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Observations cliniques',
                prefixIcon: Icon(Icons.notes_rounded,
                    size: 20, color: AppColors.textHint),
                alignLabelWithHint: true,
              ),
            ),

            // ─── Ordonnance ──────────────────────────────────────────────────
            const SizedBox(height: 24),
            _SectionHeader(
              title: 'Ordonnance',
              trailing: TextButton.icon(
                onPressed: () => setState(() => _medications.add(_MedRow())),
                icon: const Icon(Icons.add_rounded, size: 16),
                label: const Text('Ajouter'),
                style: TextButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    padding: EdgeInsets.zero),
              ),
            ),
            const SizedBox(height: 12),

            // Une carte par médicament
            ..._medications.asMap().entries.map((entry) {
              final idx = entry.key;
              final med = entry.value;
              return _MedicationCard(
                med: med,
                index: idx,
                onRemove: _medications.length > 1
                    ? () => setState(() {
                          med.dispose();
                          _medications.removeAt(idx);
                        })
                    : null,
              );
            }),

            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: _saving ? null : _save,
                icon: _saving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2),
                      )
                    : const Icon(Icons.save_rounded),
                label: const Text('Enregistrer la consultation'),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

// ─── Modèle de ligne médicament ──────────────────────────────────────────────

// Regroupe les contrôleurs d'un médicament dans le formulaire
class _MedRow {
  final nameCtrl = TextEditingController();
  final dosageCtrl = TextEditingController();
  final freqCtrl = TextEditingController();
  final durationCtrl = TextEditingController();
  final instrCtrl = TextEditingController();

  void dispose() {
    nameCtrl.dispose();
    dosageCtrl.dispose();
    freqCtrl.dispose();
    durationCtrl.dispose();
    instrCtrl.dispose();
  }
}

// ─── Widgets locaux ───────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  final String title;
  final Widget? trailing;
  const _SectionHeader({required this.title, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 4,
          height: 18,
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 8),
        Text(title, style: Theme.of(context).textTheme.titleSmall),
        const Spacer(),
        trailing ?? const SizedBox.shrink(),
      ],
    );
  }
}

class _VitalField extends StatelessWidget {
  final TextEditingController ctrl;
  final String label;
  final IconData icon;
  final bool isNumeric;
  const _VitalField({
    required this.ctrl,
    required this.label,
    required this.icon,
    this.isNumeric = true,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: ctrl,
      keyboardType:
          isNumeric ? const TextInputType.numberWithOptions(decimal: true) : TextInputType.text,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, size: 18, color: AppColors.textHint),
      ),
    );
  }
}

class _MedicationCard extends StatelessWidget {
  final _MedRow med;
  final int index;
  final VoidCallback? onRemove;

  const _MedicationCard({
    required this.med,
    required this.index,
    this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: AppDecorations.card.copyWith(
        border: Border(
          left: BorderSide(color: AppColors.accent, width: 3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.medication_rounded,
                  color: AppColors.accent, size: 16),
              const SizedBox(width: 6),
              Text('Médicament ${index + 1}',
                  style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                      fontSize: 13)),
              const Spacer(),
              if (onRemove != null)
                IconButton(
                  icon: const Icon(Icons.close_rounded,
                      color: AppColors.textHint, size: 18),
                  onPressed: onRemove,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
            ],
          ),
          const SizedBox(height: 10),
          TextFormField(
            controller: med.nameCtrl,
            decoration: const InputDecoration(
              labelText: 'Nom du médicament *',
              contentPadding:
                  EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: med.dosageCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Posologie',
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextFormField(
                  controller: med.freqCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Fréquence',
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: med.durationCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Durée',
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextFormField(
                  controller: med.instrCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Instructions',
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
