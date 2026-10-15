import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'main.dart' show kBaseUrl;

/// Signed-in tenant, as returned by NextAuth `/api/auth/session`.
class AuthUser {
  const AuthUser({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.role,
    this.image,
    this.phoneVerified = false,
  });

  final String id;
  final String name;
  final String email;
  final String phone;
  final String role;
  final String? image;
  final bool phoneVerified;

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
    id: '${json['id'] ?? ''}',
    name: '${json['name'] ?? 'Khách thuê'}',
    email: '${json['email'] ?? ''}',
    phone: '${json['phone'] ?? ''}',
    role: '${json['role'] ?? 'TENANT'}',
    image: json['image'] as String?,
    phoneVerified: json['phoneVerified'] == true,
  );
}

class AuthException implements Exception {
  const AuthException(this.message);
  final String message;

  @override
  String toString() => message;
}

/// Mobile client for the web's NextAuth credentials provider
/// (`loginType` TENANT_PASSWORD / TENANT_REGISTER in web/src/lib/auth.ts).
/// The session cookie is persisted so the tenant stays signed in.
abstract final class AuthService {
  static const _cookieKey = 'auth_session_cookies';
  static const _timeout = Duration(seconds: 20);

  static final ValueNotifier<AuthUser?> currentUser = ValueNotifier<AuthUser?>(
    null,
  );
  static final Map<String, String> _cookies = {};

  static bool get isSignedIn => currentUser.value != null;

  /// Headers to attach to API calls so the backend sees the session.
  static Map<String, String> get authHeaders => _cookies.isEmpty
      ? const {}
      : {
          'Cookie': _cookies.entries
              .map((e) => '${e.key}=${e.value}')
              .join('; '),
        };

  /// Restores a saved session on app start; silently ignores failures.
  static Future<void> restore() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_cookieKey);
      if (saved == null) return;
      _cookies
        ..clear()
        ..addAll(Map<String, String>.from(jsonDecode(saved) as Map));
      await _loadSession();
    } catch (e) {
      debugPrint('Auth restore failed: $e');
    }
  }

  static Future<AuthUser> login({
    required String identifier,
    required String password,
  }) {
    final isEmail = identifier.contains('@');
    return _signIn({
      'loginType': 'TENANT_PASSWORD',
      if (isEmail) 'email': identifier.trim() else 'phone': identifier.trim(),
      'password': password,
    });
  }

  static Future<AuthUser> register({
    required String name,
    required String email,
    required String phone,
    required String password,
  }) {
    return _signIn({
      'loginType': 'TENANT_REGISTER',
      'name': name.trim(),
      'email': email.trim(),
      'phone': phone.trim(),
      'password': password,
    });
  }

  /// Pushes changed fields (name, phone, phoneVerified) into the NextAuth JWT,
  /// like the web's `useSession().update(...)`, then reloads the user.
  static Future<void> updateSession(Map<String, dynamic> changes) async {
    if (_cookies.isEmpty) return;
    try {
      final csrfRes = await http
          .get(Uri.parse('$kBaseUrl/api/auth/csrf'), headers: authHeaders)
          .timeout(_timeout);
      _storeCookies(csrfRes);
      final csrfToken = (jsonDecode(csrfRes.body) as Map)['csrfToken'];
      final res = await http
          .post(
            Uri.parse('$kBaseUrl/api/auth/session'),
            headers: {...authHeaders, 'Content-Type': 'application/json'},
            body: jsonEncode({'csrfToken': csrfToken, 'data': changes}),
          )
          .timeout(_timeout);
      _storeCookies(res);
      await _loadSession();
      await _persist();
    } catch (e) {
      debugPrint('Session update failed: $e');
    }
  }

  static Future<void> logout() async {
    _cookies.clear();
    currentUser.value = null;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_cookieKey);
    } catch (e) {
      debugPrint('Auth logout cleanup failed: $e');
    }
  }

  static Future<AuthUser> _signIn(Map<String, String> fields) async {
    try {
      // 1. CSRF token (also sets the csrf cookie NextAuth checks).
      final csrfRes = await http
          .get(Uri.parse('$kBaseUrl/api/auth/csrf'), headers: authHeaders)
          .timeout(_timeout);
      _storeCookies(csrfRes);
      final csrfToken = (jsonDecode(csrfRes.body) as Map)['csrfToken'];
      if (csrfToken is! String) {
        throw const AuthException('Không lấy được mã bảo mật từ máy chủ.');
      }

      // 2. Credentials callback; json=true returns {url} instead of redirecting.
      final res = await http
          .post(
            Uri.parse('$kBaseUrl/api/auth/callback/credentials'),
            headers: {
              ...authHeaders,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: {...fields, 'csrfToken': csrfToken, 'json': 'true'},
          )
          .timeout(_timeout);
      _storeCookies(res);

      final error = _errorFrom(res);
      if (error != null) throw AuthException(error);

      final user = await _loadSession();
      if (user == null) {
        throw const AuthException(
          'Đăng nhập không thành công. Vui lòng thử lại.',
        );
      }
      await _persist();
      return user;
    } on AuthException {
      rethrow;
    } catch (e) {
      throw AuthException('Không kết nối được máy chủ $kBaseUrl ($e)');
    }
  }

  static Future<AuthUser?> _loadSession() async {
    final res = await http
        .get(Uri.parse('$kBaseUrl/api/auth/session'), headers: authHeaders)
        .timeout(_timeout);
    _storeCookies(res);
    final body = jsonDecode(utf8.decode(res.bodyBytes));
    final userJson = body is Map ? body['user'] : null;
    final user = userJson is Map
        ? AuthUser.fromJson(Map<String, dynamic>.from(userJson))
        : null;
    currentUser.value = user;
    if (user == null) _cookies.remove('next-auth.session-token');
    return user;
  }

  static String? _errorFrom(http.Response res) {
    String? url;
    try {
      final body = jsonDecode(utf8.decode(res.bodyBytes));
      if (body is Map) url = body['url'] as String?;
    } on FormatException {
      return 'Máy chủ trả về HTTP ${res.statusCode}.';
    }
    final error = url == null ? null : Uri.parse(url).queryParameters['error'];
    if (error != null) {
      return error == 'CredentialsSignin'
          ? 'Thông tin đăng nhập không chính xác.'
          : error;
    }
    if (res.statusCode >= 400) return 'Máy chủ trả về HTTP ${res.statusCode}.';
    return null;
  }

  /// Keeps NextAuth cookies from `Set-Cookie` (http joins multiple with ",").
  static void _storeCookies(http.Response res) {
    final raw = res.headers['set-cookie'];
    if (raw == null) return;
    for (final cookie in raw.split(RegExp(r',(?=\s*[^;,=\s]+=)'))) {
      final pair = cookie.split(';').first.trim();
      final eq = pair.indexOf('=');
      if (eq <= 0) continue;
      final name = pair.substring(0, eq);
      final value = pair.substring(eq + 1);
      if (!name.contains('next-auth')) continue;
      if (value.isEmpty) {
        _cookies.remove(name);
      } else {
        _cookies[name] = value;
      }
    }
  }

  static Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_cookieKey, jsonEncode(_cookies));
  }
}
