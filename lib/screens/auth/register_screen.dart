import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/patient_profile.dart';
import '../../models/user.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_provider.dart';
import '../../services/storage_service.dart';
import '../patient/patient_home_screen.dart';

const _navy = Color(0xFF0D2137);
const _inputFill = Color(0xFFF2F4F7);

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();

  Sexe _sexe = Sexe.masculin;
  DateTime _dateOfBirth = DateTime(1990, 1, 1);
  bool _obscure = true;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _dateOfBirth,
      firstDate: DateTime(1920),
      lastDate: DateTime.now().subtract(const Duration(days: 365 * 10)),
      helpText: 'Date de naissance',
      confirmText: 'Confirmer',
      cancelText: 'Annuler',
    );
    if (picked != null) setState(() => _dateOfBirth = picked);
  }

  Future<void> _register() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final auth = context.read<AuthProvider>();
    if (auth.emailExists(_emailCtrl.text.trim())) {
      setState(() => _error = 'Cet email est déjà utilisé.');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    await Future.delayed(const Duration(milliseconds: 500));
    if (!mounted) return;

    final id = 'pat_${DateTime.now().millisecondsSinceEpoch}';
    final newUser = User(
      id: id,
      name: _nameCtrl.text.trim(),
      email: _emailCtrl.text.trim(),
      password: _passCtrl.text,
      role: UserRole.patient,
      phone: _phoneCtrl.text.trim(),
    );

    auth.addUser(newUser);
    context.read<DataProvider>().addProfile(PatientProfile(
          userId: id,
          dateOfBirth: _dateOfBirth,
          sexe: _sexe,
          bloodType: 'Inconnu',
        ));

    auth.login(_emailCtrl.text.trim(), _passCtrl.text);
    StorageService.saveSession(id);

    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const PatientHomeScreen()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 16),
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: _inputFill,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.arrow_back_ios_new_rounded,
                          size: 18, color: _navy),
                    ),
                  ),
                  const SizedBox(height: 32),
                  const Text(
                    'Créer un compte',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      color: _navy,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Espace Patient',
                    style: TextStyle(
                        fontSize: 14,
                        color: Color(0xFF8A9BB0),
                        fontWeight: FontWeight.w400),
                  ),
                  const SizedBox(height: 32),

                  _label('Nom complet'),
                  const SizedBox(height: 8),
                  _field(
                    controller: _nameCtrl,
                    hint: 'SAWADOGO Marcel',
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Champ requis' : null,
                  ),
                  const SizedBox(height: 20),

                  _label('Adresse e-mail'),
                  const SizedBox(height: 8),
                  _field(
                    controller: _emailCtrl,
                    hint: 'exemple@email.com',
                    keyboard: TextInputType.emailAddress,
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) return 'Champ requis';
                      if (!v.contains('@')) return 'Email invalide';
                      return null;
                    },
                  ),
                  const SizedBox(height: 20),

                  _label('Mot de passe'),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _passCtrl,
                    obscureText: _obscure,
                    style: const TextStyle(
                        fontSize: 14,
                        color: _navy,
                        fontWeight: FontWeight.w500),
                    decoration: InputDecoration(
                      hintText: '••••••••',
                      hintStyle: const TextStyle(
                          color: Color(0xFFB0BAC8), fontSize: 14),
                      suffixIcon: GestureDetector(
                        onTap: () => setState(() => _obscure = !_obscure),
                        child: Padding(
                          padding: const EdgeInsets.only(right: 14),
                          child: Icon(
                            _obscure
                                ? Icons.visibility_off_outlined
                                : Icons.visibility_outlined,
                            size: 20,
                            color: const Color(0xFF8A9BB0),
                          ),
                        ),
                      ),
                      filled: true,
                      fillColor: _inputFill,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide.none,
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide.none,
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide:
                            const BorderSide(color: _navy, width: 1.5),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 18, vertical: 16),
                    ),
                    validator: (v) {
                      if (v == null || v.isEmpty) return 'Champ requis';
                      if (v.length < 6) return 'Minimum 6 caractères';
                      return null;
                    },
                  ),
                  const SizedBox(height: 20),

                  _label('Téléphone'),
                  const SizedBox(height: 8),
                  _field(
                    controller: _phoneCtrl,
                    hint: '70 00 00 00 00',
                    keyboard: TextInputType.phone,
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Champ requis' : null,
                  ),
                  const SizedBox(height: 20),

                  _label('Date de naissance'),
                  const SizedBox(height: 8),
                  GestureDetector(
                    onTap: _pickDate,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 18, vertical: 16),
                      decoration: BoxDecoration(
                        color: _inputFill,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              '${_dateOfBirth.day.toString().padLeft(2, '0')}/${_dateOfBirth.month.toString().padLeft(2, '0')}/${_dateOfBirth.year}',
                              style: const TextStyle(
                                  fontSize: 14,
                                  color: _navy,
                                  fontWeight: FontWeight.w500),
                            ),
                          ),
                          const Icon(Icons.calendar_today_outlined,
                              size: 18, color: Color(0xFF8A9BB0)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  _label('Sexe'),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _sexeChip(Sexe.masculin, 'Masculin'),
                      const SizedBox(width: 10),
                      _sexeChip(Sexe.feminin, 'Féminin'),
                      const SizedBox(width: 10),
                      _sexeChip(Sexe.autre, 'Autre'),
                    ],
                  ),

                  const SizedBox(height: 24),

                  if (_error != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF0F0),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                            color: const Color(0xFFFFCDD2), width: 1),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline_rounded,
                              color: Color(0xFFD32F2F), size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(_error!,
                                style: const TextStyle(
                                    color: Color(0xFFD32F2F), fontSize: 12)),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _register,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _navy,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16)),
                        disabledBackgroundColor:
                            _navy.withValues(alpha: 0.5),
                      ),
                      child: _loading
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                  color: Colors.white, strokeWidth: 2.5))
                          : const Text(
                              "S'inscrire",
                              style: TextStyle(
                                  fontSize: 16, fontWeight: FontWeight.w700),
                            ),
                    ),
                  ),
                  const SizedBox(height: 28),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _label(String text) => Text(
        text,
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: Color(0xFF2D3A4A),
        ),
      );

  Widget _field({
    required TextEditingController controller,
    required String hint,
    TextInputType keyboard = TextInputType.text,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboard,
      style: const TextStyle(
          fontSize: 14, color: _navy, fontWeight: FontWeight.w500),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle:
            const TextStyle(color: Color(0xFFB0BAC8), fontSize: 14),
        filled: true,
        fillColor: _inputFill,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: _navy, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide:
              const BorderSide(color: Color(0xFFD32F2F), width: 1),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      ),
      validator: validator,
    );
  }

  Widget _sexeChip(Sexe value, String label) {
    final selected = _sexe == value;
    return GestureDetector(
      onTap: () => setState(() => _sexe = value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? _navy : _inputFill,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? _navy : const Color(0xFFE0E4EA),
            width: 1.5,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : const Color(0xFF8A9BB0),
          ),
        ),
      ),
    );
  }
}
