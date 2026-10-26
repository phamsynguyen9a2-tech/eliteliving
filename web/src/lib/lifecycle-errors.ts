import { NextResponse } from 'next/server';

/**
 * Lỗi nghiệp vụ vòng đời phòng / hợp đồng ném từ lib/db.ts dạng `MÃ: thông báo` → mã HTTP.
 * Trả null với lỗi khác (lỗi hệ thống) để route xử lý như cũ.
 */
const LIFECYCLE_ERROR_STATUS: Record<string, number> = {
  INVALID_ROOM_STATUS: 400,
  ROOM_NOT_FOUND: 404,
  CONTRACT_NOT_FOUND: 404,
  ROOM_STATUS_CONFLICT: 409,
  ROOM_HAS_ACTIVE_CONTRACT: 409,
  ROOM_RESERVED: 409,
  ROOM_NOT_AVAILABLE: 409,
  CONTRACT_NOT_ACTIVE: 409,
  CONTRACT_CHANGED: 409,
};

export function lifecycleErrorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : '';
  const match = /^([A-Z_]+):\s*([\s\S]*)$/.exec(message);
  if (!match) return null;
  const status = LIFECYCLE_ERROR_STATUS[match[1]];
  if (!status) return null;
  return NextResponse.json({ success: false, message: match[2].trim() }, { status });
}
