import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'auth.dart';
import 'main.dart' show kBaseUrl;

class ApiException implements Exception {
  const ApiException(this.message);
  final String message;

  @override
  String toString() => message;
}

/// Thin JSON client for the web backend. Every call carries the NextAuth
/// session cookie and unwraps `{success, data, message}` responses.
abstract final class ApiClient {
  static const _timeout = Duration(seconds: 20);

  static Future<dynamic> get(String path, [Map<String, String>? query]) =>
      _call('GET', path, query: query);

  static Future<dynamic> send(
    String method,
    String path, [
    Map<String, dynamic>? body,
  ]) => _call(method, path, body: body);

  /// Returns the full JSON map so callers can read `message` on success.
  static Future<Map<String, dynamic>> sendRaw(
    String method,
    String path, [
    Map<String, dynamic>? body,
  ]) async {
    final res = await _request(method, path, body: body);
    return _decode(res);
  }

  static Future<dynamic> _call(
    String method,
    String path, {
    Map<String, String>? query,
    Map<String, dynamic>? body,
  }) async {
    final res = await _request(method, path, query: query, body: body);
    return _decode(res)['data'];
  }

  static Future<http.Response> _request(
    String method,
    String path, {
    Map<String, String>? query,
    Map<String, dynamic>? body,
  }) async {
    try {
      final request =
          http.Request(
              method,
              Uri.parse('$kBaseUrl$path').replace(
                queryParameters: query == null || query.isEmpty ? null : query,
              ),
            )
            ..headers.addAll({
              ...AuthService.authHeaders,
              if (body != null) 'Content-Type': 'application/json',
            });
      if (body != null) request.body = jsonEncode(body);
      return await http.Response.fromStream(
        await request.send().timeout(_timeout),
      );
    } catch (e) {
      throw ApiException('Không kết nối được máy chủ $kBaseUrl ($e)');
    }
  }

  static Map<String, dynamic> _decode(http.Response res) {
    dynamic body;
    try {
      body = jsonDecode(utf8.decode(res.bodyBytes));
    } on FormatException {
      throw ApiException('Máy chủ trả về HTTP ${res.statusCode}.');
    }
    if (body is Map && body['success'] == true) {
      return Map<String, dynamic>.from(body);
    }
    final message = body is Map ? body['message'] : null;
    throw ApiException(
      message is String && message.isNotEmpty
          ? message
          : 'Máy chủ trả về HTTP ${res.statusCode}.',
    );
  }
}

double _num(dynamic v) => (v as num?)?.toDouble() ?? 0;

/// Thanh toán MÔ PHỎNG: hệ thống không kết nối ngân hàng, mã giao dịch có tiền tố SIM.
const kSimulatedPaymentNote =
    'Thanh toán mô phỏng phục vụ khóa luận: không trừ tiền thật. Mã QR và tài khoản chỉ để minh họa.';

String simulatedTransactionCode(String prefix, [DateTime? now]) {
  final t = now ?? DateTime.now();
  String two(int n) => n.toString().padLeft(2, '0');
  final stamp = '${t.year % 100}${two(t.month)}${two(t.day)}${two(t.hour)}${two(t.minute)}';
  final random = (t.microsecondsSinceEpoch % 1679616).toRadixString(36).toUpperCase().padLeft(4, '0');
  return 'SIM-$prefix-$stamp-$random';
}
String _str(dynamic v, [String fallback = '']) => v == null ? fallback : '$v';

// -------------------------------------------------------------
// MODELS (field names follow web/src/lib/db.ts mappers)
// -------------------------------------------------------------
class TenantAppointmentInfo {
  const TenantAppointmentInfo({
    required this.id,
    required this.roomId,
    required this.roomTitle,
    required this.roomCode,
    required this.date,
    required this.timeSlot,
    required this.status,
    required this.price,
    required this.roomStatus,
    this.address,
    this.roomImage,
    this.buildingName,
  });

  final String id;
  final int roomId;
  final String roomTitle;
  final String roomCode;
  final String date;
  final String timeSlot;

  /// PENDING | CONFIRMED | COMPLETED | CANCELLED
  final String status;
  final double price;

  /// Room lifecycle: AVAILABLE | RESERVED | RENTED ...
  final String roomStatus;
  final String? address;
  final String? roomImage;
  final String? buildingName;

  factory TenantAppointmentInfo.fromJson(Map<String, dynamic> j) =>
      TenantAppointmentInfo(
        id: _str(j['id']),
        roomId: (j['room_id'] as num?)?.toInt() ?? 0,
        roomTitle: _str(j['room_title'], 'Phòng #${j['room_id']}'),
        roomCode: _str(j['room_code']),
        date: _str(j['date']),
        timeSlot: _str(j['time_slot']),
        status: _str(j['status'], 'PENDING'),
        price: _num(j['price']),
        roomStatus: _str(j['room_status'], 'AVAILABLE'),
        address: j['address'] as String?,
        roomImage: j['room_image'] as String?,
        buildingName: j['building_name'] as String?,
      );
}

class RentalContract {
  const RentalContract({
    required this.id,
    required this.roomId,
    required this.roomTitle,
    required this.tenantName,
    required this.tenantPhone,
    required this.landlordName,
    required this.startDate,
    required this.endDate,
    required this.monthlyRent,
    required this.depositAmount,
    required this.status,
    required this.tenantSigned,
    this.tenantSignedAt,
  });

  final String id;
  final int roomId;
  final String roomTitle;
  final String tenantName;
  final String tenantPhone;
  final String landlordName;
  final String startDate;
  final String endDate;
  final double monthlyRent;
  final double depositAmount;
  final String status;
  final bool tenantSigned;
  final String? tenantSignedAt;

  factory RentalContract.fromJson(Map<String, dynamic> j) => RentalContract(
    id: _str(j['id']),
    roomId: (j['room_id'] as num?)?.toInt() ?? 0,
    roomTitle: _str(j['room_title'], 'Phòng #${j['room_id']}'),
    tenantName: _str(j['tenant_name']),
    tenantPhone: _str(j['tenant_phone']),
    landlordName: _str(j['landlord_name'], 'Chủ trọ'),
    startDate: _str(j['start_date']),
    endDate: _str(j['end_date']),
    monthlyRent: _num(j['monthly_rent']),
    depositAmount: _num(j['deposit_amount']),
    status: _str(j['status'], 'ACTIVE'),
    tenantSigned: j['tenant_signed'] == true,
    tenantSignedAt: j['tenant_signed_at'] as String?,
  );

  RentalContract copyWith({bool? tenantSigned, String? tenantSignedAt}) =>
      RentalContract(
        id: id,
        roomId: roomId,
        roomTitle: roomTitle,
        tenantName: tenantName,
        tenantPhone: tenantPhone,
        landlordName: landlordName,
        startDate: startDate,
        endDate: endDate,
        monthlyRent: monthlyRent,
        depositAmount: depositAmount,
        status: status,
        tenantSigned: tenantSigned ?? this.tenantSigned,
        tenantSignedAt: tenantSignedAt ?? this.tenantSignedAt,
      );
}

class HandoverItem {
  const HandoverItem({
    required this.assetName,
    required this.category,
    required this.quantity,
    required this.condition,
  });

  final String assetName;
  final String category;
  final int quantity;
  final String condition;

  factory HandoverItem.fromJson(Map<String, dynamic> j) => HandoverItem(
    assetName: _str(j['asset_name']),
    category: _str(j['category']),
    quantity: (j['quantity'] as num?)?.toInt() ?? 1,
    condition: _str(j['condition']),
  );
}

class Handover {
  const Handover({
    required this.id,
    required this.contractId,
    required this.roomId,
    required this.roomCode,
    required this.roomTitle,
    required this.type,
    required this.tenantName,
    required this.tenantPhone,
    required this.landlordName,
    required this.status,
    required this.tenantConfirmed,
    required this.landlordConfirmed,
    required this.damageCost,
    required this.items,
    this.handoverDate,
  });

  final String id;
  final String contractId;
  final int roomId;
  final String roomCode;
  final String roomTitle;

  /// CHECK_IN | CHECK_OUT
  final String type;
  final String tenantName;
  final String tenantPhone;
  final String landlordName;
  final String status;
  final bool tenantConfirmed;
  final bool landlordConfirmed;
  final double damageCost;
  final List<HandoverItem> items;
  final DateTime? handoverDate;

  factory Handover.fromJson(Map<String, dynamic> j) => Handover(
    id: _str(j['id']),
    contractId: _str(j['contract_id']),
    roomId: (j['room_id'] as num?)?.toInt() ?? 0,
    roomCode: _str(j['room_code']),
    roomTitle: _str(j['room_title'], 'Phòng #${j['room_id']}'),
    type: _str(j['type'], 'CHECK_IN'),
    tenantName: _str(j['tenant_name']),
    tenantPhone: _str(j['tenant_phone']),
    landlordName: _str(j['landlord_name']),
    status: _str(j['status']),
    tenantConfirmed: j['tenant_confirmed'] == true,
    landlordConfirmed: j['landlord_confirmed'] == true,
    damageCost: _num(j['damage_cost']),
    items: [
      for (final i in (j['items'] as List? ?? const []))
        if (i is Map) HandoverItem.fromJson(Map<String, dynamic>.from(i)),
    ],
    handoverDate: DateTime.tryParse(_str(j['handover_date'])),
  );
}

class UtilityBill {
  const UtilityBill({
    required this.id,
    required this.roomId,
    required this.roomCode,
    required this.month,
    required this.electricOld,
    required this.electricNew,
    required this.electricUsed,
    required this.electricCost,
    required this.waterOld,
    required this.waterNew,
    required this.waterUsed,
    required this.waterCost,
    required this.internetCost,
    required this.serviceCost,
    required this.rentCost,
    required this.totalAmount,
    required this.status,
    this.createdAt,
  });

  final String id;
  final int roomId;
  final String roomCode;
  final String month;
  final double electricOld;
  final double electricNew;
  final double electricUsed;
  final double electricCost;
  final double waterOld;
  final double waterNew;
  final double waterUsed;
  final double waterCost;
  final double internetCost;
  final double serviceCost;
  final double rentCost;
  final double totalAmount;

  /// UNPAID | PAID
  final String status;

  final DateTime? createdAt;

  bool get isPaid => status.toUpperCase() == 'PAID';

  /// First day of the billing month (`MM/YYYY`), used for sorting/grouping.
  DateTime? get period {
    final match = RegExp(r'^(\d{1,2})/(\d{4})$').firstMatch(month.trim());
    if (match == null) return null;
    return DateTime(int.parse(match.group(2)!), int.parse(match.group(1)!));
  }

  factory UtilityBill.fromJson(Map<String, dynamic> j) => UtilityBill(
    id: _str(j['id']),
    roomId: (j['room_id'] as num?)?.toInt() ?? 0,
    roomCode: _str(j['room_code']),
    month: _str(j['month']),
    electricOld: _num(j['electric_old']),
    electricNew: _num(j['electric_new']),
    electricUsed: _num(j['electric_used']),
    electricCost: _num(j['electric_cost']),
    waterOld: _num(j['water_old']),
    waterNew: _num(j['water_new']),
    waterUsed: _num(j['water_used']),
    waterCost: _num(j['water_cost']),
    internetCost: _num(j['internet_cost']),
    serviceCost: _num(j['service_cost']),
    rentCost: _num(j['rent_cost']),
    totalAmount: _num(j['total_amount']),
    status: _str(j['status'], 'UNPAID'),
    createdAt: DateTime.tryParse(_str(j['created_at'])),
  );
}

class AppNotification {
  const AppNotification({
    required this.id,
    required this.subject,
    required this.summary,
    required this.type,
    required this.isRead,
    this.sentAt,
  });

  final String id;
  final String subject;
  final String summary;
  final String type;
  final bool isRead;
  final DateTime? sentAt;

  factory AppNotification.fromJson(Map<String, dynamic> j) => AppNotification(
    id: _str(j['id']),
    subject: _str(j['subject']),
    summary: _str(j['summary']),
    type: _str(j['type']),
    isRead: j['isRead'] == true,
    sentAt: DateTime.tryParse(_str(j['sentAt'])),
  );
}

class TenantProfile {
  const TenantProfile({
    required this.name,
    required this.email,
    required this.phone,
    required this.phoneVerified,
  });

  final String name;
  final String email;
  final String phone;
  final bool phoneVerified;

  factory TenantProfile.fromJson(Map<String, dynamic> j) => TenantProfile(
    name: _str(j['name'], 'Khách thuê'),
    email: _str(j['email']),
    phone: _str(j['phone']),
    phoneVerified: j['phoneVerified'] == true,
  );
}

class RoommateProfileData {
  const RoommateProfileData({
    this.gender = 'Nữ',
    this.age,
    this.occupation = '',
    this.lifestyle = 'Introvert',
    this.habits = const [],
    this.bio = '',
    this.petFriendly = false,
    this.smokingStatus = false,
  });

  final String gender;
  final int? age;
  final String occupation;
  final String lifestyle;
  final List<String> habits;
  final String bio;
  final bool petFriendly;
  final bool smokingStatus;

  factory RoommateProfileData.fromJson(Map<String, dynamic> j) =>
      RoommateProfileData(
        gender: _str(j['gender'], 'Nữ'),
        age: (j['age'] as num?)?.toInt(),
        occupation: _str(j['occupation']),
        lifestyle: _str(j['lifestyle'], 'Introvert'),
        habits: [for (final h in (j['habits'] as List? ?? const [])) '$h'],
        bio: _str(j['bio']),
        petFriendly: j['pet_friendly'] == true,
        smokingStatus: j['smoking_status'] == true,
      );

  Map<String, dynamic> toJson() => {
    'gender': gender,
    'age': ?age,
    'occupation': occupation,
    'lifestyle': lifestyle,
    'habits': habits,
    'bio': bio,
    'pet_friendly': petFriendly,
    'smoking_status': smokingStatus,
  };
}

// -------------------------------------------------------------
// ENDPOINTS
// -------------------------------------------------------------
abstract final class TenantApi {
  // Rooms ------------------------------------------------------
  static Future<({List<dynamic> items, int total, int totalPages})> searchRooms(
    Map<String, String> filters,
  ) async {
    final data = await ApiClient.get('/api/rooms', filters);
    final map = data is Map ? data : const {};
    return (
      items: (map['items'] as List?) ?? const [],
      total: (map['total'] as num?)?.toInt() ?? 0,
      totalPages: (map['totalPages'] as num?)?.toInt() ?? 1,
    );
  }

  static Future<Map<String, dynamic>?> fetchRoom(int id) async {
    final data = await ApiClient.get('/api/rooms/$id');
    return data is Map ? Map<String, dynamic>.from(data) : null;
  }

  // Appointments ----------------------------------------------
  static Future<List<TenantAppointmentInfo>> fetchAppointments() async {
    final data = await ApiClient.get('/api/appointments');
    return [
      for (final a in (data as List? ?? const []))
        if (a is Map)
          TenantAppointmentInfo.fromJson(Map<String, dynamic>.from(a)),
    ];
  }

  static Future<void> cancelAppointment(String id) => ApiClient.send(
    'PATCH',
    '/api/appointments',
    {'id': id, 'status': 'CANCELLED'},
  );

  // Deposit ----------------------------------------------------
  static Future<String> deposit({
    required int roomId,
    required String moveInDate,
    required int vehicleCount,
    required String transactionCode,
    String notes = '',
  }) async {
    final res = await ApiClient.sendRaw('POST', '/api/rooms/deposit', {
      'roomId': roomId,
      'moveInDate': moveInDate,
      'vehicleCount': vehicleCount,
      'paymentMethod': 'BANK_TRANSFER',
      'transactionCode': transactionCode,
      'notes': notes,
    });
    return _str(res['message'], 'Đặt cọc giữ chỗ thành công!');
  }

  /// reason: EXPIRED_NO_SHOW | TENANT_REQUEST | MUTUAL_AGREEMENT
  static Future<String> cancelDeposit({
    required int roomId,
    required String reason,
    String notes = '',
  }) async {
    final res = await ApiClient.sendRaw('POST', '/api/rooms/deposit/cancel', {
      'roomId': roomId,
      'reason': reason,
      'forfeitDeposit': true,
      'notes': notes,
    });
    return _str(res['message'], 'Đã hủy giữ chỗ.');
  }

  // Contracts --------------------------------------------------
  static Future<List<RentalContract>> fetchContracts() async {
    final data = await ApiClient.get('/api/landlords', {'type': 'contracts'});
    return [
      for (final c in (data as List? ?? const []))
        if (c is Map) RentalContract.fromJson(Map<String, dynamic>.from(c)),
    ];
  }

  static Future<String?> signContract(String contractId) async {
    final data = await ApiClient.send('POST', '/api/landlords', {
      'action': 'SIGN_CONTRACT',
      'contractId': contractId,
    });
    return data is Map ? data['tenant_signed_at'] as String? : null;
  }

  static Future<String> renewContract(String contractId, int months) async {
    final res = await ApiClient.sendRaw('POST', '/api/contracts/renew', {
      'contractId': contractId,
      'monthsToExtend': months,
    });
    return _str(res['message'], 'Gia hạn hợp đồng thành công!');
  }

  static Future<String> checkout({
    required String contractId,
    required int roomId,
    required int finalElectric,
    required int finalWater,
    required String tenantBankInfo,
    String deductionNotes =
        'Thiết bị nguyên vẹn, hao mòn tự nhiên thông thường.',
  }) async {
    final res = await ApiClient.sendRaw('POST', '/api/contracts/checkout', {
      'contractId': contractId,
      'roomId': roomId,
      'finalElectric': finalElectric,
      'finalWater': finalWater,
      'damageCost': 0,
      'deductionNotes': deductionNotes,
      'tenantBankInfo': tenantBankInfo,
    });
    return _str(res['message'], 'Đã gửi yêu cầu trả phòng.');
  }

  // Handover ---------------------------------------------------
  static Future<List<Handover>> fetchHandovers({int? roomId}) async {
    final data = await ApiClient.get('/api/handover', {
      if (roomId != null) 'roomId': '$roomId',
    });
    return [
      for (final h in (data as List? ?? const []))
        if (h is Map) Handover.fromJson(Map<String, dynamic>.from(h)),
    ];
  }

  static Future<void> confirmHandover(String handoverId) => ApiClient.send(
    'POST',
    '/api/handover',
    {'action': 'CONFIRM_HANDOVER', 'handoverId': handoverId, 'role': 'TENANT'},
  );

  // Bills ------------------------------------------------------
  static Future<List<UtilityBill>> fetchBills(int roomId) async {
    final data = await ApiClient.get('/api/bills', {'roomId': '$roomId'});
    return [
      for (final b in (data as List? ?? const []))
        if (b is Map) UtilityBill.fromJson(Map<String, dynamic>.from(b)),
    ];
  }

  static Future<String> payBill(String billId, String transactionCode) async {
    final res = await ApiClient.sendRaw('POST', '/api/bills', {
      'action': 'PAY_BILL',
      'billId': billId,
      'transactionCode': transactionCode,
    });
    return _str(res['message'], 'Thanh toán hóa đơn thành công!');
  }

  // Profile ----------------------------------------------------
  static Future<TenantProfile> fetchProfile() async {
    final data = await ApiClient.get('/api/user/profile');
    return TenantProfile.fromJson(Map<String, dynamic>.from(data as Map));
  }

  static Future<String> updateProfile({
    required String name,
    required String phone,
  }) async {
    final res = await ApiClient.sendRaw('PUT', '/api/user/profile', {
      'name': name,
      'phone': phone,
    });
    return _str(res['message'], 'Cập nhật hồ sơ thành công!');
  }

  /// Returns the development OTP when the backend runs outside production.
  static Future<({String message, String? developmentCode})> requestPhoneOtp(
    String phone,
  ) async {
    final res = await ApiClient.sendRaw('POST', '/api/auth/verify-phone', {
      'phone': phone,
      'action': 'REQUEST_CODE',
    });
    return (
      message: _str(res['message'], 'Đã gửi mã OTP.'),
      developmentCode: res['developmentCode'] as String?,
    );
  }

  static Future<void> verifyPhoneOtp(String phone, String code) =>
      ApiClient.send('POST', '/api/auth/verify-phone', {
        'phone': phone,
        'code': code,
        'action': 'VERIFY_CODE',
      });

  // Notifications ---------------------------------------------
  static Future<List<AppNotification>> fetchNotifications(String email) async {
    final data = await ApiClient.get('/api/notifications', {'email': email});
    return [
      for (final n in (data as List? ?? const []))
        if (n is Map) AppNotification.fromJson(Map<String, dynamic>.from(n)),
    ];
  }

  static Future<void> markNotificationRead(String id) =>
      ApiClient.send('PATCH', '/api/notifications', {'id': id});

  // Roommate profile ------------------------------------------
  static Future<RoommateProfileData?> fetchRoommateProfile() async {
    final data = await ApiClient.get('/api/roommate/profile');
    return data is Map
        ? RoommateProfileData.fromJson(Map<String, dynamic>.from(data))
        : null;
  }

  static Future<void> saveRoommateProfile(RoommateProfileData profile) =>
      ApiClient.send('POST', '/api/roommate/profile', profile.toJson());

  // Hồ sơ nhu cầu (dùng cho gợi ý Top-K) --------------------------------
  static Future<({PreferenceProfile? profile, List<String> districts, List<String> amenities})>
  fetchPreferences() async {
    final data = await ApiClient.get('/api/user/preferences');
    final map = data is Map ? data : const {};
    final options = map['options'] is Map ? map['options'] as Map : const {};
    return (
      profile: map['profile'] is Map
          ? PreferenceProfile.fromJson(Map<String, dynamic>.from(map['profile']))
          : null,
      districts: [
        for (final d in (options['districts'] as List? ?? const []))
          if (d is Map) _str(d['district']),
      ],
      amenities: [for (final a in (options['amenities'] as List? ?? const [])) _str(a)],
    );
  }

  static Future<String> savePreferences(PreferenceProfile profile) async {
    final res = await ApiClient.sendRaw('PUT', '/api/user/preferences', profile.toJson());
    return _str(res['message'], 'Đã lưu hồ sơ nhu cầu.');
  }

  // Tìm phòng gần vị trí hiện tại ---------------------------------------
  static Future<List<dynamic>> fetchNearby({
    required double lat,
    required double lng,
    double radiusKm = 3,
  }) async {
    final data = await ApiClient.get('/api/rooms/nearby', {
      'lat': '$lat',
      'lng': '$lng',
      'radius': '$radiusKm',
      'limit': '30',
    });
    return data is Map ? (data['items'] as List? ?? const []) : const [];
  }

  // Ghi lượt xem / lượt bấm từ danh sách gợi ý (đo CTR) -------------------
  static Future<void> recordView(int roomId, {String? recommendationId}) async {
    try {
      await ApiClient.sendRaw('POST', '/api/interactions', {
        'action': 'VIEW',
        'roomId': roomId,
        'recommendationId': ?recommendationId,
      });
    } catch (_) {
      // ghi hành vi là phụ, không làm phiền người dùng
    }
  }

  // Khung giờ đón khách của chủ trọ + đổi lịch hẹn -------------------------
  static Future<LandlordAvailability> fetchAvailability(int roomId) async {
    final data = await ApiClient.get('/api/landlords', {
      'type': 'availability',
      'roomId': '$roomId',
    });
    return LandlordAvailability.fromJson(
      data is Map ? Map<String, dynamic>.from(data) : const {},
    );
  }

  static Future<String> rescheduleAppointment({
    required String id,
    required String date,
    required String timeSlot,
    String? reason,
  }) async {
    final res = await ApiClient.sendRaw('PATCH', '/api/appointments', {
      'id': id,
      'action': 'RESCHEDULE',
      'date': date,
      'time_slot': timeSlot,
      'reason': ?reason,
    });
    return _str(res['message'], 'Đã đổi lịch xem phòng.');
  }

  // Thông báo đẩy FCM ---------------------------------------------------
  static Future<void> registerDeviceToken(String token, String platform) =>
      ApiClient.send('POST', '/api/user/device-token', {
        'token': token,
        'platform': platform,
      });

  static Future<void> unregisterDeviceToken(String token) =>
      ApiClient.send('DELETE', '/api/user/device-token', {'token': token});
}

// -------------------------------------------------------------
// FAVORITES (kept on device, like the web's LocalStorage favorites)
// -------------------------------------------------------------
abstract final class FavoritesStore {
  static const _key = 'favorite_rooms_v1';

  /// roomId -> room JSON snapshot so the list renders offline.
  static final ValueNotifier<Map<int, Map<String, dynamic>>> rooms =
      ValueNotifier({});

  static bool contains(dynamic roomId) =>
      rooms.value.containsKey(int.tryParse('$roomId'));

  static Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_key);
      if (raw == null) return;
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      rooms.value = {
        for (final e in decoded.entries)
          if (int.tryParse(e.key) != null && e.value is Map)
            int.parse(e.key): Map<String, dynamic>.from(e.value as Map),
      };
    } catch (e) {
      debugPrint('Favorites load failed: $e');
    }
  }

  /// Returns true when the room is now a favorite.
  static Future<bool> toggle(Map<String, dynamic> room) async {
    final id = int.tryParse('${room['id']}');
    if (id == null) return false;
    final next = Map<int, Map<String, dynamic>>.from(rooms.value);
    final added = next.remove(id) == null;
    if (added) next[id] = room;
    rooms.value = next;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _key,
        jsonEncode({for (final e in next.entries) '${e.key}': e.value}),
      );
    } catch (e) {
      debugPrint('Favorites save failed: $e');
    }
    return added;
  }
}


/// Hồ sơ nhu cầu thuê phòng của người thuê (GET/PUT /api/user/preferences).
class PreferenceProfile {
  const PreferenceProfile({
    required this.budgetMax,
    required this.maxRadiusKm,
    required this.amenities,
    this.district,
    this.targetLat,
    this.targetLng,
  });

  final double budgetMax;
  final double maxRadiusKm;
  final List<String> amenities;
  final String? district;
  final double? targetLat;
  final double? targetLng;

  factory PreferenceProfile.fromJson(Map<String, dynamic> json) => PreferenceProfile(
    budgetMax: _num(json['budget_max']) > 0 ? _num(json['budget_max']) : 4500000,
    maxRadiusKm: _num(json['max_radius_km']) > 0 ? _num(json['max_radius_km']) : 5,
    amenities: [for (final a in (json['preferred_amenities'] as List? ?? const [])) '$a'],
    district: json['preferred_district'] as String?,
    targetLat: (json['target_lat'] as num?)?.toDouble(),
    targetLng: (json['target_lng'] as num?)?.toDouble(),
  );

  Map<String, dynamic> toJson() => {
    'budget_max': budgetMax.round(),
    'max_radius_km': maxRadiusKm,
    'preferred_amenities': amenities,
    'preferred_district': district,
    'target_lat': targetLat,
    'target_lng': targetLng,
  };

  PreferenceProfile copyWith({
    double? budgetMax,
    double? maxRadiusKm,
    List<String>? amenities,
    String? district,
    double? targetLat,
    double? targetLng,
  }) => PreferenceProfile(
    budgetMax: budgetMax ?? this.budgetMax,
    maxRadiusKm: maxRadiusKm ?? this.maxRadiusKm,
    amenities: amenities ?? this.amenities,
    district: district ?? this.district,
    targetLat: targetLat ?? this.targetLat,
    targetLng: targetLng ?? this.targetLng,
  );
}

/// Khung giờ đón khách xem phòng do chủ trọ cấu hình.
class LandlordAvailability {
  const LandlordAvailability({
    required this.availableDays,
    required this.slots,
    required this.noticeHours,
  });

  final List<String> availableDays; // T2..T7, CN
  final List<String> slots; // chỉ các khung giờ đang bật
  final int noticeHours;

  static const _dayCodes = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  factory LandlordAvailability.fromJson(Map<String, dynamic> json) =>
      LandlordAvailability(
        availableDays: [for (final d in (json['available_days'] as List? ?? const [])) '$d'],
        slots: [
          for (final s in (json['slots'] as List? ?? const []))
            if (s is Map && s['enabled'] == true) '${s['timeSlot']}',
        ],
        noticeHours: (json['notice_hours'] as num?)?.toInt() ?? 0,
      );

  /// Mã ngày theo cách chủ trọ cấu hình (DateTime.weekday: 1 = Thứ hai … 7 = Chủ nhật).
  static String dayCode(DateTime d) => _dayCodes[d.weekday - 1];

  bool isOpenOn(DateTime d) => availableDays.isEmpty || availableDays.contains(dayCode(d));

  /// Khung giờ còn đặt được trong ngày [d] (trong ngày hôm nay phải trước [noticeHours] giờ).
  List<String> slotsFor(DateTime d, {DateTime? now}) {
    final current = now ?? DateTime.now();
    final sameDay = d.year == current.year && d.month == current.month && d.day == current.day;
    if (!sameDay) return slots;
    final minStart = current.hour * 60 + current.minute + noticeHours * 60;
    return slots.where((s) {
      final m = RegExp(r'^(\d{2}):(\d{2})').firstMatch(s);
      if (m == null) return true;
      return int.parse(m.group(1)!) * 60 + int.parse(m.group(2)!) >= minStart;
    }).toList();
  }
}
