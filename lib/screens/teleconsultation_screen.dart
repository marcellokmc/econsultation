import 'package:flutter/material.dart';

import '../models/user.dart';
import '../theme/app_theme.dart';

class _ChatMessage {
  final String text;
  final bool isDoctor;
  final String time;
  _ChatMessage(this.text, {required this.isDoctor, required this.time});
}

class TeleconsultationScreen extends StatefulWidget {
  final User? doctor;
  final User? patient;

  const TeleconsultationScreen({super.key, this.doctor, this.patient});

  @override
  State<TeleconsultationScreen> createState() => _TeleconsultationScreenState();
}

class _TeleconsultationScreenState extends State<TeleconsultationScreen> {
  final _msgCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  bool _micOn = true;
  bool _camOn = true;

  late final List<_ChatMessage> _messages;

  @override
  void initState() {
    super.initState();
    final doctorName = widget.doctor?.name ?? 'Médecin';
    final patientName = widget.patient?.name ?? 'Patient';
    _messages = [
      _ChatMessage('Bonjour $patientName, je suis prêt pour la consultation.',
          isDoctor: true, time: '09:00'),
      _ChatMessage('Bonjour Docteur, merci de me recevoir.',
          isDoctor: false, time: '09:01'),
      _ChatMessage('Pouvez-vous me décrire vos symptômes depuis quand exactement ?',
          isDoctor: true, time: '09:01'),
      _ChatMessage('Depuis environ 3 jours, j\'ai des douleurs abdominales et de la fièvre.',
          isDoctor: false, time: '09:02'),
      _ChatMessage('Je comprends. Avez-vous pris des médicaments récemment ?',
          isDoctor: true, time: '09:02'),
    ];
    // ignore: unused_local_variable
    final _ = doctorName; // utilisé dans le nom du médecin affiché
  }

  @override
  void dispose() {
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _sendMessage() {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _messages.add(_ChatMessage(text, isDoctor: false,
          time: TimeOfDay.now().format(context)));
      _msgCtrl.clear();
    });
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _endCall() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Terminer la consultation ?'),
        content: const Text('La session de téléconsultation sera fermée.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annuler')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pop(context);
            },
            child: const Text('Terminer'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final doctorName = widget.doctor?.name ?? 'Dr. Médecin';
    final doctorInitials = widget.doctor?.initials ?? 'DR';
    final doctorSpecialty = widget.doctor?.specialty ?? 'Médecin';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        flexibleSpace: Container(decoration: AppDecorations.gradientPrimary),
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        title: const Text('Téléconsultation'),
        actions: [
          IconButton(
            icon: const Icon(Icons.call_end_rounded, color: Colors.white),
            style: IconButton.styleFrom(
              backgroundColor: AppColors.error,
              shape: const CircleBorder(),
            ),
            onPressed: _endCall,
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // ── Vidéo médecin ──────────────────────────────────────────────
          Container(
            height: MediaQuery.of(context).size.height * 0.28,
            width: double.infinity,
            color: const Color(0xFF1A2A3A),
            child: Stack(
              children: [
                // Fond caméra simulée (pattern grille légère)
                Positioned.fill(
                  child: CustomPaint(painter: _GridPainter()),
                ),
                // Avatar médecin centré
                Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          color: AppColors.avatarColor(
                              widget.doctor?.id ?? 'doc1'),
                          shape: BoxShape.circle,
                          border: Border.all(
                              color: Colors.white.withValues(alpha: 0.3),
                              width: 2),
                        ),
                        child: Center(
                          child: Text(doctorInitials,
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 26)),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(doctorName,
                          style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize: 15)),
                      Text(doctorSpecialty,
                          style: const TextStyle(
                              color: Colors.white60, fontSize: 12)),
                    ],
                  ),
                ),
                // Badge "En direct"
                Positioned(
                  top: 12,
                  left: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.error,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.circle, color: Colors.white, size: 8),
                        SizedBox(width: 5),
                        Text('EN DIRECT',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.5)),
                      ],
                    ),
                  ),
                ),
                // Miniature caméra patient (coin bas-droit)
                Positioned(
                  bottom: 12,
                  right: 12,
                  child: Container(
                    width: 72,
                    height: 90,
                    decoration: BoxDecoration(
                      color: const Color(0xFF2D3F52),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                          color: Colors.white.withValues(alpha: 0.2)),
                    ),
                    child: const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.person_rounded,
                            color: Colors.white54, size: 28),
                        SizedBox(height: 4),
                        Text('Vous',
                            style: TextStyle(
                                color: Colors.white54, fontSize: 10)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── Contrôles appel ───────────────────────────────────────────
          Container(
            color: const Color(0xFF0F1D2C),
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 24),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _CallControl(
                  icon: _micOn ? Icons.mic_rounded : Icons.mic_off_rounded,
                  label: _micOn ? 'Micro' : 'Muet',
                  active: _micOn,
                  onTap: () => setState(() => _micOn = !_micOn),
                ),
                _CallControl(
                  icon: _camOn
                      ? Icons.videocam_rounded
                      : Icons.videocam_off_rounded,
                  label: _camOn ? 'Caméra' : 'Caméra Off',
                  active: _camOn,
                  onTap: () => setState(() => _camOn = !_camOn),
                ),
                _CallControl(
                  icon: Icons.call_end_rounded,
                  label: 'Quitter',
                  active: false,
                  isEndCall: true,
                  onTap: _endCall,
                ),
              ],
            ),
          ),

          // ── Chat en direct ────────────────────────────────────────────
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            color: Colors.white,
            child: const Row(
              children: [
                Icon(Icons.chat_bubble_outline_rounded,
                    size: 16, color: AppColors.primary),
                SizedBox(width: 6),
                Text('Chat en direct',
                    style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: AppColors.textPrimary)),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: ListView.builder(
              controller: _scrollCtrl,
              padding: const EdgeInsets.all(12),
              itemCount: _messages.length,
              itemBuilder: (_, i) => _MessageBubble(msg: _messages[i]),
            ),
          ),

          // ── Zone de saisie ────────────────────────────────────────────
          Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: AppColors.divider)),
            ),
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _msgCtrl,
                    style: const TextStyle(fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Tapez votre message...',
                      filled: true,
                      fillColor: AppColors.background,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 10),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: _sendMessage,
                  child: Container(
                    width: 42,
                    height: 42,
                    decoration: const BoxDecoration(
                        color: AppColors.primary, shape: BoxShape.circle),
                    child: const Icon(Icons.send_rounded,
                        color: Colors.white, size: 20),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CallControl extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final bool isEndCall;
  final VoidCallback onTap;

  const _CallControl({
    required this.icon,
    required this.label,
    required this.active,
    required this.onTap,
    this.isEndCall = false,
  });

  @override
  Widget build(BuildContext context) {
    final bg = isEndCall
        ? AppColors.error
        : active
            ? Colors.white.withValues(alpha: 0.15)
            : Colors.white.withValues(alpha: 0.05);
    final iconColor = isEndCall
        ? Colors.white
        : active
            ? Colors.white
            : Colors.white38;

    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          const SizedBox(height: 4),
          Text(label,
              style: TextStyle(
                  color: isEndCall ? Colors.white70 : Colors.white54,
                  fontSize: 10)),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final _ChatMessage msg;
  const _MessageBubble({required this.msg});

  @override
  Widget build(BuildContext context) {
    final isDoctor = msg.isDoctor;
    return Align(
      alignment: isDoctor ? Alignment.centerLeft : Alignment.centerRight,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.72),
        padding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isDoctor ? AppColors.primaryLight : AppColors.accentLight,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isDoctor ? 4 : 16),
            bottomRight: Radius.circular(isDoctor ? 16 : 4),
          ),
        ),
        child: Column(
          crossAxisAlignment:
              isDoctor ? CrossAxisAlignment.start : CrossAxisAlignment.end,
          children: [
            Text(
              isDoctor ? 'Médecin' : 'Vous',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: isDoctor ? AppColors.primary : AppColors.accentDark,
              ),
            ),
            const SizedBox(height: 3),
            Text(msg.text,
                style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textPrimary,
                    height: 1.4)),
            const SizedBox(height: 3),
            Text(msg.time,
                style: const TextStyle(
                    fontSize: 10, color: AppColors.textHint)),
          ],
        ),
      ),
    );
  }
}

// Grille légère en arrière-plan de la vidéo simulée
class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.03)
      ..strokeWidth = 1;
    const step = 40.0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(_) => false;
}
