import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/room_transfer.dart';
import 'package:mobile/tenant_api.dart';

void main() {
  group('Ước tính chênh lệch đổi phòng (cùng quy tắc với web)', () {
    test(
      'phòng đắt hơn, tháng đã lập hóa đơn: cọc + chênh lệch ngày còn lại',
      () {
        final s = estimateTransfer(
          oldRent: 3000000,
          newRent: 3500000,
          oldDeposit: 3000000,
          newDeposit: 3500000,
          transferDate: DateTime(2026, 11, 20),
          monthAlreadyBilled: true,
        );
        expect(s.depositDiff, 500000);
        expect(s.remainingDays, 11);
        expect(s.daysInMonth, 30);
        expect(s.rentDiff, (500000 * 11 / 30).roundToDouble());
        expect(s.totalDiff, 500000 + 183333);
        expect(s.tenantPays, isTrue);
        expect(transferDiffText(s.totalDiff), startsWith('Bạn cần trả thêm'));
      },
    );

    test('phòng rẻ hơn: chủ trọ hoàn lại', () {
      final s = estimateTransfer(
        oldRent: 3000000,
        newRent: 2400000,
        oldDeposit: 3000000,
        newDeposit: 2400000,
        transferDate: DateTime(2026, 11, 20),
        monthAlreadyBilled: true,
      );
      expect(s.totalDiff, lessThan(0));
      expect(s.landlordRefunds, isTrue);
      expect(transferDiffText(s.totalDiff), startsWith('Chủ trọ hoàn lại'));
      expect(signedVnd(s.totalDiff), startsWith('−'));
    });

    test(
      'phòng cũ chưa lập hóa đơn tháng chuyển: tính trọn tháng theo ngày',
      () {
        final s = estimateTransfer(
          oldRent: 3000000,
          newRent: 3500000,
          oldDeposit: 3000000,
          newDeposit: 3500000,
          transferDate: DateTime(2026, 11, 20),
          monthAlreadyBilled: false,
        );
        expect(
          s.rentDiff,
          ((3000000 * 19 + 3500000 * 11) / 30).roundToDouble(),
        );
      },
    );

    test('tháng 2 năm nhuận và ngày cuối tháng', () {
      final feb = estimateTransfer(
        oldRent: 0,
        newRent: 0,
        oldDeposit: 0,
        newDeposit: 0,
        transferDate: DateTime(2028, 2, 10),
        monthAlreadyBilled: true,
      );
      expect(feb.daysInMonth, 29);
      expect(feb.remainingDays, 20);
      expect(
        signedVnd(feb.totalDiff),
        isNot(anyOf(startsWith('+'), startsWith('−'))),
      );
      expect(
        transferDiffText(feb.totalDiff),
        'Không có chênh lệch cần thanh toán.',
      );
      final last = estimateTransfer(
        oldRent: 0,
        newRent: 0,
        oldDeposit: 0,
        newDeposit: 0,
        transferDate: DateTime(2026, 12, 31),
        monthAlreadyBilled: true,
      );
      expect(last.remainingDays, 1);
    });
  });

  test('đọc yêu cầu đổi phòng đã duyệt từ API', () {
    final r = RoomTransferRequestInfo.fromJson({
      'id': 't_1',
      'from_contract_id': 'c_old',
      'new_contract_id': 'c_new',
      'from_room_id': 101,
      'to_room_id': 102,
      'from_room': {'room_code': 'A101'},
      'to_room': {
        'room_code': 'A102',
        'title': 'Studio ban công',
        'price': 3500000,
      },
      'desired_date': '2026-11-20',
      'transfer_date': '2026-11-20',
      'contract_end_date': '2027-05-31',
      'status': 'APPROVED',
      'status_label': 'Đã đổi phòng',
      'settlement': {
        'depositDiff': 500000,
        'rentDiff': 183333,
        'remainingDays': 11,
        'daysInMonth': 30,
        'monthAlreadyBilled': true,
        'utilityIncluded': true,
        'utilityCost': 303000,
        'damageCost': 0,
        'totalDiff': 986333,
        'electricUsed': 60,
        'waterUsed': 3,
        'old_rent': 3000000,
        'new_rent': 3500000,
      },
      'settlement_status': 'UNPAID',
      'settlement_status_label': 'Chưa thanh toán',
      'created_at': '2026-11-10T03:00:00.000Z',
    });
    expect(r.belongsTo('c_old'), isTrue);
    expect(r.belongsTo('c_new'), isTrue);
    expect(r.belongsTo('khac'), isFalse);
    expect(r.toRoomCode, 'A102');
    expect(r.settlement?.utilityIncluded, isTrue);
    expect(r.settlement?.rentLabel, contains('11/30'));
    expect(r.canReportPayment, isTrue);
    expect(r.isPending, isFalse);
  });

  test(
    'yêu cầu đã thanh toán xong hoặc chủ trọ hoàn thì khách không báo chuyển khoản',
    () {
      Map<String, dynamic> base(String status, double total) => {
        'id': 't',
        'from_contract_id': 'c',
        'status': 'APPROVED',
        'settlement': {'totalDiff': total},
        'settlement_status': status,
      };
      expect(
        RoomTransferRequestInfo.fromJson(
          base('SETTLED', 500000),
        ).canReportPayment,
        isFalse,
      );
      expect(
        RoomTransferRequestInfo.fromJson(
          base('UNPAID', -500000),
        ).canReportPayment,
        isFalse,
      );
      expect(
        RoomTransferRequestInfo.fromJson(
          base('PENDING_CONFIRMATION', 1000),
        ).canReportPayment,
        isTrue,
      );
    },
  );

  test('thông báo đổi phòng nằm trong nhóm Vòng đời thuê', () {
    final n = AppNotification.fromJson({
      'id': 'n1',
      'type': 'ROOM_TRANSFER_UPDATE',
      'subject': 'Đã đổi phòng',
      'summary': 'ok',
      'sentAt': '2026-11-20T03:00:00.000Z',
      'isRead': false,
    });
    expect(filterNotifications([n], category: 'LIFECYCLE'), hasLength(1));
  });

  test('mã giao dịch mô phỏng cho chênh lệch đổi phòng', () {
    expect(
      simulatedTransactionCode('DP', DateTime(2026, 11, 20, 10, 30)),
      startsWith('SIM-DP-2611201030-'),
    );
  });

  test('đổi phòng trong tháng bắt đầu hợp đồng không tính những ngày chưa vào ở', () {
    final s = estimateTransfer(
      oldRent: 8000000,
      newRent: 8000000,
      oldDeposit: 8000000,
      newDeposit: 8000000,
      transferDate: DateTime(2026, 11, 9),
      monthAlreadyBilled: false,
      contractStartDate: DateTime(2026, 11, 9),
    );
    expect(s.rentDiff, (8000000 * 22 / 30).roundToDouble());
    final older = estimateTransfer(
      oldRent: 3000000,
      newRent: 3500000,
      oldDeposit: 3000000,
      newDeposit: 3500000,
      transferDate: DateTime(2026, 11, 20),
      monthAlreadyBilled: false,
      contractStartDate: DateTime(2026, 10, 15),
    );
    expect(older.rentDiff, ((3000000 * 19 + 3500000 * 11) / 30).roundToDouble());
  });
}
