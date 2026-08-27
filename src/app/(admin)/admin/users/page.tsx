import type { Metadata } from 'next'
import { Search, Plus, Filter, MoreVertical, Shield, UserCheck, UserX } from 'lucide-react'

export const metadata: Metadata = { title: 'Quản lý người dùng' }

const users = [
  { id: 1, name: 'Trần Thị Mai', email: 'mai.tran@email.com', phone: '0901234567', role: 'TENANT', status: 'ACTIVE', joinDate: '10/01/2026', rooms: 1 },
  { id: 2, name: 'Lê Văn Nam', email: 'nam.le@email.com', phone: '0912345678', role: 'TENANT', status: 'ACTIVE', joinDate: '15/01/2026', rooms: 1 },
  { id: 3, name: 'Nguyễn Văn Hùng', email: 'hung.nguyen@email.com', phone: '0923456789', role: 'LANDLORD', status: 'ACTIVE', joinDate: '01/09/2025', rooms: 0 },
  { id: 4, name: 'Phạm Thị Lan', email: 'lan.pham@email.com', phone: '0934567890', role: 'TENANT', status: 'INACTIVE', joinDate: '20/02/2026', rooms: 1 },
  { id: 5, name: 'Võ Minh Tuấn', email: 'tuan.vo@email.com', phone: '0945678901', role: 'TENANT', status: 'BANNED', joinDate: '05/03/2026', rooms: 0 },
]

const roleBadge: Record<string, string> = { ADMIN: 'badge-purple', LANDLORD: 'badge-orange', TENANT: 'badge-blue' }
const roleLabel: Record<string, string> = { ADMIN: 'Quản trị', LANDLORD: 'Chủ trọ', TENANT: 'Người thuê' }
const statusBadge: Record<string, string> = { ACTIVE: 'badge-green', INACTIVE: 'badge-gray', BANNED: 'badge-red' }
const statusLabel: Record<string, string> = { ACTIVE: 'Hoạt động', INACTIVE: 'Không HĐ', BANNED: 'Bị khóa' }

export default function AdminUsersPage() {
  return (
    <div className="animate-fade-in space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý người dùng</h1>
          <p className="page-subtitle">1,248 người dùng đã đăng ký</p>
        </div>
        <button className="btn btn-primary" id="btn-add-user"><Plus className="w-4 h-4" /> Thêm người dùng</button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input id="user-search" type="text" placeholder="Tìm tên, email, SĐT..." className="form-input pl-9" />
          </div>
          <select className="form-select w-40" id="user-role-filter">
            <option value="">Tất cả vai trò</option>
            <option>Quản trị</option><option>Chủ trọ</option><option>Người thuê</option>
          </select>
          <select className="form-select w-40" id="user-status-filter">
            <option value="">Tất cả trạng thái</option>
            <option>Hoạt động</option><option>Không HĐ</option><option>Bị khóa</option>
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
                <th>#</th>
                <th>Họ tên</th>
                <th>Liên hệ</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Ngày tham gia</th>
                <th>Phòng đang thuê</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="text-slate-400 text-xs font-mono">{String(u.id).padStart(3, '0')}</td>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <span className="font-medium text-dark-800">{u.name}</span>
                    </div>
                  </td>
                  <td>
                    <p className="text-sm">{u.email}</p>
                    <p className="text-xs text-slate-400">{u.phone}</p>
                  </td>
                  <td><span className={roleBadge[u.role]}>{roleLabel[u.role]}</span></td>
                  <td><span className={statusBadge[u.status]}>{statusLabel[u.status]}</span></td>
                  <td className="text-slate-500 text-sm">{u.joinDate}</td>
                  <td className="text-center">
                    {u.rooms > 0 ? <span className="badge-blue">{u.rooms} phòng</span> : <span className="text-slate-400 text-xs">—</span>}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button className="btn btn-secondary btn-sm btn-icon" title="Xem chi tiết"><Shield className="w-3.5 h-3.5" /></button>
                      {u.status === 'ACTIVE'
                        ? <button className="btn btn-sm btn-icon text-orange-500 border border-orange-200 hover:bg-orange-50" title="Khóa tài khoản"><UserX className="w-3.5 h-3.5" /></button>
                        : <button className="btn btn-sm btn-icon text-green-500 border border-green-200 hover:bg-green-50" title="Kích hoạt"><UserCheck className="w-3.5 h-3.5" /></button>
                      }
                      <button className="btn btn-secondary btn-sm btn-icon"><MoreVertical className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-dark-100">
          <p className="text-sm text-slate-500">Hiển thị 1–5 trong 1,248 người dùng</p>
          <div className="flex gap-1">
            {[1,2,3,'...',125].map((p, i) => (
              <button key={i} className={`w-8 h-8 rounded-lg text-sm font-medium ${p === 1 ? 'bg-primary-600 text-white' : 'text-slate-500 hover:bg-dark-100'}`}>{p}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
