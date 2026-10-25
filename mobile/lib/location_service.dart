import 'package:geolocator/geolocator.dart';

class LocationException implements Exception {
  const LocationException(this.message);
  final String message;

  @override
  String toString() => message;
}

/// Lấy vị trí GPS hiện tại của điện thoại (xin quyền khi cần).
abstract final class LocationService {
  /// Vị trí mặc định khi chạy trên máy ảo không có GPS: ĐH Công Thương TP.HCM.
  static const huitLat = 10.8066;
  static const huitLng = 106.6286;

  static Future<({double lat, double lng})> current() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw const LocationException('Hãy bật Vị trí (GPS) trên điện thoại rồi thử lại.');
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied) {
      throw const LocationException('Bạn chưa cho phép ứng dụng dùng vị trí.');
    }
    if (permission == LocationPermission.deniedForever) {
      throw const LocationException(
        'Quyền vị trí đang bị chặn. Mở Cài đặt > Ứng dụng > SmartTro > Quyền để cho phép.',
      );
    }
    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 15),
      ),
    );
    return (lat: position.latitude, lng: position.longitude);
  }
}
