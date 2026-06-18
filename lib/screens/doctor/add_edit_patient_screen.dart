import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/patient_profile.dart';
import '../../models/user.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_provider.dart';
import '../../theme/app_theme.dart';

// Écran de création ou modification d'un patient
// Appelé avec [patient] et [profile] null pour une création, renseignés pour une édition
class AddEditPatientScreen extends StatefulWidget {
  final User? patient;
  final PatientProfile? profile;

  const AddEditPatientScreen({super.key, this.patient, this.profile});

  @override
  State<AddEditPatientScreen> createState() => _AddEditPatientScreenState();
}

class _AddEditPatientScreenState extends State<AddEditPatientScreen> {
  final _formKey = GlobalKey<FormState>();

  // Contrôleurs pour les champs texte
  late final TextEditingController _nameCtrl;
  late final TextEditingController _emailCtrl;
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _weightCtrl;
  late final TextEditingController _heightCtrl;
  late final TextEditingController _addressCtrl;
  late final TextEditingController _emergencyCtrl;
  // Une allergie/pathologie par ligne
  late final TextEditingController _allergiesCtrl;
  late final TextEditingController _conditionsCtrl;

  DateTime? _dateOfBirth;
  Sexe? _sexe;
  String _bloodType = 'A+';

  bool _saving = false;
  bool get _isEditing => widget.patient != null;

  static const _bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  @override
  void initState() {
    super.initState();
    final p = widget.patient;
    final prof = widget.profile;

    _nameCtrl = TextEditingController(text: p?.name ?? '');
    _emailCtrl = TextEditingController(text: p?.email ?? '');
    _phoneCtrl = TextEditingController(text: p?.phone ?? '');
    _weightCtrl = TextEditingController(
        text: prof?.weight?.toStringAsFixed(1) ?? '');
    _heightCtrl = TextEditingController(
        text: prof?.height?.toStringAsFixed(0) ?? '');
    _addressCtrl = TextEditingController(text: prof?.address ?? '');
    _emergencyCtrl = TextEditingController(text: prof?.emergencyContact ?? '');
    _allergiesCtrl = TextEditingController(
        text: prof?.allergies.join('\n') ?? '');
    _conditionsCtrl = TextEditingController(
        text: prof?.chronicConditions.join('\n') ?? '');

    _dateOfBirth = prof?.dateOfBirth;
    _sexe = prof?.sexe;
    _bloodType = prof?.bloodType ?? 'A+';
  }

  @override
  void dispose() {
    for (final c in [
      _nameCtrl, _emailCtrl, _phoneCtrl, _weightCtrl, _heightCtrl,
      _addressCtrl, _emergencyCtrl, _allergiesCtrl, _conditionsCtrl,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  // Parse un champ texte multiligne en liste (filtre les lignes vides)
  List<String> _parseLines(String text) {
    return text
        .split('\n')
        .map((l) => l.trim())
        .where((l) => l.isNotEmpty)
        .toList();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _dateOfBirth ?? DateTime(1990),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
      locale: const Locale('fr', 'FR'),
    );
    if (picked != null) setState(() => _dateOfBirth = picked);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_dateOfBirth == null) {
      _showError('Veuillez sélectionner une date de naissance.');
      return;
    }

    final auth = context.read<AuthProvider>();
    final data = context.read<DataProvider>();

    // Vérification unicité de l'email
    final emailTaken = auth.emailExists(
      _emailCtrl.text.trim(),
      excludeId: widget.patient?.id,
    );
    if (emailTaken) {
      _showError('Cet email est déjà utilisé par un autre compte.');
      return;
    }

    setState(() => _saving = true);

    if (_isEditing) {
      // Mise à jour d'un patient existant
      final updatedUser = widget.patient!.copyWith(
        name: _nameCtrl.text.trim(),
        email: _emailCtrl.text.trim(),
        phone: _phoneCtrl.text.trim(),
      );
      auth.updateUser(updatedUser);

      final updatedProfile = PatientProfile(
        userId: widget.patient!.id,
        dateOfBirth: _dateOfBirth!,
        sexe: _sexe,
        bloodType: _bloodType,
        weight: double.tryParse(_weightCtrl.text),
        height: double.tryParse(_heightCtrl.text),
        address: _addressCtrl.text.trim().isEmpty ? null : _addressCtrl.text.trim(),
        emergencyContact: _emergencyCtrl.text.trim().isEmpty ? null : _emergencyCtrl.text.trim(),
        allergies: _parseLines(_allergiesCtrl.text),
        chronicConditions: _parseLines(_conditionsCtrl.text),
      );
      data.updateProfile(updatedProfile);
    } else {
      // Création d'un nouveau patient
      final newId = 'pat_${DateTime.now().millisecondsSinceEpoch}';
      final newUser = User(
        id: newId,
        name: _nameCtrl.text.trim(),
        email: _emailCtrl.text.trim(),
        // Mot de passe par défaut, à changer lors de la première connexion
        password: 'patient123',
        role: UserRole.patient,
        phone: _phoneCtrl.text.trim(),
      );
      auth.addUser(newUser);

      final newProfile = PatientProfile(
        userId: newId,
        dateOfBirth: _dateOfBirth!,
        sexe: _sexe,
        bloodType: _bloodType,
        weight: double.tryParse(_weightCtrl.text),
        height: double.tryParse(_heightCtrl.text),
        address: _addressCtrl.text.trim().isEmpty ? null : _addressCtrl.text.trim(),
        emergencyContact: _emergencyCtrl.text.trim().isEmpty ? null : _emergencyCtrl.text.trim(),
        allergies: _parseLines(_allergiesCtrl.text),
        chronicConditions: _parseLines(_conditionsCtrl.text),
      );
      data.addProfile(newProfile);
    }

    if (mounted) Navigator.pop(context, true);
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: AppColors.error),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        flexibleSpace: Container(decoration: AppDecorations.gradientPrimary),
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        title: Text(_isEditing ? 'Modifier le patient' : 'Nouveau patient'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _Section(title: 'Identité'),
            const SizedBox(height: 12),

            _Field(
              controller: _nameCtrl,
              label: 'Nom complet',
              icon: Icons.person_outline_rounded,
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Champ requis' : null,
            ),
            const SizedBox(height: 12),
            _Field(
              controller: _emailCtrl,
              label: 'Email',
              icon: Icons.email_outlined,
              keyboardType: TextInputType.emailAddress,
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Champ requis';
                if (!v.contains('@')) return 'Email invalide';
                return null;
              },
            ),
            const SizedBox(height: 12),
            _Field(
              controller: _phoneCtrl,
              label: 'Téléphone',
              icon: Icons.phone_outlined,
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 12),

            // Sélecteur de date de naissance
            GestureDetector(
              onTap: _pickDate,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _dateOfBirth == null
                        ? AppColors.divider
                        : AppColors.primary,
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.cake_outlined,
                        color: AppColors.textHint, size: 20),
                    const SizedBox(width: 12),
                    Text(
                      _dateOfBirth == null
                          ? 'Date de naissance'
                          : '${_dateOfBirth!.day.toString().padLeft(2, '0')}/${_dateOfBirth!.month.toString().padLeft(2, '0')}/${_dateOfBirth!.year}',
                      style: TextStyle(
                        color: _dateOfBirth == null
                            ? AppColors.textHint
                            : AppColors.textPrimary,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Sélecteur de sexe
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.divider),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.wc_outlined,
                          color: AppColors.textHint, size: 20),
                      const SizedBox(width: 12),
                      const Text('Sexe',
                          style: TextStyle(
                              color: AppColors.textHint, fontSize: 14)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: Sexe.values.map((s) {
                      final selected = _sexe == s;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(s.label),
                          selected: selected,
                          onSelected: (_) => setState(() => _sexe = s),
                          selectedColor: AppColors.primary,
                          labelStyle: TextStyle(
                            color: selected ? Colors.white : AppColors.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            _Section(title: 'Informations médicales'),
            const SizedBox(height: 12),

            // Groupe sanguin
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.divider),
              ),
              child: Row(
                children: [
                  const Icon(Icons.bloodtype_outlined,
                      color: AppColors.textHint, size: 20),
                  const SizedBox(width: 12),
                  const Text('Groupe sanguin',
                      style: TextStyle(
                          color: AppColors.textHint, fontSize: 14)),
                  const Spacer(),
                  DropdownButton<String>(
                    value: _bloodType,
                    underline: const SizedBox(),
                    items: _bloodTypes
                        .map((bt) => DropdownMenuItem(
                              value: bt,
                              child: Text(bt,
                                  style: const TextStyle(
                                      color: AppColors.textPrimary,
                                      fontWeight: FontWeight.w600)),
                            ))
                        .toList(),
                    onChanged: (v) {
                      if (v != null) setState(() => _bloodType = v);
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                  child: _Field(
                    controller: _weightCtrl,
                    label: 'Poids (kg)',
                    icon: Icons.monitor_weight_outlined,
                    keyboardType: TextInputType.number,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _Field(
                    controller: _heightCtrl,
                    label: 'Taille (cm)',
                    icon: Icons.height_rounded,
                    keyboardType: TextInputType.number,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Allergies — une par ligne
            _Field(
              controller: _allergiesCtrl,
              label: 'Allergies (une par ligne)',
              icon: Icons.warning_amber_outlined,
              maxLines: 3,
            ),
            const SizedBox(height: 12),

            // Pathologies chroniques — une par ligne
            _Field(
              controller: _conditionsCtrl,
              label: 'Pathologies chroniques (une par ligne)',
              icon: Icons.medical_information_outlined,
              maxLines: 3,
            ),
            const SizedBox(height: 24),

            _Section(title: 'Contact'),
            const SizedBox(height: 12),

            _Field(
              controller: _addressCtrl,
              label: 'Adresse',
              icon: Icons.location_on_outlined,
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            _Field(
              controller: _emergencyCtrl,
              label: 'Contact urgence (nom — téléphone)',
              icon: Icons.emergency_outlined,
            ),
            const SizedBox(height: 32),

            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2),
                      )
                    : Text(_isEditing
                        ? 'Enregistrer les modifications'
                        : 'Créer le patient'),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

// ─── Widgets locaux ───────────────────────────────────────────────────────────

class _Section extends StatelessWidget {
  final String title;
  const _Section({required this.title});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(width: 4, height: 18, decoration: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(2),
        )),
        const SizedBox(width: 8),
        Text(title, style: Theme.of(context).textTheme.titleSmall),
      ],
    );
  }
}

class _Field extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final IconData icon;
  final TextInputType? keyboardType;
  final int maxLines;
  final String? Function(String?)? validator;

  const _Field({
    required this.controller,
    required this.label,
    required this.icon,
    this.keyboardType,
    this.maxLines = 1,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      maxLines: maxLines,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, size: 20, color: AppColors.textHint),
      ),
    );
  }
}
