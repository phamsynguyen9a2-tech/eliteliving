import 'package:flutter/material.dart';

import 'contact_actions.dart';
import 'location_service.dart' show showsHuitDistance;
import 'main.dart' show EliteColors, RoomDetailScreen, openBookingSheet;
import 'tenant_api.dart';
import 'room_type_text.dart';
import 'ui_kit.dart';

String buildingPriceRange(double min, double max) {
  String tr(double v) => (v / 1000000).toStringAsFixed(1);
  return '${tr(min)} - ${tr(max)} Tr/th';
}

/// Lọc phòng trong tòa nhà: [status] là all | AVAILABLE | BALCONY, [floor] null là mọi tầng.
List<Map<String, dynamic>> filterBuildingRooms(
  List<Map<String, dynamic>> rooms, {
  String status = 'all',
  int? floor,
}) {
  return [
    for (final room in rooms)
      if ((floor == null || floorOf(room) == floor) &&
          (status != 'AVAILABLE' || roomStatusOf(room) == 'AVAILABLE') &&
          (status != 'BALCONY' || room['has_balcony'] == true))
        room,
  ];
}

int floorOf(Map<String, dynamic> room) => (room['floor'] as num?)?.toInt() ?? 1;

/// Nhóm phòng theo tầng, tầng thấp trước.
Map<int, List<Map<String, dynamic>>> groupRoomsByFloor(
  List<Map<String, dynamic>> rooms,
) {
  final groups = <int, List<Map<String, dynamic>>>{};
  for (final room in rooms) {
    groups.putIfAbsent(floorOf(room), () => []).add(room);
  }
  final floors = groups.keys.toList()..sort();
  return {for (final f in floors) f: groups[f]!};
}

/// Thẻ tòa nhà ở danh sách và bản đồ, tương ứng thẻ tòa nhà ở trang chủ web.
class BuildingCard extends StatelessWidget {
  const BuildingCard({super.key, required this.building, this.distanceKm});

  final BuildingInfo building;

  /// Khoảng cách tới điểm đang chọn trên bản đồ; null thì hiện khoảng cách tới HUIT.
  final double? distanceKm;

  void _open(BuildContext context) => Navigator.push(
    context,
    MaterialPageRoute(builder: (_) => BuildingDetailScreen(building: building)),
  );

  @override
  Widget build(BuildContext context) {
    final b = building;
    final distance = distanceKm != null
        ? 'cách ${distanceKm!.toStringAsFixed(2)} km'
        : showsHuitDistance(b.district)
            ? '${b.distanceToHuitKm} km tới HUIT'
            : null;
    return EliteCard(
      padding: EdgeInsets.zero,
      onTap: () => _open(context),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: Stack(
              children: [
                Image.network(
                  b.image.isEmpty ? kFallbackRoomImage : b.image,
                  height: 150,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => Container(
                    height: 150,
                    color: EliteColors.border,
                    alignment: Alignment.center,
                    child: const Icon(Icons.apartment_rounded, size: 36),
                  ),
                ),
                Positioned(
                  top: 8,
                  left: 8,
                  child: _Pill(
                    'Còn trống ${b.availableRooms} / ${b.totalRooms} phòng',
                  ),
                ),
                Positioned(
                  bottom: 8,
                  left: 8,
                  child: _Pill('Mã DA: ${b.code}'),
                ),
                if (b.imageCount > 0)
                  Positioned(
                    bottom: 8,
                    right: 8,
                    child: _Pill('${b.imageCount} ảnh'),
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
                  b.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: EliteColors.deepNavy,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  [b.address, b.district, ?distance].join(' • '),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 11),
                ),
                if (b.amenities.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 4,
                    runSpacing: 4,
                    children: [
                      for (final a in b.amenities.take(4)) _AmenityTag(a),
                      if (b.amenities.length > 4)
                        _AmenityTag('+${b.amenities.length - 4}'),
                    ],
                  ),
                ],
                const Divider(height: 18),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        buildingPriceRange(b.minPrice, b.maxPrice),
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                          color: EliteColors.champagneHover,
                        ),
                      ),
                    ),
                    FilledButton.icon(
                      onPressed: () => _open(context),
                      style: FilledButton.styleFrom(
                        backgroundColor: EliteColors.champagne,
                        foregroundColor: Colors.white,
                        visualDensity: VisualDensity.compact,
                        textStyle: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      icon: const Icon(Icons.visibility_outlined, size: 16),
                      label: Text('Xem ${b.availableRooms} phòng trống'),
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

class _Pill extends StatelessWidget {
  const _Pill(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: EliteColors.deepNavy.withValues(alpha: 0.88),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _AmenityTag extends StatelessWidget {
  const _AmenityTag(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: EliteColors.canvas,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: EliteColors.border),
      ),
      child: Text(
        text,
        style: const TextStyle(fontSize: 10, color: EliteColors.deepNavy),
      ),
    );
  }
}

/// Chi tiết tòa nhà: danh sách phòng theo từng tầng và bộ lọc, như `BuildingDetailModal`.
class BuildingDetailScreen extends StatefulWidget {
  const BuildingDetailScreen({super.key, required this.building});

  final BuildingInfo building;

  @override
  State<BuildingDetailScreen> createState() => _BuildingDetailScreenState();
}

class _BuildingDetailScreenState extends State<BuildingDetailScreen> {
  BuildingInfo? _detail;
  bool _loading = true;
  String? _error;
  String _status = 'all';
  int? _floor;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final detail = await TenantApi.fetchBuilding(widget.building.code);
      if (mounted) setState(() => _detail = detail);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openRoom(Map<String, dynamic> room) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: EliteColors.canvas,
      barrierColor: EliteColors.deepNavy.withValues(alpha: 0.45),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => _RoomPreviewSheet(room: room),
    );
  }

  @override
  Widget build(BuildContext context) {
    final b = _detail ?? widget.building;
    final rooms = _detail?.rooms ?? const <Map<String, dynamic>>[];
    final floors = groupRoomsByFloor(rooms).keys.toList();
    final grouped = groupRoomsByFloor(
      filterBuildingRooms(rooms, status: _status, floor: _floor),
    );
    return Scaffold(
      appBar: AppBar(title: Text(b.code.isEmpty ? 'Tòa nhà' : b.code)),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              b.name,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: EliteColors.deepNavy,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Còn trống ${b.availableRooms} / ${b.totalRooms} phòng • ${b.district}'
                  '${showsHuitDistance(b.district) ? ' • Cách ĐH HUIT ${b.distanceToHuitKm} km' : ''}',
              style: TextStyle(color: Colors.grey.shade700, fontSize: 12),
            ),
            const SizedBox(height: 12),
            EliteCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  EliteInfoRow(label: 'Địa chỉ', value: b.address),
                  EliteInfoRow(label: 'Chủ tòa nhà', value: b.landlordName),
                  EliteInfoRow(
                    label: 'Giá thuê',
                    value: buildingPriceRange(b.minPrice, b.maxPrice),
                    bold: true,
                  ),
                  const SizedBox(height: 8),
                  if (b.landlordPhone.isNotEmpty)
                    ContactButtons(phone: b.landlordPhone),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: () => openExternal(
                      context,
                      directionsUri(
                        lat: b.latitude,
                        lng: b.longitude,
                        address: b.address,
                      ),
                    ),
                    style: eliteOutlinedStyle(height: 44),
                    icon: const Icon(Icons.directions_rounded, size: 18),
                    label: const Text('Chỉ đường'),
                  ),
                ],
              ),
            ),
            EliteChoiceChips<String>(
              options: [
                ('all', 'Tất cả (${rooms.length})'),
                ('AVAILABLE', 'Còn trống (${b.availableRooms})'),
                ('BALCONY', 'Có ban công'),
              ],
              selected: _status,
              onSelected: (v) => setState(() => _status = v),
            ),
            if (floors.length > 1) ...[
              const SizedBox(height: 6),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: EliteChoiceChips<int?>(
                  options: [
                    (null, 'Tất cả tầng'),
                    for (final f in floors) (f, 'Tầng $f'),
                  ],
                  selected: _floor,
                  onSelected: (v) => setState(() => _floor = v),
                ),
              ),
            ],
            const SizedBox(height: 12),
            if (_loading && _detail == null)
              const Padding(
                padding: EdgeInsets.only(top: 32),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null && _detail == null)
              EliteMessageBox(
                icon: Icons.cloud_off_rounded,
                title: 'Không tải được phòng của tòa nhà',
                message: _error!,
                actionLabel: 'Thử lại',
                onAction: _load,
              )
            else if (grouped.isEmpty)
              const EliteMessageBox(
                icon: Icons.search_off_rounded,
                title: 'Không có phòng phù hợp',
                message: 'Thử đổi bộ lọc tầng hoặc trạng thái phòng.',
              )
            else
              for (final entry in grouped.entries)
                EliteCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      EliteSectionTitle(
                        'Tầng ${entry.key}',
                        trailing: Text(
                          '${entry.value.where((r) => roomStatusOf(r) == 'AVAILABLE').length} phòng trống',
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 11,
                          ),
                        ),
                      ),
                      GridView.count(
                        crossAxisCount: 2,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        mainAxisSpacing: 8,
                        crossAxisSpacing: 8,
                        childAspectRatio: 2.1,
                        children: [
                          for (final room in entry.value)
                            _RoomCell(room: room, onTap: () => _openRoom(room)),
                        ],
                      ),
                    ],
                  ),
                ),
          ],
        ),
      ),
    );
  }
}

class _RoomCell extends StatelessWidget {
  const _RoomCell({required this.room, required this.onTap});

  final Map<String, dynamic> room;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final status = roomStatusOf(room);
    final available = status == 'AVAILABLE';
    final rented = status == 'RENTED';
    return Opacity(
      opacity: rented ? 0.6 : 1,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: available
                ? EliteColors.champagne.withValues(alpha: 0.1)
                : EliteColors.canvas,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: available
                  ? EliteColors.champagne.withValues(alpha: 0.5)
                  : EliteColors.border,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '${room['room_code'] ?? ''}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 12,
                  color: EliteColors.deepNavy,
                ),
              ),
              Text(
                vnd.format(room['price'] ?? 0),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: EliteColors.champagneHover,
                ),
              ),
              Text(
                roomStatusLabel(room),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 10, color: Colors.grey.shade700),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Xem nhanh một phòng trong tòa nhà, với nút mở chi tiết và đặt lịch.
class _RoomPreviewSheet extends StatelessWidget {
  const _RoomPreviewSheet({required this.room});

  final Map<String, dynamic> room;

  @override
  Widget build(BuildContext context) {
    final images = room['images'] as List<dynamic>? ?? const [];
    final amenities = room['amenities'] as List<dynamic>? ?? const [];
    final bookable = isRoomBookable(room);
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.75,
      maxChildSize: 0.95,
      builder: (context, controller) => ListView(
        controller: controller,
        padding: const EdgeInsets.all(16),
        children: [
          SizedBox(
            height: 190,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: images.isEmpty
                  ? Image.network(kFallbackRoomImage, fit: BoxFit.cover)
                  : PageView.builder(
                      itemCount: images.length,
                      itemBuilder: (_, i) => Image.network(
                        '${images[i]}',
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => Container(
                          color: EliteColors.border,
                          alignment: Alignment.center,
                          child: const Icon(Icons.image_not_supported_outlined),
                        ),
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Text(
                  roomShortTitle(room),
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: EliteColors.deepNavy,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              EliteStatusChip(roomStatusLabel(room)),
            ],
          ),
          const SizedBox(height: 8),
          EliteInfoRow(
            label: 'Giá thuê',
            value: '${vnd.format(room['price'] ?? 0)}/tháng',
            bold: true,
          ),
          EliteInfoRow(
            label: 'Tiền đặt cọc',
            value: vnd.format(room['deposit'] ?? room['price'] ?? 0),
          ),
          EliteInfoRow(
            label: 'Diện tích • Tầng',
            value: '${room['area'] ?? '?'} m² • Tầng ${floorOf(room)}',
          ),
          if (room['has_balcony'] == true)
            const EliteInfoRow(label: 'Ban công', value: 'Có ban công riêng'),
          if (amenities.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 4,
              runSpacing: 4,
              children: [for (final a in amenities) _AmenityTag('$a')],
            ),
          ],
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: bookable
                ? () {
                    Navigator.pop(context);
                    openBookingSheet(context, room);
                  }
                : null,
            style: eliteFilledStyle(),
            icon: const Icon(Icons.calendar_month_rounded, size: 18),
            label: Text(roomBookingLabel(room)),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => RoomDetailScreen(room: room)),
              );
            },
            style: eliteOutlinedStyle(),
            child: Text('Mở trang chi tiết căn ${room['room_code'] ?? ''}'),
          ),
        ],
      ),
    );
  }
}
