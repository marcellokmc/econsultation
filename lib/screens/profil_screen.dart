import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../services/storage_service.dart';
import '../theme/app_theme.dart';
import 'auth/welcome_screen.dart';

class ProfilScreen extends StatelessWidget {
  const ProfilScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.currentUser!;
    final isDoctor = user.isDoctor;
    final color = isDoctor ? AppColors.primary : AppColors.accent;
    final consentDate = StorageService.consentDate;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // ── AppBar avec avatar ───────────────────────────────────────────
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            backgroundColor: color,
            foregroundColor: Colors.white,
            surfaceTintColor: Colors.transparent,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: AppDecorations.gradientPrimary,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(height: 40),
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: AppColors.avatarColor(user.id),
                        shape: BoxShape.circle,
                        border: Border.all(
                            color: Colors.white.withValues(alpha: 0.4),
                            width: 3),
                      ),
                      child: Center(
                        child: Text(user.initials,
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 28,
                                fontWeight: FontWeight.w800)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(user.name,
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        isDoctor
                            ? (user.specialty ?? 'Médecin')
                            : 'Patient',
                        style: const TextStyle(
                            color: Colors.white, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            title: const Text('Mon profil'),
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Informations personnelles ────────────────────────────
                  _SectionTitle('Informations personnelles'),
                  const SizedBox(height: 10),
                  _InfoCard(children: [
                    _InfoRow(
                        icon: Icons.email_outlined,
                        label: 'Email',
                        value: user.email),
                    const Divider(height: 20),
                    _InfoRow(
                        icon: Icons.phone_outlined,
                        label: 'Téléphone',
                        value: user.phone),
                    if (isDoctor && user.specialty != null) ...[
                      const Divider(height: 20),
                      _InfoRow(
                          icon: Icons.medical_services_outlined,
                          label: 'Spécialité',
                          value: user.specialty!),
                    ],
                    if (isDoctor && user.experienceYears != null) ...[
                      const Divider(height: 20),
                      _InfoRow(
                          icon: Icons.workspace_premium_outlined,
                          label: 'Expérience',
                          value:
                              '${user.experienceYears} ans'),
                    ],
                  ]),

                  const SizedBox(height: 20),

                  // ── RGPD ─────────────────────────────────────────────────
                  _SectionTitle('Confidentialité & RGPD'),
                  const SizedBox(height: 10),
                  _InfoCard(children: [
                    _InfoRow(
                      icon: Icons.verified_user_outlined,
                      label: 'Consentement donné le',
                      value: consentDate != null
                          ? _fmtDate(consentDate)
                          : 'Non enregistré',
                      valueColor: AppColors.success,
                    ),
                    const Divider(height: 20),
                    const _InfoRow(
                      icon: Icons.storage_outlined,
                      label: 'Stockage',
                      value: 'Données chiffrées AES-256 localement',
                    ),
                    const Divider(height: 20),
                    const _InfoRow(
                      icon: Icons.lock_outlined,
                      label: 'Droits',
                      value:
                          'Accès, rectification, suppression disponibles',
                    ),
                  ]),

                  const SizedBox(height: 12),

                  // Bouton supprimer mes données
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () =>
                          _confirmDeleteData(context, auth),
                      icon: const Icon(Icons.delete_forever_rounded,
                          color: AppColors.error),
                      label: const Text('Supprimer mes données',
                          style:
                              TextStyle(color: AppColors.error)),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(
                            color: AppColors.error),
                        padding: const EdgeInsets.symmetric(
                            vertical: 14),
                        shape: RoundedRectangleBorder(
                            borderRadius:
                                BorderRadius.circular(12)),
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),

                  // ── À propos ─────────────────────────────────────────────
                  _SectionTitle('À propos'),
                  const SizedBox(height: 10),
                  _InfoCard(children: [
                    const _InfoRow(
                        icon: Icons.info_outline_rounded,
                        label: 'Version',
                        value: '1.0.0'),
                    const Divider(height: 20),
                    const _InfoRow(
                        icon: Icons.school_outlined,
                        label: 'Projet',
                        value:
                            'Master Télémédecine & e-Santé'),
                    const Divider(height: 20),
                    const _InfoRow(
                        icon: Icons.person_outlined,
                        label: 'Encadrant',
                        value:
                            'Dr. Ing. Lebian Wilfried NIKIEMA'),
                  ]),

                  const SizedBox(height: 20),

                  // ── Déconnexion ──────────────────────────────────────────
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => _logout(context, auth),
                      icon: const Icon(Icons.logout_rounded),
                      label: const Text('Se déconnecter'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.error,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                            vertical: 14),
                        shape: RoundedRectangleBorder(
                            borderRadius:
                                BorderRadius.circular(12)),
                      ),
                    ),
                  ),

                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _fmtDate(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';

  void _confirmDeleteData(BuildContext context, AuthProvider auth) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.warning_rounded, color: AppColors.error),
            SizedBox(width: 8),
            Text('Supprimer mes données'),
          ],
        ),
        content: const Text(
          'Cette action effacera toutes vos données locales (consultations, rendez-vous, profil) de façon irréversible. '
          'Voulez-vous continuer ?',
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annuler')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error,
                foregroundColor: Colors.white),
            onPressed: () async {
              Navigator.pop(ctx);
              await StorageService.clearAll();
              if (context.mounted) {
                auth.logout();
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(
                      builder: (_) => const WelcomeScreen()),
                  (_) => false,
                );
              }
            },
            child: const Text('Supprimer tout'),
          ),
        ],
      ),
    );
  }

  void _logout(BuildContext context, AuthProvider auth) {
    auth.logout();
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const WelcomeScreen()),
      (_) => false,
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  const _SectionTitle(this.title);

  @override
  Widget build(BuildContext context) =>
      Text(title, style: Theme.of(context).textTheme.titleSmall);
}

class _InfoCard extends StatelessWidget {
  final List<Widget> children;
  const _InfoCard({required this.children});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: AppDecorations.card,
        child: Column(children: children),
      );
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppColors.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.textHint)),
                const SizedBox(height: 2),
                Text(value,
                    style: TextStyle(
                        fontSize: 13,
                        color: valueColor ?? AppColors.textPrimary,
                        fontWeight: FontWeight.w500)),
              ],
            ),
          ),
        ],
      );
}
