import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/auth_screen.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('Profile tab offers login and register when signed out', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const SmartTroApp());

    await tester.tap(find.byIcon(Icons.account_circle_outlined));
    await tester.pump();

    expect(find.widgetWithText(FilledButton, 'Đăng nhập'), findsOneWidget);
    expect(find.widgetWithText(OutlinedButton, 'Đăng ký'), findsOneWidget);
  });

  testWidgets('Login form validates input before calling the server', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const MaterialApp(home: AuthScreen()));

    await tester.tap(find.widgetWithText(FilledButton, 'Đăng nhập'));
    await tester.pump();

    expect(find.text('Vui lòng nhập Email hoặc SĐT.'), findsOneWidget);
    expect(find.text('Mật khẩu tối thiểu 6 ký tự.'), findsOneWidget);
  });

  testWidgets('Register form checks matching passwords', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const MaterialApp(home: AuthScreen(initialTab: 1)));

    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), 'Nguyễn Văn A');
    await tester.enterText(fields.at(1), 'vana@gmail.com');
    await tester.enterText(fields.at(3), 'abc123');
    await tester.enterText(fields.at(4), 'abc999');
    await tester.tap(find.widgetWithText(FilledButton, 'Đăng ký'));
    await tester.pump();

    expect(find.text('Mật khẩu nhập lại không khớp.'), findsOneWidget);
  });
}
