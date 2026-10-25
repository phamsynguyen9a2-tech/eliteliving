import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'location_service.dart';
import 'main.dart' show EliteColors;
import 'tenant_api.dart';

/// Hồ sơ nhu cầu thuê phòng: ngân sách, vị trí mong muốn, bán kính, tiện ích.
/// Gợi ý Top-K trên trang chủ dùng hồ sơ này.
class PreferenceProfileScreen extends StatefulWidget {
  const PreferenceProfileScreen({super.key});

  @override
  State<PreferenceProfileScreen> createState() => _PreferenceProfileScreenState();
}

class _PreferenceProfileScreenState extends State<PreferenceProfileScreen> {
  static const _huitLabel = 'Gần ĐH Công Thương TP.HCM (HUIT)';
  final _vnd = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ', decimalDigits: 0);
  PreferenceProfile _profile = const PreferenceProfile(
    budgetMax: 4500000,
    maxRadiusKm: 5,
    amenities: [],
    district: _huitLabel,
    targetLat: LocationService.huitLat,
    targetLng: LocationService.huitLng,
  );
  List<String> _amenityOptions = const [];
  bool _loading = true;
  bool _saving = false;
  bool _locating = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final result = await TenantApi.fetchPreferences();
      if (!mounted) return;
      setState(() {
        _amenityOptions = result.amenities;
        final saved = result.profile;
        if (saved != null) {
          _profile = saved.targetLat != null
              ? saved
              : saved.copyWith(
                  targetLat: LocationService.huitLat,
                  targetLng: LocationService.huitLng,
                  district: _huitLabel,
                );
        }
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _useCurrentLocation() async {
    setState(() => _locating = true);
    try {
      final pos = await LocationService.current();
      setState(() => _profile = _profile.copyWith(targetLat: pos.lat, targetLng: pos.lng, district: 'Vị trí hiện tại'));
    } on LocationException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final message = await TenantApi.savePreferences(_profile);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
      Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Hồ sơ nhu cầu')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(_error!, style: const TextStyle(color: Color(0xFFC0392B))),
                  ),
                Text('Ngân sách tối đa: ${_vnd.format(_profile.budgetMax)}/tháng',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: EliteColors.deepNavy)),
                Slider(
                  value: _profile.budgetMax.clamp(1000000, 20000000),
                  min: 1000000,
                  max: 20000000,
                  divisions: 76,
                  activeColor: EliteColors.champagne,
                  label: _vnd.format(_profile.budgetMax),
                  onChanged: (v) => setState(() => _profile = _profile.copyWith(budgetMax: v)),
                ),
                const SizedBox(height: 8),
                Text('Muốn ở gần: ${_profile.district ?? _huitLabel}',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: EliteColors.deepNavy)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  children: [
                    OutlinedButton.icon(
                      onPressed: () => setState(() => _profile = _profile.copyWith(
                        targetLat: LocationService.huitLat,
                        targetLng: LocationService.huitLng,
                        district: _huitLabel,
                      )),
                      icon: const Icon(Icons.school_outlined),
                      label: const Text('Gần HUIT'),
                    ),
                    OutlinedButton.icon(
                      onPressed: _locating ? null : _useCurrentLocation,
                      icon: _locating
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.my_location_rounded),
                      label: const Text('Vị trí hiện tại'),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text('Bán kính tìm: ${_profile.maxRadiusKm.toStringAsFixed(1)} km',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: EliteColors.deepNavy)),
                Slider(
                  value: _profile.maxRadiusKm.clamp(1, 15),
                  min: 1,
                  max: 15,
                  divisions: 28,
                  activeColor: EliteColors.champagne,
                  label: '${_profile.maxRadiusKm.toStringAsFixed(1)} km',
                  onChanged: (v) => setState(() => _profile = _profile.copyWith(maxRadiusKm: v)),
                ),
                const SizedBox(height: 8),
                Text('Tiện ích cần có (${_profile.amenities.length}/15)',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: EliteColors.deepNavy)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    for (final a in _amenityOptions)
                      FilterChip(
                        label: Text(a),
                        selected: _profile.amenities.contains(a),
                        selectedColor: EliteColors.champagne.withValues(alpha: 0.25),
                        onSelected: (on) {
                          final next = [..._profile.amenities];
                          if (on && next.length < 15) next.add(a);
                          if (!on) next.remove(a);
                          setState(() => _profile = _profile.copyWith(amenities: next));
                        },
                      ),
                  ],
                ),
                const SizedBox(height: 20),
                FilledButton.icon(
                  onPressed: _saving ? null : _save,
                  icon: const Icon(Icons.save_rounded),
                  label: Text(_saving ? 'Đang lưu…' : 'Lưu hồ sơ nhu cầu'),
                  style: FilledButton.styleFrom(
                    backgroundColor: EliteColors.champagne,
                    minimumSize: const Size.fromHeight(48),
                  ),
                ),
              ],
            ),
    );
  }
}
