import { HouseRule } from './types';

export const DEFAULT_HOUSE_RULES: HouseRule[] = [
  {
    id: 'RULE_PCCC_01',
    order: 1,
    category: 'PCCC',
    title: 'An Toàn Phòng Cháy Chữa Cháy (PCCC) & Quy Định Sạc Xe Điện',
    content:
      'Nghiêm cấm tuyệt đối cắm sạc xe máy điện, xe đạp điện hoặc pin Lithium qua đêm trong phòng ngủ. Xe điện bắt buộc sạc tại khu vực sạc chuyên dụng có rơ-le tự ngắt và bình chữa cháy tự động. Không sử dụng bình gas mini cũ rỉ sét, bình gas >12kg trong phòng khép kín; ưu tiên sử dụng bếp từ/hồng ngoại. Không chứa chất dễ cháy nổ (xăng, dầu, pháo nổ). Không để đồ đạc, xe cộ lấn chiếm hành lang, cầu thang bộ và lối thoát hiểm.',
    mandatory: true,
    isActive: true,
    penalty: 'Phạt vi phạm 1.000.000đ và đơn phương chấm dứt hợp đồng ngay nếu tái phạm',
  },
  {
    id: 'RULE_SECURITY_02',
    order: 2,
    category: 'SECURITY',
    title: 'An Ninh Trật Tự & Giờ Giấc Ra Vào (Khóa Vân Tay / Thẻ Từ)',
    content:
      'Cửa chính tòa nhà sử dụng khóa vân tay/thẻ từ bảo mật 24/7. Cư dân có nghĩa vụ đóng chặt cửa khi ra vào, tuyệt đối không tiết lộ mã số cho người lạ và không mở cửa cho người ngoài bám đuôi vào tòa nhà. Nghiêm cấm tàng trữ vũ khí, chất kích thích, cờ bạc, mại dâm hoặc tụ tập gây rối; mọi vi phạm sẽ lập tức báo cơ quan Công an và chấm dứt hợp đồng không hoàn cọc.',
    mandatory: true,
    isActive: true,
    penalty: 'Chấm dứt hợp đồng ngay lập tức, chuyển hồ sơ cơ quan chức năng',
  },
  {
    id: 'RULE_RESIDENCE_03',
    order: 3,
    category: 'SECURITY',
    title: 'Đăng Ký Cư Trú & Tiếp Đón Khách Thăm Qua Đêm',
    content:
      'Khách thuê có trách nhiệm cung cấp bản sao CCCD gắn chip (hoặc định danh VNeID mức 2) trong vòng 24h kể từ khi nhận phòng để chủ nhà làm thủ tục đăng ký tạm trú với Công an phường theo Luật Cư trú. Khách đến chơi ban ngày đón tiếp lịch sự tại phòng; trường hợp khách ở lại qua đêm (sau 23:00) phải thông báo trước cho Quản lý tòa nhà và xuất trình CCCD để đăng ký lưu trú theo quy định.',
    mandatory: true,
    isActive: true,
    penalty: 'Nhắc nhở lần 1; người thuê chịu trách nhiệm nếu cơ quan chức năng kiểm tra phạt hành chính',
  },
  {
    id: 'RULE_HYGIENE_04',
    order: 4,
    category: 'HYGIENE',
    title: 'Vệ Sinh Môi Trường & Phân Loại Rác Thải Sinh Hoạt',
    content:
      'Rác sinh hoạt phải được buộc kín trong bao nilon và bỏ đúng vị trí tại phòng rác chung trước 21:00 hàng ngày; nghiêm cấm để túi rác trước cửa phòng gây mùi hôi. Tuyệt đối không xả thức ăn thừa, dầu mỡ chiên xào, băng vệ sinh vào bồn cầu hay bồn rửa chén làm tắc nghẽn đường ống cống chung. Giữ gìn vệ sinh chung khu vực hành lang, thang máy và sân phơi đồ.',
    mandatory: false,
    isActive: true,
    penalty: 'Phạt 200.000đ/lần vi phạm vào quỹ vệ sinh và chi trả toàn bộ chi phí thông tắc cống',
  },
  {
    id: 'RULE_CIVILITY_05',
    order: 5,
    category: 'CIVILITY',
    title: 'Khung Giờ Yên Tĩnh (Quiet Hours 22:00 - 06:00)',
    content:
      'Quy định khung giờ yên tĩnh từ 22:00 đêm đến 06:00 sáng hôm sau. Trong khung giờ này, cư dân không mở loa công suất lớn, không hát karaoke, không tụ tập nhậu nhẹt nói cười to tiếng, không dịch chuyển đồ đạc gây chấn động trần sàn ảnh hưởng đến các phòng lân cận. Tôn trọng không gian riêng tư và giấc ngủ của cộng đồng cư dân.',
    mandatory: false,
    isActive: true,
    penalty: 'Cảnh cáo lần 1; phạt 300.000đ từ lần thứ 2 vi phạm',
  },
  {
    id: 'RULE_PETS_06',
    order: 6,
    category: 'PETS',
    title: 'Chính Sách Nuôi Thú Cưng (Chó, Mèo)',
    content:
      'Chỉ được nuôi thú cưng tại các căn phòng có đăng ký rõ trong hợp đồng (gắn nhãn Pet-friendly). Thú cưng bắt buộc phải tiêm phòng dại định kỳ; khi ra khu vực chung phải có dây xích/rọ mõm và người dắt; giữ gìn vệ sinh không để thú cưng phóng uế bừa bãi. Người nuôi chịu trách nhiệm 100% bồi hoàn thiệt hại nếu thú cưng làm cào rách sofa, cửa gỗ, rèm cửa hoặc làm phiền cư dân khác.',
    mandatory: false,
    isActive: true,
    penalty: 'Bồi thường 100% chi phí sửa chữa đồ đạc hoặc buộc ngừng nuôi nếu tái phạm gây ồn',
  },
  {
    id: 'RULE_ASSETS_07',
    order: 7,
    category: 'UTILITIES',
    title: 'Bảo Vệ Cơ Sở Vật Chất & Bàn Giao Thiết Bị',
    content:
      'Hai bên lập Biên bản bàn giao cơ sở vật chất (Check-in Handover) ghi nhận hiện trạng ban đầu. Khách thuê có nghĩa vụ sử dụng đúng công năng và bảo quản trang thiết bị (máy lạnh, tủ lạnh, máy giặt, gác lửng, thiết bị vệ sinh). Nghiêm cấm tự ý khoan đục tường, dán decal làm tróc sơn, thay đổi kết cấu điện nước khi chưa có chấp thuận bằng văn bản của Bên A. Hỏng hóc do bất cẩn bên thuê tự chi trả sửa chữa.',
    mandatory: true,
    isActive: true,
    penalty: 'Khấu trừ chi phí sửa chữa/thay mới trực tiếp vào tiền cọc khi thanh lý hợp đồng',
  },
  {
    id: 'RULE_UTILITIES_08',
    order: 8,
    category: 'UTILITIES',
    title: 'Chốt Chỉ Số Điện Nước & Định Kỳ Thanh Toán Tiền Thuê',
    content:
      'Chỉ số đồng hồ điện và nước được chốt công khai từ ngày 25 đến 30 hàng tháng; khách thuê có quyền đối soát trực tiếp đồng hồ phòng mình. Tiền phòng và các khoản phí dịch vụ thanh toán định kỳ từ ngày 01 đến ngày 05 hàng tháng qua cổng thanh toán số hoặc chuyển khoản ngân hàng. Trường hợp thanh toán chậm quá 05 ngày không có lý do chính đáng sẽ tính phí phạt chậm nộp 50.000đ/ngày.',
    mandatory: true,
    isActive: true,
    penalty: 'Phạt 50.000đ/ngày quá hạn; tạm ngừng cấp dịch vụ sau 10 ngày thông báo',
  },
  {
    id: 'RULE_VEHICLES_09',
    order: 9,
    category: 'CIVILITY',
    title: 'Quy Định Định Mức Người Ở & Phương Tiện Xe Máy',
    content:
      'Mỗi phòng chỉ được ở đúng số lượng người đã đăng ký trong hợp đồng. Xe máy phải đăng ký biển số và dán thẻ nhận diện của ban quản lý. Để xe gọn gàng đúng vị trí ô vạch sơn trong nhà xe, khóa cổ cẩn thận. Không nổ máy rú ga trong hầm xe hoặc lối đi chung để tránh tích tụ khí thải độc hại và ô nhiễm tiếng ồn.',
    mandatory: false,
    isActive: true,
    penalty: 'Nhắc nhở và từ chối nhận xe nếu không đăng ký biển số chính chủ',
  },
  {
    id: 'RULE_TERMINATION_10',
    order: 10,
    category: 'CONTRACT',
    title: 'Chấm Dứt Hợp Đồng, Báo Trước 30 Ngày & Hoàn Trả Tiền Cọc',
    content:
      'Khi hết hạn hợp đồng hoặc có nhu cầu trả phòng trước hạn, Bên thuê bắt buộc phải thông báo bằng văn bản hoặc tin nhắn cho Bên cho thuê trước tối thiểu 30 ngày. Tiền cọc được hoàn trả 100% trong vòng 03 ngày làm việc sau khi hai bên ký Biên bản bàn giao trả phòng (Check-out), nghiệm thu phòng sạch sẽ, đồ đạc nguyên vẹn và hoàn tất công nợ điện nước. Trường hợp tự ý bỏ phòng hoặc không báo trước đủ 30 ngày sẽ mất toàn bộ tiền đặt cọc.',
    mandatory: true,
    isActive: true,
    penalty: 'Mất toàn bộ 100% tiền đặt cọc nếu đơn phương chấm dứt hợp đồng trái quy định',
  },
];

export function getCategoryBadge(category: HouseRule['category']): { label: string; color: string } {
  switch (category) {
    case 'PCCC':
      return { label: 'PCCC & An Toàn Điện', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'SECURITY':
      return { label: 'An Ninh & Trật Tự', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'HYGIENE':
      return { label: 'Vệ Sinh Môi Trường', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'CIVILITY':
      return { label: 'Nếp Sống Văn Minh', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'PETS':
      return { label: 'Chính Sách Thú Cưng', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'UTILITIES':
      return { label: 'Cơ Sở Vật Chất & Tiện Ích', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
    case 'CONTRACT':
      return { label: 'Pháp Lý & Hoàn Cọc', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    default:
      return { label: 'Quy Định Chung', color: 'bg-slate-50 text-slate-700 border-slate-200' };
  }
}
