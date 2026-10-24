import { NextRequest, NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/request-session';
import { isRecommendationId, recordRecommendationEvent, recordRoomView } from '@/lib/interaction-tracking';

/**
 * Ghi lượt xem trang chi tiết phòng.
 * Body: { action: 'VIEW', roomId: number, recommendationId?: string }
 * - Khách thuê đã đăng nhập: ghi VIEW vào lịch sử tương tác (dùng cho gợi ý cá nhân hóa).
 * - Có recommendationId (mở từ danh sách gợi ý Top-K): ghi lượt bấm để tính CTR, kể cả khách chưa đăng nhập.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const roomId = Number(body?.roomId);
    if (body?.action !== 'VIEW' || !Number.isInteger(roomId) || roomId <= 0) {
      return NextResponse.json({ success: false, message: 'Dữ liệu tương tác không hợp lệ.' }, { status: 400 });
    }

    const session = await getRequestSession().catch(() => null);
    const [viewLogged, clickLogged] = await Promise.all([
      recordRoomView(session?.user?.id, roomId),
      isRecommendationId(body?.recommendationId)
        ? recordRecommendationEvent({ recommendationId: body.recommendationId, roomId, action: 'CLICK' })
        : Promise.resolve(false),
    ]);

    return NextResponse.json({ success: true, data: { viewLogged, clickLogged } });
  } catch (err) {
    console.warn('[interactions] Không ghi được tương tác:', err);
    // Ghi hành vi là phụ: không làm hỏng trang của người dùng
    return NextResponse.json({ success: false, message: 'Không ghi được tương tác.' }, { status: 200 });
  }
}
