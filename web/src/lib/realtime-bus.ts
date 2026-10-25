/**
 * Đồng bộ thời gian thực giữa Web Admin, Web Chủ trọ và Web/App Người thuê.
 *
 * Mỗi khi dữ liệu nghiệp vụ đổi (trạng thái phòng, lịch xem, hợp đồng, hóa đơn, thông báo, đánh giá),
 * máy chủ phát một sự kiện ngắn lên bus này; route /api/events đẩy sự kiện xuống trình duyệt bằng
 * Server-Sent Events (kết nối HTTP giữ mở, máy chủ chủ động gửi). Trình duyệt nhận được thì tải lại
 * đúng phần dữ liệu qua REST API như bình thường, nên quyền truy cập vẫn do REST API kiểm soát.
 * App mobile nhận cùng loại biến động qua thông báo đẩy FCM (lib/push.ts).
 *
 * Bus nằm trong bộ nhớ tiến trình: đủ cho một máy chủ Next.js (npm run dev / next start).
 * Chạy nhiều máy chủ thì thay bằng Redis Pub/Sub (đề cương cho phép dùng Redis).
 */
import { EventEmitter } from 'node:events';
import prisma from './prisma';

export type RealtimeEventType = 'room' | 'appointment' | 'contract' | 'bill' | 'notification' | 'review';

export interface RealtimeEvent {
  type: RealtimeEventType;
  roomId?: number;
  /** Chủ trọ liên quan (để chỉ báo cho đúng chủ trọ) — không gửi xuống trình duyệt */
  landlordId?: string;
  /** Người thuê liên quan — không gửi xuống trình duyệt */
  userId?: string | null;
  at?: number;
}

const globalForBus = globalThis as typeof globalThis & { __eliteRealtimeBus?: EventEmitter };
const bus = globalForBus.__eliteRealtimeBus ?? new EventEmitter();
bus.setMaxListeners(0);
globalForBus.__eliteRealtimeBus = bus;

export function publishRealtime(event: RealtimeEvent) {
  try {
    bus.emit('event', { ...event, at: Date.now() });
  } catch (err) {
    console.warn('[realtime] Không phát được sự kiện:', err);
  }
}

/** Phát sự kiện gắn với một phòng; tự tra chủ trọ của phòng. Không ném lỗi. */
export function publishRoomEvent(type: RealtimeEventType, roomId: number, userId?: string | null) {
  void (async () => {
    let landlordId: string | undefined;
    try {
      const room = await prisma.room.findUnique({ where: { id: roomId }, select: { landlordId: true } });
      landlordId = room?.landlordId;
    } catch {
      // vẫn phát sự kiện, chỉ thiếu thông tin chủ trọ (admin vẫn nhận)
    }
    publishRealtime({ type, roomId, landlordId, userId: userId ?? null });
  })();
}

export function subscribeRealtime(listener: (event: RealtimeEvent) => void): () => void {
  bus.on('event', listener);
  return () => bus.off('event', listener);
}

export interface RealtimeViewer {
  id: string;
  role: 'ADMIN' | 'LANDLORD' | 'TENANT';
  /** Phòng mà người thuê đang có hợp đồng / lịch hẹn (để nhận biến động hợp đồng, hóa đơn) */
  roomIds?: Set<number>;
}

/** Ai được nhận sự kiện nào. Sự kiện "room" (trạng thái phòng công khai) gửi cho mọi người. */
export function shouldDeliver(event: RealtimeEvent, viewer: RealtimeViewer | null): boolean {
  if (event.type === 'room' || event.type === 'review') return true;
  if (!viewer) return false;
  if (viewer.role === 'ADMIN') return true;
  if (viewer.role === 'LANDLORD') return Boolean(event.landlordId && event.landlordId === viewer.id);
  if (event.userId && event.userId === viewer.id) return true;
  return Boolean(event.roomId && viewer.roomIds?.has(event.roomId));
}
