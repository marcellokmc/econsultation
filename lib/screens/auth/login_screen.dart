import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/user.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../doctor/doctor_home_screen.dart';
import '../patient/patient_home_screen.dart';

class LoginScreen extends StatefulWidget {
  final UserRole role;
  const LoginScreen({super.key, required this.role});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _obscure = true;
  bool _loading = false;
  String? _error;

  late AnimationController _ctrl;
  late Animation<double> _headerFade;
  late Animation<Offset> _formSlide;
  late Animation<double> _formFade;

  // ── Role-specific getters ───────────────────────────────────────────────────

  bool get _isDoctor => widget.role == UserRole.doctor;

  List<Color> get _gradientColors => _isDoctor
      ? const [Color(0xFF1A6FDB), Color(0xFF0A3F8A)]
      : const [Color(0xFF00BFA5), Color(0xFF006B5E)];

  Color get _mainColor => _gradientColors.first;

  IconData get _roleIcon =>
      _isDoctor ? Icons.local_hospital_rounded : Icons.favorite_rounded;

  String get _roleTitle => _isDoctor ? 'Espace Médecin' : 'Espace Patient';

  String get _roleSubtitle => _isDoctor
      ? 'Accédez à votre tableau de bord clinique'
      : 'Consultez et gérez votre santé en ligne';

  String get _demoEmail =>
      _isDoctor ? 'dr.martin@econsult.fr' : 'jean.durand@email.fr';

  String get _demoPassword => _isDoctor ? 'doctor123' : 'patient123';

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 650));

    _headerFade = Tween<double>(begin: 0, end: 1).animate(CurvedAnimation(
        parent: _ctrl,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOut)));
    _formSlide =
        Tween<Offset>(begin: const Offset(0, 0.15), end: Offset.zero).animate(
            CurvedAnimation(
                parent: _ctrl,
                curve:
                    const Interval(0.2, 1.0, curve: Curves.easeOutCubic)));
    _formFade = Tween<double>(begin: 0, end: 1).animate(CurvedAnimation(
        parent: _ctrl,
        curve: const Interval(0.2, 0.85, curve: Curves.easeOut)));

    _ctrl.forward();
    _emailCtrl.text = _demoEmail;
    _passCtrl.text = _demoPassword;
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _ctrl.dispose();
    super.dispose();
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  Future<void> _login() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    await Future.delayed(const Duration(milliseconds: 800));
    if (!mounted) return;

    final ok = context
        .read<AuthProvider>()
        .login(_emailCtrl.text.trim(), _passCtrl.text);
    if (!mounted) return;

    if (ok) {
      final auth = context.read<AuthProvider>();
      Navigator.of(context).pushAndRemoveUntil(
        PageRouteBuilder(
          pageBuilder: (_, _, _) => auth.currentUser!.isDoctor
              ? const DoctorHomeScreen()
              : const PatientHomeScreen(),
          transitionDuration: const Duration(milliseconds: 500),
          transitionsBuilder: (_, anim, _, child) =>
              FadeTransition(opacity: anim, child: child),
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

  // ── Build ────────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Full gradient background
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: _gradientColors,
              ),
            ),
          ),
          // Decorative circles
          Positioned(
            top: -60,
            right: -70,
            child: _DecorCircle(size: 220, opacity: 0.08),
          ),
          Positioned(
            top: 130,
            left: -80,
            child: _DecorCircle(size: 160, opacity: 0.06),
          ),
          Positioned(
            top: 60,
            right: 60,
            child: _DecorCircle(size: 60, opacity: 0.07),
          ),
          // Content
          SafeArea(
            child: Column(
              children: [
                // ── Header ─────────────────────────────────────────────────
                FadeTransition(
                  opacity: _headerFade,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(8, 4, 20, 0),
                    child: Column(
                      children: [
                        // Back button
                        Align(
                          alignment: Alignment.centerLeft,
                          child: IconButton(
                            icon: const Icon(
                                Icons.arrow_back_ios_new_rounded,
                                color: Colors.white,
                                size: 20),
                            onPressed: () => Navigator.pop(context),
                          ),
                        ),
                        const SizedBox(height: 4),
                        // Hero icon
                        Hero(
                          tag: 'role_icon_${widget.role.name}',
                          child: Container(
                            width: 70,
                            height: 70,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.18),
                              shape: BoxShape.circle,
                              border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.35),
                                  width: 1.5),
                            ),
                            child: Icon(_roleIcon,
                                color: Colors.white, size: 34),
                          ),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          _roleTitle,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 5),
                        Text(
                          _roleSubtitle,
                          style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.75),
                              fontSize: 13),
                        ),
                        const SizedBox(height: 28),
                      ],
                    ),
                  ),
                ),
                // ── Form card ───────────────────────────────────────────────
                Expanded(
                  child: SlideTransition(
                    position: _formSlide,
                    child: FadeTransition(
                      opacity: _formFade,
                      child: Container(
                        width: double.infinity,
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.vertical(
                              top: Radius.circular(28)),
                          boxShadow: [
                            BoxShadow(
                              color: Color(0x22000000),
                              blurRadius: 24,
                              offset: Offset(0, -6),
                            ),
                          ],
                        ),
                        child: SingleChildScrollView(
                          padding:
                              const EdgeInsets.fromLTRB(24, 28, 24, 24),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Title row
                              Row(
                                crossAxisAlignment:
                                    CrossAxisAlignment.center,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'Connexion',
                                          style: TextStyle(
                                            fontSize: 24,
                                            fontWeight: FontWeight.w800,
                                            color: AppColors.textPrimary,
                                            letterSpacing: -0.3,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        const Text(
                                          'Entrez vos identifiants pour continuer',
                                          style: TextStyle(
                                              color:
                                                  AppColors.textSecondary,
                                              fontSize: 13),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 9, vertical: 5),
                                    decoration: BoxDecoration(
                                      color: AppColors.successLight,
                                      borderRadius:
                                          BorderRadius.circular(8),
                                    ),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.shield_rounded,
                                            size: 11,
                                            color: AppColors.success),
                                        SizedBox(width: 4),
                                        Text('RGPD',
                                            style: TextStyle(
                                                fontSize: 10,
                                                color: AppColors.success,
                                                fontWeight:
                                                    FontWeight.w700)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 26),
                              // Email
                              _InputField(
                                controller: _emailCtrl,
                                label: 'Adresse email',
                                hint: 'exemple@domaine.fr',
                                icon: Icons.alternate_email_rounded,
                                keyboardType: TextInputType.emailAddress,
                                accentColor: _mainColor,
                              ),
                              const SizedBox(height: 16),
                              // Password
                              _InputField(
                                controller: _passCtrl,
                                label: 'Mot de passe',
                                hint: '••••••••',
                                icon: Icons.lock_outline_rounded,
                                obscure: _obscure,
                                onSubmit: (_) => _login(),
                                accentColor: _mainColor,
                                suffix: IconButton(
                                  splashRadius: 20,
                                  icon: Icon(
                                    _obscure
                                        ? Icons.visibility_off_outlined
                                        : Icons.visibility_outlined,
                                    size: 19,
                                    color: AppColors.textSecondary,
                                  ),
                                  onPressed: () => setState(
                                      () => _obscure = !_obscure),
                                ),
                              ),
                              // Forgot password
                              Align(
                                alignment: Alignment.centerRight,
                                child: TextButton(
                                  onPressed: () {},
                                  style: TextButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(
                                          vertical: 4)),
                                  child: Text(
                                    'Mot de passe oublié ?',
                                    style: TextStyle(
                                        fontSize: 12,
                                        color: _mainColor,
                                        fontWeight: FontWeight.w500),
                                  ),
                                ),
                              ),
                              // Error
                              if (_error != null) ...[
                                const SizedBox(height: 2),
                                _ErrorBanner(message: _error!),
                              ],
                              const SizedBox(height: 16),
                              // Login button
                              _GradientButton(
                                gradientColors: _gradientColors,
                                onPressed: _loading ? null : _login,
                                loading: _loading,
                              ),
                              const SizedBox(height: 22),
                              // Divider
                              _SmallDivider(label: 'Accès démo rapide'),
                              const SizedBox(height: 16),
                              // Demo card
                              _DemoCard(
                                email: _demoEmail,
                                password: _demoPassword,
                                isDoctor: _isDoctor,
                                accentColor: _mainColor,
                                lightColor: _isDoctor
                                    ? AppColors.primaryLight
                                    : AppColors.accentLight,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Decorative circle ────────────────────────────────────────────────────────

class _DecorCircle extends StatelessWidget {
  final double size;
  final double opacity;
  const _DecorCircle({required this.size, required this.opacity});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
            color: Colors.white.withValues(alpha: opacity * 2), width: 1.5),
        color: Colors.white.withValues(alpha: opacity),
      ),
    );
  }
}

// ─── Custom input field ───────────────────────────────────────────────────────

class _InputField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final IconData icon;
  final Color accentColor;
  final bool obscure;
  final TextInputType? keyboardType;
  final ValueChanged<String>? onSubmit;
  final Widget? suffix;

  const _InputField({
    required this.controller,
    required this.label,
    required this.hint,
    required this.icon,
    required this.accentColor,
    this.obscure = false,
    this.keyboardType,
    this.onSubmit,
    this.suffix,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
            letterSpacing: 0.1,
          ),
        ),
        const SizedBox(height: 7),
        Container(
          decoration: BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.divider),
          ),
          child: TextField(
            controller: controller,
            obscureText: obscure,
            keyboardType: keyboardType,
            onSubmitted: onSubmit,
            style: const TextStyle(
                fontSize: 14,
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w500),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: const TextStyle(
                  color: AppColors.textHint, fontSize: 14),
              prefixIcon:
                  Icon(icon, color: accentColor.withValues(alpha: 0.65), size: 19),
              suffixIcon: suffix,
              filled: false,
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: accentColor, width: 1.5),
              ),
              contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16, vertical: 14),
            ),
          ),
        ),
      ],
    );
  }
}

// ─── Error banner ─────────────────────────────────────────────────────────────

class _ErrorBanner extends StatelessWidget {
  final String message;
  const _ErrorBanner({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      decoration: BoxDecoration(
        color: AppColors.errorLight,
        borderRadius: BorderRadius.circular(10),
        border:
            Border.all(color: AppColors.error.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline_rounded,
              color: AppColors.error, size: 17),
          const SizedBox(width: 8),
          Expanded(
            child: Text(message,
                style: const TextStyle(
                    color: AppColors.error,
                    fontSize: 13,
                    fontWeight: FontWeight.w400)),
          ),
        ],
      ),
    );
  }
}

// ─── Gradient button ──────────────────────────────────────────────────────────

class _GradientButton extends StatelessWidget {
  final List<Color> gradientColors;
  final VoidCallback? onPressed;
  final bool loading;

  const _GradientButton({
    required this.gradientColors,
    required this.onPressed,
    required this.loading,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: onPressed != null
              ? LinearGradient(
                  colors: gradientColors,
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                )
              : null,
          color: onPressed == null ? AppColors.textHint : null,
          borderRadius: BorderRadius.circular(14),
          boxShadow: onPressed != null
              ? [
                  BoxShadow(
                    color: gradientColors.first.withValues(alpha: 0.38),
                    blurRadius: 14,
                    offset: const Offset(0, 5),
                  )
                ]
              : null,
        ),
        child: ElevatedButton(
          onPressed: onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.transparent,
            shadowColor: Colors.transparent,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14)),
          ),
          child: loading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                      color: Colors.white, strokeWidth: 2.5))
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      'Se connecter',
                      style: TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(width: 10),
                    Container(
                      width: 26,
                      height: 26,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.arrow_forward_rounded,
                          color: Colors.white, size: 14),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}

// ─── Small divider ────────────────────────────────────────────────────────────

class _SmallDivider extends StatelessWidget {
  final String label;
  const _SmallDivider({required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Expanded(child: Divider(color: AppColors.divider)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text(label,
              style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.textHint,
                  fontWeight: FontWeight.w500,
                  letterSpacing: 0.3)),
        ),
        const Expanded(child: Divider(color: AppColors.divider)),
      ],
    );
  }
}

// ─── Demo card ────────────────────────────────────────────────────────────────

class _DemoCard extends StatelessWidget {
  final String email;
  final String password;
  final bool isDoctor;
  final Color accentColor;
  final Color lightColor;

  const _DemoCard({
    required this.email,
    required this.password,
    required this.isDoctor,
    required this.accentColor,
    required this.lightColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: lightColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: accentColor.withValues(alpha: 0.18)),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: accentColor.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.play_circle_outline_rounded,
                color: accentColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Identifiants pré-remplis',
                  style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                      fontSize: 12),
                ),
                const SizedBox(height: 2),
                Text(
                  '$email  •  $password',
                  style: const TextStyle(
                      color: AppColors.textSecondary, fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
