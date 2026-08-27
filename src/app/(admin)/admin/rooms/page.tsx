import type { Metadata } from 'next'
import { Plus, Search, Filter, MapPin, Home, Eye, Edit, Trash2 } from 'lucide-react'

export const metadata: Metadata = { title: 'Quản lý phòng trọ' }

const rooms = [
  { id: 'TP-101', name: 'Phòng TP.101', area: 'Khu trọ Tân Phú', floor: 1, size: 28, price: 4500000, status: 'AVAILABLE', landlord: 'Nguyễn Văn Hùng', published: true },
  { id: 'TP-102', name: 'Phòng TP.102', area: 'Khu trọ Tân Phú', floor: 1, size: 32, price: 5200000, status: 'OCCUPIED', landlord: 'Nguyễn Văn Hùng', published: true },
  { id: 'TP-201', name: 'Phòng TP.201', area: 'Khu trọ Tân Phú', floor: 2, size: 28, price: 4500000, status: 'AVAILABLE', landlord: 'Nguyễn Văn Hùng', published: true },
  { id: 'TP-202', name: 'Phòng TP.202', area: 'Khu trọ Tân Phú', floor: 2, size: 35, price: 5800000, status: 'SCHEDULED', landlord: 'Nguyễn Văn Hùng', published: true },
  { id: 'TP-301', name: 'Phòng TP.301', area: 'Khu trọ Tân Phú', floor: 3, size: 40, price: 6500000, status: 'AVAILABLE', landlord: 'Nguyễn Văn Hùng', published: true },
  { id: 'TP-302', name: 'Phòng TP.302', area: 'Khu trọ Tân Phú', floor: 3, size: 25, price: 3800000, status: 'RESERVED', landlord: 'Nguyễn Văn Hùng', published: false },
]

const statusConfig: Record<string, { label: string; cls: string }> = {
  AVAILABLE:   { label: 'Còn trống',   cls: 'badge-green' },
  OCCUPIED:    { label: 'Đang thuê',   cls: 'badge-blue' },
  SCHEDULED:   { label: 'Đặt lịch',   cls: 'badge-yellow' },
  RESERVED:    { label: 'Giữ chỗ',    cls: 'badge-orange' },
  MAINTENANCE: { label: 'Bảo trì',    cls: 'badge-gray' },
}

export default function AdminRoomsPage() {
  return (
    <div className="animate-fade-in space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý phòng trọ</h1>
          <p className="page-subtitle">73 phòng trên toàn hệ thống</p>
        </div>
        <button className="btn btn-primary" id="btn-add-room"><Plus className="w-4 h-4" /> Thêm phòng</button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Còn trống', count: 12, cls: 'border-l-4 border-green-400' },
          { label: 'Đang thuê', count: 45, cls: 'border-l-4 border-blue-400' },
          { label: 'Đặt lịch',  count: 8,  cls: 'border-l-4 border-yellow-400' },
          { label: 'Giữ chỗ',   count: 5,  cls: 'border-l-4 border-orange-400' },
          { label: 'Bảo trì',   count: 3,  cls: 'border-l-4 border-gray-400' },
        ].map(s => (
          <div key={s.label} className={`card py-3 px-4 ${s.cls}`}>
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="text-2xl font-bold text-dark-900">{s.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input id="room-search" type="text" placeholder="Tìm mã phòng, tên phòng..." className="form-input pl-9" />
          </div>
          <select className="form-select w-40" id="room-status-filter">
            <option value="">Tất cả trạng thái</option>
            <option>Còn trống</option><option>Đang thuê</option><option>Đặt lịch</option><option>Giữ chỗ</option>
          </select>
          <select className="form-select w-44" id="room-area-filter">
            <option value="">Tất cả khu trọ</option>
            <option>Khu trọ Tân Phú</option>
          </select>
          <button className="btn btn-secondary"><Filter className="w-4 h-4" /> Lọc</button>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Mã phòng</th>
                <th>Thông tin</th>
                <th>Khu trọ</th>
                <th>Diện tích</th>
                <th>Giá thuê</th>
                <th>Trạng thái</th>
                <th>Đăng tin</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map(r => {
                const st = statusConfig[r.status]
                return (
                  <tr key={r.id}>
                    <td>
                      <code className="text-xs bg-dark-100 text-dark-700 px-2 py-0.5 rounded-lg font-mono">{r.id}</code>
                    </td>
                    <td>
                      <p className="font-medium text-dark-800">{r.name}</p>
                      <p className="text-xs text-slate-400">Tầng {r.floor} • {r.landlord}</p>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-slate-600 text-sm">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />{r.area}
                      </div>
                    </td>
                    <td className="text-slate-600">{r.size} m²</td>
                    <td className="font-semibold text-dark-800">{r.price.toLocaleString('vi-VN')} đ</td>
                    <td><span className={st.cls}>{st.label}</span></td>
                    <td>
                      {r.published
                        ? <span className="badge-green">Đã đăng</span>
                        : <span className="badge-gray">Chưa đăng</span>
                      }
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-secondary btn-sm btn-icon" title="Xem"><Eye className="w-3.5 h-3.5" /></button>
                        <button className="btn btn-secondary btn-sm btn-icon" title="Sửa"><Edit className="w-3.5 h-3.5" /></button>
                        <button className="btn btn-sm btn-icon text-red-400 border border-red-200 hover:bg-red-50" title="Xóa"><Trash2 className="w-3.5 h-3.5" /></button>
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
