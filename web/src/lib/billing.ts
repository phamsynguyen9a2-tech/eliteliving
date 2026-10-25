/**
 * Tính tiền hóa đơn điện nước và lập hóa đơn hàng loạt theo tháng.
 * Số tiền luôn tính ở máy chủ từ đơn giá của phòng và tiền thuê ghi trên hợp đồng (không tin số
 * tiền trình duyệt gửi lên).
 */
export interface MeterReadings {
  electricOld: number;
  electricNew: number;
  waterOld: number;
  waterNew: number;
}

export interface BillRates {
  electricityRate: number;
  waterRate: number;
  internetFee: number;
  serviceFee: number;
  /** Tiền thuê / tháng theo hợp đồng đang hiệu lực */
  rent: number;
}

export interface BillAmounts {
  electricUsed: number;
  electricCost: number;
  waterUsed: number;
  waterCost: number;
  internetCost: number;
  serviceCost: number;
  rentCost: number;
  totalAmount: number;
}

/** Kiểm tra chỉ số và tính tiền. Ném "INVALID_READING: …" khi chỉ số sai. */
export function computeBill(readings: MeterReadings, rates: BillRates): BillAmounts {
  const { electricOld, electricNew, waterOld, waterNew } = readings;
  for (const [label, value] of [['điện cũ', electricOld], ['điện mới', electricNew], ['nước cũ', waterOld], ['nước mới', waterNew]] as const) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`INVALID_READING: Chỉ số ${label} không hợp lệ.`);
  }
  if (electricNew < electricOld) throw new Error('INVALID_READING: Chỉ số điện mới phải lớn hơn hoặc bằng chỉ số cũ.');
  if (waterNew < waterOld) throw new Error('INVALID_READING: Chỉ số nước mới phải lớn hơn hoặc bằng chỉ số cũ.');
  const electricUsed = Number((electricNew - electricOld).toFixed(2));
  const waterUsed = Number((waterNew - waterOld).toFixed(2));
  const electricCost = Math.round(electricUsed * rates.electricityRate);
  const waterCost = Math.round(waterUsed * rates.waterRate);
  const internetCost = Math.round(rates.internetFee);
  const serviceCost = Math.round(rates.serviceFee);
  const rentCost = Math.round(rates.rent);
  return {
    electricUsed,
    electricCost,
    waterUsed,
    waterCost,
    internetCost,
    serviceCost,
    rentCost,
    totalAmount: rentCost + electricCost + waterCost + internetCost + serviceCost,
  };
}

/** Chỉ số ban đầu ghi trong biên bản nhận phòng: "Chỉ số điện ban đầu: 120 kWh. Chỉ số nước ban đầu: 15 m³." */
export function parseInitialReadings(notes: string | null | undefined): { electric?: number; water?: number } {
  const text = String(notes || '');
  const e = /chỉ số điện ban đầu:\s*([\d.,]+)/i.exec(text);
  const w = /chỉ số nước ban đầu:\s*([\d.,]+)/i.exec(text);
  const num = (m: RegExpExecArray | null) => (m ? Number(m[1].replace(',', '.')) : undefined);
  return { electric: num(e), water: num(w) };
}
