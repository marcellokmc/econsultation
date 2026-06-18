import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

import 'fhir_service.dart';

// Service de synchronisation offline/online.
// Surveille la connectivité et tente de synchroniser les données en attente
// dès que la connexion est rétablie.
class SyncService extends ChangeNotifier {
  bool _isOnline = false;
  bool _isSyncing = false;
  int _pendingCount = 0;
  DateTime? _lastSync;

  bool get isOnline => _isOnline;
  bool get isSyncing => _isSyncing;
  int get pendingCount => _pendingCount;
  DateTime? get lastSync => _lastSync;

  String get statusLabel {
    if (_isSyncing) return 'Synchronisation…';
    if (!_isOnline) {
      return _pendingCount > 0
          ? 'Hors ligne — $_pendingCount donnée(s) en attente'
          : 'Hors ligne';
    }
    if (_lastSync != null) {
      final m = DateTime.now().difference(_lastSync!).inMinutes;
      return m < 1 ? 'Synchronisé' : 'Synchronisé il y a ${m}min';
    }
    return 'En ligne';
  }

  SyncService() {
    _init();
  }

  Future<void> _init() async {
    // Vérification initiale
    await _checkConnectivity();

    // Écoute les changements de connectivité
    Connectivity().onConnectivityChanged.listen((results) async {
      final wasOffline = !_isOnline;
      _isOnline = results.any((r) => r != ConnectivityResult.none);
      notifyListeners();

      // Déclenche la sync automatique quand on repasse en ligne
      if (wasOffline && _isOnline && _pendingCount > 0) {
        await syncNow();
      }
    });
  }

  Future<void> _checkConnectivity() async {
    final results = await Connectivity().checkConnectivity();
    _isOnline = results.any((r) => r != ConnectivityResult.none);
    if (_isOnline) {
      _isOnline = await FhirService.ping();
    }
    notifyListeners();
  }

  // Ajoute une donnée en attente de synchronisation
  void markPending() {
    _pendingCount++;
    notifyListeners();
  }

  // Synchronisation manuelle ou automatique
  Future<void> syncNow() async {
    if (_isSyncing || !_isOnline) return;
    _isSyncing = true;
    notifyListeners();

    try {
      // Vérifie la connectivité FHIR
      _isOnline = await FhirService.ping();
      if (_isOnline && _pendingCount > 0) {
        // Simule la synchronisation des données en attente
        await Future.delayed(const Duration(seconds: 1));
        _pendingCount = 0;
        _lastSync = DateTime.now();
      }
    } catch (e) {
      if (kDebugMode) debugPrint('[Sync] error: $e');
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }

  // Vérifie si l'appareil peut atteindre le serveur FHIR
  Future<void> refresh() async {
    await _checkConnectivity();
  }
}
