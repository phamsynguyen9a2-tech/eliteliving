import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import 'account_screens.dart';
import 'auth.dart';
import 'main.dart' show EliteColors;
import 'tenant_api.dart';
import 'ui_kit.dart';

/// Same receiving account the web shows in PayBillModal / DepositBookingModal.
const String kBankCode = 'MB';
const String kBankName = 'MBBank (Ngân hàng Quân đội)';
const String kBankAccount = '0908123456';
const String kBankHolder = 'NGUYEN VAN HUNG (CHU TRO)';

/// Titles of the 10 default house rules (web/src/lib/house-rules.ts).
const List<String> kHouseRuleTitles = [
  'An toàn PCCC & quy định sạc xe điện',
  'An ninh trật tự & giờ giấc ra vào',
  'Đăng ký cư trú & tiếp khách qua đêm',
  'Vệ sinh môi trường & phân loại rác',
  'Khung giờ yên tĩnh 22:00 - 06:00',
  'Chính sách nuôi thú cưng',
  'Bảo vệ cơ sở vật chất & bàn giao thiết bị',
  'Chốt chỉ số điện nước & kỳ thanh toán',
  'Định mức người ở & phương tiện xe máy',
  'Chấm dứt hợp đồng, báo trước 30 ngày & hoàn cọc',
];

String vietQrUrl({required double amount, required String content}) =>
    'https://img.vietqr.io/image/$kBankCode-$kBankAccount-compact2.png'
    '?amount=${amount.round()}'
    '&addInfo=${Uri.encodeComponent(content)}'
    '&accountName=${Uri.encodeComponent(kBankHolder)}';

String _contractStatusLabel(String status) => switch (status.toUpperCase()) {
  'ACTIVE' => 'Đang hiệu lực',
  'EXPIRED' => 'Đã hết hạn',
  'TERMINATED' => 'Đã thanh lý',
  _ => status,
};

// -------------------------------------------------------------
// HUB
// -------------------------------------------------------------
class RentalHubScreen extends StatefulWidget {
  const RentalHubScreen({super.key});

  @override
  State<RentalHubScreen> createState() => _RentalHubScreenState();
}

class _RentalHubScreenState extends State<RentalHubScreen> {
  List<TenantAppointmentInfo> _appointments = [];
  List<RentalContract> _contracts = [];
  List<Handover> _handovers = [];
  List<UtilityBill> _bills = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final appointments = await TenantApi.fetchAppointments();
      final contracts = await TenantApi.fetchContracts();
      final user = AuthService.currentUser.value;

      final handovers = <Handover>[];
      final bills = <UtilityBill>[];
      for (final roomId in {for (final c in contracts) c.roomId}) {
        final roomHandovers = await TenantApi.fetchHandovers(roomId: roomId);
        handovers.addAll(
          roomHandovers.where(
            (h) => user == null || h.tenantPhone == user.phone,
          ),
        );
        bills.addAll(await TenantApi.fetchBills(roomId));
      }

      if (!mounted) return;
      setState(() {
        _appointments = appointments;
        _contracts = contracts;
        _handovers = handovers;
        _bills = bills;
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<TenantAppointmentInfo> get _depositable {
    final seen = <int>{};
    return [
      for (final a in _appointments)
        if (a.status == 'COMPLETED' &&
            a.roomStatus == 'AVAILABLE' &&
            seen.add(a.roomId))
          a,
    ];
  }

  List<TenantAppointmentInfo> get _reserved {
    final contractRooms = {for (final c in _contracts) c.roomId};
    final seen = <int>{};
    return [
      for (final a in _appointments)
        if (a.roomStatus == 'RESERVED' &&
            contractRooms.contains(a.roomId) &&
            seen.add(a.roomId))
          a,
    ];
  }

  Future<void> _open(Widget screen) async {
    final changed = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => screen),
    );
    if (changed == true) _load();
  }

  Future<void> _cancelReservation(TenantAppointmentInfo a) async {
    final message = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: EliteColors.canvas,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => _CancelReservationSheet(appointment: a),
    );
    if (message != null && mounted) {
      showSnack(context, message);
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService.currentUser.value;
    final unpaid = _bills.where((b) => !b.isPaid).length;
    return Scaffold(
      appBar: AppBar(title: const Text('Thuê phòng của tôi')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            if (user != null && !user.phoneVerified)
              EliteCard(
                onTap: () => _open(const PhoneVerifyScreen()),
                child: const Row(
                  children: [
                    Icon(
                      Icons.verified_user_outlined,
                      color: EliteColors.champagneHover,
                    ),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Xác minh SĐT để đặt cọc, xem và ký hợp đồng điện tử.',
                        style: TextStyle(fontSize: 13),
                      ),
                    ),
                    Icon(Icons.chevron_right_rounded),
                  ],
                ),
              ),
            Row(
              children: [
                _Stat('Hợp đồng', '${_contracts.length}'),
                _Stat('Bàn giao', '${_handovers.length}'),
                _Stat('HĐ chưa trả', '$unpaid'),
              ],
            ),
            const SizedBox(height: 12),
            if (_isLoading)
              const Padding(
                padding: EdgeInsets.only(top: 48),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              EliteMessageBox(
                icon: Icons.cloud_off_rounded,
                title: 'Không tải được dữ liệu thuê phòng',
                message: _error!,
                actionLabel: 'Thử lại',
                onAction: _load,
              )
            else ...[
              const EliteSectionTitle('Đặt cọc giữ chỗ'),
              if (_depositable.isEmpty && _reserved.isEmpty)
                Text(
                  'Sau khi chủ trọ đánh dấu "Đã xem phòng" (hoàn tất lịch hẹn), '
                  'phòng sẽ hiện ở đây để bạn đặt cọc.',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                ),
              for (final a in _depositable)
                EliteCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        a.roomTitle,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          color: EliteColors.deepNavy,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Đã xem phòng ngày ${formatDate(a.date)} • ${vnd.format(a.price)}/tháng',
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 10),
                      FilledButton.icon(
                        onPressed: () => _open(DepositScreen(appointment: a)),
                        style: eliteFilledStyle(height: 42),
                        icon: const Icon(Icons.lock_outline_rounded, size: 18),
                        label: const Text('Đặt cọc giữ chỗ'),
                      ),
                    ],
                  ),
                ),
              for (final a in _reserved)
                EliteCard(
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              a.roomTitle,
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                color: EliteColors.deepNavy,
                              ),
                            ),
                            const SizedBox(height: 4),
                            const EliteStatusChip('Đang giữ chỗ'),
                          ],
                        ),
                      ),
                      TextButton(
                        onPressed: () => _cancelReservation(a),
                        child: const Text('Hủy giữ chỗ'),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 8),
              const EliteSectionTitle('Hợp đồng điện tử'),
              if (_contracts.isEmpty)
                Text(
                  user?.phoneVerified == true
                      ? 'Chưa có hợp đồng. Hợp đồng được lập sau khi bạn đặt cọc.'
                      : 'Xác minh SĐT để xem hợp đồng gắn với số điện thoại của bạn.',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                ),
              for (final c in _contracts)
                EliteCard(
                  onTap: () => _open(ContractDetailScreen(contract: c)),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.description_outlined,
                        color: EliteColors.champagneHover,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              c.roomTitle,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                color: EliteColors.deepNavy,
                              ),
                            ),
                            Text(
                              '${formatDate(c.startDate)} → ${formatDate(c.endDate)}',
                              style: TextStyle(
                                color: Colors.grey.shade600,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      EliteStatusChip(
                        c.tenantSigned ? 'Đã ký' : 'Chờ ký',
                        color: c.tenantSigned
                            ? const Color(0xFF2F6FB5)
                            : EliteColors.champagneHover,
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 8),
              const EliteSectionTitle('Biên bản bàn giao'),
              if (_handovers.isEmpty)
                Text(
                  'Biên bản bàn giao cơ sở vật chất sẽ hiện khi có hợp đồng.',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                ),
              for (final h in _handovers)
                EliteCard(
                  onTap: () => _open(HandoverDetailScreen(handover: h)),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.fact_check_outlined,
                        color: EliteColors.champagneHover,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          '${h.type == 'CHECK_OUT' ? 'Trả phòng' : 'Nhận phòng'} • ${h.roomTitle}',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                      EliteStatusChip(
                        h.tenantConfirmed ? 'Đã xác nhận' : 'Chờ bạn ký',
                        color: h.tenantConfirmed
                            ? const Color(0xFF2F6FB5)
                            : EliteColors.champagneHover,
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 8),
              const EliteSectionTitle('Hóa đơn điện nước'),
              if (_bills.isEmpty)
                Text(
                  'Chưa có hóa đơn. Chủ trọ lập hóa đơn hằng tháng sau khi bạn nhận phòng.',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                ),
              for (final b in _bills)
                EliteCard(
                  onTap: () => _open(BillDetailScreen(bill: b)),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.receipt_long_outlined,
                        color: EliteColors.champagneHover,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Tháng ${b.month} • ${b.roomCode}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            Text(
                              vnd.format(b.totalAmount),
                              style: const TextStyle(
                                color: EliteColors.champagneHover,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                      EliteStatusChip(
                        b.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán',
                        color: b.isPaid
                            ? const Color(0xFF2F6FB5)
                            : EliteColors.champagneHover,
                      ),
                    ],
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: EliteColors.deepNavy,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: const TextStyle(
                color: EliteColors.champagne,
                fontSize: 20,
                fontWeight: FontWeight.w800,
              ),
            ),
            Text(
              label,
              style: const TextStyle(color: Colors.white70, fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }
}

class _CancelReservationSheet extends StatefulWidget {
  const _CancelReservationSheet({required this.appointment});

  final TenantAppointmentInfo appointment;

  @override
  State<_CancelReservationSheet> createState() =>
      _CancelReservationSheetState();
}

class _CancelReservationSheetState extends State<_CancelReservationSheet> {
  String _reason = 'TENANT_REQUEST';
  final _notesController = TextEditingController();
  bool _isSubmitting = false;
  String? _error;

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _isSubmitting = true;
      _error = null;
    });
    try {
      final message = await TenantApi.cancelDeposit(
        roomId: widget.appointment.roomId,
        reason: _reason,
        notes: _notesController.text.trim(),
      );
      if (mounted) Navigator.pop(context, message);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        20,
        20,
        MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Hủy đặt cọc giữ chỗ',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: EliteColors.deepNavy,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Theo nội quy, khách thuê chủ động hủy sẽ không được hoàn tiền cọc.',
            style: TextStyle(color: Colors.grey.shade700, fontSize: 12),
          ),
          const SizedBox(height: 10),
          RadioGroup<String>(
            groupValue: _reason,
            onChanged: (v) => setState(() => _reason = v ?? _reason),
            child: const Column(
              children: [
                RadioListTile(
                  value: 'TENANT_REQUEST',
                  dense: true,
                  title: Text('Tôi đổi ý, không thuê nữa'),
                ),
                RadioListTile(
                  value: 'EXPIRED_NO_SHOW',
                  dense: true,
                  title: Text('Không thể dọn vào đúng hạn'),
                ),
                RadioListTile(
                  value: 'MUTUAL_AGREEMENT',
                  dense: true,
                  title: Text('Đã thỏa thuận với chủ trọ'),
                ),
              ],
            ),
          ),
          TextField(
            controller: _notesController,
            decoration: const InputDecoration(labelText: 'Ghi chú (tùy chọn)'),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: const TextStyle(color: Colors.red)),
          ],
          const SizedBox(height: 14),
          FilledButton(
            onPressed: _isSubmitting ? null : _submit,
            style: eliteFilledStyle(),
            child: Text(
              _isSubmitting ? 'Đang xử lý...' : 'Xác nhận hủy giữ chỗ',
            ),
          ),
        ],
      ),
    );
  }
}

// -------------------------------------------------------------
// DEPOSIT
// -------------------------------------------------------------
class DepositScreen extends StatefulWidget {
  const DepositScreen({super.key, required this.appointment});

  final TenantAppointmentInfo appointment;

  @override
  State<DepositScreen> createState() => _DepositScreenState();
}

class _DepositScreenState extends State<DepositScreen> {
  final _transactionController = TextEditingController();
  final _notesController = TextEditingController();
  late DateTime _moveIn = DateTime.now().add(const Duration(days: 5));
  int _vehicles = 1;
  bool _agreed = false;
  bool _isSubmitting = false;
  String? _error;

  TenantAppointmentInfo get a => widget.appointment;

  String get _transferContent =>
      'COC P${a.roomCode.replaceAll(RegExp(r'[^0-9]'), '')} ${AuthService.currentUser.value?.phone ?? ''}'
          .trim();

  @override
  void dispose() {
    _transactionController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_agreed) {
      setState(
        () => _error =
            'Vui lòng đọc và tích cam kết tuân thủ 10 điều nội quy & PCCC.',
      );
      return;
    }
    setState(() {
      _isSubmitting = true;
      _error = null;
    });
    try {
      final message = await TenantApi.deposit(
        roomId: a.roomId,
        moveInDate: DateFormat('yyyy-MM-dd').format(_moveIn),
        vehicleCount: _vehicles,
        transactionCode: _transactionController.text.trim(),
        notes: _notesController.text.trim(),
      );
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('Đặt cọc thành công'),
          content: Text(message),
          actions: [
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext),
              style: FilledButton.styleFrom(
                backgroundColor: EliteColors.champagne,
              ),
              child: const Text('Xem hợp đồng'),
            ),
          ],
        ),
      );
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Deposit equals one month's rent unless the landlord set otherwise.
    final amount = a.price;
    return Scaffold(
      appBar: AppBar(title: const Text('Đặt cọc giữ chỗ')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          EliteCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  a.roomTitle,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
                    color: EliteColors.deepNavy,
                  ),
                ),
                const SizedBox(height: 8),
                EliteInfoRow(label: 'Giá thuê', value: vnd.format(a.price)),
                EliteInfoRow(
                  label: 'Tiền cọc (dự kiến)',
                  value: vnd.format(amount),
                  bold: true,
                ),
              ],
            ),
          ),
          const EliteSectionTitle('1. Chuyển khoản tiền cọc'),
          EliteCard(
            child: Column(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(
                    vietQrUrl(amount: amount, content: _transferContent),
                    height: 220,
                    errorBuilder: (_, _, _) => const SizedBox(
                      height: 80,
                      child: Center(child: Text('Không tải được mã VietQR')),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                EliteInfoRow(label: 'Ngân hàng', value: kBankName),
                EliteInfoRow(label: 'Số tài khoản', value: kBankAccount),
                EliteInfoRow(label: 'Chủ tài khoản', value: kBankHolder),
                EliteInfoRow(label: 'Nội dung', value: _transferContent),
                TextButton.icon(
                  onPressed: () {
                    Clipboard.setData(const ClipboardData(text: kBankAccount));
                    showSnack(context, 'Đã sao chép số tài khoản.');
                  },
                  icon: const Icon(Icons.copy_rounded, size: 18),
                  label: const Text('Sao chép số tài khoản'),
                ),
              ],
            ),
          ),
          const EliteSectionTitle('2. Thông tin dọn vào'),
          EliteCard(
            child: Column(
              children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.event_rounded),
                  title: const Text('Ngày dọn vào'),
                  subtitle: Text(DateFormat('dd/MM/yyyy').format(_moveIn)),
                  trailing: const Icon(Icons.edit_calendar_outlined),
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _moveIn,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 90)),
                    );
                    if (picked != null) setState(() => _moveIn = picked);
                  },
                ),
                Row(
                  children: [
                    const Expanded(child: Text('Số xe máy gửi')),
                    IconButton(
                      onPressed: _vehicles > 0
                          ? () => setState(() => _vehicles--)
                          : null,
                      icon: const Icon(Icons.remove_circle_outline),
                    ),
                    Text(
                      '$_vehicles',
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                    IconButton(
                      onPressed: _vehicles < 10
                          ? () => setState(() => _vehicles++)
                          : null,
                      icon: const Icon(Icons.add_circle_outline),
                    ),
                  ],
                ),
                TextField(
                  controller: _transactionController,
                  decoration: const InputDecoration(
                    labelText: 'Mã giao dịch chuyển khoản (nếu có)',
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _notesController,
                  decoration: const InputDecoration(labelText: 'Ghi chú'),
                ),
              ],
            ),
          ),
          const EliteSectionTitle('3. Cam kết nội quy'),
          EliteCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (var i = 0; i < kHouseRuleTitles.length; i++)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: Text(
                      '${i + 1}. ${kHouseRuleTitles[i]}',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _agreed,
                  activeColor: EliteColors.champagne,
                  controlAffinity: ListTileControlAffinity.leading,
                  title: const Text(
                    'Tôi đã đọc và cam kết tuân thủ 10 điều nội quy & an toàn PCCC.',
                    style: TextStyle(fontSize: 13),
                  ),
                  onChanged: (v) => setState(() => _agreed = v ?? false),
                ),
              ],
            ),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(_error!, style: const TextStyle(color: Colors.red)),
            ),
          FilledButton(
            onPressed: _isSubmitting ? null : _submit,
            style: eliteFilledStyle(height: 50),
            child: Text(
              _isSubmitting
                  ? 'Đang xử lý...'
                  : 'Tôi đã chuyển khoản, xác nhận đặt cọc',
            ),
          ),
        ],
      ),
    );
  }
}

// -------------------------------------------------------------
// CONTRACT
// -------------------------------------------------------------
class ContractDetailScreen extends StatefulWidget {
  const ContractDetailScreen({super.key, required this.contract});

  final RentalContract contract;

  @override
  State<ContractDetailScreen> createState() => _ContractDetailScreenState();
}

class _ContractDetailScreenState extends State<ContractDetailScreen> {
  late RentalContract _contract = widget.contract;
  bool _changed = false;
  bool _busy = false;

  Future<void> _run(Future<String?> Function() action) async {
    setState(() => _busy = true);
    try {
      final message = await action();
      _changed = true;
      if (mounted && message != null) showSnack(context, message);
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _sign() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Ký số hợp đồng'),
        content: const Text(
          'Bạn xác nhận đã đọc toàn bộ điều khoản và 10 điều nội quy PCCC, '
          'đồng ý ký hợp đồng điện tử này?',
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
            child: const Text('Ký hợp đồng'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await _run(() async {
      final signedAt = await TenantApi.signContract(_contract.id);
      setState(
        () => _contract = _contract.copyWith(
          tenantSigned: true,
          tenantSignedAt: signedAt ?? DateTime.now().toIso8601String(),
        ),
      );
      return 'Ký số hợp đồng điện tử thành công!';
    });
  }

  Future<void> _renew() async {
    final months = await showDialog<int>(
      context: context,
      builder: (dialogContext) => SimpleDialog(
        title: const Text('Gia hạn hợp đồng'),
        children: [
          for (final m in const [3, 6, 12])
            SimpleDialogOption(
              onPressed: () => Navigator.pop(dialogContext, m),
              child: Text('Thêm $m tháng'),
            ),
        ],
      ),
    );
    if (months == null) return;
    await _run(() => TenantApi.renewContract(_contract.id, months));
  }

  Future<void> _checkout() async {
    final message = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => CheckoutScreen(contract: _contract)),
    );
    if (message != null && mounted) {
      _changed = true;
      showSnack(context, message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = _contract;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) Navigator.pop(context, _changed);
      },
      child: Scaffold(
        appBar: AppBar(title: const Text('Hợp đồng thuê phòng')),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            EliteCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          c.roomTitle,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 15,
                            color: EliteColors.deepNavy,
                          ),
                        ),
                      ),
                      EliteStatusChip(_contractStatusLabel(c.status)),
                    ],
                  ),
                  const Divider(height: 20),
                  EliteInfoRow(label: 'Bên cho thuê', value: c.landlordName),
                  EliteInfoRow(label: 'Bên thuê', value: c.tenantName),
                  EliteInfoRow(label: 'SĐT bên thuê', value: c.tenantPhone),
                  EliteInfoRow(
                    label: 'Thời hạn',
                    value:
                        '${formatDate(c.startDate)} → ${formatDate(c.endDate)}',
                  ),
                  EliteInfoRow(
                    label: 'Giá thuê / tháng',
                    value: vnd.format(c.monthlyRent),
                    bold: true,
                  ),
                  EliteInfoRow(
                    label: 'Tiền cọc',
                    value: vnd.format(c.depositAmount),
                  ),
                ],
              ),
            ),
            const EliteSectionTitle('Điều 6. Nội quy & an toàn PCCC'),
            EliteCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (var i = 0; i < kHouseRuleTitles.length; i++)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 3),
                      child: Text(
                        '6.${i + 1}. ${kHouseRuleTitles[i]}',
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                ],
              ),
            ),
            if (c.tenantSigned)
              EliteCard(
                child: Row(
                  children: [
                    const Icon(
                      Icons.verified_rounded,
                      color: Color(0xFF2F6FB5),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Bạn đã ký số hợp đồng'
                        '${c.tenantSignedAt != null ? ' lúc ${DateFormat('HH:mm dd/MM/yyyy').format(DateTime.tryParse(c.tenantSignedAt!)?.toLocal() ?? DateTime.now())}' : ''}.',
                      ),
                    ),
                  ],
                ),
              )
            else
              FilledButton.icon(
                onPressed: _busy ? null : _sign,
                style: eliteFilledStyle(height: 50),
                icon: const Icon(Icons.draw_outlined),
                label: const Text('Ký số hợp đồng điện tử'),
              ),
            const SizedBox(height: 10),
            if (c.status.toUpperCase() == 'ACTIVE') ...[
              OutlinedButton.icon(
                onPressed: _busy ? null : _renew,
                style: eliteOutlinedStyle(),
                icon: const Icon(Icons.update_rounded),
                label: const Text('Gia hạn hợp đồng'),
              ),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: _busy ? null : _checkout,
                style: eliteOutlinedStyle(),
                icon: const Icon(Icons.logout_rounded),
                label: const Text('Trả phòng & quyết toán cọc'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key, required this.contract});

  final RentalContract contract;

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final _electricController = TextEditingController();
  final _waterController = TextEditingController();
  final _bankController = TextEditingController();
  bool _isSubmitting = false;
  String? _error;

  @override
  void dispose() {
    _electricController.dispose();
    _waterController.dispose();
    _bankController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _isSubmitting = true;
      _error = null;
    });
    try {
      final message = await TenantApi.checkout(
        contractId: widget.contract.id,
        roomId: widget.contract.roomId,
        finalElectric: int.parse(_electricController.text),
        finalWater: int.parse(_waterController.text),
        tenantBankInfo: _bankController.text.trim(),
      );
      if (mounted) Navigator.pop(context, message);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  String? _number(String? v) =>
      int.tryParse(v ?? '') == null ? 'Nhập số hợp lệ.' : null;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Trả phòng')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              'Chốt chỉ số điện nước cuối kỳ và tài khoản nhận lại tiền cọc. '
              'Chủ trọ sẽ đối chiếu biên bản bàn giao trước khi hoàn cọc.',
              style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _electricController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Chỉ số điện cuối (kWh)',
              ),
              validator: _number,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _waterController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Chỉ số nước cuối (m³)',
              ),
              validator: _number,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _bankController,
              decoration: const InputDecoration(
                labelText: 'Ngân hàng - STK - Tên chủ TK nhận hoàn cọc',
              ),
              validator: (v) => (v ?? '').trim().length < 8
                  ? 'Vui lòng nhập thông tin tài khoản nhận hoàn cọc.'
                  : null,
            ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(_error!, style: const TextStyle(color: Colors.red)),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _isSubmitting ? null : _submit,
              style: eliteFilledStyle(height: 50),
              child: Text(
                _isSubmitting ? 'Đang xử lý...' : 'Xác nhận trả phòng',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// -------------------------------------------------------------
// HANDOVER
// -------------------------------------------------------------
class HandoverDetailScreen extends StatefulWidget {
  const HandoverDetailScreen({super.key, required this.handover});

  final Handover handover;

  @override
  State<HandoverDetailScreen> createState() => _HandoverDetailScreenState();
}

class _HandoverDetailScreenState extends State<HandoverDetailScreen> {
  late bool _confirmed = widget.handover.tenantConfirmed;
  bool _busy = false;

  Future<void> _confirm() async {
    setState(() => _busy = true);
    try {
      await TenantApi.confirmHandover(widget.handover.id);
      if (!mounted) return;
      setState(() => _confirmed = true);
      showSnack(context, 'Đã ký xác nhận biên bản bàn giao cơ sở vật chất!');
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final h = widget.handover;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) Navigator.pop(context, _confirmed != h.tenantConfirmed);
      },
      child: Scaffold(
        appBar: AppBar(title: const Text('Biên bản bàn giao')),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            EliteCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${h.type == 'CHECK_OUT' ? 'Trả phòng' : 'Nhận phòng'} • ${h.roomTitle}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      color: EliteColors.deepNavy,
                    ),
                  ),
                  const SizedBox(height: 8),
                  EliteInfoRow(label: 'Bên giao', value: h.landlordName),
                  EliteInfoRow(label: 'Bên nhận', value: h.tenantName),
                  if (h.handoverDate != null)
                    EliteInfoRow(
                      label: 'Ngày lập',
                      value: DateFormat('dd/MM/yyyy').format(h.handoverDate!),
                    ),
                  if (h.damageCost > 0)
                    EliteInfoRow(
                      label: 'Chi phí hư hỏng',
                      value: vnd.format(h.damageCost),
                      bold: true,
                    ),
                ],
              ),
            ),
            EliteSectionTitle('Danh mục tài sản (${h.items.length})'),
            for (final item in h.items)
              EliteCard(
                child: Row(
                  children: [
                    const Icon(
                      Icons.inventory_2_outlined,
                      color: EliteColors.champagneHover,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${item.assetName} × ${item.quantity}',
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          Text(
                            '${item.category} • ${item.condition}',
                            style: TextStyle(
                              color: Colors.grey.shade600,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 8),
            if (_confirmed)
              const EliteCard(
                child: Row(
                  children: [
                    Icon(Icons.verified_rounded, color: Color(0xFF2F6FB5)),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text('Bạn đã ký xác nhận biên bản bàn giao này.'),
                    ),
                  ],
                ),
              )
            else
              FilledButton.icon(
                onPressed: _busy ? null : _confirm,
                style: eliteFilledStyle(height: 50),
                icon: const Icon(Icons.task_alt_rounded),
                label: const Text('Tôi đã kiểm tra, ký xác nhận bàn giao'),
              ),
          ],
        ),
      ),
    );
  }
}

// -------------------------------------------------------------
// BILL
// -------------------------------------------------------------
class BillDetailScreen extends StatefulWidget {
  const BillDetailScreen({super.key, required this.bill});

  final UtilityBill bill;

  @override
  State<BillDetailScreen> createState() => _BillDetailScreenState();
}

class _BillDetailScreenState extends State<BillDetailScreen> {
  late bool _paid = widget.bill.isPaid;
  bool _busy = false;

  String get _transferContent {
    final b = widget.bill;
    final room = b.roomCode.replaceAll(RegExp(r'[^0-9]'), '');
    return 'TIENPHONG P${room.isEmpty ? b.roomId : room} T${b.month.replaceAll('/', '')}';
  }

  Future<void> _confirmPaid() async {
    setState(() => _busy = true);
    try {
      final message = await TenantApi.payBill(widget.bill.id);
      if (!mounted) return;
      setState(() => _paid = true);
      showSnack(context, message);
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final b = widget.bill;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) Navigator.pop(context, _paid != b.isPaid);
      },
      child: Scaffold(
        appBar: AppBar(title: Text('Hóa đơn tháng ${b.month}')),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            EliteCard(
              child: Column(
                children: [
                  EliteInfoRow(label: 'Phòng', value: b.roomCode),
                  EliteInfoRow(
                    label: 'Tiền phòng',
                    value: vnd.format(b.rentCost),
                  ),
                  EliteInfoRow(
                    label:
                        'Điện (${b.electricOld.round()} → ${b.electricNew.round()}: ${b.electricUsed.round()} kWh)',
                    value: vnd.format(b.electricCost),
                  ),
                  EliteInfoRow(
                    label:
                        'Nước (${b.waterOld.round()} → ${b.waterNew.round()}: ${b.waterUsed.round()} m³)',
                    value: vnd.format(b.waterCost),
                  ),
                  EliteInfoRow(
                    label: 'Internet',
                    value: vnd.format(b.internetCost),
                  ),
                  EliteInfoRow(
                    label: 'Dịch vụ',
                    value: vnd.format(b.serviceCost),
                  ),
                  const Divider(height: 20),
                  EliteInfoRow(
                    label: 'Tổng cộng',
                    value: vnd.format(b.totalAmount),
                    bold: true,
                  ),
                ],
              ),
            ),
            if (_paid)
              const EliteCard(
                child: Row(
                  children: [
                    Icon(Icons.verified_rounded, color: Color(0xFF2F6FB5)),
                    SizedBox(width: 10),
                    Expanded(child: Text('Hóa đơn đã được thanh toán.')),
                  ],
                ),
              )
            else ...[
              const EliteSectionTitle('Thanh toán qua VietQR'),
              EliteCard(
                child: Column(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        vietQrUrl(
                          amount: b.totalAmount,
                          content: _transferContent,
                        ),
                        height: 220,
                        errorBuilder: (_, _, _) => const SizedBox(
                          height: 80,
                          child: Center(
                            child: Text('Không tải được mã VietQR'),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    EliteInfoRow(label: 'Ngân hàng', value: kBankName),
                    EliteInfoRow(label: 'Số tài khoản', value: kBankAccount),
                    EliteInfoRow(label: 'Nội dung', value: _transferContent),
                    TextButton.icon(
                      onPressed: () {
                        Clipboard.setData(
                          ClipboardData(text: _transferContent),
                        );
                        showSnack(
                          context,
                          'Đã sao chép nội dung chuyển khoản.',
                        );
                      },
                      icon: const Icon(Icons.copy_rounded, size: 18),
                      label: const Text('Sao chép nội dung'),
                    ),
                  ],
                ),
              ),
              FilledButton(
                onPressed: _busy ? null : _confirmPaid,
                style: eliteFilledStyle(height: 50),
                child: Text(_busy ? 'Đang xử lý...' : 'Tôi đã chuyển khoản'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
