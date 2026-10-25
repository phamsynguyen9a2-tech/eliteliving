import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, portalAuthOptions } from '@/lib/auth';
import { getTenantScope } from '@/lib/tenant-access';
import { shouldDeliver, subscribeRealtime, type RealtimeViewer } from '@/lib/realtime-bus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HEARTBEAT_MS = 25_000;

/**
 * Kênh Server-Sent Events: GET /api/events?scope=portal|tenant
 * (EventSource không gửi được header nên phiên được chọn qua tham số scope; vẫn cần cookie phiên hợp lệ.)
 * Chỉ gửi loại sự kiện + mã phòng, không gửi dữ liệu cá nhân; trình duyệt tự gọi lại REST API để lấy dữ liệu.
 */
export async function GET(request: NextRequest) {
  const scope = new URL(request.url).searchParams.get('scope') === 'portal' ? 'portal' : 'tenant';
  const session = await getServerSession(scope === 'portal' ? portalAuthOptions : authOptions).catch(() => null);
  const user = session?.user as { id?: string; role?: string } | undefined;

  let viewer: RealtimeViewer | null = null;
  if (user?.id && (user.role === 'ADMIN' || user.role === 'LANDLORD' || user.role === 'TENANT')) {
    viewer = { id: user.id, role: user.role };
    if (user.role === 'TENANT') {
      try {
        const tenantScope = await getTenantScope(user.id);
        viewer.roomIds = new Set([...tenantScope.appointmentRoomIds, ...tenantScope.contractRoomIds]);
      } catch {
        viewer.roomIds = new Set();
      }
    }
  }

  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      send(`retry: 5000\n\nevent: ready\ndata: {"ok":true}\n\n`);
      const unsubscribe = subscribeRealtime((event) => {
        if (!shouldDeliver(event, viewer)) return;
        send(`event: change\ndata: ${JSON.stringify({ type: event.type, roomId: event.roomId ?? null, at: event.at })}\n\n`);
      });
      const heartbeat = setInterval(() => send(`: ping\n\n`), HEARTBEAT_MS);
      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // đã đóng
        }
      };
      request.signal.addEventListener('abort', () => cleanup());
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
