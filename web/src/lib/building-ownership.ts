export const FOREIGN_BUILDING_CODE = 'BUILDING_NOT_OWNED';

/**
 * Chặn chủ trọ gắn phòng vào khu trọ của tài khoản khác.
 * Quản trị viên có thể bỏ qua kiểm tra này khi thực hiện nghiệp vụ toàn hệ thống.
 */
export function assertBuildingOwnership(
  buildingLandlordId: string,
  requestedLandlordId: string,
  allowForeignBuilding = false
) {
  if (!allowForeignBuilding && buildingLandlordId !== requestedLandlordId) {
    throw new Error(`${FOREIGN_BUILDING_CODE}: Khu trọ này thuộc một chủ trọ khác.`);
  }
}

export function isForeignBuildingError(error: unknown) {
  return error instanceof Error && error.message.startsWith(`${FOREIGN_BUILDING_CODE}:`);
}
