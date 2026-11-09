import 'package:flutter/material.dart';

import 'main.dart' show EliteColors;
import 'room_transfer.dart';
import 'tenant_api.dart';
import 'ui_kit.dart';

/// Khách thuê: xem phòng trống cùng chủ trọ, gửi yêu cầu đổi phòng, theo dõi trạng thái và bảng
/// quyết toán chênh lệch; báo đã chuyển khoản khi phải trả thêm (thanh toán giả lập).
class RoomTransferScreen extends StatefulWidget {
  const RoomTransferScreen({super.key, required this.contract});

  final RentalContract contract;

  @override
  State<RoomTransferScreen> createState() => _RoomTransferScreenState();
}

class _RoomTransferScreenState extends State<RoomTransferScreen> {
  TransferOptionsData? _data;
  List<RoomTransferRequestInfo> _requests = const [];
  bool _loading = true;
  bool _busy = false;
  bool _changed = false;
  String? _error;

  TransferOptionEntry? _selected;
  DateTime? _desiredDate;
  final _noteController = TextEditingController();
  final Map<String, TextEditingController> _codeControllers = {};

  bool get _isActive => widget.contract.status.toUpperCase() == 'ACTIVE';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _noteController.dispose();
    for (final c in _codeControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final all = await RoomTransferApi.fetchRequests();
      final data = _isActive
          ? await RoomTransferApi.fetchOptions(widget.contract.id)
          : null;
      if (!mounted) return;
      setState(() {
        _data = data;
        _requests = [
          for (final r in all)
            if (r.belongsTo(widget.contract.id)) r,
        ];
        if (_selected != null &&
            !(data?.options.any((o) => o.room.id == _selected!.room.id) ??
                false)) {
          _selected = null;
        }
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  DateTime get _today {
    final parsed = DateTime.tryParse(_data?.estimateDate ?? '');
    final now = DateTime.now();
    return parsed ?? DateTime(now.year, now.month, now.day);
  }

  DateTime get _lastDate {
    final end = DateTime.tryParse(
      _data?.contractEndDate ?? widget.contract.endDate,
    );
    if (end == null) return _today.add(const Duration(days: 365));
    final last = DateTime(end.year, end.month, end.day - 1);
    return last.isBefore(_today) ? _today : last;
  }

  String _iso(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  TransferSettlementInfo? get _estimate {
    final data = _data;
    final selected = _selected;
    if (data == null || selected == null) return null;
    final date = _desiredDate ?? _today;
    final sameMonth = date.year == _today.year && date.month == _today.month;
    return estimateTransfer(
      oldRent: data.monthlyRent,
      newRent: selected.room.price,
      oldDeposit: data.depositAmount,
      newDeposit: selected.room.deposit,
      transferDate: date,
      monthAlreadyBilled: sameMonth ? data.monthAlreadyBilled : true,
      contractStartDate: data.contractStartDate,
    );
  }

  Future<void> _run(Future<String> Function() action) async {
    setState(() => _busy = true);
    try {
      final message = await action();
      _changed = true;
      if (mounted) showSnack(context, message);
      await _load();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _desiredDate ?? _today,
      firstDate: _today,
      lastDate: _lastDate,
      helpText: 'Ngày muốn chuyển phòng',
    );
    if (picked != null) setState(() => _desiredDate = picked);
  }

  Future<void> _submit() async {
    final selected = _selected;
    if (selected == null) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Gửi yêu cầu đổi phòng'),
        content: Text(
          'Chuyển sang ${selected.room.roomCode} — ${selected.room.title}?\n'
          'Hợp đồng hiện tại giữ nguyên cho tới khi chủ trọ duyệt.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            style: FilledButton.styleFrom(
              backgroundColor: EliteColors.champagne,
            ),
            child: const Text('Gửi yêu cầu'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await _run(
      () => RoomTransferApi.create(
        contractId: widget.contract.id,
        toRoomId: selected.room.id,
        desiredDate: _iso(_desiredDate ?? _today),
        note: _noteController.text.trim(),
      ),
    );
    if (mounted) {
      setState(() {
        _selected = null;
        _desiredDate = null;
        _noteController.clear();
      });
    }
  }

  TextEditingController _codeFor(RoomTransferRequestInfo r) =>
      _codeControllers.putIfAbsent(
        r.id,
        () => TextEditingController(text: r.settlementTxCode ?? ''),
      );

  Widget _settlementTable(TransferSettlementInfo s, {bool estimate = false}) {
    Widget row(String label, double value) =>
        EliteInfoRow(label: label, value: signedVnd(value));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        row('Chênh lệch tiền cọc', s.depositDiff),
        row(s.rentLabel, s.rentDiff),
        if (s.utilityIncluded)
          EliteInfoRow(
            label:
                'Điện nước phòng cũ (${s.electricUsed.toStringAsFixed(0)} kWh, ${s.waterUsed.toStringAsFixed(0)} m³)',
            value: signedVnd(s.utilityCost),
          ),
        if (s.damageCost != 0) row('Chi phí hư hỏng phòng cũ', s.damageCost),
        const Divider(height: 14),
        EliteInfoRow(
          label: estimate ? 'Tổng ước tính' : 'Tổng chênh lệch',
          value: signedVnd(s.totalDiff),
          bold: true,
        ),
        const SizedBox(height: 4),
        Text(
          transferDiffText(s.totalDiff),
          style: const TextStyle(
            color: EliteColors.champagneHover,
            fontWeight: FontWeight.w700,
            fontSize: 12.5,
          ),
        ),
        if (estimate && !s.utilityIncluded)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              'Tiền điện nước phòng cũ được tính khi chủ trọ chốt chỉ số lúc bàn giao.',
              style: TextStyle(fontSize: 11.5, color: Colors.grey.shade600),
            ),
          ),
      ],
    );
  }

  Color _statusColor(String status) => switch (status) {
    'PENDING' => const Color(0xFFB7791F),
    'REJECTED' => const Color(0xFFC0392B),
    'CANCELLED' => Colors.grey.shade600,
    _ => EliteColors.champagneHover,
  };

  Widget _requestCard(RoomTransferRequestInfo r) {
    final s = r.settlement;
    return EliteCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '${r.fromRoomCode} → ${r.toRoomCode}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                    color: EliteColors.deepNavy,
                  ),
                ),
              ),
              EliteStatusChip(r.statusLabel, color: _statusColor(r.status)),
            ],
          ),
          if (r.toRoomTitle.isNotEmpty)
            Text(
              r.toRoomTitle,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
            ),
          const Divider(height: 18),
          EliteInfoRow(
            label: r.transferDate != null ? 'Ngày chuyển' : 'Dự kiến chuyển',
            value: formatDate(r.transferDate ?? r.desiredDate),
          ),
          if (r.contractEndDate != null)
            EliteInfoRow(
              label: 'Hạn hợp đồng (giữ nguyên)',
              value: formatDate(r.contractEndDate!),
            ),
          if (r.note != null) EliteInfoRow(label: 'Lời nhắn', value: r.note!),
          if (r.rejectReason != null)
            EliteInfoRow(label: 'Lý do từ chối', value: r.rejectReason!),
          if (s != null) ...[
            const SizedBox(height: 6),
            _settlementTable(s),
            const SizedBox(height: 6),
            EliteInfoRow(
              label: 'Thanh toán chênh lệch',
              value: r.settlementStatusLabel,
              bold: true,
            ),
            if (r.settlementTxCode != null)
              EliteInfoRow(label: 'Mã giao dịch', value: r.settlementTxCode!),
            Text(
              'Vui lòng ký hợp đồng mới, biên bản trả phòng cũ và biên bản nhận phòng mới.',
              style: TextStyle(fontSize: 11.5, color: Colors.grey.shade600),
            ),
          ],
          if (r.canReportPayment) ...[
            const SizedBox(height: 10),
            TextField(
              controller: _codeFor(r),
              decoration: InputDecoration(
                labelText: 'Mã giao dịch chuyển khoản',
                suffixIcon: IconButton(
                  tooltip: 'Tạo mã mô phỏng',
                  icon: const Icon(Icons.auto_fix_high_rounded),
                  onPressed: () =>
                      _codeFor(r).text = simulatedTransactionCode('DP'),
                ),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              kSimulatedPaymentNote,
              style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: _busy
                  ? null
                  : () => _run(
                      () => RoomTransferApi.reportPayment(
                        r.id,
                        _codeFor(r).text.trim(),
                      ),
                    ),
              style: eliteFilledStyle(height: 44),
              child: const Text('Báo đã chuyển khoản'),
            ),
          ],
          if (r.isPending) ...[
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: _busy
                  ? null
                  : () => _run(() => RoomTransferApi.cancel(r.id)),
              style: eliteOutlinedStyle(height: 44),
              child: const Text('Hủy yêu cầu'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _optionCard(TransferOptionEntry o) {
    final selected = _selected?.room.id == o.room.id;
    return EliteCard(
      onTap: () => setState(() => _selected = o),
      child: Container(
        decoration: selected
            ? BoxDecoration(
                border: Border(
                  left: BorderSide(color: EliteColors.champagne, width: 4),
                ),
              )
            : null,
        padding: EdgeInsets.only(left: selected ? 10 : 0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    '${o.room.roomCode} — ${o.room.title}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      color: EliteColors.deepNavy,
                    ),
                  ),
                ),
                Icon(
                  selected
                      ? Icons.radio_button_checked_rounded
                      : Icons.radio_button_off_rounded,
                  color: EliteColors.champagne,
                ),
              ],
            ),
            if (o.room.projectName != null)
              Text(
                o.room.projectName!,
                style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
              ),
            const SizedBox(height: 4),
            Text(
              'Giá ${vnd.format(o.room.price)} • Cọc ${vnd.format(o.room.deposit)}'
              '${o.room.area != null ? ' • ${o.room.area!.toStringAsFixed(0)} m²' : ''}',
              style: const TextStyle(fontSize: 12.5),
            ),
            const SizedBox(height: 2),
            Text(
              '${o.estimate.monthAlreadyBilled ? 'Ước tính chênh lệch' : 'Ước tính cần thanh toán'}: ${signedVnd(o.estimate.totalDiff)}',
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                color: EliteColors.champagneHover,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final data = _data;
    final hasPending =
        _requests.any((r) => r.isPending) || (data?.hasPendingRequest ?? false);
    final estimate = _estimate;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) Navigator.pop(context, _changed);
      },
      child: Scaffold(
        appBar: AppBar(title: const Text('Đổi phòng')),
        body: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              EliteCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Đang thuê: ${widget.contract.roomTitle}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        color: EliteColors.deepNavy,
                      ),
                    ),
                    const Divider(height: 18),
                    EliteInfoRow(
                      label: 'Giá thuê hiện tại',
                      value: vnd.format(widget.contract.monthlyRent),
                    ),
                    EliteInfoRow(
                      label: 'Tiền cọc đang giữ',
                      value: vnd.format(widget.contract.depositAmount),
                    ),
                    EliteInfoRow(
                      label: 'Hạn hợp đồng',
                      value:
                          '${formatDate(widget.contract.endDate)} (giữ nguyên khi đổi phòng)',
                    ),
                  ],
                ),
              ),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_error != null)
                EliteMessageBox(
                  icon: Icons.error_outline_rounded,
                  title: 'Không tải được dữ liệu đổi phòng',
                  message: _error!,
                  actionLabel: 'Thử lại',
                  onAction: _load,
                )
              else ...[
                if (_requests.isNotEmpty) ...[
                  const EliteSectionTitle('Yêu cầu đổi phòng của bạn'),
                  for (final r in _requests) _requestCard(r),
                ],
                if (_isActive && data != null && !hasPending) ...[
                  const EliteSectionTitle('Phòng trống cùng chủ trọ'),
                  if (!data.monthAlreadyBilled && data.options.isNotEmpty)
                    const EliteCard(
                      child: Text(
                        'Phòng bạn đang ở chưa có hóa đơn tháng này. Sau khi đổi phòng, tiền thuê tháng này '
                        'được thu luôn trong quyết toán, tính theo ngày (ngày ở phòng cũ theo giá cũ, ngày còn lại '
                        'theo giá mới), nên số tiền ước tính gồm cả tiền thuê tháng này.',
                        style: TextStyle(fontSize: 12.5, height: 1.4),
                      ),
                    ),
                  if (data.options.isEmpty)
                    const EliteMessageBox(
                      icon: Icons.bed_outlined,
                      title: 'Chưa có phòng trống nào khác',
                      message:
                          'Khi chủ trọ có phòng trống (tin đã duyệt), phòng sẽ hiện ở đây.',
                    )
                  else
                    for (final o in data.options) _optionCard(o),
                  if (_selected != null && estimate != null) ...[
                    const EliteSectionTitle('Thông tin yêu cầu'),
                    EliteCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: const Icon(
                              Icons.event_rounded,
                              color: EliteColors.champagne,
                            ),
                            title: const Text('Ngày muốn chuyển'),
                            subtitle: Text(
                              formatDate(_iso(_desiredDate ?? _today)),
                            ),
                            trailing: const Icon(Icons.edit_calendar_rounded),
                            onTap: _pickDate,
                          ),
                          TextField(
                            controller: _noteController,
                            maxLength: 500,
                            maxLines: 2,
                            decoration: const InputDecoration(
                              labelText:
                                  'Lời nhắn cho chủ trọ (không bắt buộc)',
                            ),
                          ),
                          EliteInfoRow(
                            label: 'Giá thuê mới',
                            value: vnd.format(_selected!.room.price),
                          ),
                          EliteInfoRow(
                            label: 'Tiền cọc mới',
                            value: vnd.format(_selected!.room.deposit),
                          ),
                          const Divider(height: 18),
                          _settlementTable(estimate, estimate: true),
                          const SizedBox(height: 6),
                          Text(
                            'Ngày chuyển là ngày chủ trọ duyệt (nếu hợp đồng chưa bắt đầu thì là ngày nhận phòng); số tiền cuối cùng tính theo ngày đó.',
                            style: TextStyle(
                              fontSize: 11.5,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    FilledButton.icon(
                      onPressed: _busy ? null : _submit,
                      style: eliteFilledStyle(height: 50),
                      icon: const Icon(Icons.swap_horiz_rounded),
                      label: const Text('Gửi yêu cầu đổi phòng'),
                    ),
                  ],
                ],
                if (!_isActive && _requests.isEmpty)
                  const EliteMessageBox(
                    icon: Icons.info_outline_rounded,
                    title: 'Hợp đồng đã kết thúc',
                    message:
                        'Chỉ hợp đồng đang hiệu lực mới yêu cầu đổi phòng được.',
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
