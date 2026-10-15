import 'dart:convert';

import 'package:http/http.dart' as http;

import 'auth.dart';
import 'main.dart' show kBaseUrl;

/// Same options as the web form (web/src/app/o-ghep/dang-bai/page.tsx).
const List<String> kRoommateHabitOptions = [
  'Sạch sẽ',
  'Ngủ sớm (trước 23h30)',
  'Dậy sớm',
  'Không hút thuốc',
  'Thích nấu ăn',
  'Yên tĩnh học bài',
  'Thân thiện hòa đồng',
  'Yêu thích thú cưng',
  'Tập thể thao',
  'Không tụ tập bạn bè qua đêm',
];

const List<String> kRoommateGenderOptions = ['Nữ', 'Nam', 'Không yêu cầu'];

const List<String> kRoommateDistricts = [
  'Quận Tân Phú',
  'Quận Tân Bình',
  'Quận Bình Tân',
  'Quận Gò Vấp',
  'Quận 10',
  'Thủ Đức',
];

class RoommatePost {
  const RoommatePost({
    required this.id,
    required this.userId,
    required this.title,
    required this.description,
    required this.sharedRent,
    required this.maxPeople,
    required this.currentPeople,
    required this.genderPreference,
    required this.requiredHabits,
    required this.images,
    required this.contactPhone,
    required this.district,
    required this.address,
    required this.userName,
    this.userImage,
    this.roomTitle,
    this.createdAt,
    this.compatibilityScore,
  });

  final String id;
  final String userId;
  final String title;
  final String description;
  final double sharedRent;
  final int maxPeople;
  final int currentPeople;
  final String genderPreference;
  final List<String> requiredHabits;
  final List<String> images;
  final String contactPhone;
  final String district;
  final String address;
  final String userName;
  final String? userImage;
  final String? roomTitle;
  final DateTime? createdAt;
  final double? compatibilityScore;

  int get slotsLeft => (maxPeople - currentPeople).clamp(0, maxPeople);

  factory RoommatePost.fromJson(Map<String, dynamic> json) => RoommatePost(
    id: '${json['id']}',
    userId: '${json['user_id'] ?? ''}',
    title: '${json['title'] ?? ''}',
    description: '${json['description'] ?? ''}',
    sharedRent: (json['shared_rent'] as num?)?.toDouble() ?? 0,
    maxPeople: (json['max_people'] as num?)?.toInt() ?? 2,
    currentPeople: (json['current_people'] as num?)?.toInt() ?? 1,
    genderPreference: '${json['gender_preference'] ?? 'Không yêu cầu'}',
    requiredHabits: [
      for (final h in (json['required_habits'] as List? ?? const [])) '$h',
    ],
    images: [for (final i in (json['images'] as List? ?? const [])) '$i'],
    contactPhone: '${json['contact_phone'] ?? ''}',
    district: '${json['district'] ?? ''}',
    address: '${json['address'] ?? ''}',
    userName: '${json['user_name'] ?? 'Người thuê'}',
    userImage: json['user_image'] as String?,
    roomTitle: json['room_title'] as String?,
    createdAt: DateTime.tryParse('${json['created_at']}'),
    compatibilityScore: (json['compatibility_score'] as num?)?.toDouble(),
  );
}

class RoommateRequest {
  const RoommateRequest({
    required this.id,
    required this.postId,
    required this.requesterId,
    required this.message,
    required this.status,
    required this.requesterName,
    required this.requesterPhone,
    required this.postTitle,
    this.createdAt,
  });

  final String id;
  final String postId;
  final String requesterId;
  final String message;

  /// PENDING | ACCEPTED | REJECTED
  final String status;
  final String requesterName;
  final String requesterPhone;
  final String postTitle;
  final DateTime? createdAt;

  factory RoommateRequest.fromJson(Map<String, dynamic> json) =>
      RoommateRequest(
        id: '${json['id']}',
        postId: '${json['post_id'] ?? ''}',
        requesterId: '${json['requester_id'] ?? ''}',
        message: '${json['message'] ?? ''}',
        status: '${json['status'] ?? 'PENDING'}',
        requesterName: '${json['requester_name'] ?? 'Khách thuê'}',
        requesterPhone: '${json['requester_phone'] ?? ''}',
        postTitle: '${json['post_title'] ?? 'Bài đăng ở ghép'}',
        createdAt: DateTime.tryParse('${json['created_at']}'),
      );
}

class RoommateApiException implements Exception {
  const RoommateApiException(this.message);
  final String message;

  @override
  String toString() => message;
}

/// Client for web/src/app/api/roommate/*. Sends the NextAuth session so
/// posts and requests belong to the signed-in tenant, exactly like the web.
abstract final class RoommateApi {
  static const _timeout = Duration(seconds: 15);

  static Future<List<RoommatePost>> fetchPosts({
    String district = 'all',
    String gender = 'all',
    String search = '',
    String? authorId,
  }) async {
    final user = AuthService.currentUser.value;
    final data = await _get('/api/roommate/posts', {
      if (district != 'all') 'district': district,
      if (gender != 'all') 'gender': gender,
      if (search.trim().isNotEmpty) 'search': search.trim(),
      'authorId': ?authorId,
      // Lets the backend rank posts by compatibility with the tenant profile.
      if (user != null && authorId == null) 'userId': user.id,
    });
    return [
      for (final raw in data as List)
        if (raw is Map) RoommatePost.fromJson(Map<String, dynamic>.from(raw)),
    ];
  }

  static Future<RoommatePost> fetchPost(String id) async {
    final data = await _get('/api/roommate/posts/${Uri.encodeComponent(id)}');
    return RoommatePost.fromJson(Map<String, dynamic>.from(data as Map));
  }

  static Future<RoommatePost> createPost({
    required String title,
    required String description,
    required double sharedRent,
    required int maxPeople,
    required int currentPeople,
    required String genderPreference,
    required List<String> requiredHabits,
    required String district,
    required String address,
    required String contactPhone,
  }) async {
    final data = await _send('POST', '/api/roommate/posts', {
      'title': title,
      'description': description,
      'shared_rent': sharedRent,
      'max_people': maxPeople,
      'current_people': currentPeople,
      'gender_preference': genderPreference,
      'required_habits': requiredHabits,
      'district': district,
      'address': address,
      'contact_phone': contactPhone,
    });
    return RoommatePost.fromJson(Map<String, dynamic>.from(data as Map));
  }

  static Future<void> sendRequest({
    required String postId,
    required String message,
  }) => _send('POST', '/api/roommate/requests', {
    'post_id': postId,
    'message': message,
  });

  /// Requests other tenants sent to my posts.
  static Future<List<RoommateRequest>> fetchReceivedRequests(String userId) =>
      _fetchRequests({'ownerId': userId});

  /// Requests I sent to other tenants' posts.
  static Future<List<RoommateRequest>> fetchSentRequests(String userId) =>
      _fetchRequests({'requesterId': userId});

  static Future<void> updateRequestStatus(String id, String status) =>
      _send('PATCH', '/api/roommate/requests', {'id': id, 'status': status});

  static Future<List<RoommateRequest>> _fetchRequests(
    Map<String, String> query,
  ) async {
    final data = await _get('/api/roommate/requests', query);
    return [
      for (final raw in data as List)
        if (raw is Map)
          RoommateRequest.fromJson(Map<String, dynamic>.from(raw)),
    ];
  }

  static Future<dynamic> _get(String path, [Map<String, String>? query]) async {
    try {
      final res = await http
          .get(
            Uri.parse('$kBaseUrl$path').replace(queryParameters: query),
            headers: AuthService.authHeaders,
          )
          .timeout(_timeout);
      return _unwrap(res);
    } on RoommateApiException {
      rethrow;
    } catch (e) {
      throw RoommateApiException('Không kết nối được máy chủ $kBaseUrl ($e)');
    }
  }

  static Future<dynamic> _send(
    String method,
    String path,
    Map<String, dynamic> body,
  ) async {
    try {
      final request = http.Request(method, Uri.parse('$kBaseUrl$path'))
        ..headers.addAll({
          ...AuthService.authHeaders,
          'Content-Type': 'application/json',
        })
        ..body = jsonEncode(body);
      final res = await http.Response.fromStream(
        await request.send().timeout(_timeout),
      );
      return _unwrap(res);
    } on RoommateApiException {
      rethrow;
    } catch (e) {
      throw RoommateApiException('Không kết nối được máy chủ $kBaseUrl ($e)');
    }
  }

  static dynamic _unwrap(http.Response res) {
    dynamic body;
    try {
      body = jsonDecode(utf8.decode(res.bodyBytes));
    } on FormatException {
      throw RoommateApiException('Máy chủ trả về HTTP ${res.statusCode}.');
    }
    if (body is Map && body['success'] == true) return body['data'];
    final message = body is Map ? body['message'] : null;
    throw RoommateApiException(
      message is String && message.isNotEmpty
          ? message
          : 'Máy chủ trả về HTTP ${res.statusCode}.',
    );
  }
}
