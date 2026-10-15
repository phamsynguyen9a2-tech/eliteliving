import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mobile/bill_reminder.dart';
import 'package:mobile/tenant_api.dart';

UtilityBill bill(String id, String month, {String status = 'UNPAID'}) =>
    UtilityBill.fromJson({
      'id': id,
      'room_id': 1,
      'room_code': 'P.101',
      'month': month,
      'total_amount': 5000000,
      'status': status,
    });

void main() {
  test('Due date is the 5th of the following month', () {
    expect(bill('a', '10/2026').dueDate, DateTime(2026, 11, 5));
    // December rolls over to January of the next year.
    expect(bill('b', '12/2026').dueDate, DateTime(2027, 1, 5));
    expect(bill('c', 'invalid').dueDate, isNull);
  });

  test('Overdue days and late fee follow house rule 8', () {
    final b = bill('a', '10/2026');
    expect(b.daysOverdue(DateTime(2026, 11, 5)), 0);
    expect(b.daysUntilDue(DateTime(2026, 11, 3)), 2);
    expect(b.daysUntilDue(DateTime(2026, 11, 5)), 0);
    expect(b.daysOverdue(DateTime(2026, 11, 8, 23)), 3);
    expect(b.lateFee(DateTime(2026, 11, 8)), 3 * kLateFeePerDay);
    expect(b.isOverdue(DateTime(2026, 11, 6)), isTrue);
  });

  test('Paid bills are never overdue', () {
    final b = bill('a', '01/2020', status: 'PAID');
    expect(b.daysOverdue(), 0);
    expect(b.lateFee(), 0);
    expect(b.daysUntilDue(), isNull);
  });

  test('New bills are counted until marked seen', () async {
    SharedPreferences.setMockInitialValues({});
    await BillReminderStore.update([
      bill('old', '01/2020'),
      bill('paid', '01/2020', status: 'PAID'),
      bill('future', '12/2099'),
    ]);
    var state = BillReminderStore.state.value;
    expect(state.unpaid.length, 2);
    expect(state.overdue.map((b) => b.id), ['old']);
    expect(state.newCount, 2);
    expect(state.badgeCount, 2);

    await BillReminderStore.markAllSeen();
    state = BillReminderStore.state.value;
    expect(state.newCount, 0);
    // Overdue bills still need attention after being seen.
    expect(state.badgeCount, 1);

    await BillReminderStore.update([bill('old', '01/2020')]);
    expect(BillReminderStore.state.value.newCount, 0);
  });
}
