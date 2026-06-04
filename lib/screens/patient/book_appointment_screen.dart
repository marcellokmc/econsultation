import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/appointment.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_provider.dart';
import '../../theme/app_theme.dart';
import '../../utils/date_helper.dart';

class BookAppointmentScreen extends StatefulWidget {
  const BookAppointmentScreen({super.key});

  @override
  State<BookAppointmentScreen> createState() =>
      _BookAppointmentScreenState();
}

class _BookAppointmentScreenState extends State<BookAppointmentScreen> {
  int _step = 0;
  String? _selectedDoctorId;
  DateTime? _selectedDate;
  String? _selectedSlot;
  String _reason = '';
  String? _reasonChip;
  final _reasonCtrl = TextEditingController();

  static const _slots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  ];

  static const _reasonChips = [
    'Consultation générale',
    'Renouvellement ordonnance',
    'Bilan de santé',
    'Douleurs',
    'Fièvre / infection',
    'Suivi chronique',
    'Autre',
  ];

  @override
  void dispose() {
    _reasonCtrl.dispose();
    super.dispose();
  }

  List<DateTime> _getNextDays() {
    final days = <DateTime>[];
    var d = DateTime.now();
    while (days.length < 8) {
      days.add(DateTime(d.year, d.month, d.day));
      d = d.add(const Duration(days: 1));
    }
    return days;
  }

  void _confirm() {
    if (_selectedDoctorId == null ||
        _selectedDate == null ||
        _selectedSlot == null) {
      return;
    }

    final parts = _selectedSlot!.split(':');
    final dt = DateTime(
      _selectedDate!.year,
      _selectedDate!.month,
      _selectedDate!.day,
      int.parse(parts[0]),
      int.parse(parts[1]),
    );
    final finalReason = _reasonChip != null
        ? (_reason.isNotEmpty ? '$_reasonChip — $_reason' : _reasonChip!)
        : (_reason.isNotEmpty ? _reason : 'Consultation générale');

    final patientId = context.read<AuthProvider>().currentUser!.id;
    final appt = Appointment(
      id: 'apt_${DateTime.now().millisecondsSinceEpoch}',
      patientId: patientId,
      doctorId: _selectedDoctorId!,
      dateTime: dt,
      reason: finalReason,
      status: AppointmentStatus.pending,
    );

    context.read<DataProvider>().addAppointment(appt);
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Row(children: [
          Icon(Icons.check_circle_rounded, color: Colors.white),
          SizedBox(width: 10),
          Text('Rendez-vous pris avec succès !',
              style: TextStyle(fontWeight: FontWeight.w500)),
        ]),
        backgroundColor: AppColors.success,
        behavior: SnackBarBehavior.floating,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        margin: const EdgeInsets.all(12),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        flexibleSpace: Container(decoration: AppDecorations.gradientPrimary),
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        title: const Text('Prendre un rendez-vous'),
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Column(
        children: [
          // Step progress
          _StepIndicator(currentStep: _step),
          // Content
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              child: _step == 0
                  ? _StepDoctor(
                      key: const ValueKey(0),
                      selectedId: _selectedDoctorId,
                      onSelect: (id) =>
                          setState(() => _selectedDoctorId = id),
                    )
                  : _step == 1
                      ? _StepDateTime(
                          key: const ValueKey(1),
                          doctorId: _selectedDoctorId!,
                          selectedDate: _selectedDate,
                          selectedSlot: _selectedSlot,
                          days: _getNextDays(),
                          slots: _slots,
                          onDateSelect: (d) =>
                              setState(() {
                                _selectedDate = d;
                                _selectedSlot = null;
                              }),
                          onSlotSelect: (s) =>
                              setState(() => _selectedSlot = s),
                        )
                      : _StepReason(
                          key: const ValueKey(2),
                          chips: _reasonChips,
                          selectedChip: _reasonChip,
                          controller: _reasonCtrl,
                          onChipSelect: (c) =>
                              setState(() => _reasonChip = c),
                          onReasonChanged: (v) => _reason = v,
                        ),
            ),
          ),
          // Bottom navigation
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            decoration: const BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                    color: Color(0x10000000),
                    blurRadius: 12,
                    offset: Offset(0, -4))
              ],
            ),
            child: Row(
              children: [
                if (_step > 0)
                  OutlinedButton(
                    onPressed: () => setState(() => _step--),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.divider),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Retour',
                        style: TextStyle(color: AppColors.textSecondary)),
                  ),
                if (_step > 0) const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _canProceed() ? _onNext : null,
                    child: Text(
                      _step < 2 ? 'Continuer' : 'Confirmer le rendez-vous',
                      style: const TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 15),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  bool _canProceed() {
    if (_step == 0) return _selectedDoctorId != null;
    if (_step == 1) return _selectedDate != null && _selectedSlot != null;
    return true;
  }

  void _onNext() {
    if (_step < 2) {
      setState(() => _step++);
    } else {
      _confirm();
    }
  }
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

class _StepIndicator extends StatelessWidget {
  final int currentStep;
  const _StepIndicator({required this.currentStep});

  @override
  Widget build(BuildContext context) {
    const labels = ['Médecin', 'Date & heure', 'Motif'];
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Row(
        children: List.generate(3, (i) {
          final done = i < currentStep;
          final active = i == currentStep;
          final color = done || active ? AppColors.primary : AppColors.textHint;
          return Expanded(
            child: Row(
              children: [
                Column(
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: done || active
                            ? AppColors.primary
                            : AppColors.background,
                        shape: BoxShape.circle,
                        border: Border.all(color: color, width: 2),
                      ),
                      child: Center(
                        child: done
                            ? const Icon(Icons.check_rounded,
                                color: Colors.white, size: 14)
                            : Text('${i + 1}',
                                style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: active
                                        ? Colors.white
                                        : AppColors.textHint)),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(labels[i],
                        style: TextStyle(
                            fontSize: 10,
                            color: color,
                            fontWeight: active
                                ? FontWeight.w600
                                : FontWeight.w400)),
                  ],
                ),
                if (i < 2)
                  Expanded(
                    child: Container(
                      height: 2,
                      margin: const EdgeInsets.only(bottom: 18),
                      color: i < currentStep
                          ? AppColors.primary
                          : AppColors.divider,
                    ),
                  ),
              ],
            ),
          );
        }),
      ),
    );
  }
}

// ─── Step 1: Doctor ───────────────────────────────────────────────────────────

class _StepDoctor extends StatelessWidget {
  final String? selectedId;
  final ValueChanged<String> onSelect;
  const _StepDoctor(
      {super.key, required this.selectedId, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final doctors = auth.doctors;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Choisissez un médecin',
            style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 18,
                color: AppColors.textPrimary)),
        const SizedBox(height: 6),
        const Text('Sélectionnez le médecin pour votre consultation',
            style:
                TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        const SizedBox(height: 20),
        ...doctors.map((d) {
          final selected = d.id == selectedId;
          return GestureDetector(
            onTap: () => onSelect(d.id),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: selected ? AppColors.primaryLight : Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color:
                      selected ? AppColors.primary : AppColors.divider,
                  width: selected ? 2 : 1,
                ),
                boxShadow: selected
                    ? [
                        BoxShadow(
                            color:
                                AppColors.primary.withValues(alpha: 0.15),
                            blurRadius: 12,
                            offset: const Offset(0, 4))
                      ]
                    : const [
                        BoxShadow(
                            color: Color(0x0A000000),
                            blurRadius: 8,
                            offset: Offset(0, 2))
                      ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: AppColors.avatarColor(d.id),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(d.initials,
                          style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 18)),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(d.name,
                            style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                                color: AppColors.textPrimary)),
                        if (d.specialty != null)
                          Text(d.specialty!,
                              style: const TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 12)),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            if (d.rating != null) ...[
                              const Icon(Icons.star_rounded,
                                  color: Color(0xFFFFC107), size: 14),
                              const SizedBox(width: 3),
                              Text('${d.rating}',
                                  style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textPrimary)),
                              const SizedBox(width: 10),
                            ],
                            if (d.experienceYears != null) ...[
                              const Icon(Icons.work_outline_rounded,
                                  size: 12, color: AppColors.textHint),
                              const SizedBox(width: 3),
                              Text('${d.experienceYears} ans exp.',
                                  style: const TextStyle(
                                      fontSize: 11,
                                      color: AppColors.textHint)),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                  Container(
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(
                      color: selected ? AppColors.primary : Colors.white,
                      shape: BoxShape.circle,
                      border: Border.all(
                          color: selected
                              ? AppColors.primary
                              : AppColors.divider,
                          width: 2),
                    ),
                    child: selected
                        ? const Icon(Icons.check_rounded,
                            color: Colors.white, size: 12)
                        : null,
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }
}

// ─── Step 2: Date & Time ─────────────────────────────────────────────────────

class _StepDateTime extends StatelessWidget {
  final String doctorId;
  final DateTime? selectedDate;
  final String? selectedSlot;
  final List<DateTime> days;
  final List<String> slots;
  final ValueChanged<DateTime> onDateSelect;
  final ValueChanged<String> onSlotSelect;

  const _StepDateTime({
    super.key,
    required this.doctorId,
    required this.selectedDate,
    required this.selectedSlot,
    required this.days,
    required this.slots,
    required this.onDateSelect,
    required this.onSlotSelect,
  });

  @override
  Widget build(BuildContext context) {
    final data = context.read<DataProvider>();
    final takenSlots = selectedDate != null
        ? data.getTakenSlots(doctorId, selectedDate!)
        : <String>{};

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Choisissez une date',
            style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 18,
                color: AppColors.textPrimary)),
        const SizedBox(height: 16),
        SizedBox(
          height: 80,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: days.length,
            separatorBuilder: (_, _) => const SizedBox(width: 8),
            itemBuilder: (_, i) {
              final d = days[i];
              final sel = selectedDate != null &&
                  DateHelper.isSameDay(d, selectedDate!);
              final isToday = DateHelper.isToday(d);
              return GestureDetector(
                onTap: () => onDateSelect(d),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 60,
                  decoration: BoxDecoration(
                    color: sel ? AppColors.primary : Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: sel
                            ? AppColors.primary
                            : isToday
                                ? AppColors.primary.withValues(alpha: 0.4)
                                : AppColors.divider),
                    boxShadow: sel
                        ? [
                            BoxShadow(
                                color: AppColors.primary
                                    .withValues(alpha: 0.25),
                                blurRadius: 8,
                                offset: const Offset(0, 3))
                          ]
                        : null,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(DateHelper.weekdayShort(d),
                          style: TextStyle(
                              fontSize: 10,
                              color: sel ? Colors.white70 : AppColors.textHint,
                              fontWeight: FontWeight.w500)),
                      const SizedBox(height: 4),
                      Text('${d.day}',
                          style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: sel ? Colors.white : AppColors.textPrimary)),
                      if (isToday)
                        Text('Auj.',
                            style: TextStyle(
                                fontSize: 9,
                                color: sel
                                    ? Colors.white70
                                    : AppColors.primary,
                                fontWeight: FontWeight.w500)),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        if (selectedDate != null) ...[
          const SizedBox(height: 24),
          const Text('Créneaux disponibles',
              style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 18,
                  color: AppColors.textPrimary)),
          const SizedBox(height: 4),
          Text(DateHelper.formatDayMonth(selectedDate!),
              style: const TextStyle(
                  color: AppColors.textSecondary, fontSize: 13)),
          const SizedBox(height: 14),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 2.4,
            ),
            itemCount: slots.length,
            itemBuilder: (_, i) {
              final slot = slots[i];
              final taken = takenSlots.contains(slot);
              final sel = slot == selectedSlot;
              return GestureDetector(
                onTap: taken ? null : () => onSlotSelect(slot),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  decoration: BoxDecoration(
                    color: taken
                        ? AppColors.background
                        : sel
                            ? AppColors.primary
                            : Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: taken
                          ? AppColors.divider
                          : sel
                              ? AppColors.primary
                              : AppColors.divider,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      slot,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: taken
                            ? AppColors.textHint
                            : sel
                                ? Colors.white
                                : AppColors.textPrimary,
                        decoration: taken
                            ? TextDecoration.lineThrough
                            : null,
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ],
    );
  }
}

// ─── Step 3: Reason ───────────────────────────────────────────────────────────

class _StepReason extends StatelessWidget {
  final List<String> chips;
  final String? selectedChip;
  final TextEditingController controller;
  final ValueChanged<String> onChipSelect;
  final ValueChanged<String> onReasonChanged;

  const _StepReason({
    super.key,
    required this.chips,
    required this.selectedChip,
    required this.controller,
    required this.onChipSelect,
    required this.onReasonChanged,
  });

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Motif de consultation',
            style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 18,
                color: AppColors.textPrimary)),
        const SizedBox(height: 6),
        const Text('Décrivez brièvement la raison de votre visite',
            style:
                TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        const SizedBox(height: 20),
        Wrap(
          spacing: 8,
          runSpacing: 10,
          children: chips.map((c) {
            final sel = c == selectedChip;
            return GestureDetector(
              onTap: () => onChipSelect(c),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: sel ? AppColors.primary : Colors.white,
                  borderRadius: BorderRadius.circular(25),
                  border: Border.all(
                      color:
                          sel ? AppColors.primary : AppColors.divider),
                  boxShadow: sel
                      ? [
                          BoxShadow(
                              color: AppColors.primary
                                  .withValues(alpha: 0.2),
                              blurRadius: 8,
                              offset: const Offset(0, 3))
                        ]
                      : null,
                ),
                child: Text(c,
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: sel
                            ? FontWeight.w600
                            : FontWeight.w400,
                        color: sel
                            ? Colors.white
                            : AppColors.textPrimary)),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 24),
        const Text('Précisions (optionnel)',
            style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 14,
                color: AppColors.textPrimary)),
        const SizedBox(height: 10),
        TextField(
          controller: controller,
          onChanged: onReasonChanged,
          maxLines: 4,
          decoration: const InputDecoration(
            hintText: 'Décrivez vos symptômes ou questions…',
            alignLabelWithHint: true,
          ),
        ),
        const SizedBox(height: 20),
      ],
    );
  }
}
