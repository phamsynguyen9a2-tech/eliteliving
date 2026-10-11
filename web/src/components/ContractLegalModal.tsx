'use client';

import React from 'react';
import { Contract } from '@/lib/types';
import { DEFAULT_HOUSE_RULES } from '@/lib/house-rules';
import { Printer, X, ShieldCheck, FileCheck, CheckCircle2 } from 'lucide-react';

interface ContractLegalModalProps {
  contract: Contract;
  onClose: () => void;
  landlordPhone?: string;
  tenantCanSign?: boolean;
  onSignContract?: (contractId: string) => void;
}

export default function ContractLegalModal({
  contract,
  onClose,
  landlordPhone = '0908123456',
  tenantCanSign = false,
  onSignContract,
}: ContractLegalModalProps) {
  const [signed, setSigned] = React.useState(Boolean(contract.tenant_signed));
  // Compute contract rules (use contract.rules or default 10 rules)
  const rulesToDisplay = contract.rules && contract.rules.length > 0
    ? DEFAULT_HOUSE_RULES.filter((r) => contract.rules?.includes(r.id) || r.mandatory)
    : DEFAULT_HOUSE_RULES.filter((r) => r.isActive);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        {/* TOP BAR FOR SCREEN VIEW */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B89C66] animate-pulse" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Bản Hợp Đồng Thuê Nhà Trọ &amp; Căn Hộ Dịch Vụ Điện Tử Chuẩn Pháp Lý 2026
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PRINTABLE LEGAL CONTRACT BODY */}
        <div className="pt-4 text-slate-900 font-sans text-xs leading-relaxed space-y-4">
          {/* HEADER QUỐC HIỆU */}
          <div className="text-center space-y-1 pb-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </h2>
            <p className="text-[11px] font-semibold text-slate-700">Độc lập – Tự do – Hạnh phúc</p>
            <div className="w-28 h-0.5 bg-slate-400 mx-auto my-1.5" />
            <h1 className="text-base sm:text-lg font-black uppercase text-[#0F223A] pt-1">
              HỢP ĐỒNG THUÊ PHÒNG TRỌ &amp; CĂN HỘ DỊCH VỤ
            </h1>
            <p className="text-[11px] text-slate-500">
              Số hợp đồng: <strong className="text-slate-900">{contract.id}</strong> • Ngày ký kết:{' '}
              <strong>{contract.created_at ? contract.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)}</strong>
            </p>
            <p className="text-[10px] text-slate-400 italic">
              Căn cứ Bộ Luật Dân Sự số 91/2015/QH13, Luật Nhà Ở số 27/2023/QH15 và Luật Cư Trú số 68/2020/QH14.
            </p>
          </div>

          {/* BÊN A & BÊN B */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="space-y-1.5 text-[11px]">
              <h3 className="font-extrabold uppercase text-[#0F223A] text-xs pb-1 border-b border-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#B89C66]" />
                <span>BÊN CHO THUÊ (BÊN A)</span>
              </h3>
              <p>Họ tên: <strong className="text-slate-900">{contract.landlord_name || 'Nguyễn Văn Hùng'}</strong></p>
              <p>Hệ thống: <strong>Mạng lưới Căn hộ Elite Living</strong></p>
              <p>Số điện thoại: <strong>{contract.landlord_phone || landlordPhone}</strong></p>
              <p>Tư cách pháp lý: Chủ sở hữu / Người đại diện hợp pháp tòa nhà</p>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <h3 className="font-extrabold uppercase text-[#0F223A] text-xs pb-1 border-b border-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0F223A]" />
                <span>BÊN THUÊ (BÊN B)</span>
              </h3>
              <p>Họ và tên: <strong className="text-slate-900">{contract.tenant_name}</strong></p>
              <p>Số điện thoại: <strong>{contract.tenant_phone}</strong></p>
              <p>Số CCCD gắn chip: <strong>{contract.tenant_citizen_id || '079202008899 (Đã đối soát)'}</strong></p>
              <p>Địa chỉ thường trú: <strong>{contract.tenant_address || 'TP. Hồ Chí Minh'}</strong></p>
            </div>
          </div>

          {/* ĐIỀU KHOẢN HỢP ĐỒNG */}
          <div className="space-y-3.5 text-slate-800 text-[11px]">
            <div>
              <h4 className="font-bold uppercase text-[#0F223A]">
                ĐIỀU 1: ĐỐI TƯỢNG VÀ MỤC ĐÍCH THUÊ
              </h4>
              <p className="mt-1">
                Bên A đồng ý cho Bên B thuê căn phòng/căn hộ: <strong>{contract.room_title}</strong> (Mã định danh hệ thống #{contract.room_id}). Mục đích thuê: Dùng để ở và sinh hoạt cá nhân hợp pháp, không sử dụng làm kho chứa hàng cấm, địa điểm kinh doanh trái phép hoặc tệ nạn xã hội.
              </p>
            </div>

            <div>
              <h4 className="font-bold uppercase text-[#0F223A]">
                ĐIỀU 2: THỜI HẠN THUÊ VÀ GIA HẠN HỢP ĐỒNG
              </h4>
              <p className="mt-1">
                Thời hạn thuê bắt đầu từ ngày <strong>{contract.start_date}</strong> đến hết ngày <strong>{contract.end_date}</strong>. Trước khi hết hạn hợp đồng 30 ngày, nếu Bên B có nguyện vọng tiếp tục thuê thì hai bên sẽ tiến hành ký phụ lục gia hạn hợp đồng.
              </p>
            </div>

            <div>
              <h4 className="font-bold uppercase text-[#0F223A]">
                ĐIỀU 3: GIÁ THUÊ, TIỀN ĐẶT CỌC VÀ PHƯƠNG THỨC THANH TOÁN
              </h4>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>
                  Giá thuê cố định: <strong className="text-[#0F223A] font-extrabold">{contract.monthly_rent.toLocaleString('vi-VN')} đ/tháng</strong> (Cam kết không tăng giá trong suốt thời hạn hợp đồng).
                </li>
                <li>
                  Tiền đặt cọc đảm bảo hợp đồng: <strong className="text-[#B89C66] font-extrabold">{contract.deposit_amount.toLocaleString('vi-VN')} đ</strong> (Tương đương 01 tháng tiền phòng).
                </li>
                <li>
                  Biểu giá điện, nước &amp; dịch vụ: Điện 3.800 đ/kWh theo đồng hồ riêng; Nước 25.000 đ/m³; Internet 100.000 đ/phòng; Phí vệ sinh, rác và thang máy theo thỏa thuận bàn giao.
                </li>
                <li>
                  Kỳ thanh toán: Từ ngày <strong>01 đến ngày 05 hàng tháng</strong> qua hình thức chuyển khoản số hoặc tiền mặt.
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold uppercase text-[#0F223A]">
                ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN CHO THUÊ (BÊN A)
              </h4>
              <p className="mt-1">
                Bàn giao phòng và trang thiết bị đúng hiện trạng thỏa thuận; đảm bảo tính pháp lý của tòa nhà; phối hợp đăng ký tạm trú cho Bên B với Công an địa phương; bảo trì, sửa chữa các hư hỏng kết cấu và trang thiết bị do hao mòn tự nhiên.
              </p>
            </div>

            <div>
              <h4 className="font-bold uppercase text-[#0F223A]">
                ĐIỀU 5: QUYỀN VÀ NGHĨA VỤ CỦA BÊN THUÊ (BÊN B)
              </h4>
              <p className="mt-1">
                Thanh toán tiền phòng và chi phí điện nước đúng hạn; cung cấp đầy đủ CCCD đăng ký tạm trú; giữ gìn vệ sinh, bảo quản trang thiết bị; tuyệt đối tuân thủ Bộ nội quy tòa nhà và an toàn PCCC.
              </p>
            </div>

            {/* ĐIỀU 6: BỘ NỘI QUY VÀ PCCC CHI TIẾT */}
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200">
              <h4 className="font-black uppercase text-[#0F223A] text-xs flex items-center gap-1.5 pb-2 border-b border-amber-200">
                <FileCheck className="w-4 h-4 text-[#B89C66]" />
                <span>ĐIỀU 6: QUY CHẾ NỘI QUY TÒA NHÀ &amp; TIÊU CHUẨN AN TOÀN PCCC (10 ĐIỀU BẮT BUỘC)</span>
              </h4>
              <div className="space-y-2 mt-2 text-[10.5px]">
                {rulesToDisplay.map((rule) => (
                  <div key={rule.id}>
                    <p className="font-bold text-slate-900">
                      6.{rule.order}. {rule.title}:
                    </p>
                    <p className="text-slate-700 pl-3">{rule.content}</p>
                    {rule.penalty && (
                      <p className="text-rose-700 pl-3 italic text-[10px]">
                        &rarr; Chế tài: {rule.penalty}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold uppercase text-[#0F223A]">
                ĐIỀU 7: ĐIỀU KIỆN CHẤM DỨT HỢP ĐỒNG &amp; HOÀN TRẢ TIỀN CỌC
              </h4>
              <p className="mt-1">
                {contract.deposit_refund_condition ||
                  'Khi có nhu cầu trả phòng, Bên B bắt buộc phải thông báo cho Bên A trước tối thiểu 30 ngày. Tiền đặt cọc được Bên A hoàn trả 100% trong vòng 03 ngày làm việc sau khi hai bên hoàn tất nghiệm thu Biên bản bàn giao trả phòng (Check-out Handover), thiết bị nguyên vẹn và Bên B hoàn tất toàn bộ công nợ tiền thuê và điện nước. Trường hợp không báo trước đủ 30 ngày hoặc tự ý bỏ phòng, Bên B mất toàn bộ tiền đặt cọc.'}
              </p>
            </div>

            <div>
              <h4 className="font-bold uppercase text-[#0F223A]">
                ĐIỀU 8: CAM KẾT CHUNG &amp; CHỮ KÝ XÁC THỰC ĐIỆN TỬ
              </h4>
              <p className="mt-1">
                Hai bên cam kết đã đọc, hiểu rõ và đồng ý toàn bộ các điều khoản nêu trên. Hợp đồng điện tử này được lập thành dữ liệu số có giá trị pháp lý tương đương bản giấy, được lưu trữ trên cơ sở dữ liệu hệ thống Elite Living và cấp mã băm (Hash Key) xác thực an toàn.
              </p>
            </div>
          </div>

          {/* CHỮ KÝ 2 BÊN */}
          <div className="pt-6 grid grid-cols-2 text-center text-xs">
            <div>
              <p className="font-bold text-slate-800 uppercase">ĐẠI DIỆN BÊN B (BÊN THUÊ)</p>
              <p className="text-[10px] text-slate-500 mt-1 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Đã ký số điện tử qua OTP/SĐT</span>
              </p>
              <div className="my-6 font-extrabold text-slate-900 text-sm">{contract.tenant_name}</div>
              <p className="text-[10px] text-slate-400">CCCD: {contract.tenant_citizen_id || '079202008899'}</p>
            </div>

            <div>
              <p className="font-bold text-slate-800 uppercase">ĐẠI DIỆN BÊN A (CHỦ TRỌ / ELITE LIVING)</p>
              <p className="text-[10px] text-[#B89C66] mt-1 font-semibold flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#B89C66]" />
                <span>Chữ ký số hệ thống đã xác thực</span>
              </p>
              <div className="my-6 font-extrabold text-[#0F223A] text-sm">{contract.landlord_name || 'Nguyễn Văn Hùng'}</div>
              <p className="text-[10px] text-slate-400">Đại diện Quản lý Khu trọ</p>
            </div>
          </div>
        </div>

        {/* PRINT & SIGN ACTIONS */}
        <div className="pt-5 mt-4 border-t border-slate-200 flex items-center justify-between gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>In Bản Hợp Đồng (A4)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-semibold cursor-pointer text-xs"
            >
              Đóng
            </button>

            {tenantCanSign && !signed && (
              <button
                type="button"
                onClick={() => {
                  setSigned(true);
                  if (onSignContract) onSignContract(contract.id);
                  alert('✅ Bạn đã ký số điện tử xác nhận Hợp đồng thuê và cam kết 10 điều nội quy PCCC thành công!');
                }}
                className="px-5 py-2 bg-[#B89C66] hover:bg-[#A38752] text-[#0F223A] font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Ký Số Điện Tử Xác Nhận Hợp Đồng</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
