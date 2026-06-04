import 'package:flutter/material.dart';

import '../../models/user.dart';
import '../../theme/app_theme.dart';
import 'login_screen.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _brandFade;
  late Animation<Offset> _cardsSlide;
  late Animation<double> _cardsFade;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 800));

    _brandFade = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
          parent: _ctrl,
          curve: const Interval(0.0, 0.6, curve: Curves.easeOut)),
    );
    _cardsSlide =
        Tween<Offset>(begin: const Offset(0, 0.12), end: Offset.zero)
            .animate(CurvedAnimation(
      parent: _ctrl,
      curve: const Interval(0.3, 1.0, curve: Curves.easeOutCubic),
    ));
    _cardsFade = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
          parent: _ctrl,
          curve: const Interval(0.3, 0.85, curve: Curves.easeOut)),
    );
    _ctrl.forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _navigate(UserRole role) {
    Navigator.push(
      context,
      PageRouteBuilder(
        pageBuilder: (_, _, _) => LoginScreen(role: role),
        transitionDuration: const Duration(milliseconds: 400),
        transitionsBuilder: (_, anim, _, child) => FadeTransition(
          opacity: CurvedAnimation(parent: anim, curve: Curves.easeOut),
          child: SlideTransition(
            position: Tween<Offset>(
                    begin: const Offset(0.03, 0), end: Offset.zero)
                .animate(
                    CurvedAnimation(parent: anim, curve: Curves.easeOutCubic)),
            child: child,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Column(
        children: [
          // ── Gradient branding area (top, fills remaining space) ──────────
          Expanded(
            child: FadeTransition(
              opacity: _brandFade,
              child: Stack(
                children: [
                  // Gradient background
                  Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [Color(0xFF1A6FDB), Color(0xFF0D47A1)],
                      ),
                      borderRadius: BorderRadius.vertical(
                          bottom: Radius.circular(36)),
                      boxShadow: [
                        BoxShadow(
                          color: Color(0x20000000),
                          blurRadius: 20,
                          offset: Offset(0, 8),
                        ),
                      ],
                    ),
                  ),
                  // Decorative circles
                  Positioned(
                    top: -70,
                    right: -70,
                    child: _Circle(200, 0.07),
                  ),
                  Positioned(
                    bottom: 20,
                    left: -60,
                    child: _Circle(160, 0.05),
                  ),
                  Positioned(
                    top: 80,
                    right: 40,
                    child: _Circle(55, 0.08),
                  ),
                  // Branding content
                  SafeArea(
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 82,
                            height: 82,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.18),
                              shape: BoxShape.circle,
                              border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.3),
                                  width: 2),
                            ),
                            child: const Icon(
                              Icons.medical_services_rounded,
                              color: Colors.white,
                              size: 40,
                            ),
                          ),
                          const SizedBox(height: 18),
                          const Text(
                            'eConsultation',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 30,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.4,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Consultation médicale en ligne',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.75),
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 24),
                          // Trust pills
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              _TrustPill(
                                  icon: Icons.lock_rounded,
                                  label: 'Sécurisé'),
                              const SizedBox(width: 10),
                              _TrustPill(
                                  icon: Icons.verified_rounded,
                                  label: 'Certifié'),
                              const SizedBox(width: 10),
                              _TrustPill(
                                  icon: Icons.star_rounded, label: '4.9/5'),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          // ── Cards area (bottom, fixed height) ────────────────────────────
          SlideTransition(
            position: _cardsSlide,
            child: FadeTransition(
              opacity: _cardsFade,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Choisissez votre espace',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    // Doctor card
                    _RoleCard(
                      role: UserRole.doctor,
                      title: 'Espace Médecin',
                      subtitle: 'Gérez vos patients et consultations',
                      icon: Icons.local_hospital_rounded,
                      gradientColors: const [
                        Color(0xFF1A6FDB),
                        Color(0xFF0A3F8A),
                      ],
                      onTap: () => _navigate(UserRole.doctor),
                    ),
                    const SizedBox(height: 12),
                    // Patient card
                    _RoleCard(
                      role: UserRole.patient,
                      title: 'Espace Patient',
                      subtitle: 'Consultez et suivez votre santé',
                      icon: Icons.favorite_rounded,
                      gradientColors: const [
                        Color(0xFF00BFA5),
                        Color(0xFF006B5E),
                      ],
                      onTap: () => _navigate(UserRole.patient),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Compact role card ────────────────────────────────────────────────────────

class _RoleCard extends StatelessWidget {
  final UserRole role;
  final String title;
  final String subtitle;
  final IconData icon;
  final List<Color> gradientColors;
  final VoidCallback onTap;

  const _RoleCard({
    required this.role,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.gradientColors,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
            colors: gradientColors,
          ),
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: gradientColors.first.withValues(alpha: 0.35),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          children: [
            // Hero icon
            Hero(
              tag: 'role_icon_${role.name}',
              child: Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: Colors.white, size: 25),
              ),
            ),
            const SizedBox(width: 16),
            // Text
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.2,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.75),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            // Arrow
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.arrow_forward_rounded,
                color: Colors.white,
                size: 17,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

class _Circle extends StatelessWidget {
  final double size;
  final double opacity;
  const _Circle(this.size, this.opacity);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withValues(alpha: opacity),
        border: Border.all(
            color: Colors.white.withValues(alpha: opacity * 1.8),
            width: 1.2),
      ),
    );
  }
}

class _TrustPill extends StatelessWidget {
  final IconData icon;
  final String label;
  const _TrustPill({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border:
            Border.all(color: Colors.white.withValues(alpha: 0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 12),
          const SizedBox(width: 5),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
