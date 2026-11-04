import 'package:flutter/material.dart';

import 'building_screens.dart';
import 'location_service.dart';
import 'main.dart' show EliteColors, RoomDetailScreen;
import 'map_screen.dart';
import 'tenant_api.dart';
import 'ui_kit.dart';

/// Filter values mirror the web home page (web/src/app/page.tsx) so both
/// clients send the same query to GET /api/rooms.
const List<(String, String)> kDistrictOptions = [
  ('all', 'Tất cả khu vực'),
  ('tân phú', 'Quận Tân Phú'),
  ('tân bình', 'Quận Tân Bình'),
  ('bình tân', 'Quận Bình Tân'),
  ('gò vấp', 'Quận Gò Vấp'),
  ('bình thạnh', 'Quận Bình Thạnh'),
  ('thủ đức', 'TP. Thủ Đức'),
  ('quận 7', 'Quận 7'),
  ('quận 12', 'Quận 12'),
  ('phú nhuận', 'Quận Phú Nhuận'),
  ('quận 10', 'Quận 10'),
  ('quận 3', 'Quận 3'),
  ('quận 1', 'Quận 1'),
  ('quận 6', 'Quận 6'),
  ('quận 8', 'Quận 8'),
];

/// Gợi ý tìm theo tuyến đường, cùng danh sách với trang chủ web.
const List<String> kHotStreets = [
  'Lê Trọng Tấn',
  'Tây Thạnh',
  'Cộng Hòa',
  'Lê Đức Thọ',
  'Đường D2',
  'Phan Xích Long',
  'Sư Vạn Hạnh',
  'Nguyễn Thị Thập',
  'Thảo Điền',
  'Lê Văn Sỹ',
  'Dương Bá Trạc',
  'Tân Hòa Đông',
];

const List<String> kRequiredAmenities = [
  'Wifi',
  'Máy lạnh',
  'WC riêng',
  'Ban công',
];

const List<double> kSearchRadiusOptions = [1, 3, 5, 10];

const List<(int, int, String)> kPriceRanges = [
  (0, 0, 'Mọi ngân sách'),
  (0, 4000000, 'Dưới 4tr'),
  (4000000, 6000000, '4 - 6tr'),
  (6000000, 9000000, '6 - 9tr'),
  (9000000, 20000000, 'Trên 9tr'),
];

const List<(String, String)> kSortOptions = [
  ('newest', 'Mới nhất'),
  ('price_asc', 'Giá tăng dần'),
  ('price_desc', 'Giá giảm dần'),
];

class RoomFilters {
  String keyword = '';
  String district = 'all';
  int priceIndex = 0;
  String sort = 'newest';
  String roomType = 'all';
  String occupants = 'all';
  String bikes = 'all';
  bool cheapElectricity = false;
  bool freeService = false;
  bool petFriendly = false;
  bool moveInNow = false;
  Set<String> amenities = {};
  double? radiusKm;
  ({double lat, double lng})? center;

  int get advancedCount => [
    roomType != 'all',
    occupants != 'all',
    bikes != 'all',
    cheapElectricity,
    freeService,
    petFriendly,
    moveInNow,
    amenities.isNotEmpty,
    radiusKm != null,
  ].where((v) => v).length;

  void resetAdvanced() {
    roomType = 'all';
    occupants = 'all';
    bikes = 'all';
    cheapElectricity = false;
    freeService = false;
    petFriendly = false;
    moveInNow = false;
    amenities = {};
    radiusKm = null;
  }

  /// Bộ lọc áp dụng được cho danh sách tòa nhà, giống tham số chung của web.
  Map<String, String> toBuildingQuery() {
    final (min, max, _) = kPriceRanges[priceIndex];
    return {
      'district': district,
      if (min > 0) 'minPrice': '$min',
      if (max > 0) 'maxPrice': '$max',
      if (keyword.trim().isNotEmpty) 'search': keyword.trim(),
      if (roomType != 'all') 'roomType': roomType,
    };
  }

  Map<String, String> toQuery(int page) {
    final (min, max, _) = kPriceRanges[priceIndex];
    return {
      'page': '$page',
      'limit': '12',
      // Đánh dấu lượt tìm từ app để thống kê khu vực có nhu cầu tìm kiếm cao
      'source': 'mobile',
      'district': district,
      'sort': sort,
      if (min > 0) 'minPrice': '$min',
      if (max > 0) 'maxPrice': '$max',
      if (keyword.trim().isNotEmpty) 'search': keyword.trim(),
      if (roomType != 'all') 'roomType': roomType,
      if (occupants != 'all') 'occupants': occupants,
      if (bikes != 'all') 'bikes': bikes,
      if (cheapElectricity) 'maxElectricity': '3800',
      if (freeService) 'freeService': 'true',
      if (petFriendly) 'petFriendly': 'true',
      if (moveInNow) 'moveInTime': 'immediate',
      if (amenities.isNotEmpty) 'amenities': amenities.join(','),
      if (radiusKm != null && center != null) ...{
        'lat': '${center!.lat}',
        'lng': '${center!.lng}',
        'radius': '$radiusKm',
      },
    };
  }
}

class RoomSearchScreen extends StatefulWidget {
  const RoomSearchScreen({super.key, this.startWithBuildings = false});

  /// Mở sẵn chế độ xem theo tòa nhà.
  final bool startWithBuildings;

  @override
  State<RoomSearchScreen> createState() => _RoomSearchScreenState();
}

class _RoomSearchScreenState extends State<RoomSearchScreen> {
  final RoomFilters _filters = RoomFilters();
  final TextEditingController _searchController = TextEditingController();
  final List<dynamic> _rooms = [];
  List<BuildingInfo> _buildings = const [];
  late bool _viewBuildings = widget.startWithBuildings;
  int _page = 1;
  int _totalPages = 1;
  int _total = 0;
  bool _isLoading = true;
  bool _isLoadingMore = false;
  bool _showFavorites = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load({bool more = false}) async {
    setState(() {
      if (more) {
        _isLoadingMore = true;
      } else {
        _isLoading = true;
        _error = null;
      }
    });
    final page = more ? _page + 1 : 1;
    try {
      if (_viewBuildings) {
        final buildings = await TenantApi.fetchBuildings(
          _filters.toBuildingQuery(),
        );
        if (mounted) setState(() => _buildings = buildings);
        return;
      }
      final result = await TenantApi.searchRooms(_filters.toQuery(page));
      if (!mounted) return;
      setState(() {
        if (!more) _rooms.clear();
        _rooms.addAll(result.items);
        _page = page;
        _total = result.total;
        _totalPages = result.totalPages;
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _isLoadingMore = false;
        });
      }
    }
  }

  void _apply(VoidCallback change) {
    setState(change);
    _load();
  }

  Future<void> _openAdvanced() async {
    final applied = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: EliteColors.canvas,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => _AdvancedFilterSheet(filters: _filters),
    );
    // Bộ lọc nâng cao chỉ áp dụng cho từng phòng nên chuyển sang xem theo phòng, như web
    if (_filters.advancedCount > 0) _viewBuildings = false;
    if (applied == true) _load();
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tìm kiếm & Lọc phòng'),
        actions: [
          IconButton(
            tooltip: 'Bản đồ tòa nhà',
            icon: const Icon(Icons.explore_outlined),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) =>
                    BuildingMapScreen(initialQuery: _filters.keyword.trim()),
              ),
            ),
          ),
          ValueListenableBuilder(
            valueListenable: FavoritesStore.rooms,
            builder: (context, favorites, _) => IconButton(
              tooltip: 'Phòng yêu thích',
              onPressed: () => setState(() => _showFavorites = !_showFavorites),
              icon: Badge(
                isLabelVisible: favorites.isNotEmpty,
                label: Text('${favorites.length}'),
                backgroundColor: EliteColors.champagneHover,
                child: Icon(
                  _showFavorites
                      ? Icons.favorite_rounded
                      : Icons.favorite_border_rounded,
                  color: _showFavorites ? EliteColors.champagneHover : null,
                ),
              ),
            ),
          ),
        ],
      ),
      body: _showFavorites ? _buildFavorites() : _buildSearch(),
    );
  }

  Widget _buildFavorites() {
    return ValueListenableBuilder(
      valueListenable: FavoritesStore.rooms,
      builder: (context, favorites, _) {
        final rooms = favorites.values.toList();
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            EliteSectionTitle('Phòng yêu thích (${rooms.length})'),
            if (rooms.isEmpty)
              const EliteMessageBox(
                icon: Icons.favorite_border_rounded,
                title: 'Chưa có phòng yêu thích',
                message:
                    'Bấm biểu tượng trái tim ở trang chi tiết phòng để lưu.',
              ),
            for (final room in rooms) RoomListCard(room: room),
          ],
        );
      },
    );
  }

  Widget _buildSearch() {
    final advancedCount = _filters.advancedCount;
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  textInputAction: TextInputAction.search,
                  onSubmitted: (v) => _apply(() => _filters.keyword = v),
                  decoration: const InputDecoration(
                    hintText: 'Tên đường, tòa nhà, gác lửng...',
                    prefixIcon: Icon(
                      Icons.search_rounded,
                      color: EliteColors.champagneHover,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Badge(
                isLabelVisible: advancedCount > 0,
                label: Text('$advancedCount'),
                backgroundColor: EliteColors.champagneHover,
                child: IconButton.filled(
                  tooltip: 'Bộ lọc nâng cao',
                  onPressed: _openAdvanced,
                  style: IconButton.styleFrom(
                    backgroundColor: EliteColors.deepNavy,
                    foregroundColor: EliteColors.champagne,
                    fixedSize: const Size(52, 52),
                  ),
                  icon: const Icon(Icons.tune_rounded),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _horizontalChips<String>(
            kDistrictOptions,
            _filters.district,
            (v) => _apply(() => _filters.district = v),
          ),
          const SizedBox(height: 6),
          _horizontalChips<int>(
            [
              for (var i = 0; i < kPriceRanges.length; i++)
                (i, kPriceRanges[i].$3),
            ],
            _filters.priceIndex,
            (v) => _apply(() => _filters.priceIndex = v),
          ),
          const SizedBox(height: 6),
          _horizontalChips<String>(
            [
              for (final street in kHotStreets) (street, street),
            ],
            _filters.keyword,
            (street) => _apply(() {
              final next = _filters.keyword == street ? '' : street;
              _filters.keyword = next;
              _searchController.text = next;
            }),
          ),
          const SizedBox(height: 10),
          EliteChoiceChips<bool>(
            options: const [(false, 'Theo phòng'), (true, 'Theo tòa nhà')],
            selected: _viewBuildings,
            onSelected: (v) => _apply(() => _viewBuildings = v),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: Text(
                  _isLoading
                      ? 'Đang tìm...'
                      : _viewBuildings
                      ? 'Tìm thấy ${_buildings.length} tòa nhà'
                      : 'Tìm thấy $_total phòng trống',
                  style: TextStyle(color: Colors.grey.shade700, fontSize: 12),
                ),
              ),
              if (!_viewBuildings) DropdownButton<String>(
                value: _filters.sort,
                underline: const SizedBox.shrink(),
                style: const TextStyle(
                  color: EliteColors.deepNavy,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
                items: [
                  for (final (value, label) in kSortOptions)
                    DropdownMenuItem(value: value, child: Text(label)),
                ],
                onChanged: (v) {
                  if (v != null) _apply(() => _filters.sort = v);
                },
              ),
            ],
          ),
          const SizedBox(height: 4),
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.only(top: 48),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_error != null)
            EliteMessageBox(
              icon: Icons.cloud_off_rounded,
              title: 'Không tải được danh sách phòng',
              message: _error!,
              actionLabel: 'Thử lại',
              onAction: _load,
            )
          else if (_viewBuildings)
            if (_buildings.isEmpty)
              const EliteMessageBox(
                icon: Icons.search_off_rounded,
                title: 'Không tìm thấy tòa nhà nào phù hợp',
                message: 'Thử xóa bộ lọc để xem tất cả tòa nhà.',
              )
            else ...[
              for (final building in _buildings)
                BuildingCard(building: building),
            ]
          else if (_rooms.isEmpty)
            EliteMessageBox(
              icon: Icons.search_off_rounded,
              title: 'Không có phòng phù hợp',
              message: 'Thử nới bộ lọc hoặc đổi khu vực, ngân sách.',
              actionLabel: advancedCount > 0 ? 'Xóa bộ lọc nâng cao' : null,
              onAction: () => _apply(_filters.resetAdvanced),
            )
          else ...[
            for (final room in _rooms)
              if (room is Map)
                RoomListCard(room: Map<String, dynamic>.from(room)),
            if (_page < _totalPages)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: OutlinedButton(
                  onPressed: _isLoadingMore ? null : () => _load(more: true),
                  style: eliteOutlinedStyle(),
                  child: _isLoadingMore
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text('Tải thêm (trang ${_page + 1}/$_totalPages)'),
                ),
              ),
          ],
        ],
      ),
    );
  }

  Widget _horizontalChips<T>(
    List<(T, String)> options,
    T selected,
    ValueChanged<T> onSelected,
  ) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (final (value, label) in options)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(label),
                selected: value == selected,
                showCheckmark: false,
                selectedColor: EliteColors.champagne,
                backgroundColor: Colors.white,
                side: BorderSide(
                  color: value == selected
                      ? EliteColors.champagne
                      : EliteColors.border,
                ),
                labelStyle: TextStyle(
                  fontSize: 12,
                  color: value == selected
                      ? Colors.white
                      : EliteColors.deepNavy,
                  fontWeight: value == selected
                      ? FontWeight.w700
                      : FontWeight.w500,
                ),
                onSelected: (_) => onSelected(value),
              ),
            ),
        ],
      ),
    );
  }
}

class _AdvancedFilterSheet extends StatefulWidget {
  const _AdvancedFilterSheet({required this.filters});

  final RoomFilters filters;

  @override
  State<_AdvancedFilterSheet> createState() => _AdvancedFilterSheetState();
}

class _AdvancedFilterSheetState extends State<_AdvancedFilterSheet> {
  RoomFilters get f => widget.filters;
  bool _locating = false;
  String? _locationError;

  /// Chọn bán kính thì cần vị trí hiện tại; lấy một lần rồi dùng lại.
  Future<void> _applyRadius(double? radius) async {
    if (radius == null || f.center != null) {
      setState(() {
        f.radiusKm = radius;
        _locationError = null;
      });
      return;
    }
    setState(() {
      _locating = true;
      _locationError = null;
    });
    try {
      final position = await LocationService.current();
      if (!mounted) return;
      setState(() {
        f.center = position;
        f.radiusKm = radius;
      });
    } on LocationException catch (e) {
      if (mounted) setState(() => _locationError = e.message);
    } catch (_) {
      if (mounted) {
        setState(
          () => _locationError =
              'Không lấy được vị trí. Hãy cấp quyền vị trí rồi thử lại.',
        );
      }
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  Widget _switch(String label, bool value, ValueChanged<bool> onChanged) {
    return SwitchListTile(
      contentPadding: EdgeInsets.zero,
      dense: true,
      title: Text(label, style: const TextStyle(fontSize: 13)),
      value: value,
      activeThumbColor: EliteColors.champagne,
      onChanged: (v) => setState(() => onChanged(v)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.8,
      maxChildSize: 0.95,
      builder: (context, controller) => ListView(
        controller: controller,
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Bộ lọc nâng cao',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: EliteColors.deepNavy,
                  ),
                ),
              ),
              TextButton(
                onPressed: () => setState(f.resetAdvanced),
                child: const Text('Đặt lại'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const EliteSectionTitle('Dạng phòng'),
          EliteChoiceChips<String>(
            options: const [
              ('all', 'Tất cả'),
              ('gac_lung', 'Gác lửng đúc'),
              ('studio', 'Studio không gác'),
              ('1pn', '1 phòng ngủ'),
              ('2pn', '2 phòng ngủ'),
            ],
            selected: f.roomType,
            onSelected: (v) => setState(() => f.roomType = v),
          ),
          const SizedBox(height: 12),
          const EliteSectionTitle('Số người ở'),
          EliteChoiceChips<String>(
            options: const [
              ('all', 'Tất cả'),
              ('1', '1 người'),
              ('2', '2 người'),
              ('3-4', '3 - 4 người'),
              ('family', '5 người trở lên'),
            ],
            selected: f.occupants,
            onSelected: (v) => setState(() => f.occupants = v),
          ),
          const SizedBox(height: 12),
          const EliteSectionTitle('Phương tiện'),
          EliteChoiceChips<String>(
            options: const [
              ('all', 'Tất cả'),
              ('1', '1 xe máy'),
              ('2', '2 xe máy'),
              ('3+', '3+ xe máy'),
              ('car', 'Chỗ đỗ ô tô'),
            ],
            selected: f.bikes,
            onSelected: (v) => setState(() => f.bikes = v),
          ),
          const SizedBox(height: 12),
          const EliteSectionTitle('Chi phí & tiện nghi'),
          _switch(
            'Điện rẻ (< 3.800 đ/kWh)',
            f.cheapElectricity,
            (v) => f.cheapElectricity = v,
          ),
          _switch('Miễn phí dịch vụ', f.freeService, (v) => f.freeService = v),
          _switch('Cho nuôi thú cưng', f.petFriendly, (v) => f.petFriendly = v),
          _switch('Dọn vào ngay tuần này', f.moveInNow, (v) => f.moveInNow = v),
          const SizedBox(height: 12),
          const EliteSectionTitle('Tiện ích bắt buộc'),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              for (final amenity in kRequiredAmenities)
                FilterChip(
                  label: Text(amenity),
                  selected: f.amenities.contains(amenity),
                  showCheckmark: false,
                  selectedColor: EliteColors.champagne,
                  backgroundColor: Colors.white,
                  side: BorderSide(
                    color: f.amenities.contains(amenity)
                        ? EliteColors.champagne
                        : EliteColors.border,
                  ),
                  labelStyle: TextStyle(
                    fontSize: 12,
                    color: f.amenities.contains(amenity)
                        ? Colors.white
                        : EliteColors.deepNavy,
                  ),
                  onSelected: (selected) => setState(() {
                    selected
                        ? f.amenities.add(amenity)
                        : f.amenities.remove(amenity);
                  }),
                ),
            ],
          ),
          const SizedBox(height: 12),
          const EliteSectionTitle('Bán kính quanh tôi'),
          EliteChoiceChips<double?>(
            options: [
              (null, 'Tất cả'),
              for (final r in kSearchRadiusOptions)
                (r, '${r.toStringAsFixed(0)} km'),
            ],
            selected: f.radiusKm,
            onSelected: (v) {
              if (!_locating) _applyRadius(v);
            },
          ),
          const SizedBox(height: 4),
          Text(
            _locating
                ? 'Đang lấy vị trí…'
                : _locationError ??
                      (f.radiusKm != null
                          ? 'Đang lọc bằng vị trí hiện tại của thiết bị.'
                          : 'Chọn bán kính để dùng vị trí hiện tại.'),
            style: TextStyle(
              fontSize: 11,
              color: _locationError != null
                  ? const Color(0xFFC0392B)
                  : Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: eliteFilledStyle(),
            child: const Text('Áp dụng bộ lọc'),
          ),
        ],
      ),
    );
  }
}

/// Phòng đã lưu, mở từ trang cá nhân; dùng chung danh sách với website.
class SavedRoomsScreen extends StatelessWidget {
  const SavedRoomsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Phòng đã lưu')),
      body: ValueListenableBuilder(
        valueListenable: FavoritesStore.rooms,
        builder: (context, favorites, _) {
          final rooms = favorites.values.toList();
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (rooms.isEmpty)
                const EliteMessageBox(
                  icon: Icons.favorite_border_rounded,
                  title: 'Chưa có phòng đã lưu',
                  message:
                      'Bấm biểu tượng trái tim ở trang chi tiết phòng để lưu.',
                ),
              for (final room in rooms) RoomListCard(room: room),
            ],
          );
        },
      ),
    );
  }
}

/// Compact room card used by search and favorites.
class RoomListCard extends StatelessWidget {
  const RoomListCard({super.key, required this.room});

  final Map<String, dynamic> room;

  @override
  Widget build(BuildContext context) {
    final images = room['images'] as List<dynamic>?;
    final image = images != null && images.isNotEmpty
        ? '${images.first}'
        : kFallbackRoomImage;
    // Danh sách "gần tôi" có calculated_distance (km tới vị trí hiện tại); còn lại hiện khoảng cách tới HUIT
    final nearDistance = room['calculated_distance'];
    final distance = room['distance_to_huit_km'];
    return EliteCard(
      padding: EdgeInsets.zero,
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => RoomDetailScreen(room: room)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.horizontal(
              left: Radius.circular(16),
            ),
            child: Image.network(
              image,
              width: 112,
              height: 124,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => Container(
                width: 112,
                height: 124,
                color: EliteColors.border,
                child: const Icon(Icons.image_not_supported_outlined),
              ),
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${room['room_code'] ?? ''}',
                          style: const TextStyle(
                            color: EliteColors.champagneHover,
                            fontWeight: FontWeight.w800,
                            fontSize: 11,
                          ),
                        ),
                      ),
                      ValueListenableBuilder(
                        valueListenable: FavoritesStore.rooms,
                        builder: (context, _, _) => GestureDetector(
                          onTap: () async {
                            try {
                              await FavoritesStore.toggle(room);
                            } on ApiException catch (e) {
                              if (context.mounted) showSnack(context, e.message);
                            }
                          },
                          child: Icon(
                            FavoritesStore.contains(room['id'])
                                ? Icons.favorite_rounded
                                : Icons.favorite_border_rounded,
                            size: 20,
                            color: EliteColors.champagneHover,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
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
                  const SizedBox(height: 4),
                  Text(
                    [
                      '${room['area'] ?? '?'}m²',
                      if (room['district'] != null) '${room['district']}',
                      if (nearDistance is num)
                        'cách bạn ${nearDistance.toStringAsFixed(1)} km'
                      else if (distance is num)
                        '${distance.toStringAsFixed(1)} km tới HUIT',
                    ].join(' • '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 11),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${vnd.format(room['price'] ?? 0)}/tháng',
                    style: const TextStyle(
                      color: EliteColors.champagneHover,
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                    ),
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
