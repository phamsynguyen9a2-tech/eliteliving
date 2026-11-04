import 'dart:async';

import 'package:flutter/material.dart';

import 'auth.dart';
import 'location_presets.dart';
import 'location_service.dart';
import 'main.dart' show EliteColors, RoomDetailScreen, openBookingSheet;
import 'map_screen.dart';
import 'tenant_api.dart';
import 'ui_kit.dart';

const List<(String, String, IconData)> kLifestyleTabs = [
  ('all', 'Tất cả', Icons.auto_awesome_rounded),
  ('student', 'Sinh viên (dưới 4,5 triệu)', Icons.school_outlined),
  ('office', 'Người đi làm', Icons.work_outline_rounded),
  ('couple', 'Ở 2 người, cần phòng rộng', Icons.people_outline_rounded),
  ('pet', 'Cho nuôi thú cưng', Icons.pets_outlined),
  ('balcony', 'Có ban công hoặc cửa sổ lớn', Icons.wb_sunny_outlined),
  ('flexible', 'Giờ giấc tự do', Icons.vpn_key_outlined),
];

const List<(String, String)> kSmartSortOptions = [
  ('smart', 'Phù hợp nhất'),
  ('distance', 'Gần nhất'),
  ('price', 'Giá thấp nhất'),
  ('area', 'Rộng nhất'),
];

/// Tìm phòng gần nơi học hoặc làm việc: cùng bộ điều khiển với `TopKWidget` của web.
class SmartSearchScreen extends StatefulWidget {
  const SmartSearchScreen({super.key});

  @override
  State<SmartSearchScreen> createState() => _SmartSearchScreenState();
}

class _SmartSearchScreenState extends State<SmartSearchScreen> {
  static const _debounce = Duration(milliseconds: 300);

  double _budget = 6000000;
  double _radius = 5;
  LocationPreset _landmark = kTopKLandmarks.first;
  ({double lat, double lng, String label})? _customOrigin;
  String _lifestyle = 'all';
  String _sortBy = 'smart';
  bool _usingProfile = false;
  bool _locating = false;

  List<dynamic> _rooms = const [];
  String? _recommendationId;
  bool _loading = true;
  String? _error;
  int _requestVersion = 0;
  Timer? _debounceTimer;

  double get _lat => _customOrigin?.lat ?? _landmark.lat;
  double get _lng => _customOrigin?.lng ?? _landmark.lng;
  String get _originName => _customOrigin?.label ?? _landmark.name;

  /// Bán kính dạng 5 km hoặc 1.5 km, như web.
  String get _radiusLabel =>
      '${_radius == _radius.roundToDouble() ? _radius.toStringAsFixed(0) : _radius} km';

  @override
  void initState() {
    super.initState();
    _init();
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    super.dispose();
  }

  /// Đã đăng nhập: khởi tạo bộ lọc từ hồ sơ nhu cầu đã lưu, giống web.
  Future<void> _init() async {
    if (AuthService.isSignedIn) {
      try {
        final result = await TenantApi.fetchPreferences();
        final profile = result.profile;
        if (profile != null && mounted) {
          setState(() {
            _budget = profile.budgetMax.clamp(2500000, 12000000).toDouble();
            _radius = profile.maxRadiusKm.clamp(1, 15).toDouble();
            final lat = profile.targetLat;
            final lng = profile.targetLng;
            if (lat != null && lat != 0 && lng != null && lng != 0) {
              _customOrigin = (
                lat: lat,
                lng: lng,
                label: profile.district ?? 'Vị trí trong hồ sơ nhu cầu',
              );
            }
            _usingProfile = true;
          });
        }
      } on ApiException catch (e) {
        debugPrint('Không đọc được hồ sơ nhu cầu: ${e.message}');
      }
    }
    if (mounted) await _load();
  }

  void _scheduleLoad() {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(_debounce, _load);
  }

  Future<void> _load() async {
    final version = ++_requestVersion;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await TenantApi.fetchRecommendations(
        budget: _budget,
        radiusKm: _radius,
        lat: _lat,
        lng: _lng,
        lifestyle: _lifestyle,
        sortBy: _sortBy,
      );
      if (!mounted || version != _requestVersion) return;
      setState(() {
        _rooms = result.rooms;
        _recommendationId = result.recommendationId;
      });
    } on ApiException catch (e) {
      if (mounted && version == _requestVersion) {
        setState(() => _error = e.message);
      }
    } finally {
      if (mounted && version == _requestVersion) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _pickLandmark() async {
    final preset = await showLocationPicker(
      context,
      kTopKLandmarks,
      'Địa điểm của bạn',
    );
    if (preset == null || !mounted) return;
    setState(() {
      _landmark = preset;
      _customOrigin = null;
    });
    _load();
  }

  Future<void> _useMyLocation() async {
    setState(() => _locating = true);
    try {
      final pos = await LocationService.current();
      if (!mounted) return;
      setState(() {
        _customOrigin = (
          lat: pos.lat,
          lng: pos.lng,
          label: 'Vị trí hiện tại của bạn',
        );
      });
      _load();
    } on LocationException catch (e) {
      if (mounted) showSnack(context, e.message);
    } catch (e) {
      if (mounted) showSnack(context, 'Không lấy được vị trí: $e');
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tìm phòng gần nơi học, làm'),
        actions: [
          IconButton(
            tooltip: 'Mở bản đồ',
            icon: const Icon(Icons.explore_outlined),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const BuildingMapScreen()),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              'Chọn một địa điểm, đặt mức giá tối đa và bán kính. Kết quả xếp theo mức phù hợp, khoảng cách hoặc giá.',
              style: TextStyle(color: Colors.grey.shade700, fontSize: 12),
            ),
            const SizedBox(height: 12),
            _controls(),
            const EliteSectionTitle('Bạn cần phòng như thế nào?'),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final (id, label, icon) in kLifestyleTabs)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        avatar: Icon(
                          icon,
                          size: 16,
                          color: _lifestyle == id
                              ? Colors.white
                              : EliteColors.champagneHover,
                        ),
                        label: Text(label),
                        selected: _lifestyle == id,
                        showCheckmark: false,
                        selectedColor: EliteColors.champagne,
                        backgroundColor: Colors.white,
                        side: BorderSide(
                          color: _lifestyle == id
                              ? EliteColors.champagne
                              : EliteColors.border,
                        ),
                        labelStyle: TextStyle(
                          fontSize: 12,
                          color: _lifestyle == id
                              ? Colors.white
                              : EliteColors.deepNavy,
                          fontWeight: _lifestyle == id
                              ? FontWeight.w700
                              : FontWeight.w500,
                        ),
                        onSelected: (_) {
                          setState(() => _lifestyle = id);
                          _load();
                        },
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Tìm thấy ${_loading && _rooms.isEmpty ? '…' : _rooms.length} phòng trong bán kính $_radiusLabel',
                    style: TextStyle(color: Colors.grey.shade700, fontSize: 12),
                  ),
                ),
                DropdownButton<String>(
                  value: _sortBy,
                  underline: const SizedBox.shrink(),
                  style: const TextStyle(
                    color: EliteColors.deepNavy,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                  items: [
                    for (final (value, label) in kSmartSortOptions)
                      DropdownMenuItem(value: value, child: Text(label)),
                  ],
                  onChanged: (v) {
                    if (v == null) return;
                    setState(() => _sortBy = v);
                    _load();
                  },
                ),
              ],
            ),
            const SizedBox(height: 4),
            if (_error != null)
              EliteMessageBox(
                icon: Icons.cloud_off_rounded,
                title: 'Không tải được gợi ý',
                message: _rooms.isEmpty
                    ? _error!
                    : '$_error Đang hiển thị kết quả trước đó.',
                actionLabel: 'Thử lại',
                onAction: _load,
              ),
            if (_loading && _rooms.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 40),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error == null && _rooms.isEmpty)
              const EliteMessageBox(
                icon: Icons.apartment_rounded,
                title: 'Không tìm thấy phòng phù hợp trong bán kính này',
                message:
                    'Hãy thử tăng bán kính lên 7 - 10 km hoặc tăng mức ngân sách tối đa.',
              )
            else ...[
              if (_loading)
                const Padding(
                  padding: EdgeInsets.only(bottom: 8),
                  child: LinearProgressIndicator(
                    color: EliteColors.champagne,
                    backgroundColor: EliteColors.border,
                  ),
                ),
              for (var i = 0; i < _rooms.length; i++)
                if (_rooms[i] is Map)
                  _SmartRoomCard(
                    room: Map<String, dynamic>.from(_rooms[i] as Map),
                    rank: i + 1,
                    recommendationId: _recommendationId,
                  ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _controls() {
    return EliteCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const EliteSectionTitle('1. Địa điểm của bạn'),
          OutlinedButton.icon(
            onPressed: _pickLandmark,
            style: eliteOutlinedStyle(height: 44),
            icon: const Icon(Icons.apartment_rounded, size: 18),
            label: Text(
              _landmark.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: Text(
                  'Tính từ: $_originName${_usingProfile ? ' · theo hồ sơ nhu cầu' : ''}',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 11),
                ),
              ),
              TextButton.icon(
                onPressed: _locating ? null : _useMyLocation,
                style: TextButton.styleFrom(
                  foregroundColor: EliteColors.champagneHover,
                  visualDensity: VisualDensity.compact,
                ),
                icon: const Icon(Icons.near_me_rounded, size: 16),
                label: Text(_locating ? 'Đang lấy…' : 'Vị trí của tôi'),
              ),
            ],
          ),
          const SizedBox(height: 6),
          EliteSectionTitle(
            '2. Ngân sách tối đa',
            trailing: Text(
              '${vnd.format(_budget)}/tháng',
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 12,
                color: EliteColors.champagneHover,
              ),
            ),
          ),
          Slider(
            value: _budget,
            min: 2500000,
            max: 12000000,
            divisions: 19,
            activeColor: EliteColors.champagne,
            label: vnd.format(_budget),
            onChanged: (v) {
              setState(() => _budget = v);
              _scheduleLoad();
            },
          ),
          EliteSectionTitle(
            '3. Bán kính tối đa',
            trailing: Text(
              _radiusLabel,
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 12,
                color: EliteColors.champagneHover,
              ),
            ),
          ),
          Slider(
            value: _radius,
            min: 1,
            max: 15,
            divisions: 28,
            activeColor: EliteColors.champagne,
            label: _radiusLabel,
            onChanged: (v) {
              setState(() => _radius = v);
              _scheduleLoad();
            },
          ),
        ],
      ),
    );
  }
}

class _SmartRoomCard extends StatelessWidget {
  const _SmartRoomCard({
    required this.room,
    required this.rank,
    this.recommendationId,
  });

  final Map<String, dynamic> room;
  final int rank;
  final String? recommendationId;

  @override
  Widget build(BuildContext context) {
    final images = room['images'] as List<dynamic>? ?? const [];
    final amenities = room['amenities'] as List<dynamic>? ?? const [];
    final score = (((room['score'] as num?) ?? 0) * 100).round();
    final distance = room['calculated_distance'];
    return EliteCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: Stack(
              children: [
                Image.network(
                  images.isNotEmpty ? '${images.first}' : kFallbackRoomImage,
                  height: 150,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => Container(
                    height: 150,
                    color: EliteColors.border,
                    alignment: Alignment.center,
                    child: const Icon(Icons.image_not_supported_outlined),
                  ),
                ),
                Positioned(
                  top: 8,
                  left: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: EliteColors.champagne,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      'Top $rank • $score% phù hợp',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${room['title'] ?? ''}',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    color: EliteColors.deepNavy,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  [
                    if (room['district'] != null) '${room['district']}',
                    if (distance is num) '$distance km',
                    '${room['address'] ?? ''}',
                  ].join(' • '),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 11),
                ),
                if (amenities.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    [
                      ...amenities.take(3),
                      if (amenities.length > 3) '+${amenities.length - 3}',
                    ].join(' · '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: EliteColors.champagneHover,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
                const SizedBox(height: 6),
                Text(
                  '${vnd.format(room['price'] ?? 0)}/tháng',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                    color: EliteColors.champagneHover,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => RoomDetailScreen(
                              room: room,
                              recommendationId: recommendationId,
                            ),
                          ),
                        ),
                        style: eliteOutlinedStyle(height: 42),
                        child: const Text('Chi tiết'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: FilledButton(
                        onPressed: isRoomBookable(room)
                            ? () => openBookingSheet(
                                context,
                                room,
                                recommendationId: recommendationId,
                              )
                            : null,
                        style: eliteFilledStyle(height: 42),
                        child: Text(roomBookingLabel(room)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
