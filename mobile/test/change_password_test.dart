import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/account_screens.dart';

/// Trả JSON dạng bytes UTF-8 như máy chủ thật (chuỗi có dấu không dùng được với http.Response(String)).
http.Response jsonResponse(Map<String, dynamic> body, int status) =>
    http.Response.bytes(utf8.encode(jsonEncode(body)), status);

/// Giả lập GET / PATCH /api/user/profile; ghi lại body các lần PATCH.
MockClient fakeProfileApi({
  required bool hasPassword,
  required List<Map<String, dynamic>> patches,
  http.Response Function()? onPatch,
}) => MockClient((request) async {
  if (request.method == 'GET') {
    return jsonResponse({
      'success': true,
      'data': {'name': 'An', 'hasPassword': hasPassword},
    }, 200);
  }
  patches.add(Map<String, dynamic>.from(jsonDecode(request.body) as Map));
  return onPatch?.call() ??
      jsonResponse({
        'success': true,
        'message': 'Cập nhật mật khẩu tài khoản thành công!',
      }, 200);
});

/// Mở màn hình đổi mật khẩu từ một trang khác để kiểm tra việc đóng màn hình.
Widget host() => MaterialApp(
  home: Builder(
    builder: (context) => Scaffold(
      body: TextButton(
        onPressed: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const ChangePasswordScreen()),
        ),
        child: const Text('Mở'),
      ),
    ),
  ),
);

Future<void> openScreen(WidgetTester tester) async {
  await tester.pumpWidget(host());
  await tester.tap(find.text('Mở'));
  await settle(tester);
}

/// Phản hồi của http đi qua stream nên cần vài nhịp pump mới tới được setState.
Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 5; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
  await tester.pumpAndSettle();
}

Finder field(String label) => find.widgetWithText(TextFormField, label);

void main() {
  testWidgets(
    'mật khẩu mới quá ngắn hoặc nhập lại không khớp thì không gọi API',
    (tester) async {
      final patches = <Map<String, dynamic>>[];
      await http.runWithClient(() async {
        await openScreen(tester);
        await tester.enterText(field('Mật khẩu hiện tại'), 'matkhau-cu');
        await tester.enterText(field('Mật khẩu mới'), '123');
        await tester.enterText(field('Nhập lại mật khẩu mới'), '456');
        await tester.tap(find.widgetWithText(FilledButton, 'Đổi mật khẩu'));
        await settle(tester);
        expect(
          find.text('Mật khẩu mới phải có tối thiểu 6 ký tự.'),
          findsOneWidget,
        );
        expect(
          find.text('Mật khẩu xác nhận không khớp với mật khẩu mới.'),
          findsOneWidget,
        );
        expect(patches, isEmpty);
      }, () => fakeProfileApi(hasPassword: true, patches: patches));
    },
  );

  testWidgets(
    'sai mật khẩu hiện tại thì hiện lỗi của máy chủ, giữ nguyên màn hình',
    (tester) async {
      final patches = <Map<String, dynamic>>[];
      await http.runWithClient(
        () async {
          await openScreen(tester);
          await tester.enterText(field('Mật khẩu hiện tại'), 'sai-mat-khau');
          await tester.enterText(field('Mật khẩu mới'), 'matkhau-moi');
          await tester.enterText(field('Nhập lại mật khẩu mới'), 'matkhau-moi');
          await tester.tap(find.widgetWithText(FilledButton, 'Đổi mật khẩu'));
          await settle(tester);
          expect(patches.single, {
            'currentPassword': 'sai-mat-khau',
            'newPassword': 'matkhau-moi',
            'confirmPassword': 'matkhau-moi',
          });
          expect(
            find.text('Mật khẩu hiện tại không chính xác.'),
            findsOneWidget,
          );
          expect(find.byType(ChangePasswordScreen), findsOneWidget);
        },
        () => fakeProfileApi(
          hasPassword: true,
          patches: patches,
          onPatch: () => jsonResponse({
            'success': false,
            'message': 'Mật khẩu hiện tại không chính xác.',
          }, 400),
        ),
      );
    },
  );

  testWidgets(
    'tài khoản chưa có mật khẩu: không hỏi mật khẩu cũ, đặt xong thì đóng màn hình',
    (tester) async {
      final patches = <Map<String, dynamic>>[];
      await http.runWithClient(() async {
        await openScreen(tester);
        expect(find.text('Đặt mật khẩu'), findsWidgets);
        expect(field('Mật khẩu hiện tại'), findsNothing);
        await tester.enterText(field('Mật khẩu mới'), 'matkhau-moi');
        await tester.enterText(field('Nhập lại mật khẩu mới'), 'matkhau-moi');
        await tester.tap(find.widgetWithText(FilledButton, 'Đặt mật khẩu'));
        await settle(tester);
        expect(patches.single['currentPassword'], '');
        expect(find.byType(ChangePasswordScreen), findsNothing);
        expect(
          find.text('Cập nhật mật khẩu tài khoản thành công!'),
          findsOneWidget,
        );
      }, () => fakeProfileApi(hasPassword: false, patches: patches));
    },
  );
}
