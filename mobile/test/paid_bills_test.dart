import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/rental_screens.dart';
import 'package:mobile/tenant_api.dart';

UtilityBill bill(String id, String month, double total, {bool paid = true}) =>
    UtilityBill.fromJson({
      'id': id,
      'room_id': 1,
      'room_code': 'P.101',
      'month': month,
      'electric_used': 100,
      'water_used': 4,
      'total_amount': total,
      'status': paid ? 'PAID' : 'UNPAID',
    });

void main() {
  test('Billing period parses MM/YYYY', () {
    expect(bill('a', '09/2026', 1).period, DateTime(2026, 9));
    expect(bill('b', 'x', 1).period, isNull);
  });

  testWidgets('Paid history lists only paid bills, newest first, by year', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: PaidBillsScreen(
          bills: [
            bill('a', '11/2025', 4000000),
            bill('b', '02/2026', 5000000),
            bill('c', '03/2026', 6000000, paid: false),
          ],
        ),
      ),
    );

    expect(find.text('Tháng 02/2026 • P.101'), findsOneWidget);
    expect(find.text('Tháng 11/2025 • P.101'), findsOneWidget);
    expect(find.text('Tháng 03/2026 • P.101'), findsNothing);
    final newest = tester.getTopLeft(find.text('Tháng 02/2026 • P.101'));
    final older = tester.getTopLeft(find.text('Tháng 11/2025 • P.101'));
    expect(newest.dy, lessThan(older.dy));
    expect(find.textContaining('2 hóa đơn'), findsOneWidget);

    await tester.tap(find.text('Năm 2026'));
    await tester.pump();
    expect(find.text('Tháng 11/2025 • P.101'), findsNothing);
    expect(find.textContaining('1 hóa đơn'), findsOneWidget);
  });
}
