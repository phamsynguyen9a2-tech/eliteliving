import { getServerSession } from 'next-auth';
import { portalAuthOptions } from './auth';
import { getRequestSession } from './request-session';
import type { Room } from './types';

/**
 * Tin chưa duyệt / bị từ chối chỉ chủ trọ sở hữu phòng và quản trị viên xem được (để xem trước).
 * Người thuê và khách vãng lai chỉ thấy tin đã duyệt.
 */
export async function canPreviewUnlistedRoom(room: Pick<Room, 'landlord_id'>, opts: { fromApi?: boolean } = {}) {
  try {
    const session = opts.fromApi ? await getRequestSession() : await getServerSession(portalAuthOptions);
    const user = session?.user as { id?: string; role?: string } | undefined;
    if (!user?.id) return false;
    return user.role === 'ADMIN' || (user.role === 'LANDLORD' && user.id === room.landlord_id);
  } catch {
    return false;
  }
}
