import 'package:intl/intl.dart';

import 'tenant_api.dart' show ApiClient;

/// ĐỔI PHÒNG — model, API và cách tính ước tính (cùng quy tắc với web/src/lib/room-transfer.ts).
///
/// Khách đứng tên hợp đồng ACTIVE xin chuyển sang phòng Còn trống của cùng chủ trọ. Chủ trọ duyệt:
/// hợp đồng nối tiếp giữ nguyên ngày hết hạn, giá thuê và tiền cọc theo phòng mới. Chênh lệch dương:
/// khách trả thêm; âm: chủ trọ hoàn lại.

double _d(dynamic v) => (v as num?)?.toDouble() ?? 0;
int _i(dynamic v) => (v as num?)?.toInt() ?? 0;
String _s(dynamic v, [String fallback = '']) => v == null ? fallback : '$v';
String? _sOrNull(dynamic v) => v == null || '$v'.isEmpty ? null : '$v';

final NumberFormat _vnd = NumberFormat.currency(
  locale: 'vi_VN',
  symbol: 'đ',
  decimalDigits: 0,
);

/// "+500.000 đ", "−200.000 đ" hoặc "0 đ".
String signedVnd(double amount) {
  final rounded = amount.round();
  if (rounded == 0) return _vnd.format(0);
  final text = _vnd.format(rounded.abs());
  return rounded > 0 ? '+$text' : '−$text';
}

/// Câu mô tả chiều chênh lệch cho khách thuê.
String transferDiffText(double totalDiff) {
  final rounded = totalDiff.round();
  if (rounded == 0) return 'Không có chênh lệch cần thanh toán.';
  final amount = _vnd.format(rounded.abs());
  return rounded > 0
      ? 'Bạn cần trả thêm $amount cho chủ trọ.'
      : 'Chủ trọ hoàn lại cho bạn $amount.';
}

/// Ước tính chênh lệch (chưa gồm điện nước): cọc + tiền thuê tháng chuyển tính theo ngày.
/// Ngày chuyển tính là ngày ở phòng mới. Phòng cũ đã lập hóa đơn tháng này thì chỉ tính chênh lệch
/// những ngày còn lại; chưa lập thì tính giá cũ cho ngày đã ở + giá mới cho ngày còn lại.
TransferSettlementInfo estimateTransfer({
  required double oldRent,
  required double newRent,
  required double oldDeposit,
  required double newDeposit,
  required DateTime transferDate,
  required bool monthAlreadyBilled,
  // Ngày bắt đầu hợp đồng: đổi phòng ngay trong tháng đầu thì không tính tiền những ngày chưa vào ở
  DateTime? contractStartDate,
}) {
  final daysInMonth = DateTime(
    transferDate.year,
    transferDate.month + 1,
    0,
  ).day;
  final remaining = daysInMonth - transferDate.day + 1;
  final sameStartMonth = contractStartDate != null &&
      contractStartDate.year == transferDate.year &&
      contractStartDate.month == transferDate.month;
  final firstOccupiedDay = sameStartMonth ? contractStartDate.day : 1;
  final stayed = (transferDate.day - firstOccupiedDay).clamp(0, daysInMonth);
  final depositDiff = (newDeposit - oldDeposit).roundToDouble();
  final rentDiff = monthAlreadyBilled
      ? ((newRent - oldRent) * remaining / daysInMonth).roundToDouble()
      : ((oldRent * stayed + newRent * remaining) / daysInMonth)
            .roundToDouble();
  return TransferSettlementInfo(
    depositDiff: depositDiff,
    rentDiff: rentDiff,
    remainingDays: remaining,
    daysInMonth: daysInMonth,
    monthAlreadyBilled: monthAlreadyBilled,
    utilityIncluded: false,
    utilityCost: 0,
    damageCost: 0,
    totalDiff: depositDiff + rentDiff,
    oldRent: oldRent,
    newRent: newRent,
    oldDeposit: oldDeposit,
    newDeposit: newDeposit,
  );
}

class TransferSettlementInfo {
  const TransferSettlementInfo({
    required this.depositDiff,
    required this.rentDiff,
    required this.remainingDays,
    required this.daysInMonth,
    required this.monthAlreadyBilled,
    required this.utilityIncluded,
    required this.utilityCost,
    required this.damageCost,
    required this.totalDiff,
    this.electricUsed = 0,
    this.waterUsed = 0,
    this.oldRent,
    this.newRent,
    this.oldDeposit,
    this.newDeposit,
  });

  final double depositDiff;
  final double rentDiff;
  final int remainingDays;
  final int daysInMonth;
  final bool monthAlreadyBilled;
  final bool utilityIncluded;
  final double utilityCost;
  final double damageCost;
  final double totalDiff;
  final double electricUsed;
  final double waterUsed;
  final double? oldRent;
  final double? newRent;
  final double? oldDeposit;
  final double? newDeposit;

  bool get tenantPays => totalDiff.round() > 0;
  bool get landlordRefunds => totalDiff.round() < 0;

  String get rentLabel => monthAlreadyBilled
      ? 'Chênh lệch tiền thuê $remainingDays/$daysInMonth ngày còn lại'
      : 'Tiền thuê tháng chuyển (tính theo ngày)';

  factory TransferSettlementInfo.fromJson(Map<String, dynamic> j) =>
      TransferSettlementInfo(
        depositDiff: _d(j['depositDiff']),
        rentDiff: _d(j['rentDiff']),
        remainingDays: _i(j['remainingDays']),
        daysInMonth: _i(j['daysInMonth']),
        monthAlreadyBilled: j['monthAlreadyBilled'] == true,
        utilityIncluded: j['utilityIncluded'] == true,
        utilityCost: _d(j['utilityCost']),
        damageCost: _d(j['damageCost']),
        totalDiff: _d(j['totalDiff']),
        electricUsed: _d(j['electricUsed']),
        waterUsed: _d(j['waterUsed']),
        oldRent: (j['old_rent'] as num?)?.toDouble(),
        newRent: (j['new_rent'] as num?)?.toDouble(),
        oldDeposit: (j['old_deposit'] as num?)?.toDouble(),
        newDeposit: (j['new_deposit'] as num?)?.toDouble(),
      );
}

class TransferRoomOption {
  const TransferRoomOption({
    required this.id,
    required this.roomCode,
    required this.title,
    required this.price,
    required this.deposit,
    this.area,
    this.projectName,
    this.image,
  });

  final int id;
  final String roomCode;
  final String title;
  final double price;
  final double deposit;
  final double? area;
  final String? projectName;
  final String? image;

  factory TransferRoomOption.fromJson(Map<String, dynamic> j) =>
      TransferRoomOption(
        id: _i(j['id']),
        roomCode: _s(j['room_code'], '#${j['id']}'),
        title: _s(j['title']),
        price: _d(j['price']),
        deposit: _d(j['deposit']),
        area: (j['area'] as num?)?.toDouble(),
        projectName: _sOrNull(j['project_name']),
        image: _sOrNull(j['image']),
      );
}

class TransferOptionEntry {
  const TransferOptionEntry({required this.room, required this.estimate});

  final TransferRoomOption room;
  final TransferSettlementInfo estimate;

  factory TransferOptionEntry.fromJson(Map<String, dynamic> j) =>
      TransferOptionEntry(
        room: TransferRoomOption.fromJson(
          Map<String, dynamic>.from(j['room'] as Map? ?? const {}),
        ),
        estimate: TransferSettlementInfo.fromJson(
          Map<String, dynamic>.from(j['estimate'] as Map? ?? const {}),
        ),
      );
}

class RoomTransferRequestInfo {
  const RoomTransferRequestInfo({
    required this.id,
    required this.fromContractId,
    required this.fromRoomCode,
    required this.toRoomCode,
    required this.toRoomTitle,
    required this.toRoomPrice,
    required this.desiredDate,
    required this.status,
    required this.statusLabel,
    required this.settlementStatus,
    required this.settlementStatusLabel,
    required this.createdAt,
    this.newContractId,
    this.transferDate,
    this.contractEndDate,
    this.note,
    this.rejectReason,
    this.settlement,
    this.settlementTxCode,
  });

  final String id;
  final String fromContractId;
  final String? newContractId;
  final String fromRoomCode;
  final String toRoomCode;
  final String toRoomTitle;
  final double toRoomPrice;
  final String desiredDate;
  final String? transferDate;
  final String? contractEndDate;
  final String? note;

  /// PENDING | APPROVED | REJECTED | CANCELLED
  final String status;
  final String statusLabel;
  final String? rejectReason;
  final TransferSettlementInfo? settlement;

  /// NONE | UNPAID | PENDING_CONFIRMATION | SETTLED
  final String settlementStatus;
  final String settlementStatusLabel;
  final String? settlementTxCode;
  final String createdAt;

  bool get isPending => status == 'PENDING';

  /// Yêu cầu thuộc hợp đồng cũ (đã gửi từ đó) hoặc hợp đồng nối tiếp sinh ra khi duyệt.
  bool belongsTo(String contractId) =>
      fromContractId == contractId || newContractId == contractId;

  /// Khách phải trả thêm và chưa được chủ trọ xác nhận: được báo đã chuyển khoản.
  bool get canReportPayment =>
      status == 'APPROVED' &&
      (settlement?.tenantPays ?? false) &&
      (settlementStatus == 'UNPAID' ||
          settlementStatus == 'PENDING_CONFIRMATION');

  factory RoomTransferRequestInfo.fromJson(Map<String, dynamic> j) {
    final from = j['from_room'] is Map
        ? Map<String, dynamic>.from(j['from_room'] as Map)
        : const <String, dynamic>{};
    final to = j['to_room'] is Map
        ? Map<String, dynamic>.from(j['to_room'] as Map)
        : const <String, dynamic>{};
    return RoomTransferRequestInfo(
      id: _s(j['id']),
      fromContractId: _s(j['from_contract_id']),
      newContractId: _sOrNull(j['new_contract_id']),
      fromRoomCode: _s(from['room_code'], '#${j['from_room_id']}'),
      toRoomCode: _s(to['room_code'], '#${j['to_room_id']}'),
      toRoomTitle: _s(to['title']),
      toRoomPrice: _d(to['price']),
      desiredDate: _s(j['desired_date']),
      transferDate: _sOrNull(j['transfer_date']),
      contractEndDate: _sOrNull(j['contract_end_date']),
      note: _sOrNull(j['note']),
      status: _s(j['status'], 'PENDING'),
      statusLabel: _s(j['status_label'], _s(j['status'])),
      rejectReason: _sOrNull(j['reject_reason']),
      settlement: j['settlement'] is Map
          ? TransferSettlementInfo.fromJson(
              Map<String, dynamic>.from(j['settlement'] as Map),
            )
          : null,
      settlementStatus: _s(j['settlement_status'], 'NONE'),
      settlementStatusLabel: _s(j['settlement_status_label']),
      settlementTxCode: _sOrNull(j['settlement_tx_code']),
      createdAt: _s(j['created_at']),
    );
  }
}

class TransferOptionsData {
  const TransferOptionsData({
    required this.contractEndDate,
    this.contractStartDate,
    required this.monthlyRent,
    required this.depositAmount,
    required this.estimateDate,
    required this.monthAlreadyBilled,
    required this.hasPendingRequest,
    required this.options,
    required this.requests,
  });

  final String contractEndDate;
  final DateTime? contractStartDate;
  final double monthlyRent;
  final double depositAmount;
  final String estimateDate;
  final bool monthAlreadyBilled;
  final bool hasPendingRequest;
  final List<TransferOptionEntry> options;
  final List<RoomTransferRequestInfo> requests;

  factory TransferOptionsData.fromJson(Map<String, dynamic> j) {
    final contract = j['contract'] is Map
        ? Map<String, dynamic>.from(j['contract'] as Map)
        : const <String, dynamic>{};
    return TransferOptionsData(
      contractEndDate: _s(contract['end_date']),
      contractStartDate: DateTime.tryParse(_s(contract['start_date'])),
      monthlyRent: _d(contract['monthly_rent']),
      depositAmount: _d(contract['deposit_amount']),
      estimateDate: _s(j['estimate_date']),
      monthAlreadyBilled: j['month_already_billed'] == true,
      hasPendingRequest: j['has_pending_request'] == true,
      options: [
        for (final o in (j['options'] as List? ?? const []))
          if (o is Map)
            TransferOptionEntry.fromJson(Map<String, dynamic>.from(o)),
      ],
      requests: [
        for (final r in (j['requests'] as List? ?? const []))
          if (r is Map)
            RoomTransferRequestInfo.fromJson(Map<String, dynamic>.from(r)),
      ],
    );
  }
}

abstract final class RoomTransferApi {
  static const _path = '/api/contracts/transfer';

  static Future<TransferOptionsData> fetchOptions(String contractId) async {
    final data = await ApiClient.get(_path, {'contractId': contractId});
    return TransferOptionsData.fromJson(
      Map<String, dynamic>.from(data as Map? ?? const {}),
    );
  }

  static Future<List<RoomTransferRequestInfo>> fetchRequests() async {
    final data = await ApiClient.get(_path);
    return [
      for (final r in (data as List? ?? const []))
        if (r is Map)
          RoomTransferRequestInfo.fromJson(Map<String, dynamic>.from(r)),
    ];
  }

  static Future<String> create({
    required String contractId,
    required int toRoomId,
    required String desiredDate,
    String note = '',
  }) async {
    final res = await ApiClient.sendRaw('POST', _path, {
      'contractId': contractId,
      'toRoomId': toRoomId,
      'desiredDate': desiredDate,
      'note': note,
    });
    return _s(res['message'], 'Đã gửi yêu cầu đổi phòng.');
  }

  static Future<String> cancel(String id) async {
    final res = await ApiClient.sendRaw('PATCH', '$_path/$id', {
      'action': 'CANCEL',
    });
    return _s(res['message'], 'Đã hủy yêu cầu đổi phòng.');
  }

  static Future<String> reportPayment(String id, String transactionCode) async {
    final res = await ApiClient.sendRaw('PATCH', '$_path/$id', {
      'action': 'REPORT_PAYMENT',
      'transactionCode': transactionCode,
    });
    return _s(res['message'], 'Đã báo chuyển khoản.');
  }
}
