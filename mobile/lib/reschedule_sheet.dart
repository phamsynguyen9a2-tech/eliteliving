import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'main.dart' show EliteColors;
import 'tenant_api.dart';

/// Bottom sheet đổi lịch xem phòng: chỉ hiện ngày / khung giờ chủ trọ mở đón khách.
/// Trả về thông báo của máy chủ khi đổi thành công, null nếu người dùng đóng.
Future<String?> showRescheduleSheet(
  BuildContext context, {
  required String appointmentId,
  required int roomId,
  required String currentLabel,
}) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (_) => _RescheduleSheet(appointmentId: appointmentId, roomId: roomId, currentLabel: currentLabel),
  );
}

class _RescheduleSheet extends StatefulWidget {
  const _RescheduleSheet({required this.appointmentId, required this.roomId, required this.currentLabel});
  final String appointmentId;
  final int roomId;
  final String currentLabel;

  @override
  State<_RescheduleSheet> createState() => _RescheduleSheetState();
}

class _RescheduleSheetState extends State<_RescheduleSheet> {
  LandlordAvailability? _availability;
  DateTime? _date;
  String? _slot;
  final _reason = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    TenantApi.fetchAvailability(widget.roomId).then((a) {
      if (mounted) setState(() => _availability = a);
    }).catchError((Object e) {
      if (mounted) setState(() => _error = '$e');
    });
  }

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  List<DateTime> get _dates {
    final a = _availability;
    if (a == null) return const [];
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    return [
      for (var i = 0; i < 21; i++) today.add(Duration(days: i)),
    ].where((d) => a.isOpenOn(d) && a.slotsFor(d).isNotEmpty).take(14).toList();
  }

  Future<void> _submit() async {
    final date = _date;
    final slot = _slot;
    if (date == null || slot == null) {
      setState(() => _error = 'Vui lòng chọn ngày và khung giờ mới.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final message = await TenantApi.rescheduleAppointment(
        id: widget.appointmentId,
        date: DateFormat('yyyy-MM-dd').format(date),
        timeSlot: slot,
        reason: _reason.text.trim().isEmpty ? null : _reason.text.trim(),
      );
      if (mounted) Navigator.pop(context, message);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final a = _availability;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Đổi lịch xem phòng',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: EliteColors.deepNavy)),
            const SizedBox(height: 4),
            Text('Lịch hiện tại: ${widget.currentLabel}', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
            const SizedBox(height: 16),
            if (a == null && _error == null) const Center(child: CircularProgressIndicator()),
            if (a != null) ...[
              const Text('Chọn ngày mới', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final d in _dates)
                    ChoiceChip(
                      label: Text('${LandlordAvailability.dayCode(d)} ${DateFormat('dd/MM').format(d)}'),
                      selected: _date == d,
                      selectedColor: EliteColors.champagne.withValues(alpha: 0.25),
                      onSelected: (_) => setState(() {
                        _date = d;
                        _slot = null;
                      }),
                    ),
                ],
              ),
              if (_date != null) ...[
                const SizedBox(height: 14),
                const Text('Chọn khung giờ', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    for (final s in a.slotsFor(_date!))
                      ChoiceChip(
                        label: Text(s),
                        selected: _slot == s,
                        selectedColor: EliteColors.champagne.withValues(alpha: 0.25),
                        onSelected: (_) => setState(() => _slot = s),
                      ),
                  ],
                ),
              ],
              const SizedBox(height: 14),
              TextField(
                controller: _reason,
                maxLength: 200,
                decoration: const InputDecoration(labelText: 'Lý do (không bắt buộc)'),
              ),
              Text('Lịch mới sẽ chờ chủ trọ xác nhận lại.', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
            ],
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: const TextStyle(color: Color(0xFFC0392B))),
            ],
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _saving || a == null ? null : _submit,
              style: FilledButton.styleFrom(
                backgroundColor: EliteColors.champagne,
                minimumSize: const Size.fromHeight(48),
              ),
              child: Text(_saving ? 'Đang đổi lịch…' : 'Xác nhận đổi lịch'),
            ),
          ],
        ),
      ),
    );
  }
}
