import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/account_screens.dart';
import 'package:mobile/auth.dart';
import 'package:mobile/auth_screen.dart';
import 'package:mobile/building_screens.dart';
import 'package:mobile/contact_actions.dart';
import 'package:mobile/explore_screen.dart';
import 'package:mobile/guest_appointments.dart';
import 'package:mobile/location_presets.dart';
import 'package:mobile/main.dart';
import 'package:mobile/map_screen.dart';
import 'package:mobile/realtime_service.dart';
import 'package:mobile/rental_screens.dart';
import 'package:mobile/room_reviews.dart';
import 'package:mobile/room_sections.dart';
import 'package:mobile/roommate.dart';
import 'package:mobile/roommate_screens.dart';
import 'package:mobile/smart_search_screen.dart';
import 'package:mobile/tenant_api.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// JSON dạng bytes UTF-8 như máy chủ thật.
http.Response json(Object body, [int status = 200]) =>
    http.Response.bytes(utf8.encode(jsonEncode(body)), status);

http.Response ok(Object? data, {Map<String, dynamic> extra = const {}}) =>
    json({'success': true, 'data': data, ...extra});

Map<String, dynamic> sampleRoom({int id = 12, String status = 'AVAILABLE'}) => {
  'id': id,
  'room_code': 'P.$id',
  'title': 'Phòng $id',
  'address': '140 Lê Trọng Tấn',
  'district': 'Quận Tân Phú',
  'price': 4500000,
  'deposit': 4500000,
  'area': 25,
  'floor': 3,
  'status': status,
  'room_type': 'Studio',
  'images': <String>[],
  'amenities': ['Wifi'],
  'water_rate': 30000,
  'parking_fee': 90000,
  'electricity_rate': 3500,
  'internet_fee': 80000,
  'service_fee': 50000,
  'landlord_name': 'Chủ trọ A',
  'landlord_phone': '0901234567',
};

void signIn() {
  AuthService.currentUser.value = AuthUser.fromJson({
    'id': 'u1',
    'name': 'An',
    'email': 'an@example.com',
    'phone': '0901234567',
    'role': 'TENANT',
  });
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    FavoritesStore.rooms.value = {};
    GuestAppointmentStore.items.value = const [];
  });

  tearDown(() {
    AuthService.currentUser.value = null;
  });

  group('Tìm kiếm và lọc', () {
    test('Đủ 14 khu vực và tuyến đường như web', () {
      expect(kDistrictOptions.length, 15);
      expect(kHotStreets, contains('Lê Trọng Tấn'));
    });

    test('Tiện ích bắt buộc và bán kính gửi đúng tham số', () {
      final filters = RoomFilters()
        ..amenities = {'Wifi', 'Ban công'}
        ..radiusKm = 3
        ..center = (lat: 10.8, lng: 106.6);
      final query = filters.toQuery(1);
      expect(query['amenities'], 'Wifi,Ban công');
      expect(query['lat'], '10.8');
      expect(query['lng'], '106.6');
      expect(query['radius'], '3.0');
      expect(filters.advancedCount, 2);

      filters.resetAdvanced();
      expect(filters.advancedCount, 0);
      expect(filters.toQuery(1).containsKey('radius'), isFalse);
    });

    test('Danh sách tòa nhà chỉ nhận bộ lọc chung', () {
      final query =
          (RoomFilters()
                ..district = 'quận 7'
                ..priceIndex = 2
                ..keyword = ' Thảo Điền '
                ..roomType = 'studio'
                ..cheapElectricity = true)
              .toBuildingQuery();
      expect(query, {
        'district': 'quận 7',
        'minPrice': '4000000',
        'maxPrice': '6000000',
        'search': 'Thảo Điền',
        'roomType': 'studio',
      });
    });

    testWidgets('Đổi sang xem theo tòa nhà gọi /api/buildings', (tester) async {
      final paths = <String>[];
      tester.view.physicalSize = const Size(800, 2400);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      final client = MockClient((request) async {
        paths.add(request.url.path);
        if (request.url.path == '/api/buildings') {
          expect(request.url.queryParameters['summary'], 'true');
          return ok({
            'total': 1,
            'items': [
              {
                'code': 'DA1',
                'name': 'Tòa Lê Trọng Tấn',
                'address': '140 Lê Trọng Tấn',
                'district': 'Quận Tân Phú',
                'min_price': 4000000,
                'max_price': 6000000,
                'total_rooms': 10,
                'available_rooms': 4,
                'images': <String>[],
                'amenities': <String>[],
              },
            ],
          });
        }
        return ok({'items': [], 'total': 0, 'totalPages': 1});
      });
      await http.runWithClient(() async {
        await tester.pumpWidget(const MaterialApp(home: RoomSearchScreen()));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Theo tòa nhà'));
        await tester.pumpAndSettle();
        expect(paths, contains('/api/buildings'));
        expect(find.text('Tòa Lê Trọng Tấn'), findsOneWidget);
        expect(find.text('Xem 4 phòng trống'), findsOneWidget);
        expect(find.text('Tìm thấy 1 tòa nhà'), findsOneWidget);
      }, () => client);
    });
  });

  group('Phòng đã lưu trên máy chủ', () {
    test('Đăng nhập thì gộp phòng lưu tạm lên máy chủ', () async {
      final posted = <int>[];
      final client = MockClient((request) async {
        if (request.method == 'POST') {
          posted.add((jsonDecode(request.body) as Map)['roomId'] as int);
          return ok({'saved': true});
        }
        return ok([sampleRoom(id: 2)]);
      });
      await http.runWithClient(() async {
        await FavoritesStore.toggle(sampleRoom(id: 7));
        await FavoritesStore.syncWithAccount(userId: 'u1');
      }, () => client);
      expect(posted, [7]);
      expect(FavoritesStore.rooms.value.keys.toSet(), {2, 7});
    });

    test('Phòng bỏ lưu trên web không bị app gửi lại máy chủ', () async {
      var serverRooms = [sampleRoom(id: 2), sampleRoom(id: 3)];
      final posted = <int>[];
      final client = MockClient((request) async {
        if (request.method == 'POST') {
          posted.add((jsonDecode(request.body) as Map)['roomId'] as int);
          return ok({'saved': true});
        }
        return ok(serverRooms);
      });
      await http.runWithClient(() async {
        await FavoritesStore.syncWithAccount(userId: 'u1');
        expect(FavoritesStore.rooms.value.keys.toSet(), {2, 3});

        // Người dùng bỏ lưu phòng 3 trên web rồi mở lại app
        serverRooms = [sampleRoom(id: 2)];
        await FavoritesStore.syncWithAccount(userId: 'u1');
      }, () => client);
      expect(posted, isEmpty);
      expect(FavoritesStore.rooms.value.keys.toSet(), {2});
    });

    test('Bản sao của tài khoản cũ không gộp sang tài khoản khác', () async {
      final posted = <int>[];
      var serverRooms = [sampleRoom(id: 2)];
      final client = MockClient((request) async {
        if (request.method == 'POST') {
          posted.add((jsonDecode(request.body) as Map)['roomId'] as int);
          return ok({'saved': true});
        }
        return ok(serverRooms);
      });
      await http.runWithClient(() async {
        await FavoritesStore.syncWithAccount(userId: 'u1');
        serverRooms = [];
        await FavoritesStore.syncWithAccount(userId: 'u2');
      }, () => client);
      expect(posted, isEmpty);
      expect(FavoritesStore.rooms.value, isEmpty);
    });

    test('Đăng xuất thì xóa bản sao trên máy', () async {
      await FavoritesStore.toggle(sampleRoom(id: 7));
      await FavoritesStore.syncWithAccount(userId: null);
      expect(FavoritesStore.rooms.value, isEmpty);
    });

    test('Đã đăng nhập: lưu và bỏ lưu gọi máy chủ', () async {
      signIn();
      final calls = <String>[];
      final client = MockClient((request) async {
        calls.add('${request.method} ${request.url}');
        return ok({'saved': true});
      });
      await http.runWithClient(() async {
        expect(await FavoritesStore.toggle(sampleRoom(id: 5)), isTrue);
        expect(await FavoritesStore.toggle(sampleRoom(id: 5)), isFalse);
      }, () => client);
      expect(calls.first, startsWith('POST'));
      expect(calls.last, allOf(startsWith('DELETE'), contains('roomId=5')));
    });

    test('Máy chủ từ chối thì trả lại trạng thái cũ', () async {
      signIn();
      final client = MockClient(
        (_) async =>
            json({'success': false, 'message': 'Không lưu được.'}, 403),
      );
      await http.runWithClient(() async {
        await expectLater(
          FavoritesStore.toggle(sampleRoom(id: 5)),
          throwsA(isA<ApiException>()),
        );
      }, () => client);
      expect(FavoritesStore.contains(5), isFalse);
    });
  });

  group('Đánh giá phòng', () {
    Map<String, dynamic> reviews({
      bool canReview = false,
      bool signedIn = true,
      Map<String, dynamic>? mine,
    }) => {
      'summary': {
        'average': 4.5,
        'count': 2,
        'distribution': [0, 0, 0, 1, 1],
      },
      'items': [
        {
          'id': 'r1',
          'rating': 5,
          'comment': 'Phòng sạch',
          'author': 'Bình',
          'is_mine': false,
          'landlord_reply': 'Cảm ơn bạn',
          'created_at': '2026-10-01T00:00:00.000Z',
        },
      ],
      'mine': mine,
      'canReview': canReview,
      'signedIn': signedIn,
    };

    testWidgets('Khách chưa đăng nhập xem được và được mời đăng nhập', (
      tester,
    ) async {
      final client = MockClient((_) async => ok(reviews(signedIn: false)));
      await http.runWithClient(() async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: SingleChildScrollView(
                child: RoomReviewsSection(roomId: 12),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('4.5'), findsOneWidget);
        expect(find.text('Phòng sạch'), findsOneWidget);
        expect(find.text('Cảm ơn bạn'), findsOneWidget);
        expect(
          find.text('Đăng nhập để đánh giá phòng đã thuê hoặc đã xem'),
          findsOneWidget,
        );
        expect(find.text('Gửi đánh giá'), findsNothing);
      }, () => client);
    });

    testWidgets('Người đủ điều kiện gửi được đánh giá', (tester) async {
      Map<String, dynamic>? sent;
      final client = MockClient((request) async {
        if (request.method == 'POST') {
          sent = Map<String, dynamic>.from(jsonDecode(request.body) as Map);
          return json({
            'success': true,
            'message': 'Cảm ơn bạn đã đánh giá phòng.',
          });
        }
        return ok(reviews(canReview: true));
      });
      await http.runWithClient(() async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: SingleChildScrollView(
                child: RoomReviewsSection(roomId: 12),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();

        // Chưa chọn sao thì không gửi
        await tester.tap(find.text('Gửi đánh giá'));
        await tester.pump();
        expect(sent, isNull);
        expect(find.text('Vui lòng chọn số sao.'), findsOneWidget);

        await tester.tap(find.byTooltip('4 sao'));
        await tester.pump();
        await tester.enterText(find.byType(TextField), 'Phòng thoáng');
        await tester.tap(find.text('Gửi đánh giá'));
        await tester.pumpAndSettle();
        expect(sent, {'roomId': 12, 'rating': 4, 'comment': 'Phòng thoáng'});
      }, () => client);
    });

    test('Xóa đánh giá gửi đúng mã', () async {
      String? url;
      final client = MockClient((request) async {
        url = '${request.method} ${request.url}';
        return json({'success': true, 'message': 'Đã xóa đánh giá.'});
      });
      await http.runWithClient(
        () => TenantApi.deleteReview('r 1'),
        () => client,
      );
      expect(url, allOf(startsWith('DELETE'), contains('/api/reviews?id=r+1')));
    });
  });

  group('Tòa nhà', () {
    final rooms = [
      {...sampleRoom(id: 1), 'floor': 1},
      {...sampleRoom(id: 2, status: 'RENTED'), 'floor': 1, 'has_balcony': true},
      {...sampleRoom(id: 3), 'floor': 7, 'has_balcony': true},
    ];

    test('Lọc theo trạng thái, ban công, tầng', () {
      expect(filterBuildingRooms(rooms).length, 3);
      expect(filterBuildingRooms(rooms, status: 'AVAILABLE').length, 2);
      expect(filterBuildingRooms(rooms, status: 'BALCONY').length, 2);
      expect(filterBuildingRooms(rooms, floor: 7).single['id'], 3);
    });

    test('Nhóm theo tầng, không bỏ sót tầng cao', () {
      final groups = groupRoomsByFloor(rooms);
      expect(groups.keys.toList(), [1, 7]);
      expect(groups[1]!.length, 2);
    });

    testWidgets('Chi tiết tòa nhà hiện phòng theo tầng và lọc được', (
      tester,
    ) async {
      final building = BuildingInfo.fromJson({
        'code': 'DA1',
        'name': 'Tòa A',
        'address': '140 Lê Trọng Tấn',
        'district': 'Quận Tân Phú',
        'distance_to_huit_km': 1.2,
        'min_price': 4000000,
        'max_price': 6000000,
        'total_rooms': 3,
        'available_rooms': 2,
        'images': <String>[],
        'amenities': <String>[],
        'landlord_name': 'Chủ trọ A',
        'landlord_phone': '0901234567',
      });
      tester.view.physicalSize = const Size(800, 2400);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      final client = MockClient((request) async {
        expect(request.url.path, '/api/buildings/DA1');
        return ok({
          'code': 'DA1',
          'name': 'Tòa A',
          'address': '140 Lê Trọng Tấn',
          'total_rooms': 3,
          'available_rooms': 2,
          'images': <String>[],
          'amenities': <String>[],
          'rooms': rooms,
        });
      });
      await http.runWithClient(() async {
        await tester.pumpWidget(
          MaterialApp(home: BuildingDetailScreen(building: building)),
        );
        await tester.pumpAndSettle();
        expect(find.text('Tất cả (3)'), findsOneWidget);
        expect(find.text('P.3'), findsOneWidget);
        expect(find.text('Tầng 7'), findsWidgets);
        expect(find.text('P.2'), findsOneWidget);

        await tester.tap(find.text('Còn trống (2)'));
        await tester.pump();
        expect(find.text('P.2'), findsNothing);
        expect(find.text('P.1'), findsOneWidget);
      }, () => client);
    });
  });

  group('Bản đồ', () {
    BuildingInfo building(String code, double lat, double lng, double min) =>
        BuildingInfo.fromJson({
          'code': code,
          'name': code,
          'latitude': lat,
          'longitude': lng,
          'min_price': min,
          'max_price': min + 1000000,
        });

    test('Haversine đúng và điểm giữa là trung bình tọa độ', () {
      expect(haversineKm(10.8066, 106.6286, 10.8066, 106.6286), 0);
      final km = haversineKm(10.8066, 106.6286, 10.7726, 106.6579);
      expect(km, closeTo(4.96, 0.1));

      final mid = midpointOf([
        (lat: 10.8, lng: 106.6),
        (lat: 10.6, lng: 106.8),
      ]);
      expect(mid.lat, 10.7);
      expect(mid.lng, 106.7);
    });

    test('Lọc tòa nhà theo bán kính và giá, gần nhất trước', () {
      final all = [
        building('xa', 10.9, 106.9, 4000000),
        building('gan', 10.8067, 106.6287, 4000000),
        building('hoi-xa', 10.81, 106.63, 4000000),
        building('mac', 10.8068, 106.6288, 9000000),
        building('khong-toa-do', 0, 0, 4000000),
      ];
      final matched = matchBuildings(
        all,
        lat: 10.8066,
        lng: 106.6286,
        radiusKm: 1.5,
        maxPriceMillion: 6,
      );
      expect(matched.map((m) => m.building.code).toList(), ['gan', 'hoi-xa']);
    });

    testWidgets('Màn bản đồ: tìm quanh địa điểm và điểm giữa nhiều người', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(800, 2400);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      final client = MockClient((request) async {
        if (request.url.path == '/api/buildings') {
          expect(request.url.queryParameters['log'], '0');
          return ok({
            'items': [
              {
                'code': 'DA1',
                'name': 'Tòa Lê Thúc Hoạch',
                'address': 'Phú Thọ Hòa',
                'district': 'Quận Tân Phú',
                'latitude': kMapPresets.first.lat,
                'longitude': kMapPresets.first.lng,
                'min_price': 4000000,
                'max_price': 6000000,
                'total_rooms': 8,
                'available_rooms': 3,
                'images': <String>[],
                'amenities': <String>[],
              },
            ],
          });
        }
        return http.Response('', 404);
      });
      await http.runWithClient(() async {
        await tester.pumpWidget(const MaterialApp(home: BuildingMapScreen()));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 50));
        expect(find.text('Tìm thấy 1 tòa nhà trong bán kính'), findsOneWidget);
        expect(find.text('Tòa Lê Thúc Hoạch'), findsOneWidget);

        // Giới hạn giá dưới giá tòa nhà thì không còn kết quả
        await tester.enterText(find.widgetWithText(TextField, 'Đến'), '3');
        await tester.pump();
        expect(
          find.text('Không có tòa nhà trong bán kính này'),
          findsOneWidget,
        );

        await tester.tap(find.text('Ở giữa (2+ người)'));
        await tester.pump();
        expect(find.text('Thêm người (2/4)'), findsOneWidget);
        await tester.tap(find.text('Thêm người (2/4)'));
        await tester.pump();
        expect(find.text('Thêm người (3/4)'), findsOneWidget);
        expect(find.byTooltip('Bỏ người 3'), findsOneWidget);
        expect(
          find.textContaining('Điểm giữa cân bằng (3 người)'),
          findsOneWidget,
        );
      }, () => client);
    });

    test('Địa điểm có sẵn đủ và tìm được theo tên', () {
      expect(kTopKLandmarks.length, 28);
      // Cùng danh sách với web: 32 địa điểm khu vực + 10 địa danh nổi tiếng
      expect(kMapPresets.length, 42);
      expect(searchPresets(kMapPresets, 'hutech').single.id, 'hutech-d2');
      expect(searchPresets(kMapPresets, 'landmark 81').single.id, 'landmark-81');
      // Tìm không dấu
      expect(
        searchPresets(kMapPresets, 'cho ben thanh').single.id,
        'cho-ben-thanh',
      );
      expect(searchPresets(kMapPresets, 'không có gì'), isEmpty);
    });
  });

  group('Tìm phòng gần nơi học', () {
    testWidgets('Gửi địa điểm, ngân sách, bán kính và đổi nhóm nhu cầu', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(800, 2400);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      final queries = <Map<String, String>>[];
      final client = MockClient((request) async {
        queries.add(request.url.queryParameters);
        return ok(
          [
            {...sampleRoom(), 'score': 0.92, 'calculated_distance': 1.4},
          ],
          extra: {
            'metadata': {'recommendation_id': 'rec-1'},
          },
        );
      });
      await http.runWithClient(() async {
        await tester.pumpWidget(const MaterialApp(home: SmartSearchScreen()));
        await tester.pumpAndSettle();
        expect(queries.first['budget'], '6000000');
        expect(queries.first['radius'], '5.0');
        expect(queries.first['lat'], '${kTopKLandmarks.first.lat}');
        expect(queries.first['source'], 'MOBILE_HOME');
        expect(queries.first.containsKey('lifestyle'), isFalse);

        expect(find.text('Top 1 • 92% phù hợp'), findsOneWidget);

        await tester.tap(find.text('Người đi làm'));
        await tester.pumpAndSettle();
        expect(queries.last['lifestyle'], 'office');
      }, () => client);
    });
  });

  group('Chi tiết phòng', () {
    testWidgets('Hiện giá dịch vụ thật, nội quy, đánh giá, liên hệ', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(800, 4000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      final client = MockClient((request) async {
        switch (request.url.path) {
          case '/api/landlords':
            return ok([
              {
                'id': 'x',
                'order': 1,
                'title': 'Không hút thuốc trong phòng',
                'content': 'Giữ an toàn PCCC',
                'isActive': true,
              },
              {'id': 'y', 'order': 2, 'title': 'Đã tắt', 'isActive': false},
            ]);
          case '/api/reviews':
            return ok({
              'summary': {'average': 0, 'count': 0, 'distribution': []},
              'items': [],
              'mine': null,
              'canReview': false,
              'signedIn': false,
            });
          case '/api/rooms':
            return ok({
              'items': [sampleRoom(id: 99), sampleRoom()],
              'total': 2,
              'totalPages': 1,
            });
          case '/api/rooms/12':
            return ok(sampleRoom());
        }
        return ok({});
      });
      await http.runWithClient(() async {
        await tester.pumpWidget(
          MaterialApp(home: RoomDetailScreen(room: sampleRoom())),
        );
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 50));

        expect(find.textContaining('30.000'), findsOneWidget);
        expect(find.text('Phí gửi xe máy'), findsOneWidget);
        expect(find.text('Tầng 3'), findsOneWidget);
        expect(find.text('Không hút thuốc trong phòng'), findsOneWidget);
        expect(find.text('Đã tắt'), findsNothing);
        expect(find.text('Đánh giá của người thuê'), findsOneWidget);
        expect(find.text('Chỉ đường'), findsOneWidget);
        expect(find.text('Chat Zalo'), findsOneWidget);
        expect(find.text('Phòng 99'), findsOneWidget);
        // Không gợi ý lại chính phòng đang xem
        expect(find.text('Phòng 12'), findsOneWidget);
      }, () => client);
    });

    test('Phòng liên quan ưu tiên cùng dự án, bỏ phòng đã thuê', () {
      final room = {...sampleRoom(), 'project_name': 'A'};
      final picked = pickRelatedRooms(room, [
        sampleRoom(),
        sampleRoom(id: 2, status: 'RENTED'),
        sampleRoom(id: 3),
        {...sampleRoom(id: 4), 'project_name': 'A'},
      ]);
      expect(picked.map((r) => r['id']).toList(), [4, 3]);
    });

    test('Link liên hệ đúng dạng', () {
      expect(phoneCallUri('090 123-4567').toString(), 'tel:0901234567');
      expect(zaloUri('0901234567').toString(), 'https://zalo.me/0901234567');
      expect(
        directionsUri(lat: 10.8, lng: 106.6).toString(),
        contains('destination=10.8%2C106.6'),
      );
      expect(
        directionsUri(address: '140 Lê Trọng Tấn').toString(),
        contains('/maps/search/'),
      );
    });
  });

  group('Đặt lịch', () {
    testWidgets('Khách vãng lai lưu mã tra cứu, gửi ghi chú đã nhập', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(800, 2000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      Map<String, dynamic>? body;
      final client = MockClient((request) async {
        if (request.method == 'POST') {
          body = Map<String, dynamic>.from(jsonDecode(request.body) as Map);
          return json({
            'success': true,
            'data': {'id': 'a1', 'status': 'PENDING'},
            'lookup_token': 'a1.signature',
          });
        }
        if (request.url.path == '/api/appointments/lookup') {
          return ok({
            'room_code': 'P.12',
            'date': '2026-11-10',
            'time_slot': '09:30 - 10:30',
            'status': 'PENDING',
            'user_name': 'An',
            'user_phone_masked': '090***567',
            'can_cancel': true,
          });
        }
        return ok({
          'available_days': ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
          'slots': [
            {'timeSlot': '09:30 - 10:30', 'enabled': true},
          ],
          'notice_hours': 2,
          'instructions': 'Gọi trước khi đến',
        });
      });
      await http.runWithClient(() async {
        await tester.pumpWidget(
          MaterialApp(
            home: Builder(
              builder: (context) => Scaffold(
                body: TextButton(
                  onPressed: () => openBookingSheet(context, sampleRoom()),
                  child: const Text('Mở đặt lịch'),
                ),
              ),
            ),
          ),
        );
        await tester.tap(find.text('Mở đặt lịch'));
        await tester.pumpAndSettle();
        expect(find.text('Gọi trước khi đến'), findsOneWidget);
        expect(find.textContaining('Báo trước 2h'), findsOneWidget);

        await tester.enterText(find.byType(TextFormField).at(0), 'Nguyễn An');
        await tester.enterText(find.byType(TextFormField).at(1), '0901234567');
        await tester.enterText(
          find.widgetWithText(TextField, 'Ghi chú thêm (không bắt buộc)'),
          'Xem cuối tuần',
        );
        await tester.tap(find.text('Xác nhận đặt lịch hẹn'));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));

        expect(body!['notes'], 'Xem cuối tuần');
        expect(GuestAppointmentStore.items.value.single.token, 'a1.signature');

        // Đặt xong tự mở trang theo dõi lịch, như web chuyển tới /lich-hen/<mã>
        await tester.pump(const Duration(milliseconds: 1300));
        await tester.pumpAndSettle();
        expect(find.byType(GuestAppointmentScreen), findsOneWidget);
        expect(find.text('Phòng P.12'), findsOneWidget);
      }, () => client);
    });

    test('Khung giờ và chỉ dẫn của chủ trọ đọc đúng', () {
      final availability = LandlordAvailability.fromJson({
        'available_days': ['T2'],
        'slots': [
          {'timeSlot': '09:30 - 10:30', 'enabled': true},
        ],
        'instructions': 'Gọi trước khi đến',
      });
      expect(availability.instructions, 'Gọi trước khi đến');
    });
  });

  group('Tra cứu lịch khách vãng lai', () {
    test('Nhận cả mã trần và link', () {
      expect(parseLookupToken(' a1.sig '), 'a1.sig');
      expect(
        parseLookupToken('https://elite.vn/lich-hen/a1.sig?x=1'),
        'a1.sig',
      );
      expect(parseLookupToken('khong hop le'), isNull);
      expect(parseLookupToken(''), isNull);
    });

    test('Lưu và quên mã, không trùng', () async {
      const item = SavedGuestAppointment(
        token: 'a.b',
        roomCode: 'P.1',
        roomTitle: 'Phòng 1',
        date: '2026-11-10',
        timeSlot: '09:30 - 10:30',
      );
      await GuestAppointmentStore.save(item);
      await GuestAppointmentStore.save(item);
      expect(GuestAppointmentStore.items.value.length, 1);

      GuestAppointmentStore.items.value = const [];
      await GuestAppointmentStore.load();
      expect(GuestAppointmentStore.items.value.single.roomCode, 'P.1');

      await GuestAppointmentStore.forget('a.b');
      expect(GuestAppointmentStore.items.value, isEmpty);
    });

    testWidgets('Mở bằng mã, hủy được lịch', (tester) async {
      var cancelled = false;
      Map<String, dynamic> view() => {
        'room_id': 12,
        'room_code': 'P.12',
        'room_title': 'Phòng 12',
        'date': '2026-11-10',
        'time_slot': '09:30 - 10:30',
        'status': cancelled ? 'CANCELLED' : 'PENDING',
        'user_name': 'An',
        'user_phone_masked': '090***567',
        'can_cancel': !cancelled,
      };
      final client = MockClient((request) async {
        expect(request.url.path, '/api/appointments/lookup');
        if (request.method == 'POST') {
          expect(jsonDecode(request.body), {
            'token': 'a1.sig',
            'action': 'CANCEL',
          });
          cancelled = true;
          return json({
            'success': true,
            'message': 'Đã hủy lịch xem phòng.',
            'data': view(),
          });
        }
        return ok(view());
      });
      await http.runWithClient(() async {
        await tester.pumpWidget(
          const MaterialApp(home: GuestAppointmentScreen(token: 'a1.sig')),
        );
        await tester.pumpAndSettle();
        expect(find.text('Phòng P.12'), findsOneWidget);
        expect(find.text('Chờ chủ trọ xác nhận'), findsOneWidget);
        expect(GuestAppointmentStore.items.value.single.token, 'a1.sig');

        await tester.tap(find.text('Hủy lịch xem phòng'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Hủy lịch'));
        await tester.pumpAndSettle();
        expect(find.text('Đã hủy'), findsOneWidget);
        expect(find.text('Hủy lịch xem phòng'), findsNothing);
      }, () => client);
    });

    testWidgets('Tab lịch hẹn của khách hiện danh sách đã lưu', (tester) async {
      GuestAppointmentStore.items.value = const [
        SavedGuestAppointment(
          token: 'a.b',
          roomCode: 'P.5',
          roomTitle: 'Phòng 5',
          date: '2026-11-10',
          timeSlot: '09:30 - 10:30',
        ),
      ];
      await tester.pumpWidget(const MaterialApp(home: MyAppointmentsScreen()));
      expect(find.byType(GuestAppointmentsSection), findsOneWidget);
      expect(find.text('Phòng P.5'), findsOneWidget);
      expect(find.text('Chưa có lịch hẹn'), findsNothing);
    });
  });

  group('Thông báo', () {
    AppNotification item(String id, String type, {bool read = false}) =>
        AppNotification(
          id: id,
          subject: 'Tiêu đề $id',
          summary: 'Nội dung $id',
          type: type,
          isRead: read,
        );

    test('Lọc theo chưa đọc và danh mục như web', () {
      final items = [
        item('1', 'MONTHLY_BILL'),
        item('2', 'BILL_PAID', read: true),
        item('3', 'APPOINTMENT_UPDATE'),
        item('4', 'CONTRACT_EXPIRY'),
        item('5', 'CONTRACT_CHECKIN'),
      ];
      List<String> ids(List<AppNotification> list) =>
          list.map((n) => n.id).toList();
      expect(ids(filterNotifications(items, category: 'BILL')), ['1', '2']);
      expect(
        ids(filterNotifications(items, unreadOnly: true, category: 'BILL')),
        ['1'],
      );
      expect(ids(filterNotifications(items, category: 'LIFECYCLE')), ['4']);
      expect(ids(filterNotifications(items, category: 'CONTRACT')), ['5']);
      expect(filterNotifications(items).length, 5);
    });

    test('Link nghiệp vụ mở đúng màn hình', () {
      expect(notificationTarget('/ho-so?tab=bills'), NotificationTarget.rental);
      expect(
        notificationTarget('/ho-so?tab=appointments'),
        NotificationTarget.appointments,
      );
      expect(notificationTarget('/o-ghep/ho-so'), NotificationTarget.roommate);
      expect(notificationTarget('/phong/12'), NotificationTarget.room);
      expect(notificationTarget('/khac'), isNull);
      expect(notificationTarget(null), isNull);
    });

    testWidgets('Đọc tất cả, lọc chưa đọc và xóa', (tester) async {
      final calls = <String>[];
      final client = MockClient((request) async {
        if (request.method == 'GET') {
          expect(request.url.queryParameters['scope'], 'mine');
          return ok([
            {
              'id': 'n1',
              'subject': 'Hóa đơn mới',
              'summary': 'Tháng 10',
              'type': 'MONTHLY_BILL',
              'isRead': false,
              'link': '/ho-so?tab=bills',
            },
            {
              'id': 'n2',
              'subject': 'Lịch đã xác nhận',
              'summary': 'Ngày mai',
              'type': 'APPOINTMENT_UPDATE',
              'isRead': true,
            },
          ]);
        }
        calls.add('${request.method} ${request.url.query} ${request.body}');
        return ok({});
      });
      await http.runWithClient(() async {
        await tester.pumpWidget(const MaterialApp(home: NotificationsScreen()));
        await tester.pumpAndSettle();
        expect(find.text('Chưa đọc (1)'), findsOneWidget);

        await tester.tap(find.text('Chưa đọc (1)'));
        await tester.pump();
        expect(find.text('Lịch đã xác nhận'), findsNothing);
        await tester.tap(find.text('Tất cả (2)'));
        await tester.pump();

        await tester.tap(find.text('Đọc tất cả'));
        await tester.pumpAndSettle();
        expect(calls.single, contains('"all":true'));
        expect(find.text('Chưa đọc (0)'), findsOneWidget);

        await tester.tap(find.byTooltip('Xóa thông báo').first);
        await tester.pumpAndSettle();
        await tester.tap(find.text('Xóa'));
        await tester.pumpAndSettle();
        expect(calls.last, contains('id=n1'));
        expect(find.text('Hóa đơn mới'), findsNothing);
      }, () => client);
    });
  });

  group('Đăng nhập bằng OTP và quên mật khẩu', () {
    testWidgets('Xin mã OTP đăng nhập', (tester) async {
      Map<String, dynamic>? body;
      final client = MockClient((request) async {
        body = Map<String, dynamic>.from(jsonDecode(request.body) as Map);
        return json({
          'success': true,
          'message': 'Đã tạo mã OTP xác thực.',
          'developmentCode': '123456',
        });
      });
      await http.runWithClient(() async {
        await tester.pumpWidget(const MaterialApp(home: AuthScreen()));
        await tester.tap(find.text('Mã OTP'));
        await tester.pump();
        await tester.enterText(
          find.widgetWithText(TextFormField, 'Email hoặc số điện thoại'),
          'an@example.com',
        );
        await tester.tap(find.text('Nhận mã'));
        await tester.pumpAndSettle();
        expect(body, {
          'action': 'REQUEST_AUTH_OTP',
          'identifier': 'an@example.com',
          'purpose': 'LOGIN',
        });
        expect(find.textContaining('123456'), findsOneWidget);
        expect(find.text('Gửi lại'), findsOneWidget);
      }, () => client);
    });

    testWidgets('Mã OTP phải đủ 6 chữ số', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: AuthScreen()));
      await tester.tap(find.text('Mã OTP'));
      await tester.pump();
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email hoặc số điện thoại'),
        'an@example.com',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Mã OTP gồm 6 chữ số'),
        '12',
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Đăng nhập'));
      await tester.pump();
      expect(find.text('Vui lòng nhập mã OTP gồm 6 chữ số.'), findsOneWidget);
    });

    testWidgets('Đặt lại mật khẩu bằng OTP', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      Map<String, dynamic>? body;
      final client = MockClient((request) async {
        body = Map<String, dynamic>.from(jsonDecode(request.body) as Map);
        return json({
          'success': true,
          'message': 'Đặt lại mật khẩu thành công.',
        });
      });
      await http.runWithClient(() async {
        await tester.pumpWidget(
          const MaterialApp(home: ForgotPasswordScreen()),
        );
        final fields = find.byType(TextFormField);
        await tester.enterText(fields.at(0), 'an@example.com');
        await tester.enterText(fields.at(1), '123456');
        await tester.enterText(fields.at(2), 'matkhau1');
        await tester.enterText(fields.at(3), 'matkhau2');
        await tester.tap(find.widgetWithText(FilledButton, 'Đặt lại mật khẩu'));
        await tester.pump();
        expect(find.text('Mật khẩu xác nhận không khớp.'), findsOneWidget);
        expect(body, isNull);

        await tester.enterText(fields.at(3), 'matkhau1');
        await tester.tap(find.widgetWithText(FilledButton, 'Đặt lại mật khẩu'));
        await tester.pumpAndSettle();
        expect(body, {
          'action': 'RESET_PASSWORD_WITH_OTP',
          'identifier': 'an@example.com',
          'code': '123456',
          'newPassword': 'matkhau1',
          'confirmPassword': 'matkhau1',
        });
      }, () => client);
    });
  });

  group('Hợp đồng', () {
    RentalContract contract(String end, {String status = 'ACTIVE'}) =>
        RentalContract.fromJson({
          'id': 'c1',
          'room_id': 12,
          'room_title': 'P.101 Studio',
          'tenant_name': 'An',
          'start_date': '2026-01-01',
          'end_date': end,
          'monthly_rent': 4500000,
          'deposit_amount': 4500000,
          'status': status,
          'tenant_signed': false,
          'deposit_refund_condition': 'Điều kiện riêng',
          'rules': ['r1'],
        });

    test('Nhắc sắp hết hạn trong 30 ngày', () {
      final now = DateTime(2026, 11, 4);
      expect(contract('2026-12-01').expiresSoon(now), isTrue);
      expect(contract('2026-12-05').expiresSoon(now), isFalse);
      expect(contract('2026-11-01').expiresSoon(now), isFalse);
      expect(
        contract('2026-12-01', status: 'EXPIRED').expiresSoon(now),
        isFalse,
      );
    });

    test('Nội quy theo hợp đồng và điều bắt buộc', () {
      const rules = [
        HouseRuleInfo(
          id: 'r1',
          order: 1,
          title: 'A',
          content: '',
          isActive: true,
        ),
        HouseRuleInfo(
          id: 'r2',
          order: 2,
          title: 'B',
          content: '',
          isActive: true,
        ),
        HouseRuleInfo(
          id: 'r3',
          order: 3,
          title: 'C',
          content: '',
          isActive: true,
          mandatory: true,
        ),
      ];
      expect(rulesForContract(rules, const []).length, 3);
      expect(rulesForContract(rules, const ['r1']).map((r) => r.id).toList(), [
        'r1',
        'r3',
      ]);
    });

    testWidgets('Hợp đồng hiện đủ các điều khoản', (tester) async {
      tester.view.physicalSize = const Size(800, 5000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      final client = MockClient(
        (_) async => ok([
          {
            'id': 'r1',
            'order': 1,
            'title': 'An toàn PCCC',
            'content': 'Không đun nấu trong phòng',
            'isActive': true,
            'penalty': 'Phạt 500.000đ',
          },
        ]),
      );
      await http.runWithClient(() async {
        await tester.pumpWidget(
          MaterialApp(
            home: ContractDetailScreen(contract: contract('2030-01-01')),
          ),
        );
        await tester.pumpAndSettle();
        for (var i = 1; i <= 8; i++) {
          expect(find.textContaining('Điều $i.'), findsOneWidget);
        }
        expect(find.text('Điều kiện riêng'), findsOneWidget);
        expect(find.text('6.1. An toàn PCCC'), findsOneWidget);
        expect(find.text('Chế tài: Phạt 500.000đ'), findsOneWidget);
      }, () => client);
    });
  });

  group('Ở ghép', () {
    RoommatePost post(String id, List<String> habits) => RoommatePost.fromJson({
      'id': id,
      'title': 'Bài $id',
      'required_habits': habits,
    });

    test('Lọc theo thói quen không phân biệt hoa thường', () {
      final posts = [
        post('1', ['Sạch sẽ']),
        post('2', ['Thể thao']),
      ];
      expect(filterPostsByHabit(posts, null).length, 2);
      expect(filterPostsByHabit(posts, 'sạch sẽ').single.id, '1');
    });

    testWidgets('Lọc mức chi phí gửi maxRent', (tester) async {
      final queries = <Map<String, String>>[];
      final client = MockClient((request) async {
        queries.add(request.url.queryParameters);
        return ok([]);
      });
      await http.runWithClient(() async {
        await tester.pumpWidget(const MaterialApp(home: RoommateScreen()));
        await tester.pumpAndSettle();
        expect(find.text('Sạch sẽ'), findsOneWidget);
        await tester.tap(find.text('Dưới 2.5 triệu/tháng'));
        await tester.pumpAndSettle();
        expect(queries.last['maxRent'], '2500000');
      }, () => client);
    });
  });

  group('Cập nhật tức thời', () {
    test('Đọc đúng sự kiện change, bỏ qua sự kiện khác', () {
      final parser = RealtimeFrameParser();
      expect(parser.addLine('event: ready'), isNull);
      expect(parser.addLine('data: {"ok":true}'), isNull);
      expect(parser.addLine(''), isNull);
      expect(parser.addLine(': ping'), isNull);
      expect(parser.addLine(''), isNull);

      parser.addLine('event: change');
      parser.addLine('data: {"type":"room","roomId":12,"at":1}');
      final change = parser.addLine('');
      expect(change?.type, 'room');
      expect(change?.roomId, 12);

      parser.addLine('event: change');
      parser.addLine('data: khong-phai-json');
      expect(parser.addLine(''), isNull);
    });
  });
}
