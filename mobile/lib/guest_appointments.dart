import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'main.dart' show EliteColors, RoomDetailScreen;
import 'tenant_api.dart';
import 'ui_kit.dart';

String _statusText(String status) => switch (status.toUpperCase()) {
  'CONFIRMED' => 'Chủ trọ đã xác nhận',
  'CANCELLED' => 'Đã hủy',
  'COMPLETED' => 'Đã xem phòng',
  _ => 'Chờ chủ trọ xác nhận',
};

/// Lịch đã đặt khi chưa đăng nhập, lưu mã tra cứu trên máy như trang `/lich-hen` của web.
class GuestAppointmentsSection extends StatelessWidget {
  const GuestAppointmentsSection({super.key});

  Future<void> _enterCode(BuildContext context) async {
    final controller = TextEditingController();
    final phoneController = TextEditingController();
    final input = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Nhập mã tra cứu'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Số điện thoại đã đặt lịch',
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: controller,
              decoration: const InputDecoration(
                labelText: 'Mã 6 số (hoặc link /lich-hen/...)',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, controller.text),
            style: FilledButton.styleFrom(
              backgroundColor: EliteColors.champagne,
            ),
            child: const Text('Mở lịch hẹn'),
          ),
        ],
      ),
    );
    final phone = phoneController.text.trim();
    controller.dispose();
    phoneController.dispose();
    if (input == null || !context.mounted) return;
    // Mã 6 số: tìm trên máy chủ bằng SĐT + mã, rồi lưu lại trên máy như lịch vừa đặt
    final shortCode = input.replaceAll(RegExp(r'\D'), '');
    if (shortCode.length == 6 && !input.contains('/') && !input.contains('.')) {
      if (phone.isEmpty) {
        showSnack(context, 'Vui lòng nhập số điện thoại đã đặt lịch.');
        return;
      }
      try {
        final found = await TenantApi.findGuestAppointment(phone, shortCode);
        final foundToken = found.lookupToken;
        if (!context.mounted) return;
        if (foundToken == null) {
          showSnack(context, 'Không tìm thấy lịch hẹn.');
          return;
        }
        await GuestAppointmentStore.save(
          SavedGuestAppointment(
            token: foundToken,
            roomCode: found.roomCode,
            roomTitle: found.roomTitle,
            date: found.date,
            timeSlot: found.timeSlot,
          ),
        );
        if (!context.mounted) return;
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => GuestAppointmentScreen(token: foundToken),
          ),
        );
      } on ApiException catch (e) {
        if (context.mounted) showSnack(context, e.message);
      }
      return;
    }
    final token = parseLookupToken(input);
    if (token == null) {
      showSnack(context, 'Mã tra cứu không hợp lệ.');
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => GuestAppointmentScreen(token: token)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<List<SavedGuestAppointment>>(
      valueListenable: GuestAppointmentStore.items,
      builder: (context, items, _) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          EliteSectionTitle(
            'Lịch đã đặt trên máy này',
            trailing: TextButton(
              onPressed: () => _enterCode(context),
              style: TextButton.styleFrom(
                foregroundColor: EliteColors.champagneHover,
                visualDensity: VisualDensity.compact,
              ),
              child: const Text('Nhập mã tra cứu'),
            ),
          ),
          for (final item in items)
            EliteCard(
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => GuestAppointmentScreen(token: item.token),
                ),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.event_note_rounded,
                    color: EliteColors.champagneHover,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.roomCode.isNotEmpty
                              ? 'Phòng ${item.roomCode}'
                              : item.roomTitle,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                            color: EliteColors.deepNavy,
                          ),
                        ),
                        Text(
                          '${item.timeSlot}, ngày ${formatDate(item.date)}',
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Bỏ khỏi danh sách',
                    onPressed: () => GuestAppointmentStore.forget(item.token),
                    icon: const Icon(Icons.close_rounded, size: 18),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Chi tiết một lịch hẹn mở bằng mã tra cứu, xem được và hủy được khi chưa đăng nhập.
class GuestAppointmentScreen extends StatefulWidget {
  const GuestAppointmentScreen({super.key, required this.token});

  final String token;

  @override
  State<GuestAppointmentScreen> createState() => _GuestAppointmentScreenState();
}

class _GuestAppointmentScreenState extends State<GuestAppointmentScreen> {
  GuestAppointmentView? _view;
  String? _error;
  bool _loading = true;
  bool _cancelling = false;

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
      final view = await TenantApi.fetchGuestAppointment(widget.token);
      if (!mounted) return;
      setState(() => _view = view);
      GuestAppointmentStore.save(
        SavedGuestAppointment(
          token: widget.token,
          roomCode: view.roomCode,
          roomTitle: view.roomTitle,
          date: view.date,
          timeSlot: view.timeSlot,
        ),
      );
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _cancel() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Hủy lịch xem phòng này?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Không'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            style: FilledButton.styleFrom(
              backgroundColor: EliteColors.champagne,
            ),
            child: const Text('Hủy lịch'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => _cancelling = true);
    try {
      final result = await TenantApi.cancelGuestAppointment(widget.token);
      if (!mounted) return;
      setState(() => _view = result.view);
      showSnack(context, result.message);
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
    } finally {
      if (mounted) setState(() => _cancelling = false);
    }
  }

  Future<void> _openRoom(int roomId) async {
    try {
      final room = await TenantApi.fetchRoom(roomId);
      if (room == null || !mounted) return;
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => RoomDetailScreen(room: room)),
      );
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final view = _view;
    return Scaffold(
      appBar: AppBar(title: const Text('Lịch xem phòng')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_loading && view == null)
            const Padding(
              padding: EdgeInsets.only(top: 48),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (view == null)
            EliteMessageBox(
              icon: Icons.event_busy_rounded,
              title: 'Không mở được lịch hẹn',
              message: _error ?? 'Mã tra cứu không hợp lệ.',
              actionLabel: 'Thử lại',
              onAction: _load,
            )
          else ...[
            EliteCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          view.roomCode.isNotEmpty
                              ? 'Phòng ${view.roomCode}'
                              : 'Phòng đã đặt lịch',
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                            color: EliteColors.deepNavy,
                          ),
                        ),
                      ),
                      EliteStatusChip(_statusText(view.status)),
                    ],
                  ),
                  if (view.roomTitle.isNotEmpty)
                    Text(
                      view.roomTitle,
                      style: TextStyle(
                        color: Colors.grey.shade700,
                        fontSize: 12,
                      ),
                    ),
                  const Divider(height: 20),
                  EliteInfoRow(
                    label: 'Ngày xem',
                    value: formatDate(view.date),
                    bold: true,
                  ),
                  EliteInfoRow(
                    label: 'Khung giờ',
                    value: view.timeSlot,
                    bold: true,
                  ),
                  if (view.buildingName != null)
                    EliteInfoRow(label: 'Tòa nhà', value: view.buildingName!),
                  if (view.address != null)
                    EliteInfoRow(label: 'Địa chỉ', value: view.address!),
                  EliteInfoRow(label: 'Người xem', value: view.userName),
                  if (view.lookupCode != null)
                    EliteInfoRow(
                      label: 'Mã tra cứu',
                      value: view.lookupCode!,
                      bold: true,
                    ),
                  EliteInfoRow(
                    label: 'SĐT nhận xác nhận',
                    value: view.userPhoneMasked,
                  ),
                ],
              ),
            ),
            OutlinedButton.icon(
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: widget.token));
                if (context.mounted) {
                  showSnack(context, 'Đã sao chép mã tra cứu lịch hẹn.');
                }
              },
              style: eliteOutlinedStyle(height: 44),
              icon: const Icon(Icons.copy_rounded, size: 18),
              label: const Text('Sao chép mã tra cứu'),
            ),
            const SizedBox(height: 8),
            if (view.roomId != null)
              OutlinedButton(
                onPressed: () => _openRoom(view.roomId!),
                style: eliteOutlinedStyle(height: 44),
                child: const Text('Xem lại phòng'),
              ),
            if (view.canCancel) ...[
              const SizedBox(height: 8),
              FilledButton.icon(
                onPressed: _cancelling ? null : _cancel,
                style: FilledButton.styleFrom(
                  backgroundColor: EliteColors.deepNavy,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(46),
                ),
                icon: const Icon(Icons.event_busy_rounded, size: 18),
                label: Text(_cancelling ? 'Đang hủy…' : 'Hủy lịch xem phòng'),
              ),
            ],
          ],
        ],
      ),
    );
  }
}
