import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/user.dart';
import '../../providers/auth_provider.dart';
import '../../services/biometric_service.dart';
import '../../services/storage_service.dart';
import '../doctor/doctor_home_screen.dart';
import '../patient/patient_home_screen.dart';

// Couleurs du wireframe
const _navy = Color(0xFF0D2137);
const _inputFill = Color(0xFFF2F4F7);
const _biometricFill = Color(0xFFF5EFE0);
const _biometricBorder = Color(0xFFE8D9B8);

class LoginScreen extends StatefulWidget {
  final UserRole role;
  const LoginScreen({super.key, required this.role});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscure = true;
  bool _loading = false;
  String? _error;
  bool _biometricAvailable = false;
  bool _hasSession = false;

  bool get _isDoctor => widget.role == UserRole.doctor;
  String get _demoEmail =>
      _isDoctor ? 'marcel@medecin.bf' : 'lebian@patient.bf';
  String get _demoPassword => _isDoctor ? 'doctor123' : 'patient123';

  @override
  void initState() {
    super.initState();
    _emailCtrl.text = _demoEmail;
    _passCtrl.text = _demoPassword;
    _initBiometric();
  }

  Future<void> _initBiometric() async {
    final available = await BiometricService.isAvailable();
    final hasSession = StorageService.getSession() != null;
    if (mounted) {
      setState(() {
        _biometricAvailable = available;
        _hasSession = hasSession;
      });
    }
  }

  Future<void> _loginWithBiometric() async {
    setState(() => _loading = true);
    final ok = await BiometricService.authenticate();
    if (!mounted) return;
    if (ok) {
      final restored = context.read<AuthProvider>().restoreSession();
      if (!mounted) return;
      if (restored) {
        final auth = context.read<AuthProvider>();
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(
            builder: (_) => auth.currentUser!.isDoctor
                ? const DoctorHomeScreen()
                : const PatientHomeScreen(),
          ),
          (_) => false,
        );
        return;
      }
    }
    setState(() {
      _loading = false;
      _error = 'Authentification biométrique échouée.';
    });
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!(_formKey.currentState?.validate() ?? true)) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    await Future.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;

    final ok =
        context.read<AuthProvider>().login(_emailCtrl.text.trim(), _passCtrl.text);
    if (!mounted) return;

    if (ok) {
      final auth = context.read<AuthProvider>();
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (_) => auth.currentUser!.isDoctor
              ? const DoctorHomeScreen()
              : const PatientHomeScreen(),
        ),
        (_) => false,
      );
    } else {
      setState(() {
        _error = 'Email ou mot de passe incorrect.';
        _loading = false;
      });
    }
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

                  // ── Flèche retour ─────────────────────────────────────────
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

                  // ── Titre ─────────────────────────────────────────────────
                  const Text(
                    'Authentification',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      color: _navy,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _isDoctor ? 'Espace Médecin' : 'Espace Patient',
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF8A9BB0),
                      fontWeight: FontWeight.w400,
                    ),
                  ),

                  const SizedBox(height: 36),

                  // ── Champ email ───────────────────────────────────────────
                  _FieldLabel('Adresse e-mail'),
                  const SizedBox(height: 8),
                  _WireTextField(
                    controller: _emailCtrl,
                    hint: 'exemple@email.com',
                    keyboardType: TextInputType.emailAddress,
                  ),

                  const SizedBox(height: 20),

                  // ── Champ mot de passe ────────────────────────────────────
                  _FieldLabel('Mot de passe'),
                  const SizedBox(height: 8),
                  _WireTextField(
                    controller: _passCtrl,
                    hint: '••••••••',
                    obscure: _obscure,
                    onSubmit: (_) => _login(),
                    suffix: GestureDetector(
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
                  ),

                  // ── Mot de passe oublié ───────────────────────────────────
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () {},
                      style: TextButton.styleFrom(
                          padding: EdgeInsets.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                      child: const Text(
                        'Mot de passe oublié ?',
                        style: TextStyle(
                          fontSize: 12,
                          color: _navy,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 4),

                  // ── Erreur ────────────────────────────────────────────────
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
                    const SizedBox(height: 12),
                  ],

                  // ── Bouton Connexion ──────────────────────────────────────
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _login,
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
                              'Connexion',
                              style: TextStyle(
                                  fontSize: 16, fontWeight: FontWeight.w700),
                            ),
                    ),
                  ),

                  const SizedBox(height: 28),

                  // ── Séparateur biométrie ──────────────────────────────────
                  Row(
                    children: [
                      const Expanded(
                          child: Divider(color: Color(0xFFE0E4EA))),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        child: Text(
                          'Ou utiliser la biométrie',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade500,
                            fontWeight: FontWeight.w400,
                          ),
                        ),
                      ),
                      const Expanded(
                          child: Divider(color: Color(0xFFE0E4EA))),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // ── Boutons biométrie ─────────────────────────────────────
                  Row(
                    children: [
                      Expanded(
                        child: _BiometricCard(
                          icon: Icons.fingerprint_rounded,
                          label: 'Empreinte\ndigitale',
                          onTap: (_biometricAvailable && _hasSession)
                              ? (_loading ? null : _loginWithBiometric)
                              : null,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: _BiometricCard(
                          icon: Icons.face_rounded,
                          label: 'Reconnaissance\nfaciale',
                          onTap: (_biometricAvailable && _hasSession)
                              ? (_loading ? null : _loginWithBiometric)
                              : null,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 32),

                  // ── Liens bas de page ─────────────────────────────────────
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      TextButton(
                        onPressed: () {},
                        style: TextButton.styleFrom(
                            padding: EdgeInsets.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                        child: const Text(
                          'Mot de passe oublié ?',
                          style: TextStyle(
                            fontSize: 12,
                            color: _navy,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      Container(
                        width: 1,
                        height: 14,
                        margin:
                            const EdgeInsets.symmetric(horizontal: 12),
                        color: const Color(0xFFD0D5DD),
                      ),
                      TextButton(
                        onPressed: () {},
                        style: TextButton.styleFrom(
                            padding: EdgeInsets.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                        child: const Text(
                          'Créer un compte',
                          style: TextStyle(
                            fontSize: 12,
                            color: _navy,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // ── Accès démo (discret) ──────────────────────────────────
                  Center(
                    child: GestureDetector(
                      onTap: () {
                        _emailCtrl.text = _demoEmail;
                        _passCtrl.text = _demoPassword;
                        setState(() {});
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: _inputFill,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '⚡ Remplir les identifiants de démo',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey.shade500,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Widgets internes ─────────────────────────────────────────────────────────

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel(this.text);

  @override
  Widget build(BuildContext context) => Text(
        text,
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: Color(0xFF2D3A4A),
        ),
      );
}

class _WireTextField extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  final bool obscure;
  final TextInputType keyboardType;
  final Widget? suffix;
  final void Function(String)? onSubmit;

  const _WireTextField({
    required this.controller,
    required this.hint,
    this.obscure = false,
    this.keyboardType = TextInputType.text,
    this.suffix,
    this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      obscureText: obscure,
      keyboardType: keyboardType,
      onFieldSubmitted: onSubmit,
      style: const TextStyle(
          fontSize: 14, color: _navy, fontWeight: FontWeight.w500),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(
            color: Color(0xFFB0BAC8), fontSize: 14),
        suffixIcon: suffix,
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
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      ),
    );
  }
}

class _BiometricCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  const _BiometricCard({
    required this.icon,
    required this.label,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final enabled = onTap != null;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 12),
        decoration: BoxDecoration(
          color: enabled ? _biometricFill : const Color(0xFFF5F5F5),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: enabled ? _biometricBorder : const Color(0xFFE0E0E0),
            width: 1.5,
          ),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              size: 36,
              color: enabled ? _navy : const Color(0xFFB0BAC8),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: enabled ? _navy : const Color(0xFFB0BAC8),
                height: 1.4,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
