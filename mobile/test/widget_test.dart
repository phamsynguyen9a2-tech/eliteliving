import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/main.dart';

void main() {
  testWidgets('Elite Living navigation and appointments empty state', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const SmartTroApp());

    expect(find.text('SmartTro TP.HCM'), findsOneWidget);
    expect(find.text('Trang chủ'), findsOneWidget);
    expect(find.text('Tìm phòng'), findsOneWidget);
    expect(find.text('Lịch hẹn'), findsOneWidget);
    expect(find.text('Cá nhân'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.event_note_outlined));
    await tester.pump();

    expect(find.text('Lịch hẹn xem phòng của tôi'), findsOneWidget);
    expect(find.text('Chưa có lịch hẹn'), findsOneWidget);
    expect(
      find.text('Lịch xem phòng bạn vừa đặt sẽ xuất hiện tại đây.'),
      findsOneWidget,
    );
  });
}
