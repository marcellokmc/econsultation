class DateHelper {
  static const _months = [
    'jan', 'fév', 'mar', 'avr', 'mai', 'juin',
    'juil', 'août', 'sep', 'oct', 'nov', 'déc',
  ];
  static const _fullMonths = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
  ];
  static const _weekdays = [
    'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche',
  ];
  static const _shortWeekdays = [
    'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM',
  ];

  static String formatDate(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';

  static String formatTime(DateTime d) =>
      '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';

  static String formatShort(DateTime d) =>
      '${d.day} ${_months[d.month - 1]}. ${d.year}';

  static String formatFull(DateTime d) =>
      '${_weekdays[d.weekday - 1]} ${d.day} ${_fullMonths[d.month - 1]} ${d.year}';

  static String formatDayMonth(DateTime d) =>
      '${d.day} ${_fullMonths[d.month - 1]}';

  static String weekdayShort(DateTime d) => _shortWeekdays[d.weekday - 1];

  static bool isToday(DateTime d) {
    final now = DateTime.now();
    return d.year == now.year && d.month == now.month && d.day == now.day;
  }

  static bool isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;
}
