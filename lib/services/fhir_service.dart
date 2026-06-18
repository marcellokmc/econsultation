import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../models/user.dart';

class FhirPatient {
  final String fhirId;
  final String nom;
  final String prenom;
  final String? dateNaissance;
  final String? genre;
  final String? telephone;

  FhirPatient({
    required this.fhirId,
    required this.nom,
    required this.prenom,
    this.dateNaissance,
    this.genre,
    this.telephone,
  });

  String get nomComplet => '$prenom $nom';

  factory FhirPatient.fromJson(Map<String, dynamic> json) {
    String nom = '';
    String prenom = '';
    final names = json['name'] as List<dynamic>?;
    if (names != null && names.isNotEmpty) {
      final n = names.first as Map<String, dynamic>;
      nom = n['family'] as String? ?? '';
      final givens = n['given'] as List<dynamic>?;
      prenom = givens?.isNotEmpty == true ? givens!.first as String : '';
    }

    String? tel;
    final telecoms = json['telecom'] as List<dynamic>?;
    if (telecoms != null) {
      final phone = telecoms.firstWhere(
        (t) => (t as Map)['system'] == 'phone',
        orElse: () => null,
      );
      if (phone != null) tel = (phone as Map)['value'] as String?;
    }

    return FhirPatient(
      fhirId: json['id'] as String? ?? '',
      nom: nom,
      prenom: prenom,
      dateNaissance: json['birthDate'] as String?,
      genre: json['gender'] as String?,
      telephone: tel,
    );
  }

  // Sérialise vers un resource FHIR Patient
  static Map<String, dynamic> fromUser(User user) => {
        'resourceType': 'Patient',
        'name': [
          {
            'family': user.name.split(' ').last,
            'given': [user.name.split(' ').first],
          }
        ],
        'telecom': [
          {'system': 'phone', 'value': user.phone},
          {'system': 'email', 'value': user.email},
        ],
      };
}

class FhirService {
  static const _base = 'https://hapi.fhir.org/baseR4';
  static const _timeout = Duration(seconds: 10);
  static const _headers = {
    'Content-Type': 'application/fhir+json',
    'Accept': 'application/fhir+json',
  };

  static bool _lastOnline = true;
  static bool get isOnline => _lastOnline;

  // Vérifie que le serveur FHIR est joignable
  static Future<bool> ping() async {
    try {
      final res = await http
          .get(Uri.parse('$_base/metadata'), headers: _headers)
          .timeout(_timeout);
      _lastOnline = res.statusCode == 200;
      return _lastOnline;
    } catch (_) {
      _lastOnline = false;
      return false;
    }
  }

  // GET /Patient?_count=10 — liste les 10 premiers patients FHIR
  static Future<List<FhirPatient>> searchPatients({int count = 10}) async {
    try {
      final uri = Uri.parse('$_base/Patient?_count=$count&_format=json');
      final res = await http.get(uri, headers: _headers).timeout(_timeout);

      if (res.statusCode != 200) return [];
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      final entries = body['entry'] as List<dynamic>?;
      if (entries == null) return [];

      return entries
          .map((e) => FhirPatient.fromJson(
              (e as Map<String, dynamic>)['resource'] as Map<String, dynamic>))
          .where((p) => p.nom.isNotEmpty)
          .toList();
    } catch (e) {
      if (kDebugMode) debugPrint('[FHIR] searchPatients error: $e');
      return [];
    }
  }

  // GET /Patient/{id}
  static Future<FhirPatient?> getPatient(String id) async {
    try {
      final res = await http
          .get(Uri.parse('$_base/Patient/$id?_format=json'), headers: _headers)
          .timeout(_timeout);
      if (res.statusCode == 200) {
        return FhirPatient.fromJson(
            jsonDecode(res.body) as Map<String, dynamic>);
      }
      return null;
    } catch (e) {
      if (kDebugMode) debugPrint('[FHIR] getPatient error: $e');
      return null;
    }
  }

  // POST /Patient — crée un patient sur le serveur FHIR
  static Future<String?> createPatient(User user) async {
    try {
      final res = await http
          .post(
            Uri.parse('$_base/Patient'),
            headers: _headers,
            body: jsonEncode(FhirPatient.fromUser(user)),
          )
          .timeout(_timeout);

      if (res.statusCode == 201) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        return body['id'] as String?;
      }
      return null;
    } catch (e) {
      if (kDebugMode) debugPrint('[FHIR] createPatient error: $e');
      return null;
    }
  }
}
