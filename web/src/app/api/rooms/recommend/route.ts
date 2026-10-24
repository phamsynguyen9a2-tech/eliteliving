import { randomUUID } from 'node:crypto';
import { after, NextRequest, NextResponse } from 'next/server';
import { getPersonalizedRecommendations } from '@/lib/db';
import { getRequestSession } from '@/lib/request-session';
import { isRecommendationSource, recordImpression } from '@/lib/interaction-tracking';

const SORT_OPTIONS = new Set(['smart', 'distance', 'price', 'area']);

/** Số từ query string; bỏ qua giá trị rỗng / không phải số để dùng hồ sơ đã lưu hoặc mặc định. */
function numberParam(searchParams: URLSearchParams, name: string): number | undefined {
  const raw = searchParams.get(name);
  if (raw === null || raw.trim() === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);

  const session = await getRequestSession().catch(() => null);
  // Gợi ý cá nhân hóa dùng hồ sơ nhu cầu + lịch sử tương tác của chính người đang đăng nhập.
  // Chỉ quản trị viên được xem gợi ý của người khác qua ?userId= (để kiểm tra mô-đun gợi ý);
  // người khác truyền userId thì bị bỏ qua, không đọc được hồ sơ / lịch sử của tài khoản khác.
  const requestedUserId = searchParams.get('userId');
  const isAdmin = session?.user?.role === 'ADMIN';
  const userId = (isAdmin && requestedUserId) || session?.user?.id || undefined;

  const rawAmenities = searchParams.get('amenities');
  const k = Math.min(50, Math.max(1, Math.floor(numberParam(searchParams, 'k') ?? 6)));
  const sortByParam = searchParams.get('sortBy') || 'smart';

  // Hồ sơ nhu cầu đã lưu được đọc song song với dữ liệu phòng (một lượt truy vấn CSDL).
  // Tham số trên giao diện (ngân sách, vị trí, bán kính, tiện ích) ghi đè hồ sơ đã lưu;
  // không có cả hai thì dùng mặc định gần ĐH Công Thương TP.HCM.
  const { rooms } = await getPersonalizedRecommendations({
    userId,
    k,
    overrides: {
      budget_max: numberParam(searchParams, 'budget'),
      target_lat: numberParam(searchParams, 'lat'),
      target_lng: numberParam(searchParams, 'lng'),
      max_radius_km: numberParam(searchParams, 'radius'),
      preferred_amenities: rawAmenities
        ? rawAmenities.split(',').map((item) => item.trim()).filter(Boolean)
        : undefined,
      lifestyle: searchParams.get('lifestyle') || undefined,
      room_type: searchParams.get('roomType') || undefined,
      sortBy: SORT_OPTIONS.has(sortByParam) ? (sortByParam as 'smart' | 'distance' | 'price' | 'area') : 'smart',
    },
  });

  const latencyMs = Date.now() - startTime;

  // Lượt hiển thị danh sách gợi ý (để đo CTR): chỉ ghi khi giao diện gửi kèm source
  // (WEB_TOPK / MOBILE_HOME); các lần gọi đo hiệu năng không bị tính. Ghi SAU khi đã trả
  // kết quả để không làm chậm API.
  const source = searchParams.get('source');
  const recommendationId = isRecommendationSource(source) && rooms.length > 0 ? randomUUID() : null;
  if (recommendationId && isRecommendationSource(source)) {
    const viewerId = session?.user?.id ?? null;
    const roomIds = rooms.map((room) => room.id);
    after(async () => {
      try {
        await recordImpression({ id: recommendationId, userId: viewerId, source, roomIds });
      } catch (err) {
        console.warn('[recommend] Không ghi được lượt hiển thị gợi ý:', err);
      }
    });
  }

  return NextResponse.json({
    success: true,
    metadata: {
      algorithm: 'Hybrid: Weighted Rule-Based + Content-Based Cosine + Haversine Distance',
      k,
      latency_ms: latencyMs,
      p95_target: '< 500ms',
      recommendation_id: recommendationId,
    },
    data: rooms,
  });
}
