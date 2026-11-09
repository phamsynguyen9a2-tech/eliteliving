import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

import 'building_screens.dart';
import 'contact_actions.dart';
import 'location_presets.dart';
import 'location_service.dart';
import 'main.dart' show EliteColors;
import 'tenant_api.dart';
import 'ui_kit.dart';

const List<double> kMapRadiusOptions = [0.5, 1, 1.5, 2, 3, 5, 8];

/// Kiểu bản đồ: dùng nguồn nền miễn phí, không cần khóa API.
const Map<String, String> _kMapStyles = {
  'Đường phố': 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  'Nền sáng': 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
};

class _MapPerson {
  _MapPerson(this.preset);

  LocationPreset preset;
}

/// Kết quả tìm địa điểm: tọa độ, tên ngắn, tỉnh/thành và có thuộc TP.HCM không.
class GeocodeResult {
  const GeocodeResult({
    required this.point,
    required this.name,
    required this.inHcmc,
    this.region,
  });

  final LatLng point;
  final String name;
  final bool inHcmc;
  final String? region;
}

/// Tìm địa điểm bằng OpenStreetMap Nominatim trên toàn Việt Nam, ưu tiên khu vực TP.HCM (như web).
/// Giới hạn cứng trong TP.HCM làm "Đà Lạt" ra quán "Sữa chua Đà Lạt", nên chỉ dùng viewbox để ưu tiên.
/// Không thấy kết quả khớp từ khóa thì trả null.
Future<GeocodeResult?> geocodePlace(String query) async {
  final q = query.trim();
  if (q.isEmpty) return null;
  try {
    final res = await http
        .get(
          Uri.https('nominatim.openstreetmap.org', '/search', {
            'format': 'json',
            'limit': '5',
            'countrycodes': 'vn',
            'viewbox': '106.35,11.20,107.05,10.35',
            'q': q,
          }),
          headers: const {'User-Agent': 'EliteLivingMobile/1.0 (KLCN111)'},
        )
        .timeout(const Duration(seconds: 15));
    final data = jsonDecode(utf8.decode(res.bodyBytes));
    if (data is! List) return null;
    // Kết quả phải chứa mọi số trong từ khóa ("81", "3/2"…) và ít nhất một từ chữ
    final tokens = normalizeSearchText(
      q,
    ).split(RegExp(r'[\s,]+')).where((t) => t.length > 1).toList();
    final numbers = tokens.where((t) => RegExp(r'\d').hasMatch(t)).toList();
    final words = tokens.where((t) => !RegExp(r'\d').hasMatch(t)).toList();
    Map? best;
    for (final item in data) {
      if (item is! Map) continue;
      final text = normalizeSearchText(
        '${item['name'] ?? ''} ${item['display_name'] ?? ''}',
      );
      final matches =
          numbers.every(text.contains) &&
          (words.isEmpty || words.any(text.contains));
      if (!matches) continue;
      // Chọn kết quả nổi tiếng nhất ("Hà Nội" → thủ đô, không phải con đường tên Hà Nội ở Hóc Môn)
      final importance = double.tryParse('${item['importance']}') ?? 0;
      final bestImportance =
          double.tryParse('${best?['importance']}') ?? double.negativeInfinity;
      if (best == null || importance > bestImportance) best = item;
    }
    if (best == null) return null;
    final lat = double.tryParse('${best['lat']}');
    final lng = double.tryParse('${best['lon']}');
    if (lat == null || lng == null) return null;
    final displayName = '${best['display_name'] ?? q}';
    final parts = displayName
        .split(',')
        .map((part) => part.trim())
        .where((part) => part.isNotEmpty)
        .toList();
    final name = parts.isEmpty ? q : parts.first;
    final regions = parts
        .where(
          (part) =>
              RegExp(
                r'^(Tỉnh|Thành phố)\s',
                caseSensitive: false,
              ).hasMatch(part) &&
              part != name,
        )
        .toList();
    return GeocodeResult(
      point: LatLng(lat, lng),
      name: name,
      inHcmc: normalizeSearchText(displayName).contains('ho chi minh'),
      region: regions.isEmpty ? null : regions.last,
    );
  } catch (e) {
    debugPrint('Geocode thất bại: $e');
  }
  return null;
}

/// Giữ cho các chỗ gọi cũ: chỉ trả tọa độ.
Future<LatLng?> geocodeInHcmc(String query) async =>
    (await geocodePlace(query))?.point;

/// Bản đồ tìm tòa nhà quanh một địa điểm hoặc điểm giữa 2 đến 4 người, như `EliteRadarMapModal`.
class BuildingMapScreen extends StatefulWidget {
  const BuildingMapScreen({super.key, this.initialQuery = ''});

  final String initialQuery;

  @override
  State<BuildingMapScreen> createState() => _BuildingMapScreenState();
}

class _BuildingMapScreenState extends State<BuildingMapScreen> {
  final _mapController = MapController();
  final _addressController = TextEditingController();
  final _minPriceController = TextEditingController();
  final _maxPriceController = TextEditingController();

  List<BuildingInfo> _buildings = const [];
  bool _loading = true;
  String? _error;

  bool _midpointMode = false;
  double _radiusKm = 1.5;
  String _mapStyle = _kMapStyles.keys.first;
  bool _searching = false;
  String? _searchNotice;
  bool _searchNoticeIsError = true;
  bool _locating = false;

  late LatLng _center;
  late String _centerLabel;
  late final List<_MapPerson> _people;

  @override
  void initState() {
    super.initState();
    final first = kMapPresets.first;
    _center = LatLng(first.lat, first.lng);
    _centerLabel = first.name;
    _addressController.text = widget.initialQuery.isNotEmpty
        ? widget.initialQuery
        : first.name;
    _people = [
      _MapPerson(kMapPresets.firstWhere((p) => p.id == 'huit')),
      _MapPerson(kMapPresets.firstWhere((p) => p.id == 'bach-khoa-q10')),
    ];
    _load();
    if (widget.initialQuery.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _searchAddress();
      });
    }
  }

  @override
  void dispose() {
    _mapController.dispose();
    _addressController.dispose();
    _minPriceController.dispose();
    _maxPriceController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final buildings = await TenantApi.fetchBuildings({'district': 'all'});
      if (mounted) setState(() => _buildings = buildings);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  LatLng get _effectiveCenter {
    if (!_midpointMode) return _center;
    final mid = midpointOf([
      for (final p in _people) (lat: p.preset.lat, lng: p.preset.lng),
    ]);
    return LatLng(mid.lat, mid.lng);
  }

  String get _effectiveLabel => _midpointMode
      ? 'Điểm giữa cân bằng (${_people.length} người)'
      : _centerLabel;

  double? _priceFrom(TextEditingController c) =>
      double.tryParse(c.text.trim().replaceAll(',', '.'));

  void _moveTo(LatLng point, String label) {
    setState(() {
      _center = point;
      _centerLabel = label;
      _searchNotice = null;
    });
    _recenter(point);
  }

  void _recenter(LatLng point) {
    try {
      _mapController.move(point, 14);
    } catch (e) {
      // Bản đồ chưa dựng xong: lần dựng đầu đã dùng đúng tâm mới.
      debugPrint('Chưa di chuyển được bản đồ: $e');
    }
  }

  Future<void> _searchAddress() async {
    final query = _addressController.text.trim();
    if (query.isEmpty) return;
    FocusScope.of(context).unfocus();
    final local = searchPresets(kMapPresets, query, limit: 1);
    if (local.isNotEmpty) {
      _moveTo(LatLng(local.first.lat, local.first.lng), local.first.name);
      return;
    }
    setState(() {
      _searching = true;
      _searchNotice = null;
    });
    final found = await geocodePlace(query);
    if (!mounted) return;
    setState(() => _searching = false);
    if (found == null) {
      setState(() {
        _searchNoticeIsError = true;
        _searchNotice =
            'Không tìm thấy "$query". Thử gõ tên đường, địa danh cụ thể hơn hoặc chọn địa điểm có sẵn.';
      });
      return;
    }
    _moveTo(found.point, found.name);
    if (!found.inHcmc) {
      // Vẫn đưa bản đồ tới đúng nơi, báo rõ hệ thống chỉ có phòng ở TP.HCM
      const distance = Distance();
      final nearestKm = _buildings.isEmpty
          ? null
          : _buildings
                .map(
                  (b) => distance.as(
                    LengthUnit.Kilometer,
                    found.point,
                    LatLng(b.latitude, b.longitude),
                  ),
                )
                .reduce((a, b) => a < b ? a : b);
      final region = found.region != null && found.region != found.name
          ? ' (${found.region})'
          : '';
      setState(() {
        _searchNoticeIsError = false;
        _searchNotice =
            '${found.name}$region nằm ngoài TP.HCM. Elite Living hiện chỉ có phòng tại TP.HCM'
            '${nearestKm == null ? '' : ', tòa gần nhất cách khoảng ${nearestKm.round()} km'}.';
      });
    }
  }

  Future<void> _locateMe() async {
    setState(() => _locating = true);
    try {
      final pos = await LocationService.current();
      if (!mounted) return;
      _addressController.text = 'Vị trí GPS hiện tại của bạn';
      setState(() => _midpointMode = false);
      _moveTo(LatLng(pos.lat, pos.lng), 'Vị trí GPS hiện tại của bạn');
    } on LocationException catch (e) {
      if (mounted) showSnack(context, e.message);
    } catch (e) {
      if (mounted) showSnack(context, 'Không lấy được vị trí: $e');
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  Future<LocationPreset?> _pickPreset() {
    return showLocationPicker(context, kMapPresets, 'Chọn địa điểm');
  }

  void _showBuilding(BuildingInfo building, double distanceKm) {
    showModalBottomSheet(
      context: context,
      backgroundColor: EliteColors.canvas,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              BuildingCard(building: building, distanceKm: distanceKm),
              OutlinedButton.icon(
                onPressed: () => openExternal(
                  context,
                  directionsUri(
                    lat: building.latitude,
                    lng: building.longitude,
                    address: building.address,
                  ),
                ),
                style: eliteOutlinedStyle(height: 44),
                icon: const Icon(Icons.directions_rounded, size: 18),
                label: const Text('Chỉ đường'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final center = _effectiveCenter;
    final matched = matchBuildings(
      _buildings,
      lat: center.latitude,
      lng: center.longitude,
      radiusKm: _radiusKm,
      minPriceMillion: _priceFrom(_minPriceController),
      maxPriceMillion: _priceFrom(_maxPriceController),
    );
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bản đồ tòa nhà'),
        actions: [
          PopupMenuButton<String>(
            tooltip: 'Kiểu bản đồ',
            icon: const Icon(Icons.layers_outlined),
            initialValue: _mapStyle,
            onSelected: (v) => setState(() => _mapStyle = v),
            itemBuilder: (_) => [
              for (final name in _kMapStyles.keys)
                PopupMenuItem(value: name, child: Text(name)),
            ],
          ),
        ],
      ),
      body: Stack(
        children: [
          Positioned.fill(child: _buildMap(center, matched)),
          DraggableScrollableSheet(
            initialChildSize: 0.46,
            minChildSize: 0.16,
            maxChildSize: 0.92,
            builder: (context, controller) => Container(
              decoration: BoxDecoration(
                color: EliteColors.canvas,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(24),
                ),
                boxShadow: [
                  BoxShadow(
                    color: EliteColors.deepNavy.withValues(alpha: 0.18),
                    blurRadius: 16,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: ListView(
                controller: controller,
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
                children: _panelChildren(matched),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMap(
    LatLng center,
    List<({BuildingInfo building, double distanceKm})> matched,
  ) {
    return FlutterMap(
      mapController: _mapController,
      options: MapOptions(
        initialCenter: center,
        initialZoom: 13.5,
        onTap: (_, point) {
          // Chạm bản đồ để đổi tâm tìm kiếm ở chế độ 1 địa điểm, giống web
          if (_midpointMode) return;
          _addressController.text = 'Điểm đã chọn trên bản đồ';
          setState(() {
            _center = point;
            _centerLabel = 'Điểm đã chọn trên bản đồ';
          });
        },
      ),
      children: [
        TileLayer(
          key: ValueKey(_mapStyle),
          urlTemplate: _kMapStyles[_mapStyle],
          userAgentPackageName: 'vn.edu.huit.smarttro.mobile',
        ),
        CircleLayer(
          circles: [
            CircleMarker(
              point: center,
              radius: _radiusKm * 1000,
              useRadiusInMeter: true,
              color: EliteColors.champagne.withValues(alpha: 0.16),
              borderColor: EliteColors.champagneHover,
              borderStrokeWidth: 1.5,
            ),
          ],
        ),
        if (_midpointMode)
          PolylineLayer(
            polylines: [
              for (final person in _people)
                Polyline(
                  points: [
                    LatLng(person.preset.lat, person.preset.lng),
                    center,
                  ],
                  color: EliteColors.deepNavy,
                  strokeWidth: 2,
                ),
            ],
          ),
        MarkerLayer(
          markers: [
            for (final m in matched)
              Marker(
                point: LatLng(m.building.latitude, m.building.longitude),
                width: 38,
                height: 38,
                child: GestureDetector(
                  onTap: () => _showBuilding(m.building, m.distanceKm),
                  child: Tooltip(
                    message: m.building.name,
                    child: const Icon(
                      Icons.location_city_rounded,
                      color: EliteColors.deepNavy,
                      size: 30,
                    ),
                  ),
                ),
              ),
            if (_midpointMode)
              for (var i = 0; i < _people.length; i++)
                Marker(
                  point: LatLng(_people[i].preset.lat, _people[i].preset.lng),
                  width: 30,
                  height: 30,
                  child: CircleAvatar(
                    backgroundColor: EliteColors.deepNavy,
                    child: Text(
                      '${i + 1}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
            Marker(
              point: center,
              width: 42,
              height: 42,
              child: const Icon(
                Icons.place_rounded,
                color: EliteColors.champagneHover,
                size: 40,
              ),
            ),
          ],
        ),
        const RichAttributionWidget(
          attributions: [TextSourceAttribution('OpenStreetMap, CARTO')],
        ),
      ],
    );
  }

  List<Widget> _panelChildren(
    List<({BuildingInfo building, double distanceKm})> matched,
  ) {
    return [
      Center(
        child: Container(
          width: 42,
          height: 4,
          decoration: BoxDecoration(
            color: EliteColors.border,
            borderRadius: BorderRadius.circular(999),
          ),
        ),
      ),
      const SizedBox(height: 10),
      EliteChoiceChips<bool>(
        options: const [(false, '1 địa điểm'), (true, 'Ở giữa (2+ người)')],
        selected: _midpointMode,
        onSelected: (v) {
          setState(() => _midpointMode = v);
          _recenter(_effectiveCenter);
        },
      ),
      const SizedBox(height: 10),
      if (_midpointMode) ..._peopleControls() else ..._singleControls(),
      const SizedBox(height: 10),
      const EliteSectionTitle('Bán kính'),
      EliteChoiceChips<double>(
        options: [for (final r in kMapRadiusOptions) (r, '$r km')],
        selected: _radiusKm,
        onSelected: (v) => setState(() => _radiusKm = v),
      ),
      const SizedBox(height: 10),
      const EliteSectionTitle('Khoảng giá (triệu đồng/tháng)'),
      Row(
        children: [
          Expanded(child: _priceField(_minPriceController, 'Từ')),
          const SizedBox(width: 10),
          Expanded(child: _priceField(_maxPriceController, 'Đến')),
        ],
      ),
      const SizedBox(height: 12),
      EliteSectionTitle(
        _loading
            ? 'Đang tải các tòa nhà…'
            : 'Tìm thấy ${matched.length} tòa nhà trong bán kính',
      ),
      Text(
        'Tính từ: $_effectiveLabel',
        style: TextStyle(color: Colors.grey.shade600, fontSize: 11),
      ),
      const SizedBox(height: 8),
      if (_error != null)
        EliteMessageBox(
          icon: Icons.cloud_off_rounded,
          title: 'Không tải được tòa nhà',
          message: _error!,
          actionLabel: 'Thử lại',
          onAction: _load,
        )
      else if (!_loading && matched.isEmpty)
        const EliteMessageBox(
          icon: Icons.search_off_rounded,
          title: 'Không có tòa nhà trong bán kính này',
          message: 'Thử tăng bán kính hoặc đổi khoảng giá.',
        )
      else
        for (final m in matched)
          BuildingCard(building: m.building, distanceKm: m.distanceKm),
    ];
  }

  List<Widget> _singleControls() {
    return [
      TextField(
        controller: _addressController,
        textInputAction: TextInputAction.search,
        onSubmitted: (_) => _searchAddress(),
        decoration: InputDecoration(
          labelText: 'Địa chỉ, trường học hoặc tòa nhà',
          prefixIcon: const Icon(
            Icons.search_rounded,
            color: EliteColors.champagneHover,
          ),
          suffixIcon: IconButton(
            tooltip: 'Tìm vị trí',
            onPressed: _searching ? null : _searchAddress,
            icon: _searching
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.arrow_forward_rounded),
          ),
        ),
      ),
      if (_searchNotice != null)
        Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Text(
            _searchNotice!,
            style: TextStyle(
              color: _searchNoticeIsError
                  ? const Color(0xFFC0392B)
                  : const Color(0xFF8C6D37),
              fontSize: 12,
            ),
          ),
        ),
      const SizedBox(height: 8),
      Row(
        children: [
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () async {
                final preset = await _pickPreset();
                if (preset == null || !mounted) return;
                _addressController.text = preset.name;
                _moveTo(LatLng(preset.lat, preset.lng), preset.name);
              },
              style: eliteOutlinedStyle(height: 42),
              icon: const Icon(Icons.list_alt_rounded, size: 18),
              label: const Text('Địa điểm có sẵn'),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: OutlinedButton.icon(
              onPressed: _locating ? null : _locateMe,
              style: eliteOutlinedStyle(height: 42),
              icon: const Icon(Icons.my_location_rounded, size: 18),
              label: Text(_locating ? 'Đang lấy…' : 'Vị trí của tôi'),
            ),
          ),
        ],
      ),
    ];
  }

  List<Widget> _peopleControls() {
    return [
      for (var i = 0; i < _people.length; i++)
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: EliteCard(
            margin: EdgeInsets.zero,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            onTap: () async {
              final preset = await _pickPreset();
              if (preset != null && mounted) {
                setState(() => _people[i].preset = preset);
                _recenter(_effectiveCenter);
              }
            },
            child: Row(
              children: [
                CircleAvatar(
                  radius: 13,
                  backgroundColor: EliteColors.deepNavy,
                  child: Text(
                    '${i + 1}',
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    _people[i].preset.name,
                    style: const TextStyle(fontSize: 12),
                  ),
                ),
                if (_people.length > 2)
                  IconButton(
                    tooltip: 'Bỏ người ${i + 1}',
                    onPressed: () {
                      setState(() => _people.removeAt(i));
                      _recenter(_effectiveCenter);
                    },
                    icon: const Icon(Icons.close_rounded, size: 18),
                  )
                else
                  const SizedBox(height: 44),
              ],
            ),
          ),
        ),
      OutlinedButton.icon(
        onPressed: _people.length >= 4
            ? null
            : () {
                setState(() => _people.add(_MapPerson(kMapPresets.first)));
                _recenter(_effectiveCenter);
              },
        style: eliteOutlinedStyle(height: 42),
        icon: const Icon(Icons.person_add_alt_rounded, size: 18),
        label: Text('Thêm người (${_people.length}/4)'),
      ),
    ];
  }

  Widget _priceField(TextEditingController controller, String label) {
    return TextField(
      controller: controller,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      onChanged: (_) => setState(() {}),
      decoration: InputDecoration(labelText: label, isDense: true),
    );
  }
}

/// Chọn địa điểm có ô tìm kiếm, dùng chung cho bản đồ và mục tìm gần nơi học.
Future<LocationPreset?> showLocationPicker(
  BuildContext context,
  List<LocationPreset> presets,
  String title,
) {
  return showModalBottomSheet<LocationPreset>(
    context: context,
    isScrollControlled: true,
    backgroundColor: EliteColors.canvas,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (_) => _LocationPickerSheet(presets: presets, title: title),
  );
}

class _LocationPickerSheet extends StatefulWidget {
  const _LocationPickerSheet({required this.presets, required this.title});

  final List<LocationPreset> presets;
  final String title;

  @override
  State<_LocationPickerSheet> createState() => _LocationPickerSheetState();
}

class _LocationPickerSheetState extends State<_LocationPickerSheet> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final results = searchPresets(
      widget.presets,
      _query,
      limit: widget.presets.length,
    );
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.8,
      maxChildSize: 0.95,
      builder: (context, controller) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: TextField(
                autofocus: false,
                onChanged: (v) => setState(() => _query = v),
                decoration: InputDecoration(
                  labelText: widget.title,
                  hintText: 'Tìm trường ĐH, TTTM, tuyến đường...',
                  prefixIcon: const Icon(
                    Icons.search_rounded,
                    color: EliteColors.champagneHover,
                  ),
                ),
              ),
            ),
            Expanded(
              child: results.isEmpty
                  ? const Center(child: Text('Không có địa điểm phù hợp.'))
                  : ListView.builder(
                      controller: controller,
                      itemCount: results.length,
                      itemBuilder: (context, index) {
                        final preset = results[index];
                        return ListTile(
                          dense: true,
                          title: Text(preset.name),
                          subtitle: Text(
                            '${preset.group} • ${preset.district}',
                          ),
                          onTap: () => Navigator.pop(context, preset),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
