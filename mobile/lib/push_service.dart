import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import 'auth.dart';
import 'tenant_api.dart';

/// Thông báo đẩy qua Firebase Cloud Messaging (FCM).
///
/// Cấu hình Firebase bằng --dart-define khi chạy / build (không cần file google-services.json):
///   flutter run --dart-define=FIREBASE_API_KEY=... --dart-define=FIREBASE_APP_ID=...
///               --dart-define=FIREBASE_MESSAGING_SENDER_ID=... --dart-define=FIREBASE_PROJECT_ID=...
/// Thiếu cấu hình thì app vẫn chạy bình thường, chỉ không nhận thông báo đẩy
/// (thông báo vẫn có trong màn hình Thông báo).
abstract final class PushService {
  static const _apiKey = String.fromEnvironment('FIREBASE_API_KEY');
  static const _appId = String.fromEnvironment('FIREBASE_APP_ID');
  static const _senderId = String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID');
  static const _projectId = String.fromEnvironment('FIREBASE_PROJECT_ID');

  static bool get isConfigured =>
      _apiKey.isNotEmpty && _appId.isNotEmpty && _senderId.isNotEmpty && _projectId.isNotEmpty;

  /// Thông báo nhận được khi app đang mở (màn hình chính hiện SnackBar và tải lại dữ liệu).
  static final ValueNotifier<RemoteMessage?> foregroundMessage = ValueNotifier<RemoteMessage?>(null);

  static bool _ready = false;
  static String? _token;

  static Future<void> init() async {
    if (_ready || kIsWeb || !isConfigured) return;
    try {
      await Firebase.initializeApp(
        options: const FirebaseOptions(
          apiKey: _apiKey,
          appId: _appId,
          messagingSenderId: _senderId,
          projectId: _projectId,
        ),
      );
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission(alert: true, badge: true, sound: true);
      FirebaseMessaging.onMessage.listen((message) => foregroundMessage.value = message);
      messaging.onTokenRefresh.listen((token) {
        _token = token;
        _register();
      });
      _ready = true;
      AuthService.currentUser.addListener(_register);
      _token = await messaging.getToken();
      await _register();
    } catch (e) {
      debugPrint('FCM chưa khởi động được: $e');
    }
  }

  /// Gửi mã thiết bị lên máy chủ sau khi người thuê đăng nhập.
  static Future<void> _register() async {
    final token = _token;
    if (!_ready || token == null || !AuthService.isSignedIn) return;
    try {
      await TenantApi.registerDeviceToken(token, defaultTargetPlatform.name);
    } catch (e) {
      debugPrint('Không đăng ký được mã thiết bị FCM: $e');
    }
  }

  /// Gọi trước khi đăng xuất để máy chủ không gửi thông báo của tài khoản cũ tới máy này.
  static Future<void> unregister() async {
    final token = _token;
    if (!_ready || token == null || !AuthService.isSignedIn) return;
    try {
      await TenantApi.unregisterDeviceToken(token);
    } catch (_) {
      // bỏ qua: máy chủ tự xóa mã thiết bị hết hạn
    }
  }
}
