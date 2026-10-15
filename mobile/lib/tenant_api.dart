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

  bool get isPaid => status.toUpperCase() == 'PAID';

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

  static Future<String> payBill(String billId) async {
    final res = await ApiClient.sendRaw('POST', '/api/bills', {
      'action': 'PAY_BILL',
      'billId': billId,
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
