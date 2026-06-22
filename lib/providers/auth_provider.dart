import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/storage_service.dart';

class AuthProvider extends ChangeNotifier {
  User? _currentUser;

  // Liste modifiable pour permettre la gestion CRUD des patients par les médecins
  final List<User> _users = [
    // ── Équipe de développement — médecins (dans l'ordre) ──
    User(
      id: 'doc1',
      name: 'Dr. BADINI Ousmane',
      email: 'ousmane@medecin.bf',
      password: 'doctor123',
      role: UserRole.doctor,
      phone: '70 11 22 33 44',
      specialty: 'Médecin Généraliste',
      rating: 4.9,
      experienceYears: 12,
    ),
    User(
      id: 'doc2',
      name: 'Dr. KABORE Issa',
      email: 'issa@medecin.bf',
      password: 'doctor123',
      role: UserRole.doctor,
      phone: '76 22 33 44 55',
      specialty: 'Cardiologue',
      rating: 4.8,
      experienceYears: 10,
    ),
    User(
      id: 'doc3',
      name: 'Dr. SAWADOGO Maurice',
      email: 'maurice@medecin.bf',
      password: 'doctor123',
      role: UserRole.doctor,
      phone: '65 33 44 55 66',
      specialty: 'Pédiatre',
      rating: 4.8,
      experienceYears: 8,
    ),
    User(
      id: 'doc4',
      name: 'Dr. SAWADOGO Marcel',
      email: 'marcel@medecin.bf',
      password: 'doctor123',
      role: UserRole.doctor,
      phone: '74 44 55 66 77',
      specialty: 'Chirurgien Général',
      rating: 4.7,
      experienceYears: 9,
    ),
    // ── Patients ──
    User(
      id: 'pat1',
      name: 'NIKIEMA Lebian',
      email: 'lebian@patient.bf',
      password: 'patient123',
      role: UserRole.patient,
      phone: '70 55 66 77 88',
    ),
    User(
      id: 'pat2',
      name: 'OUEDRAOGO Moussa',
      email: 'moussa@patient.bf',
      password: 'patient123',
      role: UserRole.patient,
      phone: '76 66 77 88 99',
    ),
    User(
      id: 'pat3',
      name: 'BELEM Issa',
      email: 'belem@patient.bf',
      password: 'patient123',
      role: UserRole.patient,
      phone: '65 77 88 99 00',
    ),
    User(
      id: 'pat4',
      name: 'DRABO Aïssata',
      email: 'aissata@patient.bf',
      password: 'patient123',
      role: UserRole.patient,
      phone: '74 88 99 00 11',
    ),
    User(
      id: 'pat5',
      name: 'NEBIE Souleymane',
      email: 'souleymane@patient.bf',
      password: 'patient123',
      role: UserRole.patient,
      phone: '70 99 00 11 22',
    ),
    User(
      id: 'pat6',
      name: 'TRAORE Aminata',
      email: 'aminata.traore@patient.bf',
      password: 'patient123',
      role: UserRole.patient,
      phone: '70 12 11 22 33',
    ),
    User(
      id: 'pat7',
      name: 'COMPAORE Rasmane',
      email: 'rasmane.compaore@patient.bf',
      password: 'patient123',
      role: UserRole.patient,
      phone: '76 23 34 45 56',
    ),
    User(
      id: 'pat8',
      name: 'SOME Victorine',
      email: 'victorine.some@patient.bf',
      password: 'patient123',
      role: UserRole.patient,
      phone: '65 34 45 56 67',
    ),
    User(
      id: 'pat9',
      name: 'ZONGO Adama',
      email: 'adama.zongo@patient.bf',
      password: 'patient123',
      role: UserRole.patient,
      phone: '74 45 56 67 78',
    ),
    User(
      id: 'pat10',
      name: 'OUATTARA Mariam',
      email: 'mariam.ouattara@patient.bf',
      password: 'patient123',
      role: UserRole.patient,
      phone: '70 56 67 78 89',
    ),
    User(
      id: 'pat11',
      name: 'DAO Brahima',
      email: 'brahima.dao@patient.bf',
      password: 'patient123',
      role: UserRole.patient,
      phone: '76 67 78 89 90',
    ),
    User(
      id: 'pat12',
      name: 'COULIBALY Fatoumata',
      email: 'fatoumata.coulibaly@patient.bf',
      password: 'patient123',
      role: UserRole.patient,
      phone: '65 78 89 90 01',
    ),
    User(
      id: 'pat13',
      name: 'BONKOUNGOU Roger',
      email: 'roger.bonkoungou@patient.bf',
      password: 'patient123',
      role: UserRole.patient,
      phone: '74 89 90 01 12',
    ),
    User(
      id: 'pat14',
      name: 'ILBOUDO Germaine',
      email: 'germaine.ilboudo@patient.bf',
      password: 'patient123',
      role: UserRole.patient,
      phone: '70 90 01 12 23',
    ),
    User(
      id: 'pat15',
      name: 'KABORE Etienne',
      email: 'etienne.kabore@patient.bf',
      password: 'patient123',
      role: UserRole.patient,
      phone: '76 01 12 23 34',
    ),
  ];

  User? get currentUser => _currentUser;
  bool get isLoggedIn => _currentUser != null;

  bool login(String email, String password) {
    final matches = _users.where(
      (u) =>
          u.email.toLowerCase() == email.toLowerCase().trim() &&
          u.password == password,
    );
    if (matches.isNotEmpty) {
      _currentUser = matches.first;
      StorageService.saveSession(_currentUser!.id);
      notifyListeners();
      return true;
    }
    return false;
  }

  void logout() {
    _currentUser = null;
    StorageService.clearSession();
    notifyListeners();
  }

  // Restaure la session depuis Hive (auto-login biométrique)
  bool restoreSession() {
    final savedId = StorageService.getSession();
    if (savedId == null) return false;
    final match = _users.where((u) => u.id == savedId);
    if (match.isEmpty) return false;
    _currentUser = match.first;
    notifyListeners();
    return true;
  }

  List<User> get doctors => _users.where((u) => u.isDoctor).toList();
  List<User> get patients => _users.where((u) => !u.isDoctor).toList();

  User? getUserById(String id) {
    final m = _users.where((u) => u.id == id);
    return m.isEmpty ? null : m.first;
  }

  // Vérifie si un email est déjà utilisé (excludeId pour ignorer l'utilisateur en cours d'édition)
  bool emailExists(String email, {String? excludeId}) {
    return _users.any(
      (u) =>
          u.email.toLowerCase() == email.toLowerCase() && u.id != excludeId,
    );
  }

  // Ajoute un nouveau patient dans le système
  void addUser(User user) {
    _users.add(user);
    notifyListeners();
  }

  // Met à jour les informations d'un utilisateur existant
  void updateUser(User updatedUser) {
    final idx = _users.indexWhere((u) => u.id == updatedUser.id);
    if (idx >= 0) {
      _users[idx] = updatedUser;
      // Mettre à jour la session si c'est l'utilisateur connecté
      if (_currentUser?.id == updatedUser.id) {
        _currentUser = updatedUser;
      }
      notifyListeners();
    }
  }

  // Supprime un patient (jamais un médecin, pour la sécurité)
  void deleteUser(String id) {
    _users.removeWhere((u) => u.id == id && !u.isDoctor);
    notifyListeners();
  }
}
