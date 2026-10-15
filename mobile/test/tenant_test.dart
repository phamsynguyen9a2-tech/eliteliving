import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mobile/explore_screen.dart';
import 'package:mobile/main.dart';
import 'package:mobile/tenant_api.dart';

void main() {
  test('Contract, bill and handover parse the web API shape', () {
    final contract = RentalContract.fromJson({
      'id': 'ct_1',
      'room_id': 12,
      'room_title': 'P.101 Studio',
      'start_date': '2026-10-20',
      'end_date': '2027-10-20',
      'monthly_rent': 4500000,
      'deposit_amount': 4500000,
      'status': 'ACTIVE',
      'tenant_signed': false,
    });
    expect(contract.roomId, 12);
    expect(contract.copyWith(tenantSigned: true).tenantSigned, isTrue);

    final bill = UtilityBill.fromJson({
      'id': 'b1',
      'room_id': 12,
      'room_code': 'P.101',
      'month': '10/2026',
      'total_amount': 5300000,
      'status': 'UNPAID',
    });
    expect(bill.isPaid, isFalse);
    expect(bill.totalAmount, 5300000);

    final handover = Handover.fromJson({
      'id': 'h1',
      'room_id': 12,
      'type': 'CHECK_IN',
      'tenant_confirmed': false,
      'items': [
        {
          'asset_name': 'Điều hòa',
          'category': 'Điện tử',
          'quantity': 1,
          'condition': 'Tốt',
        },
      ],
    });
    expect(handover.items.single.assetName, 'Điều hòa');
  });

  test('Room filters build the same query as the web home page', () {
    final filters = RoomFilters()
      ..district = 'tân phú'
      ..priceIndex = 2
      ..roomType = 'gac_lung'
      ..cheapElectricity = true
      ..petFriendly = true;
    final query = filters.toQuery(1);
    expect(query['minPrice'], '4000000');
    expect(query['maxPrice'], '6000000');
    expect(query['roomType'], 'gac_lung');
    expect(query['maxElectricity'], '3800');
    expect(query['petFriendly'], 'true');
    expect(filters.advancedCount, 3);
  });

  test('Favorites toggle and persist', () async {
    SharedPreferences.setMockInitialValues({});
    final added = await FavoritesStore.toggle({'id': 7, 'title': 'P.7'});
    expect(added, isTrue);
    expect(FavoritesStore.contains(7), isTrue);
    expect(await FavoritesStore.toggle({'id': 7}), isFalse);
    expect(FavoritesStore.contains(7), isFalse);
  });

  testWidgets('Search tab shows filters instead of a placeholder', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const SmartTroApp());

    await tester.tap(find.byIcon(Icons.travel_explore_outlined));
    await tester.pump();

    expect(find.byType(RoomSearchScreen), findsOneWidget);
    expect(find.byTooltip('Bộ lọc nâng cao'), findsOneWidget);
    expect(find.text('Tất cả khu vực'), findsOneWidget);
  });
}
