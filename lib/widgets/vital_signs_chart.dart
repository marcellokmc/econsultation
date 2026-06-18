import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../models/consultation.dart';
import '../theme/app_theme.dart';

enum VitalType { heartRate, temperature, weight }

class VitalSignsChart extends StatelessWidget {
  final List<Consultation> consultations;
  final VitalType type;

  const VitalSignsChart({
    super.key,
    required this.consultations,
    this.type = VitalType.heartRate,
  });

  String get _label => switch (type) {
        VitalType.heartRate => 'Fréquence cardiaque (bpm)',
        VitalType.temperature => 'Température (°C)',
        VitalType.weight => 'Poids (kg)',
      };

  Color get _color => switch (type) {
        VitalType.heartRate => AppColors.error,
        VitalType.temperature => AppColors.warning,
        VitalType.weight => AppColors.primary,
      };

  IconData get _icon => switch (type) {
        VitalType.heartRate => Icons.favorite_rounded,
        VitalType.temperature => Icons.thermostat_rounded,
        VitalType.weight => Icons.monitor_weight_outlined,
      };

  List<Consultation> get _withData => consultations
      .where((c) => _value(c) != null)
      .toList()
    ..sort((a, b) => a.date.compareTo(b.date));

  double? _value(Consultation c) => switch (type) {
        VitalType.heartRate => c.heartRate?.toDouble(),
        VitalType.temperature => c.temperature,
        VitalType.weight => c.weight,
      };

  @override
  Widget build(BuildContext context) {
    final data = _withData;

    if (data.length < 2) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: AppDecorations.card,
        child: Row(
          children: [
            Icon(_icon, color: _color, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_label,
                      style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                          color: AppColors.textPrimary)),
                  const SizedBox(height: 2),
                  const Text('Pas assez de données pour afficher le graphique.',
                      style: TextStyle(
                          fontSize: 11, color: AppColors.textSecondary)),
                ],
              ),
            ),
          ],
        ),
      );
    }

    final spots = data.asMap().entries.map((e) {
      return FlSpot(e.key.toDouble(), _value(e.value)!);
    }).toList();

    final minY = spots.map((s) => s.y).reduce((a, b) => a < b ? a : b) - 5;
    final maxY = spots.map((s) => s.y).reduce((a, b) => a > b ? a : b) + 5;

    return Container(
      padding: const EdgeInsets.fromLTRB(12, 14, 16, 10),
      decoration: AppDecorations.card,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: _color.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(_icon, color: _color, size: 15),
              ),
              const SizedBox(width: 8),
              Text(_label,
                  style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                      color: AppColors.textPrimary)),
              const Spacer(),
              Text(
                spots.last.y.toStringAsFixed(type == VitalType.heartRate ? 0 : 1),
                style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                    color: _color),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 100,
            child: LineChart(
              LineChartData(
                minY: minY,
                maxY: maxY,
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: (maxY - minY) / 3,
                  getDrawingHorizontalLine: (_) => FlLine(
                    color: AppColors.divider,
                    strokeWidth: 1,
                  ),
                ),
                borderData: FlBorderData(show: false),
                titlesData: FlTitlesData(
                  leftTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 22,
                      interval: 1,
                      getTitlesWidget: (val, _) {
                        final idx = val.toInt();
                        if (idx < 0 || idx >= data.length) {
                          return const SizedBox.shrink();
                        }
                        final d = data[idx].date;
                        return Text(
                          '${d.day}/${d.month}',
                          style: const TextStyle(
                              fontSize: 9, color: AppColors.textHint),
                        );
                      },
                    ),
                  ),
                ),
                lineBarsData: [
                  LineChartBarData(
                    spots: spots,
                    isCurved: true,
                    color: _color,
                    barWidth: 2.5,
                    dotData: FlDotData(
                      show: true,
                      getDotPainter: (spot, xp, bar, idx) =>
                          FlDotCirclePainter(
                        radius: 3.5,
                        color: _color,
                        strokeWidth: 1.5,
                        strokeColor: Colors.white,
                      ),
                    ),
                    belowBarData: BarAreaData(
                      show: true,
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          _color.withValues(alpha: 0.20),
                          _color.withValues(alpha: 0.0),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
