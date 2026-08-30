// 멍케어 테마 — 웹(assets/css/app.css)의 두들 팔레트를 그대로 이식
import 'package:flutter/material.dart';

class MungColors {
  // light
  static const bg = Color(0xFFF7F5F2);
  static const surface = Color(0xFFFFFFFF);
  static const surface2 = Color(0xFFF2EFE9);
  static const ink = Color(0xFF241F1A);
  static const ink2 = Color(0xFF5C5348);
  static const ink3 = Color(0xFF8D8377);
  static const brand = Color(0xFFB4622D);
  static const brandInk = Color(0xFF8C4A1F);
  static const brandSoft = Color(0xFFFBEEE3);
  // dark
  static const bgDark = Color(0xFF16130F);
  static const surfaceDark = Color(0xFF211D19);
  static const surface2Dark = Color(0xFF2A251F);
  static const inkDark = Color(0xFFF0EAE2);
  static const ink2Dark = Color(0xFFBDB3A6);
  static const brandDark = Color(0xFFE0894F);
  static const brandSoftDark = Color(0xFF33241A);
}

ThemeData mungTheme(Brightness b) {
  final dark = b == Brightness.dark;
  final scheme = ColorScheme.fromSeed(
    seedColor: dark ? MungColors.brandDark : MungColors.brand,
    brightness: b,
    surface: dark ? MungColors.surfaceDark : MungColors.surface,
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: dark ? MungColors.bgDark : MungColors.bg,
    appBarTheme: AppBarTheme(
      backgroundColor: dark ? MungColors.bgDark : MungColors.bg,
      foregroundColor: dark ? MungColors.inkDark : MungColors.ink,
      elevation: 0,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      color: dark ? MungColors.surfaceDark : MungColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: dark ? MungColors.surface2Dark : MungColors.surface2),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: dark ? MungColors.brandDark : MungColors.brand,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: dark ? MungColors.surfaceDark : MungColors.surface,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: dark ? MungColors.surface2Dark : MungColors.surface2),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: dark ? MungColors.surface2Dark : MungColors.surface2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    ),
  );
}
