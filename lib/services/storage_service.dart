import 'dart:convert';
import 'dart:math';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hive_flutter/hive_flutter.dart';

class StorageService {
  static const _keyName = 'hive_aes_key';
  static const _sessionBox = 'session';
  static const _settingsBox = 'settings';
  static const _sessionUserId = 'userId';
  static const _privacyKey = 'privacy_accepted';
  static const _consentDateKey = 'consent_date';

  static late Box _session;
  static late Box _settings;

  static Future<void> init() async {
    await Hive.initFlutter();

    const secureStorage = FlutterSecureStorage(
      aOptions: AndroidOptions(encryptedSharedPreferences: true),
    );

    // Récupérer ou générer la clé AES 256 bits
    String? keyString = await secureStorage.read(key: _keyName);
    if (keyString == null) {
      final rng = Random.secure();
      final keyBytes = List<int>.generate(32, (_) => rng.nextInt(256));
      keyString = base64Url.encode(keyBytes);
      await secureStorage.write(key: _keyName, value: keyString);
    }

    final encryptionKey = base64Url.decode(keyString);
    final cipher = HiveAesCipher(encryptionKey);

    _session = await Hive.openBox(_sessionBox, encryptionCipher: cipher);
    _settings = await Hive.openBox(_settingsBox, encryptionCipher: cipher);
  }

  // ── Session utilisateur ──────────────────────────────────────────────────────

  static Future<void> saveSession(String userId) async {
    await _session.put(_sessionUserId, userId);
  }

  static String? getSession() {
    return _session.get(_sessionUserId) as String?;
  }

  static Future<void> clearSession() async {
    await _session.delete(_sessionUserId);
  }

  // ── Consentement RGPD ────────────────────────────────────────────────────────

  static bool isPrivacyAccepted() {
    return _settings.get(_privacyKey, defaultValue: false) as bool;
  }

  static Future<void> acceptPrivacy() async {
    await _settings.put(_privacyKey, true);
    await _settings.put(_consentDateKey, DateTime.now().toIso8601String());
  }

  static DateTime? get consentDate {
    final s = _settings.get(_consentDateKey) as String?;
    return s != null ? DateTime.tryParse(s) : null;
  }

  // Efface toutes les données locales (RGPD — droit à l'oubli)
  static Future<void> clearAll() async {
    await _session.clear();
    await _settings.clear();
  }
}
