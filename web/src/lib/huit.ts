/**
 * Khoảng cách tới ĐH Công Thương (HUIT) chỉ có ý nghĩa với phòng ở Quận Tân Phú,
 * nơi trường đặt cơ sở chính. Các quận khác không hiển thị thông tin này.
 */
export function showsHuitDistance(district: string | null | undefined): boolean {
  return /tân\s*phú/i.test(district || '');
}
