import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/storage_service.dart';
import '../theme/app_theme.dart';
import 'auth/welcome_screen.dart';

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: AppDecorations.gradientPrimary,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Spacer(),
                const Icon(Icons.shield_rounded, color: Colors.white, size: 52),
                const SizedBox(height: 20),
                const Text(
                  'Confidentialité\n& RGPD',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 32,
                    fontWeight: FontWeight.w800,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 28),
                _bullet(
                  Icons.lock_outline_rounded,
                  'Données chiffrées AES-256',
                  'Vos informations médicales sont stockées localement avec un chiffrement de niveau hospitalier.',
                ),
                const SizedBox(height: 16),
                _bullet(
                  Icons.person_off_outlined,
                  'Aucune transmission sans consentement',
                  'Vos données ne sont jamais partagées à des tiers sans votre accord explicite.',
                ),
                const SizedBox(height: 16),
                _bullet(
                  Icons.delete_outline_rounded,
                  'Droit à l\'effacement',
                  'Vous pouvez demander la suppression de vos données à tout moment depuis votre profil.',
                ),
                const Spacer(),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () async {
                      await StorageService.acceptPrivacy();
                      if (!context.mounted) return;
                      Navigator.of(context).pushReplacement(
                        MaterialPageRoute(
                            builder: (_) => const WelcomeScreen()),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: const RoundedRectangleBorder(
                        borderRadius: BorderRadius.all(Radius.circular(14)),
                      ),
                      textStyle: const TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 16),
                    ),
                    child: const Text('Accepter et continuer'),
                  ),
                ),
                const SizedBox(height: 12),
                Center(
                  child: TextButton(
                    onPressed: () => SystemNavigator.pop(),
                    child: const Text(
                      'Refuser et quitter',
                      style: TextStyle(color: Colors.white70, fontSize: 13),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _bullet(IconData icon, String title, String desc) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.15),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: Colors.white, size: 20),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 14)),
              const SizedBox(height: 3),
              Text(desc,
                  style: const TextStyle(
                      color: Colors.white70, fontSize: 12, height: 1.4)),
            ],
          ),
        ),
      ],
    );
  }
}
