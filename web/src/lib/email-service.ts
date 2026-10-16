/**
 * Elite Living — Email & Notification Service
 * Chuẩn màu thương hiệu: Champagne #B89C66, Deep Navy #0F223A, Slate #E5E3DE
 * Tuyệt đối không dùng màu xanh lá cây theo chỉ thị AGENTS.md
 */

import { notificationList, pushNotification } from '@/lib/notification-store';

export interface ContractEmailData {
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  roomCode: string;
  roomTitle: string;
  address: string;
  monthlyRent: number;
  depositAmount: number;
  startDate: string;
  endDate: string;
  initialElectric: number;
  initialWater: number;
  contractId: string;
}

export interface MonthlyBillEmailData {
  tenantName: string;
  tenantEmail: string;
  roomCode: string;
  month: string;
  totalAmount: number;
  rentCost: number;
  electricUsed: number;
  electricCost: number;
  waterUsed: number;
  waterCost: number;
  internetCost: number;
  serviceCost: number;
  billId: string;
}

export interface ContractExpiryEmailData {
  tenantName: string;
  tenantEmail: string;
  roomCode: string;
  endDate: string;
  daysRemaining: number;
  contractId: string;
}

export type NotificationType =
  | 'CONTRACT_CHECKIN'
  | 'MONTHLY_BILL'
  | 'CONTRACT_EXPIRY'
  | 'DEPOSIT_CANCEL'
  | 'CONTRACT_RENEWED'
  | 'CHECKOUT_SETTLEMENT'
  | 'CONTRACT_TERMINATED'
  | 'APPOINTMENT_UPDATE'
  | 'BILL_PAID';

export interface StoredNotification {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  type: NotificationType;
  contentHtml: string;
  summary: string;
  sentAt: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  /** Tài khoản nhận (nếu xác định được) — giúp khớp hộp thư khi email khác nhau. */
  recipientUserId?: string;
  /** SĐT khách thuê trên hợp đồng — khớp với SĐT đã xác minh của tài khoản. */
  recipientPhone?: string;
  /** Đường dẫn hành động trong website (VD: /ho-so?tab=bills). */
  link?: string;
}

// In-memory notifications store for real-time inbox view
// (neo vào globalThis + lưu file trong notification-store để mọi route dùng chung)
export const inMemoryNotifications: StoredNotification[] = notificationList;

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface SimpleNotificationHtmlInput {
  badge: string;
  title: string;
  recipientName: string;
  /** Các đoạn văn bản thuần (sẽ được escape). */
  paragraphs: string[];
  /** Bảng thông tin dạng nhãn → giá trị (sẽ được escape). */
  details?: Array<{ label: string; value: string }>;
  ctaLabel?: string;
  ctaHref?: string;
}

/**
 * Template email ngắn gọn theo bộ nhận diện Elite Living cho các thông báo vòng đời
 * (lịch hẹn, gia hạn, trả phòng, hủy cọc...). Mọi dữ liệu động đều được escape.
 */
export function buildSimpleNotificationHtml(input: SimpleNotificationHtmlInput): string {
  const details = (input.details || [])
    .map(
      (row) =>
        `<tr><td style="padding:8px 0;color:#64748B;font-weight:600;border-bottom:1px solid #E5E3DE;">${escapeHtml(row.label)}</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#0F223A;border-bottom:1px solid #E5E3DE;">${escapeHtml(row.value)}</td></tr>`
    )
    .join('');
  const paragraphs = input.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  const cta = input.ctaLabel && input.ctaHref
    ? `<div style="text-align:center;margin-top:24px;"><a href="${escapeHtml(input.ctaHref)}" style="display:inline-block;background:#B89C66;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:700;font-size:14px;">${escapeHtml(input.ctaLabel)}</a></div>`
    : '';

  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head><meta charset="UTF-8"><title>${escapeHtml(input.title)}</title></head>
    <body style="font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F8F8F6;color:#0F223A;margin:0;padding:20px;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #E5E3DE;">
        <div style="background:#0F223A;padding:26px;text-align:center;color:#ffffff;">
          <span style="display:inline-block;background:#B89C66;color:#ffffff;padding:4px 14px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(input.badge)}</span>
          <h2 style="margin:10px 0 0;font-size:19px;font-weight:800;">${escapeHtml(input.title)}</h2>
        </div>
        <div style="padding:26px;font-size:14px;line-height:1.6;color:#334155;">
          <p>Kính gửi quý khách <strong>${escapeHtml(input.recipientName)}</strong>,</p>
          ${paragraphs}
          ${details ? `<table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:13.5px;">${details}</table>` : ''}
          ${cta}
        </div>
        <div style="background:#F8F8F6;border-top:1px solid #E5E3DE;padding:16px;text-align:center;font-size:11px;color:#94A3B8;">
          © 2026 Elite Living (NhatroTop) • Email được tạo tự động. Hotline cư dân: 1900 6868
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML email template for Contract & Check-in Handover
 */
export function generateContractCheckinEmail(data: ContractEmailData): StoredNotification {
  const formatMoney = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' đ';

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Hợp Đồng Điện Tử & Biên Bản Bàn Giao Nhận Phòng</title>
      <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F8F8F6; color: #0F223A; margin: 0; padding: 20px; }
        .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #E5E3DE; box-shadow: 0 10px 25px rgba(15,34,58,0.06); }
        .header { background: #0F223A; padding: 32px 28px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0 0 8px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
        .header .badge { display: inline-block; background: #B89C66; color: #ffffff; padding: 4px 14px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .content { padding: 32px 28px; font-size: 14px; line-height: 1.6; color: #334155; }
        .highlight-box { background: #F8F8F6; border: 1px solid #E5E3DE; border-left: 4px solid #B89C66; border-radius: 12px; padding: 18px; margin: 20px 0; }
        .grid-info { display: table; width: 100%; margin-top: 10px; }
        .grid-row { display: table-row; }
        .grid-cell-label { display: table-cell; padding: 6px 0; font-weight: 600; color: #64748B; width: 45%; }
        .grid-cell-value { display: table-cell; padding: 6px 0; font-weight: 700; color: #0F223A; text-align: right; }
        .rules-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin: 20px 0; }
        .rules-box h3 { margin: 0 0 10px 0; color: #0F223A; font-size: 14px; font-weight: 800; }
        .rules-list { margin: 0; padding-left: 20px; font-size: 12.5px; color: #475569; }
        .rules-list li { margin-bottom: 6px; }
        .button-wrap { text-align: center; margin: 30px 0 10px 0; }
        .btn-action { display: inline-block; background: #B89C66; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 6px 18px rgba(184,156,102,0.3); }
        .footer { background: #F8F8F6; border-top: 1px solid #E5E3DE; padding: 20px; text-align: center; font-size: 11px; color: #94A3B8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <span class="badge">Elite Living • Thông Báo Nhận Phòng</span>
          <h1>HỢP ĐỒNG ĐIỆN TỬ & BÀN GIAO</h1>
          <p style="margin: 0; font-size: 13px; color: #CBD5E1;">Mã căn hộ: <strong>${data.roomCode}</strong> — Phòng: ${data.roomTitle}</p>
        </div>
        <div class="content">
          <p>Kính gửi quý khách <strong>${data.tenantName}</strong>,</p>
          <p>Ban Quản Lý trân trọng thông báo quý khách đã <strong>hoàn tất thủ tục Check-in nhận phòng</strong> thành công. Hợp đồng thuê điện tử và Biên bản bàn giao tài sản thiết bị đã được kích hoạt trên hệ thống.</p>

          <div class="highlight-box">
            <div style="font-weight: 800; color: #0F223A; font-size: 15px; margin-bottom: 8px;">Thông Tin Hợp Đồng & Chỉ Số Ban Đầu</div>
            <div class="grid-info">
              <div class="grid-row">
                <div class="grid-cell-label">Mã Hợp Đồng</div>
                <div class="grid-cell-value">#${data.contractId.slice(-8).toUpperCase()}</div>
              </div>
              <div class="grid-row">
                <div class="grid-cell-label">Địa chỉ căn hộ</div>
                <div class="grid-cell-value">${data.address}</div>
              </div>
              <div class="grid-row">
                <div class="grid-cell-label">Thời hạn thuê</div>
                <div class="grid-cell-value">${data.startDate} đến ${data.endDate}</div>
              </div>
              <div class="grid-row">
                <div class="grid-cell-label">Giá thuê hàng tháng</div>
                <div class="grid-cell-value">${formatMoney(data.monthlyRent)}</div>
              </div>
              <div class="grid-row">
                <div class="grid-cell-label">Tiền đặt cọc giữ chỗ</div>
                <div class="grid-cell-value">${formatMoney(data.depositAmount)}</div>
              </div>
              <div class="grid-row">
                <div class="grid-cell-label">Chỉ số điện chốt lúc nhận</div>
                <div class="grid-cell-value">${data.initialElectric} kWh</div>
              </div>
              <div class="grid-row">
                <div class="grid-cell-label">Chỉ số nước chốt lúc nhận</div>
                <div class="grid-cell-value">${data.initialWater} m³</div>
              </div>
            </div>
          </div>

          <div class="rules-box">
            <h3>🛡️ Cam Kết 10 Điều Nội Quy An Toàn PCCC Bắt Buộc</h3>
            <ol class="rules-list">
              <li>Không sạc xe điện, pin lithium trong phòng ngủ hoặc sạc qua đêm không có người giám sát.</li>
              <li>Tuyệt đối không che chắn, tự ý tháo dỡ đầu báo khói, đầu phun sprinkler chữa cháy tự động.</li>
              <li>Không đun nấu bằng bếp gas mini không rõ nguồn gốc; khuyến khích sử dụng bếp từ/hồng ngoại an toàn.</li>
              <li>Giữ thông thoáng hành lang thoát hiểm và lối cầu thang bộ; không để đồ đạc chắn lối đi chung.</li>
              <li>Nắm rõ vị trí bình chữa cháy bột/CO2 và thang dây thoát hiểm tại tầng cư trú.</li>
              <li>Kiểm tra ngắt aptomat, thiết bị điện công suất lớn trước khi ra khỏi phòng hoặc về quê.</li>
              <li>Nghiêm cấm tàng trữ chất dễ cháy, nổ, pháo hoa trong khuôn viên tòa nhà.</li>
              <li>Tuân thủ giờ giấc yên tĩnh sau 23h00, đảm bảo an ninh trật tự văn minh đô thị.</li>
              <li>Phải đăng ký tạm trú đúng quy định pháp luật cùng ban quản lý tòa nhà trong 24h đầu.</li>
              <li>Khi phát hiện sự cố chập điện hoặc mùi khói, bấm chuông báo động khẩn cấp và gọi hotline quản lý ngay lập tức.</li>
            </ol>
          </div>

          <p>Quý khách vui lòng đăng nhập vào tài khoản trên website để kiểm tra biên bản kiểm kê trang thiết bị (Điều hòa, Tủ lạnh, Khóa vân tay, Đèn chiếu sáng...) và bấm xác nhận ký số điện tử.</p>

          <div class="button-wrap">
            <a href="/ho-so?tab=contracts" class="btn-action">Xem Hợp Đồng & Ký Số Điện Tử</a>
          </div>
        </div>
        <div class="footer">
          <p>© 2026 Elite Living (NhatroTop) • Hệ thống quản lý và cho thuê phòng trọ cao cấp.</p>
          <p>Email này được tạo tự động từ hệ thống quản lý. Hotline hỗ trợ cư dân: 1900 6868</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const notif: StoredNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    recipientEmail: data.tenantEmail || 'tenant@eliteliving.vn',
    recipientName: data.tenantName,
    subject: `[ELITE LIVING] Hợp đồng điện tử & Bàn giao nhận phòng ${data.roomCode}`,
    type: 'CONTRACT_CHECKIN',
    contentHtml: html,
    summary: `Check-in nhận phòng ${data.roomCode} thành công. Chỉ số điện: ${data.initialElectric} kWh, Nước: ${data.initialWater} m³. Hợp đồng có hiệu lực đến ${data.endDate}.`,
    sentAt: new Date().toISOString(),
    isRead: false,
    metadata: {
      contractId: data.contractId,
      roomCode: data.roomCode,
    },
    recipientPhone: data.tenantPhone || undefined,
    link: '/ho-so?tab=contracts',
  };

  return pushNotification(notif);
}

/**
 * Generate HTML email template for Monthly Utility Bill
 */
export function generateMonthlyBillEmail(data: MonthlyBillEmailData): StoredNotification {
  const formatMoney = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' đ';

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Thông Báo Hóa Đơn Tiền Nhà & Điện Nước</title>
      <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F8F8F6; color: #0F223A; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #E5E3DE; }
        .header { background: #0F223A; padding: 28px; text-align: center; color: #ffffff; }
        .content { padding: 28px; font-size: 14px; line-height: 1.6; }
        .bill-total { background: #0F223A; color: #B89C66; text-align: center; padding: 20px; border-radius: 14px; margin: 20px 0; }
        .bill-total .amount { font-size: 28px; font-weight: 900; color: #ffffff; }
        .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .table td { padding: 10px 0; border-bottom: 1px solid #E5E3DE; font-size: 13.5px; }
        .table td:last-child { text-align: right; font-weight: 700; color: #0F223A; }
        .btn-pay { display: inline-block; background: #B89C66; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 14px; }
        .footer { background: #F8F8F6; border-top: 1px solid #E5E3DE; padding: 18px; text-align: center; font-size: 11px; color: #94A3B8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin:0; font-size: 20px; font-weight: 800;">HÓA ĐƠN THÁNG ${data.month}</h2>
          <p style="margin:4px 0 0; color:#B89C66; font-size:13px; font-weight: 600;">Phòng ${data.roomCode} • Khách thuê: ${data.tenantName}</p>
        </div>
        <div class="content">
          <p>Kính gửi quý khách <strong>${data.tenantName}</strong>,</p>
          <p>Ban Quản Lý xin gửi bảng chiết tính tiền phòng và điện nước sử dụng tháng <strong>${data.month}</strong> như sau:</p>

          <div class="bill-total">
            <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #B89C66;">Tổng Số Tiền Cần Thanh Toán</div>
            <div class="amount">${formatMoney(data.totalAmount)}</div>
            <div style="font-size: 11px; color: #CBD5E1; margin-top: 4px;">Hạn thanh toán: Trong vòng 05 ngày kể từ ngày nhận bill</div>
          </div>

          <table class="table">
            <tr><td>Tiền thuê phòng tháng ${data.month}</td><td>${formatMoney(data.rentCost)}</td></tr>
            <tr><td>Tiền điện (${data.electricUsed} kWh)</td><td>${formatMoney(data.electricCost)}</td></tr>
            <tr><td>Tiền nước (${data.waterUsed} m³)</td><td>${formatMoney(data.waterCost)}</td></tr>
            <tr><td>Phí internet & wifi tốc độ cao</td><td>${formatMoney(data.internetCost)}</td></tr>
            <tr><td>Phí vệ sinh, rác, thang máy & quản lý</td><td>${formatMoney(data.serviceCost)}</td></tr>
          </table>

          <div style="text-align: center; margin-top: 26px;">
            <a href="/ho-so?tab=bills" class="btn-pay">Quét Mã QR Thanh Toán Ngay</a>
          </div>
        </div>
        <div class="footer">
          <p>© 2026 Elite Living • Cảm ơn quý khách đã đồng hành cùng tòa nhà.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const notif: StoredNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    recipientEmail: data.tenantEmail || 'tenant@eliteliving.vn',
    recipientName: data.tenantName,
    subject: `[ELITE LIVING] Hóa đơn tiền nhà & điện nước tháng ${data.month} — Phòng ${data.roomCode}`,
    type: 'MONTHLY_BILL',
    contentHtml: html,
    summary: `Hóa đơn tháng ${data.month}: ${formatMoney(data.totalAmount)} (Điện: ${data.electricUsed} kWh, Nước: ${data.waterUsed} m³).`,
    sentAt: new Date().toISOString(),
    isRead: false,
    metadata: {
      billId: data.billId,
      roomCode: data.roomCode,
      month: data.month,
      totalAmount: data.totalAmount,
    },
    link: '/ho-so?tab=bills',
  };

  return pushNotification(notif);
}

/**
 * Generate HTML email template for Contract Expiry / Renewal Notice
 */
export function generateContractExpiryEmail(data: ContractExpiryEmailData): StoredNotification {
  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Thông Báo Hạn Hợp Đồng Thuê</title>
      <style>
        body { font-family: 'Inter', sans-serif; background-color: #F8F8F6; color: #0F223A; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #E5E3DE; }
        .header { background: #0F223A; padding: 28px; text-align: center; color: #ffffff; }
        .content { padding: 28px; font-size: 14px; line-height: 1.6; }
        .alert-box { background: #FFFBEB; border: 1px solid #FEF3C7; border-left: 4px solid #B89C66; padding: 16px; border-radius: 12px; margin: 18px 0; color: #92400E; font-weight: 600; }
        .btn-action { display: inline-block; background: #B89C66; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; margin: 6px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin:0; font-size: 20px;">NHẮC HẠN HỢP ĐỒNG THUÊ</h2>
          <p style="margin:4px 0 0; color:#B89C66;">Căn hộ ${data.roomCode} • Hạn kết thúc: ${data.endDate}</p>
        </div>
        <div class="content">
          <p>Kính gửi quý khách <strong>${data.tenantName}</strong>,</p>
          <div class="alert-box">
            ⚠️ Hợp đồng thuê phòng ${data.roomCode} sẽ chính thức kết thúc vào ngày <strong>${data.endDate}</strong> (còn ${data.daysRemaining} ngày).
          </div>
          <p>Để đảm bảo quyền lợi và kế hoạch sắp xếp phòng, quý khách vui lòng phản hồi nhu cầu cư trú trong vòng 15 ngày:</p>
          <ul>
            <li><strong>Gia hạn hợp đồng:</strong> Tiếp tục thuê với thời hạn linh hoạt 6 tháng hoặc 12 tháng (giữ nguyên chính sách ưu đãi).</li>
            <li><strong>Trả phòng:</strong> Đặt lịch hẹn bàn giao nghiệm thu tài sản, chốt điện nước cuối cùng và hoàn trả 100% tiền cọc.</li>
          </ul>
          <div style="text-align: center; margin-top: 24px;">
            <a href="/ho-so?tab=contracts" class="btn-action">Xác Nhận Gia Hạn Hoặc Trả Phòng</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const notif: StoredNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    recipientEmail: data.tenantEmail || 'tenant@eliteliving.vn',
    recipientName: data.tenantName,
    subject: `[ELITE LIVING] Nhắc hạn hợp đồng phòng ${data.roomCode} — Hết hạn ngày ${data.endDate}`,
    type: 'CONTRACT_EXPIRY',
    contentHtml: html,
    summary: `Hợp đồng phòng ${data.roomCode} hết hạn vào ngày ${data.endDate} (còn ${data.daysRemaining} ngày). Quý khách vui lòng chọn Gia hạn hoặc Trả phòng.`,
    sentAt: new Date().toISOString(),
    isRead: false,
    metadata: {
      contractId: data.contractId,
      roomCode: data.roomCode,
      endDate: data.endDate,
    },
    link: '/ho-so?tab=contracts',
  };

  return pushNotification(notif);
}
