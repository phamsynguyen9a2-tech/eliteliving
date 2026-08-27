import type { Metadata } from 'next'
import { CalendarDays, Clock, CheckCircle2, XCircle, Eye, Check, X } from 'lucide-react'

export const metadata: Metadata = { title: 'Lịch xem phòng' }

const schedules = [
  { id: 'LX-001', room: 'TP-201', tenant: 'Trần Thị Mai', phone: '0901234567', date: '26/08/2026', time: '09:00', status: 'PENDING', note: 'Muốn xem cả khu trọ' },
  { id: 'LX-002', room: 'TP-301', tenant: 'Lê Văn Phúc', phone: '0912345678', date: '26/08/2026', time: '14:00', status: 'CONFIRMED', note: '' },
  { id: 'LX-003', room: 'TP-101', tenant: 'Nguyễn Thị Hoa', phone: '0923456789', date: '27/08/2026', time: '10:30', status: 'PENDING', note: 'Hỏi về giá điện nước' },
  { id: 'LX-004', room: 'TP-202', tenant: 'Phan Minh Đức', phone: '0934567890', date: '25/08/2026', time: '15:00', status: 'COMPLETED', note: '' },
  { id: 'LX-005', room: 'TP-103', tenant: 'Võ Thị Thanh', phone: '0945678901', date: '24/08/2026', time: '11:00', status: 'CANCELLED', note: 'Bận công việc' },
]

const stConfig: Record<string, { label: string; cls: string; icon: React.FC<any> }> = {
  PENDING:   { label: 'Chờ xác nhận', cls: 'badge-yellow', icon: Clock },
  CONFIRMED: { label: 'Đã xác nhận', cls: 'badge-blue',   icon: CalendarDays },
  COMPLETED: { label: 'Đã xem xong', cls: 'badge-green',  icon: CheckCircle2 },
  CANCELLED: { label: 'Đã hủy',      cls: 'badge-red',    icon: XCircle },
}

export default function AdminSchedulesPage() {
  return (
    <div className="animate-fade-in space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Lịch xem phòng</h1>
          <p className="page-subtitle">Quản lý toàn bộ lịch đặt xem phòng trên hệ thống</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Chờ xác nhận', count: 8, cls: 'border-yellow-400', icon: Clock },
          { label: 'Đã xác nhận', count: 12, cls: 'border-blue-400', icon: CalendarDays },
          { label: 'Đã xem xong', count: 45, cls: 'border-green-400', icon: CheckCircle2 },
          { label: 'Đã hủy', count: 7, cls: 'border-red-400', icon: XCircle },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className={`card border-l-4 ${s.cls} py-3 px-4`}>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-2xl font-bold text-dark-900">{s.count}</p>
            </div>
          )
        })}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-100">
          <h2 className="font-semibold text-dark-800">Danh sách lịch xem</h2>
          <select className="form-select w-40" id="schedule-status-filter">
            <option>Tất cả trạng thái</option>
            <option>Chờ xác nhận</option><option>Đã xác nhận</option><option>Đã xem</option><option>Đã hủy</option>
          </select>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Mã lịch</th>
                <th>Phòng</th>
                <th>Người đặt</th>
                <th>Ngày xem</th>
                <th>Giờ xem</th>
                <th>Ghi chú</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map(s => {
                const st = stConfig[s.status]
                const Icon = st.icon
                return (
                  <tr key={s.id}>
                    <td><code className="text-xs font-mono text-slate-500">{s.id}</code></td>
                    <td><span className="badge-blue">{s.room}</span></td>
                    <td>
                      <p className="font-medium text-dark-800">{s.tenant}</p>
                      <p className="text-xs text-slate-400">{s.phone}</p>
                    </td>
                    <td className="text-slate-600">{s.date}</td>
                    <td><span className="font-semibold text-dark-800">{s.time}</span></td>
                    <td className="text-slate-500 text-sm max-w-[160px] truncate">{s.note || '—'}</td>
                    <td>
                      <span className={`${st.cls} flex items-center gap-1 w-fit`}>
                        <Icon className="w-3 h-3" />{st.label}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-secondary btn-sm btn-icon" title="Xem"><Eye className="w-3.5 h-3.5" /></button>
                        {s.status === 'PENDING' && <>
                          <button className="btn btn-sm btn-icon text-green-500 border border-green-200 hover:bg-green-50" title="Xác nhận"><Check className="w-3.5 h-3.5" /></button>
                          <button className="btn btn-sm btn-icon text-red-400 border border-red-200 hover:bg-red-50" title="Từ chối"><X className="w-3.5 h-3.5" /></button>
                        </>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
