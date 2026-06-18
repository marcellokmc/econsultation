import 'package:flutter/material.dart';

class AppColors {
  // Bleu acier — plus posé que l'électrique d'origine
  static const Color primary = Color(0xFF3D6DB4);
  static const Color primaryDark = Color(0xFF1E3F6B);
  static const Color primaryLight = Color(0xFFEBF3FF);
  // Sarcelle douce — harmonisée avec le bleu
  static const Color accent = Color(0xFF3A9B8C);
  static const Color accentDark = Color(0xFF1E6A5F);
  static const Color accentLight = Color(0xFFE3F4F2);
  static const Color background = Color(0xFFF5F7FA);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color success = Color(0xFF2E9E5A);
  static const Color successLight = Color(0xFFEAF5EE);
  static const Color warning = Color(0xFFE07B00);
  static const Color warningLight = Color(0xFFFFF0E0);
  static const Color error = Color(0xFFC0392B);
  static const Color errorLight = Color(0xFFFDECEA);
  static const Color textPrimary = Color(0xFF1C2A3A);
  static const Color textSecondary = Color(0xFF5A6880);
  static const Color textHint = Color(0xFFB0B8C8);
  static const Color divider = Color(0xFFECEFF5);

  static Color avatarColor(String id) {
    const List<Color> palette = [
      Color(0xFF3D6DB4),
      Color(0xFF6B52B8),
      Color(0xFF3A9B8C),
      Color(0xFFB84D72),
      Color(0xFFCC6B1A),
      Color(0xFF2E8C7A),
      Color(0xFF8C2A68),
      Color(0xFF2B5BA8),
    ];
    final sum = id.codeUnits.fold(0, (a, b) => a + b);
    return palette[sum % palette.length];
  }
}

class AppDecorations {
  static BoxDecoration get card => const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.all(Radius.circular(16)),
        boxShadow: [
          BoxShadow(
            color: Color(0x0F1A6FDB),
            blurRadius: 20,
            offset: Offset(0, 4),
          ),
          BoxShadow(
            color: Color(0x051A6FDB),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      );

  static BoxDecoration get gradientPrimary => const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF3D6DB4), Color(0xFF1E3F6B)],
        ),
      );

  static BoxDecoration get gradientAccent => const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF3A9B8C), Color(0xFF1E6A5F)],
        ),
      );

  static BoxDecoration coloredCard(Color color) => BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: const BorderRadius.all(Radius.circular(12)),
      );
}

class AppTheme {
  static ThemeData get lightTheme => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primary,
          brightness: Brightness.light,
        ).copyWith(
          primary: AppColors.primary,
          onPrimary: Colors.white,
          primaryContainer: AppColors.primaryLight,
          onPrimaryContainer: AppColors.primaryDark,
          secondary: AppColors.accent,
          onSecondary: Colors.white,
          secondaryContainer: AppColors.accentLight,
          onSecondaryContainer: AppColors.accentDark,
          error: AppColors.error,
          errorContainer: AppColors.errorLight,
          surface: AppColors.surface,
          onSurface: AppColors.textPrimary,
          onSurfaceVariant: AppColors.textSecondary,
          outline: AppColors.divider,
          outlineVariant: AppColors.textHint,
          surfaceContainerHighest: AppColors.background,
          scrim: Colors.black,
        ),
        scaffoldBackgroundColor: AppColors.background,
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          scrolledUnderElevation: 0,
          centerTitle: false,
          titleTextStyle: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
          iconTheme: IconThemeData(color: Colors.white),
        ),
        // MD3 NavigationBar (remplace BottomNavigationBar)
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: Colors.white,
          indicatorColor: AppColors.primaryLight,
          indicatorShape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(50)),
          ),
          elevation: 8,
          height: 68,
          labelTextStyle: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 11,
                color: AppColors.primary,
              );
            }
            return const TextStyle(fontSize: 11, color: AppColors.textHint);
          }),
          iconTheme: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return const IconThemeData(color: AppColors.primary, size: 24);
            }
            return const IconThemeData(color: AppColors.textHint, size: 24);
          }),
          surfaceTintColor: Colors.transparent,
        ),
        floatingActionButtonTheme: const FloatingActionButtonThemeData(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 6,
          focusElevation: 8,
          hoverElevation: 8,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(16)),
          ),
        ),
        cardTheme: const CardThemeData(
          color: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(16)),
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.all(Radius.circular(12)),
            ),
            elevation: 0,
            textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.background,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.divider),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.divider),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.error),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          hintStyle: const TextStyle(color: AppColors.textHint, fontSize: 14),
        ),
        textTheme: const TextTheme(
          displaySmall: TextStyle(
              fontSize: 30, fontWeight: FontWeight.w400, color: AppColors.textPrimary),
          headlineLarge: TextStyle(
              fontSize: 26, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
          headlineMedium: TextStyle(
              fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
          headlineSmall: TextStyle(
              fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
          titleLarge: TextStyle(
              fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
          titleMedium: TextStyle(
              fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
          titleSmall: TextStyle(
              fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
          bodyLarge: TextStyle(
              fontSize: 16, color: AppColors.textPrimary, height: 1.5),
          bodyMedium: TextStyle(
              fontSize: 14, color: AppColors.textSecondary, height: 1.4),
          bodySmall: TextStyle(
              fontSize: 12, color: AppColors.textHint, height: 1.3),
          labelLarge: TextStyle(
              fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
          labelMedium: TextStyle(
              fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textSecondary),
          labelSmall: TextStyle(
              fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.textHint),
        ),
        dividerTheme: const DividerThemeData(
          color: AppColors.divider,
          thickness: 1,
          space: 0,
        ),
        snackBarTheme: SnackBarThemeData(
          behavior: SnackBarBehavior.floating,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(12)),
          ),
          backgroundColor: AppColors.textPrimary,
          contentTextStyle: const TextStyle(color: Colors.white, fontSize: 14),
        ),
      );
}
