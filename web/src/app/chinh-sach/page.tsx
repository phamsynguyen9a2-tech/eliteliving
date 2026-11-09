import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Chính sách thuê phòng | Elite Living',
  description:
    'Quy trình đặt lịch xem phòng, chính sách cọc và hoàn tiền, quy định an ninh và PCCC, quyền lợi người thuê và chính sách bảo mật thông tin của Elite Living.',
};

type PolicySection = { id: string; title: string; items: string[] };

/**
 * Nội dung bám theo đúng luật nghiệp vụ đang chạy trong hệ thống
 * (đặt lịch, đặt cọc, hủy cọc, trả phòng, hóa đơn, bảo mật) để chính sách không hứa sai.
 */
const SECTIONS: PolicySection[] = [
  {
    id: 'dat-lich',
    title: 'Quy trình đặt lịch xem phòng',
    items: [
      'Chọn phòng còn trống, chọn ngày và khung giờ mà chủ trọ đang mở đón khách. Mỗi khung giờ của một phòng chỉ nhận một lịch hẹn.',
      'Lịch cần đặt trước ít nhất 2 giờ (chủ trọ có thể quy định khác cho tòa nhà của mình).',
      'Bạn có thể đặt lịch khi chưa có tài khoản bằng họ tên và số điện thoại. Mỗi số điện thoại giữ tối đa 2 lịch sắp tới và không đặt 2 lịch cho cùng một phòng.',
      'Đặt lịch xong, bạn nhận mã tra cứu 6 số. Vào mục "Lịch đã đặt", nhập số điện thoại cùng mã này để xem trạng thái hoặc hủy lịch trên bất kỳ thiết bị nào.',
      'Chủ trọ xác nhận, đổi giờ hoặc hủy lịch; trạng thái mới cập nhật ngay trên trang lịch hẹn của bạn.',
    ],
  },
  {
    id: 'coc-hoan-tien',
    title: 'Chính sách cọc và hoàn tiền',
    items: [
      'Đặt cọc giữ chỗ chỉ thực hiện được sau khi bạn đã xem phòng, đã đăng nhập và đã xác minh số điện thoại.',
      'Tiền cọc bằng mức ghi trên từng phòng, thường là một tháng tiền thuê. Bạn chuyển khoản và nhập mã giao dịch để chủ trọ đối soát.',
      'Trong thời gian giữ chỗ, phòng không nhận khách khác đặt cọc. Đến ngày nhận phòng, chủ trọ làm thủ tục và lập hợp đồng.',
      'Nếu bạn tự hủy giữ chỗ, tiền cọc không được hoàn lại. Nếu hai bên thỏa thuận hủy hoặc bạn không đến nhận phòng đúng hẹn, tiền cọc xử lý theo thỏa thuận với chủ trọ.',
      'Khi trả phòng, tiền cọc được hoàn lại sau khi trừ chi phí hư hỏng tài sản (nếu có) ghi trong biên bản bàn giao. Tiền điện, nước tính theo chỉ số chốt ngày trả phòng.',
    ],
  },
  {
    id: 'an-ninh-pccc',
    title: 'Quy định an ninh và PCCC',
    items: [
      'Mỗi tòa nhà có nội quy và các điều phòng cháy chữa cháy riêng do chủ trọ ban hành, hiển thị ở trang chi tiết phòng và trong hợp đồng.',
      'Khi ký hợp đồng điện tử, bạn cam kết tuân thủ nội quy và quy định PCCC của tòa nhà.',
      'Không tự ý câu móc điện, không để vật dễ cháy hoặc xe ở lối thoát hiểm, không đun nấu bằng bếp than trong phòng.',
      'Thông báo cho chủ trọ khi có người ở thêm hoặc thay đổi số lượng xe gửi.',
    ],
  },
  {
    id: 'quyen-loi',
    title: 'Bảo vệ quyền lợi người thuê',
    items: [
      'Giá thuê, tiền cọc, giá điện, nước, internet, phí dịch vụ và gửi xe được công khai trên trang phòng trước khi bạn đặt lịch.',
      'Tin đăng phòng được quản trị viên duyệt trước khi hiển thị công khai.',
      'Hợp đồng điện tử ghi đủ giá, thời hạn và điều khoản; bạn đọc kỹ trước khi ký.',
      'Hóa đơn lập theo chỉ số điện nước từng kỳ, mỗi kỳ chỉ một hóa đơn cho một phòng.',
      'Bạn có thể gửi yêu cầu sửa chữa, gia hạn hợp đồng, đổi sang phòng khác cùng chủ trọ hoặc trả phòng ngay trên hệ thống, và đánh giá phòng sau khi thuê.',
    ],
  },
  {
    id: 'bao-mat',
    title: 'Chính sách bảo mật thông tin',
    items: [
      'Elite Living thu thập họ tên, số điện thoại và email khi bạn đăng ký hoặc đặt lịch; số CCCD và địa chỉ chỉ khi bạn đặt cọc hoặc ký hợp đồng.',
      'Thông tin của bạn chỉ hiển thị cho chủ trọ của phòng bạn đặt lịch hoặc thuê, và cho quản trị viên khi cần xử lý.',
      'Mật khẩu được mã hóa trước khi lưu. Số điện thoại được xác minh bằng mã OTP. Trang tra cứu lịch hẹn che bớt số điện thoại của bạn.',
      'Muốn sửa hoặc xóa thông tin cá nhân, vui lòng liên hệ hotline 082.591.5396.',
    ],
  },
];

export default function PolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F8F6] text-[#0F223A]">
      <Navbar />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-black">Chính sách thuê phòng</h1>
        <p className="text-sm text-slate-600 mt-2">
          Các quy định áp dụng khi bạn tìm, đặt lịch và thuê phòng trên Elite Living.
        </p>

        <nav aria-label="Mục lục chính sách" className="mt-6 flex flex-wrap gap-2">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="inline-flex items-center min-h-10 px-3.5 rounded-full border border-[#E5E3DE] bg-white text-xs font-bold text-[#0F223A] hover:border-[#B89C66] hover:text-[#8C6D37] transition-colors"
            >
              {section.title}
            </a>
          ))}
        </nav>

        <div className="mt-8 space-y-6">
          {SECTIONS.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-24 rounded-2xl border border-[#E5E3DE] bg-white p-5 sm:p-6"
            >
              <h2 className="text-lg font-black">
                <span className="text-[#B89C66] mr-2">{index + 1}.</span>
                {section.title}
              </h2>
              <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-700 list-disc pl-5 marker:text-[#B89C66]">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-8 text-sm text-slate-600">
          Cần hỗ trợ thêm? Gọi hotline{' '}
          <a href="tel:0825915396" className="font-bold text-[#8C6D37] hover:underline">082.591.5396</a> hoặc{' '}
          <Link href="/" className="font-bold text-[#8C6D37] hover:underline">quay lại trang chủ</Link> để tìm phòng.
        </p>
      </main>
      <Footer />
    </div>
  );
}
