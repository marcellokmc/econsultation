import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:econsultation/main.dart';
import 'package:econsultation/providers/auth_provider.dart';
import 'package:econsultation/providers/data_provider.dart';

void main() {
  testWidgets('App starts without crashing', (tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
          ChangeNotifierProvider(create: (_) => DataProvider()),
        ],
        child: const EConsultationApp(),
      ),
    );
    expect(find.byType(EConsultationApp), findsOneWidget);
  });
}
