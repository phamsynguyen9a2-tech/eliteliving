import Link from 'next/link';
import {
  CalendarCheck2,
  ChevronRight,
  FileSignature,
  SearchCheck,
  WalletCards,
} from 'lucide-react';

const JOURNEY_STEPS = [
  {
    number: '01',
    title: 'Tìm đúng căn phòng',
    description: 'Lọc theo khu vực, ngân sách và nhu cầu sinh hoạt thực tế.',
    href: '#danh-sach-toa-nha',
    action: 'Xem phòng phù hợp',
    icon: SearchCheck,
  },
  {
    number: '02',
    title: 'Đặt lịch xem minh bạch',
    description: 'Chọn khung giờ còn trống và theo dõi xác nhận trong hồ sơ.',
    href: '/ho-so?tab=appointments',
    action: 'Quản lý lịch xem',
    icon: CalendarCheck2,
  },
  {
    number: '03',
    title: 'Đặt cọc & ký hợp đồng',
    description: 'Xem rõ điều khoản, biên bản bàn giao trước khi xác nhận.',
    href: '/ho-so?tab=contracts',
    action: 'Xem hợp đồng',
    icon: FileSignature,
  },
  {
    number: '04',
    title: 'Thanh toán & vận hành',
    description: 'Theo dõi tiền phòng, điện nước và lịch sử thanh toán tập trung.',
    href: '/ho-so?tab=bills',
    action: 'Xem hóa đơn',
    icon: WalletCards,
  },
] as const;

export default function TenantJourney() {
  return (
    <section
      aria-labelledby="tenant-journey-title"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 mb-10"
    >
      <div className="rounded-[28px] border border-[#E5E3DE] bg-white p-5 sm:p-7 shadow-[0_18px_50px_-32px_rgba(15,34,58,0.35)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-5">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#B89C66]">
              Hành trình thuê phòng
            </p>
            <h2 id="tenant-journey-title" className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-[#0F223A]">
              Mọi bước quan trọng trong một nơi
            </h2>
          </div>
          <p className="max-w-xl text-xs sm:text-sm leading-relaxed text-[#64748B]">
            Từ lúc tìm phòng đến khi thanh toán hóa đơn, trạng thái luôn được lưu trong hồ sơ khách thuê.
          </p>
        </div>

        <ol className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {JOURNEY_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.number} className="group relative rounded-2xl border border-[#E5E3DE] bg-[#F8F8F6] p-4 transition-all hover:-translate-y-0.5 hover:border-[#B89C66]/60 hover:bg-white hover:shadow-lg hover:shadow-[#0F223A]/5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F223A] text-[#B89C66] shadow-sm">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-[10px] font-black tracking-[0.18em] text-[#B89C66]">{step.number}</span>
                </div>
                <h3 className="mt-3 text-sm font-extrabold text-[#0F223A]">{step.title}</h3>
                <p className="mt-1.5 min-h-10 text-xs leading-relaxed text-[#64748B]">{step.description}</p>
                <Link
                  href={step.href}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#8C6D37] transition-colors hover:text-[#A38752]"
                >
                  {step.action}
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
