import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class ScreenGuard extends StatefulWidget {
  final Widget child;
  const ScreenGuard({super.key, required this.child});

  @override
  State<ScreenGuard> createState() => _ScreenGuardState();
}

class _ScreenGuardState extends State<ScreenGuard> {
  bool _obscured = false;
  late final AppLifecycleListener _listener;

  @override
  void initState() {
    super.initState();
    _listener = AppLifecycleListener(
      onInactive: () => setState(() => _obscured = true),
      onResume: () => setState(() => _obscured = false),
      onHide: () => setState(() => _obscured = true),
    );
  }

  @override
  void dispose() {
    _listener.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (_obscured)
          Positioned.fill(
            child: Container(
              color: AppColors.primary,
              child: const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.medical_services_rounded,
                      color: Colors.white, size: 64),
                  SizedBox(height: 20),
                  Text(
                    'eConsultation',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Données sécurisées',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
