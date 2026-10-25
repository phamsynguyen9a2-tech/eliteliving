import 'package:flutter/material.dart';

import 'explore_screen.dart' show RoomListCard;
import 'location_service.dart';
import 'main.dart' show EliteColors;
import 'tenant_api.dart';

/// Tìm phòng trống quanh vị trí hiện tại của điện thoại (GPS + khoảng cách Haversine ở máy chủ).
class NearbyRoomsScreen extends StatefulWidget {
  const NearbyRoomsScreen({super.key});

  @override
  State<NearbyRoomsScreen> createState() => _NearbyRoomsScreenState();
}

class _NearbyRoomsScreenState extends State<NearbyRoomsScreen> {
  static const _radiusOptions = [1.0, 3.0, 5.0, 10.0];
  double _radius = 3;
  ({double lat, double lng})? _position;
  bool _usingFallback = false;
  bool _loading = true;
  String? _error;
  List<dynamic> _rooms = const [];

  @override
  void initState() {
    super.initState();
    _locateAndLoad();
  }

  Future<void> _locateAndLoad({bool useFallback = false}) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      if (useFallback) {
        _position = (lat: LocationService.huitLat, lng: LocationService.huitLng);
        _usingFallback = true;
      } else {
        _position = await LocationService.current();
        _usingFallback = false;
      }
      await _load();
    } on LocationException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = 'Không lấy được vị trí: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _load() async {
    final pos = _position;
    if (pos == null) return;
    setState(() => _loading = true);
    try {
      final rooms = await TenantApi.fetchNearby(lat: pos.lat, lng: pos.lng, radiusKm: _radius);
      if (mounted) setState(() => _rooms = rooms);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final pos = _position;
    return Scaffold(
      appBar: AppBar(title: const Text('Phòng gần tôi')),
      body: RefreshIndicator(
        onRefresh: () => _locateAndLoad(useFallback: _usingFallback),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              pos == null
                  ? 'Đang xác định vị trí của bạn…'
                  : _usingFallback
                  ? 'Đang dùng vị trí mặc định: ĐH Công Thương TP.HCM'
                  : 'Vị trí hiện tại: ${pos.lat.toStringAsFixed(4)}, ${pos.lng.toStringAsFixed(4)}',
              style: TextStyle(color: Colors.grey.shade700, fontSize: 12),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              children: [
                for (final r in _radiusOptions)
                  ChoiceChip(
                    label: Text('${r.toStringAsFixed(0)} km'),
                    selected: _radius == r,
                    selectedColor: EliteColors.champagne.withValues(alpha: 0.25),
                    onSelected: pos == null
                        ? null
                        : (_) {
                            setState(() => _radius = r);
                            _load();
                          },
                  ),
              ],
            ),
            const SizedBox(height: 12),
            if (_error != null) ...[
              Text(_error!, style: const TextStyle(color: Color(0xFFC0392B))),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  FilledButton.icon(
                    onPressed: () => _locateAndLoad(),
                    icon: const Icon(Icons.my_location_rounded),
                    label: const Text('Thử lại'),
                    style: FilledButton.styleFrom(backgroundColor: EliteColors.champagne),
                  ),
                  OutlinedButton(
                    onPressed: () => _locateAndLoad(useFallback: true),
                    child: const Text('Dùng vị trí HUIT'),
                  ),
                ],
              ),
            ],
            if (_loading)
              const Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error == null && _rooms.isEmpty)
              Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Không có phòng trống trong bán kính ${_radius.toStringAsFixed(0)} km. Thử tăng bán kính.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey.shade600),
                ),
              )
            else
              for (final room in _rooms)
                if (room is Map)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: RoomListCard(room: Map<String, dynamic>.from(room)),
                  ),
          ],
        ),
      ),
    );
  }
}
