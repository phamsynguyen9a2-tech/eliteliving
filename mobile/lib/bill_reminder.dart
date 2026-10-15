import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'auth.dart';
import 'tenant_api.dart';

/// House rule 8 (web/src/lib/house-rules.ts): meters are read on the 25th-30th,
/// rent and services are paid from the 1st to the 5th of the following month,
/// late payment costs 50.000đ/day and service may be suspended after 10 days.
const int kBillDueDay = 5;
const double kLateFeePerDay = 50000;
const int kSuspensionWarningDays = 10;

DateTime _today([DateTime? now]) {
  final n = now ?? DateTime.now();
  return DateTime(n.year, n.month, n.day);
}

extension BillDueInfo on UtilityBill {
  /// Due date: the 5th of the month after the billing month (`MM/YYYY`).
  /// Falls back to null when the month string cannot be parsed.
  DateTime? get dueDate {
    final match = RegExp(r'^(\d{1,2})/(\d{4})$').firstMatch(month.trim());
    if (match == null) return null;
    final m = int.parse(match.group(1)!);
    final y = int.parse(match.group(2)!);
    if (m < 1 || m > 12) return null;
    return DateTime(y, m + 1, kBillDueDay);
  }

  int daysOverdue([DateTime? now]) {
    final due = dueDate;
    if (isPaid || due == null) return 0;
    final diff = _today(now).difference(due).inDays;
    return diff > 0 ? diff : 0;
  }

  bool isOverdue([DateTime? now]) => daysOverdue(now) > 0;

  /// Days left until the due date (0 on the due day), null once overdue/paid.
  int? daysUntilDue([DateTime? now]) {
    final due = dueDate;
    if (isPaid || due == null) return null;
    final diff = due.difference(_today(now)).inDays;
    return diff >= 0 ? diff : null;
  }

  /// Estimated late fee by the house rule; the backend does not store it.
  double lateFee([DateTime? now]) => daysOverdue(now) * kLateFeePerDay;
}

@immutable
class BillReminderState {
  const BillReminderState({
    this.unpaid = const [],
    this.newBillIds = const {},
    this.checkedAt,
  });

  final List<UtilityBill> unpaid;

  /// Unpaid bills the tenant has not opened the rental screen for yet.
  final Set<String> newBillIds;
  final DateTime? checkedAt;

  List<UtilityBill> get overdue => [
    for (final b in unpaid)
      if (b.isOverdue()) b,
  ];

  int get newCount => newBillIds.length;

  /// Number shown on badges: new bills plus overdue ones (no double count).
  int get badgeCount => {...newBillIds, for (final b in overdue) b.id}.length;

  bool get needsAttention => badgeCount > 0;
}

/// Checks the tenant's bills when the app opens / the user signs in and
/// tracks which bills were already seen, so new bills can be highlighted.
abstract final class BillReminderStore {
  static const _seenKey = 'seen_bill_ids_v1';

  static final ValueNotifier<BillReminderState> state = ValueNotifier(
    const BillReminderState(),
  );

  static Future<void> refresh() async {
    final user = AuthService.currentUser.value;
    if (user == null) {
      state.value = const BillReminderState();
      return;
    }
    try {
      final contracts = await TenantApi.fetchContracts();
      final bills = <UtilityBill>[];
      for (final roomId in {for (final c in contracts) c.roomId}) {
        bills.addAll(await TenantApi.fetchBills(roomId));
      }
      await update(bills);
    } on ApiException catch (e) {
      debugPrint('Bill reminder check failed: ${e.message}');
    }
  }

  /// Recomputes the state from bills another screen already loaded.
  static Future<void> update(List<UtilityBill> bills) async {
    final seen = await _loadSeen();
    final unpaid = [
      for (final b in bills)
        if (!b.isPaid) b,
    ]..sort((a, b) => b.daysOverdue().compareTo(a.daysOverdue()));
    state.value = BillReminderState(
      unpaid: unpaid,
      newBillIds: {
        for (final b in unpaid)
          if (!seen.contains(b.id)) b.id,
      },
      checkedAt: DateTime.now(),
    );
  }

  /// Called when the tenant opens the bill list: new bills are no longer new.
  static Future<void> markAllSeen() async {
    final current = state.value;
    if (current.newBillIds.isEmpty) return;
    final seen = await _loadSeen()
      ..addAll(current.newBillIds);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(_seenKey, seen.toList());
    } catch (e) {
      debugPrint('Saving seen bills failed: $e');
    }
    state.value = BillReminderState(
      unpaid: current.unpaid,
      checkedAt: current.checkedAt,
    );
  }

  static Future<Set<String>> _loadSeen() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return (prefs.getStringList(_seenKey) ?? const []).toSet();
    } catch (_) {
      return <String>{};
    }
  }
}
