import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import 'main.dart' show EliteColors;
import 'ui_kit.dart';

String _digits(String phone) => phone.replaceAll(RegExp(r'[\s-]'), '');

Uri phoneCallUri(String phone) => Uri(scheme: 'tel', path: _digits(phone));

Uri zaloUri(String phone) => Uri.parse('https://zalo.me/${_digits(phone)}');

/// Cùng dạng link chỉ đường với web (`RoomLocationMap`): có tọa độ thì chỉ đường tới
/// tọa độ, không có thì tìm theo địa chỉ.
Uri directionsUri({double? lat, double? lng, String address = ''}) {
  if (lat != null && lng != null && lat != 0 && lng != 0) {
    return Uri.https('www.google.com', '/maps/dir/', {
      'api': '1',
      'destination': '$lat,$lng',
    });
  }
  return Uri.https('www.google.com', '/maps/search/', {
    'api': '1',
    'query': address,
  });
}

/// Mở ứng dụng ngoài; không mở được (máy ảo không có trình gọi điện...) thì báo lại.
Future<bool> openExternal(BuildContext context, Uri uri) async {
  var opened = false;
  try {
    opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
  } catch (e) {
    debugPrint('Không mở được $uri: $e');
  }
  if (!opened && context.mounted) {
    showSnack(context, 'Không mở được ứng dụng phù hợp trên thiết bị này.');
  }
  return opened;
}

/// Gọi điện; thiết bị không gọi được thì sao chép số để người dùng tự gọi.
Future<void> callPhone(BuildContext context, String phone) async {
  var opened = false;
  try {
    opened = await launchUrl(phoneCallUri(phone));
  } catch (e) {
    debugPrint('Không gọi được $phone: $e');
  }
  if (!opened) {
    await Clipboard.setData(ClipboardData(text: phone));
    if (context.mounted) {
      showSnack(context, 'Thiết bị không gọi được. Đã sao chép số $phone.');
    }
  }
}

/// Hai nút Gọi điện và Chat Zalo, dùng ở chi tiết phòng, tòa nhà và ở ghép.
class ContactButtons extends StatelessWidget {
  const ContactButtons({super.key, required this.phone});

  final String phone;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => callPhone(context, phone),
            style: eliteOutlinedStyle(height: 44),
            icon: const Icon(Icons.call_rounded, size: 18),
            label: const Text('Gọi điện'),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: FilledButton.icon(
            onPressed: () => openExternal(context, zaloUri(phone)),
            style: FilledButton.styleFrom(
              backgroundColor: EliteColors.deepNavy,
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(44),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            icon: const Icon(Icons.chat_bubble_outline_rounded, size: 18),
            label: const Text('Chat Zalo'),
          ),
        ),
      ],
    );
  }
}
