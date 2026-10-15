import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/main.dart';
import 'package:mobile/roommate.dart';
import 'package:mobile/roommate_screens.dart';

void main() {
  test('RoommatePost parses the web API shape', () {
    final post = RoommatePost.fromJson({
      'id': 'post_1',
      'user_id': 'user_tenant_1',
      'title': 'Tìm 1 bạn nữ ở ghép studio',
      'description': 'Phòng sạch sẽ gần HUIT',
      'shared_rent': 2100000,
      'max_people': 2,
      'current_people': 1,
      'gender_preference': 'Nữ',
      'required_habits': ['Sạch sẽ', 'Ngủ sớm'],
      'images': ['https://example.com/a.jpg'],
      'contact_phone': '0901234567',
      'district': 'Quận Tân Phú',
      'address': '140 Lê Trọng Tấn',
      'created_at': '2026-10-01T08:00:00.000Z',
      'user_name': 'Lan',
      'compatibility_score': 82.5,
    });

    expect(post.sharedRent, 2100000);
    expect(post.slotsLeft, 1);
    expect(post.requiredHabits, ['Sạch sẽ', 'Ngủ sớm']);
    expect(post.compatibilityScore, 82.5);
    expect(post.createdAt, isNotNull);
  });

  test('RoommateRequest falls back to safe defaults', () {
    final request = RoommateRequest.fromJson({'id': 'req_1', 'post_id': 'p'});
    expect(request.status, 'PENDING');
    expect(request.requesterName, 'Khách thuê');
    expect(request.message, '');
  });

  testWidgets('Roommate tab shows filters and post button', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const SmartTroApp());

    await tester.tap(find.byIcon(Icons.groups_outlined));
    await tester.pump();

    expect(find.byType(RoommateScreen), findsOneWidget);
    expect(find.text('Tìm bạn ở ghép'), findsOneWidget);
    expect(find.text('Tất cả khu vực'), findsOneWidget);
    expect(find.text('Đăng bài'), findsOneWidget);
  });

  testWidgets('Create post form validates required fields', (
    WidgetTester tester,
  ) async {
    // Tall viewport so the whole form is built without scrolling.
    tester.view.physicalSize = const Size(800, 4000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(const MaterialApp(home: RoommateCreateScreen()));

    await tester.tap(find.widgetWithText(FilledButton, 'Đăng bài'));
    await tester.pump();

    expect(find.text('Tiêu đề tối thiểu 10 ký tự.'), findsOneWidget);
    expect(find.text('Vui lòng nhập địa chỉ.'), findsOneWidget);
  });
}
