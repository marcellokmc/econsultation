import 'package:flutter/material.dart';

class AppColors {
  static const Color primary = Color(0xFF1A6FDB);
  static const Color primaryDark = Color(0xFF0D47A1);
  static const Color primaryLight = Color(0xFFE3F2FD);
  static const Color accent = Color(0xFF00BFA5);
  static const Color accentDark = Color(0xFF00796B);
  static const Color accentLight = Color(0xFFE0F2F1);
  static const Color background = Color(0xFFF5F7FA);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color success = Color(0xFF00C853);
  static const Color successLight = Color(0xFFE8F5E9);
  static const Color warning = Color(0xFFFF6F00);
  static const Color warningLight = Color(0xFFFFF3E0);
  static const Color error = Color(0xFFD32F2F);
  static const Color errorLight = Color(0xFFFFEBEE);
  static const Color textPrimary = Color(0xFF1C1C3A);
  static const Color textSecondary = Color(0xFF666B8E);
  static const Color textHint = Color(0xFFB0B5C8);
  static const Color divider = Color(0xFFEEF0F7);

  static Color avatarColor(String id) {
    const List<Color> palette = [
      Color(0xFF1A6FDB),
      Color(0xFF7C4DFF),
      Color(0xFF00BFA5),
      Color(0xFFFF4081),
      Color(0xFFFF6D00),
      Color(0xFF00897B),
      Color(0xFFAD1457),
      Color(0xFF1565C0),
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
          colors: [Color(0xFF1A6FDB), Color(0xFF0D47A1)],
        ),
      );

  static BoxDecoration get gradientAccent => const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF00BFA5), Color(0xFF00796B)],
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
          secondary: AppColors.accent,
          surface: AppColors.surface,
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
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: Colors.white,
          selectedItemColor: AppColors.primary,
          unselectedItemColor: AppColors.textHint,
          type: BottomNavigationBarType.fixed,
          elevation: 0,
          selectedLabelStyle: TextStyle(fontWeight: FontWeight.w600, fontSize: 11),
          unselectedLabelStyle: TextStyle(fontSize: 11),
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
          headlineLarge: TextStyle(
              fontSize: 26, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
          headlineMedium: TextStyle(
              fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
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
        ),
        dividerTheme: const DividerThemeData(
          color: AppColors.divider,
          thickness: 1,
          space: 0,
        ),
      );
}
