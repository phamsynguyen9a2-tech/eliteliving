import 'package:flutter/material.dart';

import 'main.dart' show EliteColors, RoomDetailScreen;
import 'tenant_api.dart';
import 'ui_kit.dart';

/// Filter values mirror the web home page (web/src/app/page.tsx) so both
/// clients send the same query to GET /api/rooms.
const List<(String, String)> kDistrictOptions = [
  ('all', 'Tất cả khu vực'),
  ('tân phú', 'Quận Tân Phú'),
  ('tân bình', 'Quận Tân Bình'),
  ('bình tân', 'Quận Bình Tân'),
];

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

  int get advancedCount => [
    roomType != 'all',
    occupants != 'all',
    bikes != 'all',
    cheapElectricity,
    freeService,
    petFriendly,
    moveInNow,
  ].where((v) => v).length;

  void resetAdvanced() {
    roomType = 'all';
    occupants = 'all';
    bikes = 'all';
    cheapElectricity = false;
    freeService = false;
    petFriendly = false;
    moveInNow = false;
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
    };
  }
}

class RoomSearchScreen extends StatefulWidget {
  const RoomSearchScreen({super.key});

  @override
  State<RoomSearchScreen> createState() => _RoomSearchScreenState();
}

class _RoomSearchScreenState extends State<RoomSearchScreen> {
  final RoomFilters _filters = RoomFilters();
  final TextEditingController _searchController = TextEditingController();
  final List<dynamic> _rooms = [];
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
    if (applied == true) _load();
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tìm kiếm & Lọc phòng'),
        actions: [
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
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: Text(
                  _isLoading ? 'Đang tìm...' : 'Tìm thấy $_total phòng trống',
                  style: TextStyle(color: Colors.grey.shade700, fontSize: 12),
                ),
              ),
              DropdownButton<String>(
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
                          onTap: () => FavoritesStore.toggle(room),
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
