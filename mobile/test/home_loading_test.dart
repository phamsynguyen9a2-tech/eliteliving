import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/main.dart';

http.Response roomsResponse() => http.Response(
  jsonEncode({
    'success': true,
    'data': {'items': []},
  }),
  200,
);

void main() {
  testWidgets('Rooms load while recommendations take longer than 15 seconds', (
    tester,
  ) async {
    final recommendations = Completer<http.Response>();
    final requests = <String>[];
    final client = MockClient((request) {
      requests.add(request.url.path);
      if (request.url.path.endsWith('/recommend')) {
        return recommendations.future;
      }
      return Future.value(roomsResponse());
    });
    await http.runWithClient(() async {
      await tester.pumpWidget(const MaterialApp(home: HomeScreen()));
      await tester.pump();
      expect(requests, containsAll(['/api/rooms/recommend', '/api/rooms']));
      expect(find.text('Chưa có phòng nào trong khu vực này.'), findsOneWidget);
      expect(find.text('Đang tải gợi ý phòng…'), findsOneWidget);

      await tester.pump(const Duration(seconds: 17));
      expect(find.text('Không tải được dữ liệu'), findsNothing);
      recommendations.complete(
        http.Response('{"success":true,"data":[]}', 200),
      );
      await tester.pumpAndSettle();
      expect(find.text('Đang tải gợi ý phòng…'), findsNothing);
      expect(
        find.text('Chưa có gợi ý phù hợp. Kéo xuống để tải lại.'),
        findsOneWidget,
      );
    }, () => client);
  });

  testWidgets('A failed recommendation request does not skip room loading', (
    tester,
  ) async {
    var roomsRequested = false;
    final client = MockClient((request) async {
      if (request.url.path.endsWith('/recommend')) {
        throw http.ClientException('Connection interrupted');
      }
      roomsRequested = true;
      return roomsResponse();
    });
    await http.runWithClient(() async {
      await tester.pumpWidget(const MaterialApp(home: HomeScreen()));
      await tester.pump();
      expect(roomsRequested, isTrue);
      expect(find.text('Phòng mới đăng tải (EzHouse)'), findsOneWidget);
      expect(find.text('Không tải được dữ liệu'), findsOneWidget);
      expect(find.textContaining('Gợi ý Top-K: không kết nối'), findsOneWidget);
    }, () => client);
  });

  testWidgets('Requests still stop waiting after the bounded timeout', (
    tester,
  ) async {
    final recommendations = Completer<http.Response>();
    final client = MockClient(
      (request) => request.url.path.endsWith('/recommend')
          ? recommendations.future
          : Future.value(roomsResponse()),
    );
    await http.runWithClient(() async {
      await tester.pumpWidget(const MaterialApp(home: HomeScreen()));
      await tester.pump();
      await tester.pump(const Duration(seconds: 46));
      expect(
        find.textContaining('Gợi ý Top-K: máy chủ phản hồi chậm.'),
        findsOneWidget,
      );
      expect(find.text('Đang tải gợi ý phòng…'), findsNothing);
      recommendations.complete(
        http.Response('{"success":true,"data":[]}', 200),
      );
      await tester.pump();
    }, () => client);
  });
}
