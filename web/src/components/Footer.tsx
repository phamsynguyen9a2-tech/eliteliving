'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';

interface FooterProps {
  onSelectDistrict?: (district: string) => void;
}

export default function Footer({ onSelectDistrict }: FooterProps) {
  const handleDistrictClick = (district: string) => {
    if (onSelectDistrict) {
      onSelectDistrict(district);
      const el = document.getElementById('danh-sach-toa-nha');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = `/?district=${encodeURIComponent(district)}#danh-sach-toa-nha`;
    }
  };

  return (
    <footer id="contact" className="bg-[#0F223A] text-slate-300 pt-16 pb-12 border-t border-slate-800 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Col 1: Brand Info */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block mb-4">
              <img
                src="/logo.png"
                alt="Elite Living - Residential Rental Network"
                className="h-12 w-auto object-contain brightness-110 bg-white/90 p-1 rounded-xl"
              />
            </Link>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-4">
              Elite Living — Mạng lưới bất động sản cho thuê căn hộ dịch vụ và phòng trọ cao cấp tại các quận trọng điểm Tây Sài Gòn (Tân Phú, Tân Bình, Bình Tân). Kết nối trực tiếp khách thuê với các dự án lưu trú an toàn, tiện nghi.
            </p>
            <div className="space-y-1.5 text-xs text-slate-300">
              <p className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#B89C66] mt-0.5 shrink-0" aria-hidden="true" />
                <span className="text-[#B89C66] font-bold">Trụ sở:</span>
                <span>Tòa nhà Elite Living, Đường Tây Thạnh, P. Tây Thạnh, Q. Tân Phú, TP.HCM</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#B89C66] shrink-0" aria-hidden="true" />
                <span className="text-[#B89C66] font-bold">Hotline CSKH:</span>
                <a href="tel:0903123456" className="text-white hover:text-[#E5D7B7] font-bold">0903.123.456 (24/7)</a>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#B89C66] shrink-0" aria-hidden="true" />
                <span className="text-[#B89C66] font-bold">Email hỗ trợ:</span>
                <span>cskh@eliteliving.vn</span>
              </p>
            </div>
          </div>

          {/* Col 2: Khu Vực 3 Quận Phục Vụ */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3.5 border-b border-slate-800 pb-1.5">
              Mạng Lưới Khu Vực (3 Quận)
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button
                  type="button"
                  onClick={() => handleDistrictClick('tân phú')}
                  className="hover:text-amber-300 transition-colors text-left cursor-pointer flex items-center justify-between w-full"
                >
                  <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-[#B89C66]" aria-hidden="true" /> Quận Tân Phú</span>
                  <span className="text-[10px] text-amber-400/90 font-bold bg-white/10 px-1.5 py-0.5 rounded">10 tòa</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleDistrictClick('tân bình')}
                  className="hover:text-amber-300 transition-colors text-left cursor-pointer flex items-center justify-between w-full"
                >
                  <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-[#B89C66]" aria-hidden="true" /> Quận Tân Bình</span>
                  <span className="text-[10px] text-amber-400/90 font-bold bg-white/10 px-1.5 py-0.5 rounded">8 tòa</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleDistrictClick('bình tân')}
                  className="hover:text-amber-300 transition-colors text-left cursor-pointer flex items-center justify-between w-full"
                >
                  <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-[#B89C66]" aria-hidden="true" /> Quận Bình Tân</span>
                  <span className="text-[10px] text-amber-400/90 font-bold bg-white/10 px-1.5 py-0.5 rounded">6 tòa</span>
                </button>
              </li>
              <li className="pt-2 text-[11px] text-slate-500 leading-relaxed border-t border-slate-800/80">
                Phủ sóng: ĐH HUIT, Sân bay TSN, KCN Tân Bình, Aeon Mall Tân Phú &amp; Bình Tân.
              </li>
            </ul>
          </div>

          {/* Col 3: Dịch vụ & Loại phòng */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3.5 border-b border-slate-800 pb-1.5">
              Loại Hình Lưu Trú
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link href="/#danh-sach-toa-nha" className="hover:text-white transition-colors">Căn hộ có ban công view thoáng</Link></li>
              <li><Link href="/#danh-sach-toa-nha" className="hover:text-white transition-colors">Phòng trọ gác lửng sinh viên</Link></li>
              <li><Link href="/#danh-sach-toa-nha" className="hover:text-white transition-colors">Căn hộ 1 Phòng ngủ (1PN)</Link></li>
              <li><Link href="/#danh-sach-toa-nha" className="hover:text-white transition-colors">Studio full nội thất cao cấp</Link></li>
              <li><Link href="/#goi-y-thong-minh" className="hover:text-white transition-colors">Gợi ý phòng thông minh</Link></li>
            </ul>
          </div>

          {/* Col 4: Đối tác & Pháp lý */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3.5 border-b border-slate-800 pb-1.5">
              Chính Sách &amp; Pháp Lý
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link href="/#chinh-sach-thue" className="hover:text-white transition-colors">Quy trình đặt lịch xem phòng</Link></li>
              <li><Link href="/#chinh-sach-thue" className="hover:text-white transition-colors">Chính sách cọc &amp; hoàn tiền</Link></li>
              <li><Link href="/#chinh-sach-thue" className="hover:text-white transition-colors">Quy định an ninh &amp; PCCC</Link></li>
              <li><Link href="/#chinh-sach-thue" className="hover:text-white transition-colors">Bảo vệ quyền lợi người thuê</Link></li>
              <li><Link href="/#chinh-sach-thue" className="hover:text-white transition-colors">Chính sách bảo mật thông tin</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© 2026 ELITE LIVING Residential Rental Network. Đã đăng ký bản quyền thương hiệu.</p>
          <p className="text-[11px] text-slate-600">
            Giấy phép số 0317892345 cấp bởi Sở Kế hoạch &amp; Đầu tư TP. Hồ Chí Minh
          </p>
        </div>
      </div>
    </footer>
  );
}
