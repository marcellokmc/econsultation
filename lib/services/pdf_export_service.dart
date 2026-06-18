import 'dart:typed_data';

import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../models/prescription.dart';
import '../models/user.dart';

class PdfExportService {
  static Future<void> sharePrescription({
    required Prescription prescription,
    required User doctor,
    required User patient,
  }) async {
    final bytes = await _generate(prescription, doctor, patient);
    final dateStr = _fmt(prescription.date);
    await Printing.sharePdf(
      bytes: bytes,
      filename: 'ordonnance_${patient.name.replaceAll(' ', '_')}_$dateStr.pdf',
    );
  }

  static Future<Uint8List> _generate(
      Prescription rx, User doctor, User patient) async {
    final doc = pw.Document();

    doc.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.symmetric(horizontal: 48, vertical: 40),
        build: (ctx) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            // ── En-tête ──────────────────────────────────────────────────
            pw.Container(
              padding: const pw.EdgeInsets.all(16),
              decoration: pw.BoxDecoration(
                color: PdfColors.blue800,
                borderRadius: pw.BorderRadius.circular(8),
              ),
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('eConsultation',
                          style: pw.TextStyle(
                              color: PdfColors.white,
                              fontSize: 20,
                              fontWeight: pw.FontWeight.bold)),
                      pw.SizedBox(height: 4),
                      pw.Text('Plateforme de télémédecine',
                          style: const pw.TextStyle(
                              color: PdfColor(1, 1, 1, 0.7), fontSize: 11)),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text('ORDONNANCE MÉDICALE',
                          style: pw.TextStyle(
                              color: PdfColors.white,
                              fontSize: 13,
                              fontWeight: pw.FontWeight.bold)),
                      pw.SizedBox(height: 4),
                      pw.Text('Date : ${_fmtLong(rx.date)}',
                          style: const pw.TextStyle(
                              color: PdfColor(1, 1, 1, 0.7), fontSize: 10)),
                    ],
                  ),
                ],
              ),
            ),
            pw.SizedBox(height: 20),

            // ── Médecin + Patient côte à côte ─────────────────────────────
            pw.Row(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Expanded(
                  child: _infoBox(
                    title: 'MÉDECIN PRESCRIPTEUR',
                    lines: [
                      doctor.name,
                      if (doctor.specialty != null) doctor.specialty!,
                      doctor.phone,
                      doctor.email,
                    ],
                    color: PdfColors.blue50,
                    borderColor: PdfColors.blue200,
                  ),
                ),
                pw.SizedBox(width: 16),
                pw.Expanded(
                  child: _infoBox(
                    title: 'PATIENT',
                    lines: [
                      patient.name,
                      patient.phone,
                      patient.email,
                    ],
                    color: PdfColors.green50,
                    borderColor: PdfColors.green200,
                  ),
                ),
              ],
            ),
            pw.SizedBox(height: 20),

            // ── Titre section médicaments ─────────────────────────────────
            pw.Text('MÉDICAMENTS PRESCRITS',
                style: pw.TextStyle(
                    fontSize: 12, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 8),

            // ── Tableau ───────────────────────────────────────────────────
            pw.Table(
              border: pw.TableBorder.all(
                  color: PdfColors.grey300, width: 0.5),
              columnWidths: {
                0: const pw.FlexColumnWidth(2.5),
                1: const pw.FlexColumnWidth(1.2),
                2: const pw.FlexColumnWidth(1.5),
                3: const pw.FlexColumnWidth(1.2),
                4: const pw.FlexColumnWidth(2),
              },
              children: [
                // En-tête tableau
                pw.TableRow(
                  decoration: const pw.BoxDecoration(
                      color: PdfColors.blue800),
                  children: [
                    _cell('Médicament', header: true),
                    _cell('Dosage', header: true),
                    _cell('Fréquence', header: true),
                    _cell('Durée', header: true),
                    _cell('Instructions', header: true),
                  ],
                ),
                // Lignes médicaments
                ...rx.medications.asMap().entries.map((e) {
                  final even = e.key.isEven;
                  final m = e.value;
                  return pw.TableRow(
                    decoration: pw.BoxDecoration(
                        color: even ? PdfColors.white : PdfColors.grey50),
                    children: [
                      _cell(m.name),
                      _cell(m.dosage),
                      _cell(m.frequency),
                      _cell(m.duration),
                      _cell(m.instructions ?? '—'),
                    ],
                  );
                }),
              ],
            ),
            pw.SizedBox(height: 24),

            // ── Signature ─────────────────────────────────────────────────
            pw.Align(
              alignment: pw.Alignment.centerRight,
              child: pw.Container(
                width: 200,
                padding: const pw.EdgeInsets.all(12),
                decoration: pw.BoxDecoration(
                  border: pw.Border.all(color: PdfColors.grey300),
                  borderRadius: pw.BorderRadius.circular(6),
                ),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.center,
                  children: [
                    pw.Text('Signature du médecin',
                        style: const pw.TextStyle(
                            fontSize: 9, color: PdfColors.grey600)),
                    pw.SizedBox(height: 32),
                    pw.Divider(color: PdfColors.grey400),
                    pw.SizedBox(height: 4),
                    pw.Text(doctor.name,
                        style: pw.TextStyle(
                            fontSize: 10,
                            fontWeight: pw.FontWeight.bold)),
                  ],
                ),
              ),
            ),
            pw.Spacer(),

            // ── Pied de page ──────────────────────────────────────────────
            pw.Divider(color: PdfColors.grey300),
            pw.SizedBox(height: 6),
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text('Document généré par eConsultation',
                    style: const pw.TextStyle(
                        fontSize: 8, color: PdfColors.grey500)),
                pw.Text('Réf. : ${rx.id}',
                    style: const pw.TextStyle(
                        fontSize: 8, color: PdfColors.grey500)),
              ],
            ),
          ],
        ),
      ),
    );

    return doc.save();
  }

  static pw.Widget _infoBox({
    required String title,
    required List<String> lines,
    required PdfColor color,
    required PdfColor borderColor,
  }) {
    return pw.Container(
      padding: const pw.EdgeInsets.all(12),
      decoration: pw.BoxDecoration(
        color: color,
        border: pw.Border.all(color: borderColor),
        borderRadius: pw.BorderRadius.circular(6),
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(title,
              style: pw.TextStyle(
                  fontSize: 9,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.grey600)),
          pw.SizedBox(height: 6),
          ...lines.map((l) => pw.Padding(
                padding: const pw.EdgeInsets.only(bottom: 2),
                child: pw.Text(l,
                    style: const pw.TextStyle(fontSize: 10)),
              )),
        ],
      ),
    );
  }

  static pw.Widget _cell(String text, {bool header = false}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 5),
      child: pw.Text(
        text,
        style: pw.TextStyle(
          fontSize: header ? 9 : 10,
          fontWeight:
              header ? pw.FontWeight.bold : pw.FontWeight.normal,
          color: header ? PdfColors.white : PdfColors.black,
        ),
      ),
    );
  }

  static String _fmt(DateTime d) =>
      '${d.year}${d.month.toString().padLeft(2, '0')}${d.day.toString().padLeft(2, '0')}';

  static String _fmtLong(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
}
