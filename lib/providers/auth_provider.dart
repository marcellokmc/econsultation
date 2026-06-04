import 'package:flutter/material.dart';
import '../models/user.dart';

class AuthProvider extends ChangeNotifier {
  User? _currentUser;

  User? get currentUser => _currentUser;
  bool get isLoggedIn => _currentUser != null;

  static final List<User> _users = [
    User(
      id: 'doc1',
      name: 'Dr. Martin Dupont',
      email: 'dr.martin@econsult.fr',
      password: 'doctor123',
      role: UserRole.doctor,
      phone: '06 12 34 56 78',
      specialty: 'Médecin Généraliste',
      rating: 4.9,
      experienceYears: 15,
    ),
    User(
      id: 'doc2',
      name: 'Dr. Sophie Bernard',
      email: 'dr.sophie@econsult.fr',
      password: 'doctor123',
      role: UserRole.doctor,
      phone: '06 98 76 54 32',
      specialty: 'Cardiologue',
      rating: 4.8,
      experienceYears: 12,
    ),
    User(
      id: 'doc3',
      name: 'Dr. Pierre Nguyen',
      email: 'dr.pierre@econsult.fr',
      password: 'doctor123',
      role: UserRole.doctor,
      phone: '06 77 88 99 00',
      specialty: 'Pédiatre',
      rating: 4.7,
      experienceYears: 8,
    ),
    User(
      id: 'pat1',
      name: 'Jean Durand',
      email: 'jean.durand@email.fr',
      password: 'patient123',
      role: UserRole.patient,
      phone: '07 11 22 33 44',
    ),
    User(
      id: 'pat2',
      name: 'Marie Lambert',
      email: 'marie.lambert@email.fr',
      password: 'patient123',
      role: UserRole.patient,
      phone: '07 55 66 77 88',
    ),
    User(
      id: 'pat3',
      name: 'Pierre Martin',
      email: 'pierre.martin@email.fr',
      password: 'patient123',
      role: UserRole.patient,
      phone: '06 44 55 66 77',
    ),
    User(
      id: 'pat4',
      name: 'Isabelle Moreau',
      email: 'isabelle.moreau@email.fr',
      password: 'patient123',
      role: UserRole.patient,
      phone: '07 88 99 00 11',
    ),
    User(
      id: 'pat5',
      name: 'François Petit',
      email: 'francois.petit@email.fr',
      password: 'patient123',
      role: UserRole.patient,
      phone: '06 22 33 44 55',
    ),
  ];

  bool login(String email, String password) {
    final matches = _users.where(
      (u) =>
          u.email.toLowerCase() == email.toLowerCase().trim() &&
          u.password == password,
    );
    if (matches.isNotEmpty) {
      _currentUser = matches.first;
      notifyListeners();
      return true;
    }
    return false;
  }

  void logout() {
    _currentUser = null;
    notifyListeners();
  }

  List<User> get doctors => _users.where((u) => u.isDoctor).toList();
  List<User> get patients => _users.where((u) => !u.isDoctor).toList();

  User? getUserById(String id) {
    final m = _users.where((u) => u.id == id);
    return m.isEmpty ? null : m.first;
  }
}
