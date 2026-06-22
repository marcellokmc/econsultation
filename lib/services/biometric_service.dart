import 'package:local_auth/local_auth.dart';

class BiometricService {
  static final _auth = LocalAuthentication();

  static Future<bool> isAvailable() async {
    try {
      // isDeviceSupported() est vrai dès que l'appareil a un verrouillage d'écran
      // (PIN, schéma ou biométrie). biometricOnly:false dans authenticate() permet
      // le fallback PIN — donc pas besoin d'un capteur biométrique inscrit.
      return await _auth.isDeviceSupported();
    } catch (_) {
      return false;
    }
  }

  static Future<bool> authenticate() async {
    try {
      return await _auth.authenticate(
        localizedReason: 'Identifiez-vous pour accéder à eConsultation',
        options: const AuthenticationOptions(
          biometricOnly: false,
          stickyAuth: true,
        ),
      );
    } catch (_) {
      return false;
    }
  }
}
