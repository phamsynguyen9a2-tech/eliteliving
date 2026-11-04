import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import 'contact_actions.dart';
import 'main.dart' show EliteColors, RoomDetailScreen;
import 'rental_screens.dart' show kHouseRuleTitles;
import 'tenant_api.dart';
import 'ui_kit.dart';

/// Xem ảnh phòng toàn màn hình: vuốt đổi ảnh, chụm để phóng to, dải ảnh nhỏ bên dưới.
class RoomGalleryScreen extends StatefulWidget {
  const RoomGalleryScreen({
    super.key,
    required this.images,
    required this.roomCode,
    this.initialIndex = 0,
  });

  final List<String> images;
  final String roomCode;
  final int initialIndex;

  @override
  State<RoomGalleryScreen> createState() => _RoomGalleryScreenState();
}

class _RoomGalleryScreenState extends State<RoomGalleryScreen> {
  late final PageController _controller;
  late int _index;

  @override
  void initState() {
    super.initState();
    _index = widget.initialIndex;
    _controller = PageController(initialPage: _index);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: EliteColors.deepNavy,
      appBar: AppBar(
        backgroundColor: EliteColors.deepNavy,
        foregroundColor: Colors.white,
        iconTheme: const IconThemeData(color: Colors.white),
        titleTextStyle: const TextStyle(
          color: Colors.white,
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
        title: Text(
          '${widget.roomCode} • Ảnh ${_index + 1} / ${widget.images.length}',
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: PageView.builder(
              controller: _controller,
              itemCount: widget.images.length,
              onPageChanged: (i) => setState(() => _index = i),
              itemBuilder: (_, i) => InteractiveViewer(
                maxScale: 4,
                child: Image.network(
                  widget.images[i],
                  fit: BoxFit.contain,
                  errorBuilder: (_, _, _) => const Icon(
                    Icons.image_not_supported_outlined,
                    color: Colors.white,
                    size: 40,
                  ),
                ),
              ),
            ),
          ),
          SafeArea(
            top: false,
            child: SizedBox(
              height: 72,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.all(8),
                itemCount: widget.images.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (_, i) => GestureDetector(
                  onTap: () => _controller.jumpToPage(i),
                  child: Container(
                    width: 56,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: i == _index
                            ? EliteColors.champagne
                            : Colors.transparent,
                        width: 2,
                      ),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(
                        widget.images[i],
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) =>
                            const ColoredBox(color: EliteColors.border),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Nội quy tòa nhà của chủ trọ; chưa có dữ liệu thì dùng danh mục nội quy mặc định.
class HouseRulesCard extends StatefulWidget {
  const HouseRulesCard({super.key, required this.roomId});

  final int roomId;

  @override
  State<HouseRulesCard> createState() => _HouseRulesCardState();
}

class _HouseRulesCardState extends State<HouseRulesCard> {
  List<HouseRuleInfo> _rules = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final rules = await TenantApi.fetchHouseRules(widget.roomId);
      if (mounted) setState(() => _rules = rules);
    } on ApiException catch (e) {
      debugPrint('Không tải được nội quy: ${e.message}');
    }
  }

  @override
  Widget build(BuildContext context) {
    return EliteCard(
      margin: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const EliteSectionTitle('Quy định và an ninh tòa nhà'),
          if (_rules.isEmpty)
            for (final title in kHouseRuleTitles) _line(title, null)
          else
            for (final rule in _rules) _line(rule.title, rule.content),
        ],
      ),
    );
  }

  Widget _line(String title, String? content) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.check_circle_outline_rounded,
            size: 16,
            color: EliteColors.champagneHover,
          ),
          const SizedBox(width: 6),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: EliteColors.deepNavy,
                  ),
                ),
                if (content != null && content.isNotEmpty)
                  Text(
                    content,
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade700),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Vị trí phòng trên bản đồ, khoảng cách tới HUIT và nút chỉ đường, như `RoomLocationMap`.
class RoomLocationCard extends StatelessWidget {
  const RoomLocationCard({super.key, required this.room});

  final Map<String, dynamic> room;

  @override
  Widget build(BuildContext context) {
    final lat = (room['latitude'] as num?)?.toDouble();
    final lng = (room['longitude'] as num?)?.toDouble();
    final hasPoint = lat != null && lng != null && lat != 0 && lng != 0;
    final address = '${room['address'] ?? ''}';
    final huit = room['distance_to_huit_km'];
    return EliteCard(
      margin: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          EliteSectionTitle(
            'Vị trí phòng',
            trailing: room['district'] == null
                ? null
                : EliteStatusChip('${room['district']}'),
          ),
          Text(
            address,
            style: TextStyle(color: Colors.grey.shade700, fontSize: 12),
          ),
          if (huit is num) ...[
            const SizedBox(height: 4),
            Text(
              'Cách ĐH Công Thương TP.HCM (HUIT) $huit km',
              style: const TextStyle(
                color: EliteColors.deepNavy,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
          if (hasPoint) ...[
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: SizedBox(
                height: 180,
                child: FlutterMap(
                  options: MapOptions(
                    initialCenter: LatLng(lat, lng),
                    initialZoom: 15,
                    interactionOptions: const InteractionOptions(
                      flags: InteractiveFlag.none,
                    ),
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'vn.edu.huit.smarttro.mobile',
                    ),
                    MarkerLayer(
                      markers: [
                        Marker(
                          point: LatLng(lat, lng),
                          width: 40,
                          height: 40,
                          child: const Icon(
                            Icons.place_rounded,
                            color: EliteColors.champagneHover,
                            size: 38,
                          ),
                        ),
                      ],
                    ),
                    const RichAttributionWidget(
                      attributions: [TextSourceAttribution('OpenStreetMap')],
                    ),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: () => openExternal(
              context,
              directionsUri(lat: lat, lng: lng, address: address),
            ),
            style: eliteOutlinedStyle(height: 44),
            icon: const Icon(Icons.directions_rounded, size: 18),
            label: const Text('Chỉ đường'),
          ),
        ],
      ),
    );
  }
}

/// Chọn phòng liên quan: cùng dự án trước, bỏ phòng hiện tại và phòng không còn trống.
List<Map<String, dynamic>> pickRelatedRooms(
  Map<String, dynamic> room,
  List<dynamic> candidates, {
  int limit = 4,
}) {
  final others = [
    for (final c in candidates)
      if (c is Map &&
          '${c['id']}' != '${room['id']}' &&
          roomStatusOf(Map<String, dynamic>.from(c)) == 'AVAILABLE')
        Map<String, dynamic>.from(c),
  ];
  final project = room['project_name'];
  others.sort((a, b) {
    int rank(Map<String, dynamic> r) =>
        project != null && r['project_name'] == project ? 0 : 1;
    return rank(a).compareTo(rank(b));
  });
  return others.take(limit).toList();
}

/// Phòng khác cùng khu vực ở cuối trang chi tiết phòng.
class RelatedRoomsSection extends StatefulWidget {
  const RelatedRoomsSection({super.key, required this.room});

  final Map<String, dynamic> room;

  @override
  State<RelatedRoomsSection> createState() => _RelatedRoomsSectionState();
}

class _RelatedRoomsSectionState extends State<RelatedRoomsSection> {
  List<Map<String, dynamic>> _rooms = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final district = widget.room['district'];
    if (district == null) return;
    try {
      final result = await TenantApi.searchRooms({
        'district': '$district',
        'limit': '8',
        'log': '0',
      });
      if (mounted) {
        setState(() => _rooms = pickRelatedRooms(widget.room, result.items));
      }
    } on ApiException catch (e) {
      debugPrint('Không tải được phòng cùng khu vực: ${e.message}');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_rooms.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 20),
        EliteSectionTitle('Phòng khác cùng khu vực ${widget.room['district']}'),
        SizedBox(
          height: 190,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _rooms.length,
            separatorBuilder: (_, _) => const SizedBox(width: 10),
            itemBuilder: (context, index) {
              final room = _rooms[index];
              final images = room['images'] as List<dynamic>? ?? const [];
              return GestureDetector(
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => RoomDetailScreen(room: room),
                  ),
                ),
                child: Container(
                  width: 170,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: EliteColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ClipRRect(
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(14),
                        ),
                        child: Image.network(
                          images.isNotEmpty
                              ? '${images.first}'
                              : kFallbackRoomImage,
                          height: 100,
                          width: 170,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) =>
                              Container(height: 100, color: EliteColors.border),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(8),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${room['title'] ?? ''}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                                color: EliteColors.deepNavy,
                              ),
                            ),
                            Text(
                              '${room['area'] ?? '?'} m² • ${room['room_type'] ?? ''}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 10,
                                color: Colors.grey.shade600,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              vnd.format(room['price'] ?? 0),
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 12,
                                color: EliteColors.champagneHover,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

/// Bốn bước thuê phòng ở trang chủ, tương ứng `TenantJourney` của web.
class TenantJourneyCard extends StatelessWidget {
  const TenantJourneyCard({
    super.key,
    required this.onChooseRoom,
    required this.onAppointments,
    required this.onRental,
  });

  final VoidCallback onChooseRoom;
  final VoidCallback onAppointments;
  final VoidCallback onRental;

  @override
  Widget build(BuildContext context) {
    final steps = <(String, String, IconData, VoidCallback)>[
      (
        'Chọn phòng',
        'Lọc theo khu vực, giá, tiện ích',
        Icons.search_rounded,
        onChooseRoom,
      ),
      (
        'Hẹn xem phòng',
        'Chọn giờ còn trống',
        Icons.event_available_rounded,
        onAppointments,
      ),
      (
        'Đặt cọc & ký hợp đồng',
        'Xem rõ điều khoản, bàn giao',
        Icons.draw_outlined,
        onRental,
      ),
      (
        'Đóng tiền hàng tháng',
        'Tiền phòng, điện nước, lịch sử',
        Icons.receipt_long_rounded,
        onRental,
      ),
    ];
    return EliteCard(
      margin: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const EliteSectionTitle('Từ xem phòng đến đóng tiền'),
          for (var i = 0; i < steps.length; i++)
            InkWell(
              onTap: steps[i].$4,
              borderRadius: BorderRadius.circular(10),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 16,
                      backgroundColor: EliteColors.deepNavy,
                      child: Icon(
                        steps[i].$3,
                        size: 16,
                        color: EliteColors.champagne,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${i + 1}. ${steps[i].$1}',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: EliteColors.deepNavy,
                            ),
                          ),
                          Text(
                            steps[i].$2,
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(
                      Icons.chevron_right_rounded,
                      color: EliteColors.champagneHover,
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
