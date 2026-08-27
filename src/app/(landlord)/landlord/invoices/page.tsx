import type { Metadata } from 'next'
import { Receipt, Plus, Search, Download } from 'lucide-react'

export const metadata: Metadata = { title: 'Quản lý hóa đơn' }

const invoices = [
  { id: 'HD-2026-012', room: 'TP-101', tenant: 'Lê Văn Phúc', month: '8/2026', rent: 4500000, electric: 390000, water: 90000, total: 4980000, due: '10/09/2026', status: 'UNPAID' },
  { id: 'HD-2026-011', room: 'TP-102', tenant: 'Trần Thị Mai', month: '8/2026', rent: 5200000, electric: 480000, water: 120000, total: 5800000, due: '10/09/2026', status: 'PAID' },
  { id: 'HD-2026-010', room: 'TP-301', tenant: 'Nguyễn Văn Long', month: '8/2026', rent: 6500000, electric: 520000, water: 130000, total: 7150000, due: '10/09/2026', status: 'OVERDUE' },
]

const stMap: Record<string, { label: string; cls: string }> = {
  UNPAID: { label: 'Chưa TT', cls: 'badge-yellow' },
  PAID: { label: 'Đã TT', cls: 'badge-green' },
  OVERDUE: { label: 'Quá hạn', cls: 'badge-red' },
}

export default function LandlordInvoicesPage() {
  return (
    <div className="animate-fade-in space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý hóa đơn</h1>
          <p className="page-subtitle">Lập và theo dõi hóa đơn điện nước hàng tháng</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" id="btn-export-invoices"><Download className="w-4 h-4" /> Xuất Excel</button>
          <button className="btn btn-primary" id="btn-create-invoice"><Plus className="w-4 h-4" /> Tạo hóa đơn</button>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input id="invoice-search" type="text" placeholder="Tìm phòng, người thuê..." className="form-input pl-9" />
          </div>
          <select className="form-select w-36" id="invoice-month-filter"><option>T8/2026</option><option>T7/2026</option></select>
          <select className="form-select w-40" id="invoice-status-filter">
            <option>Tất cả</option><option>Chưa TT</option><option>Đã TT</option><option>Quá hạn</option>
          </select>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Mã HĐ</th><th>Phòng</th><th>Người thuê</th><th>Tháng</th>
                <th>Tiền thuê</th><th>Điện + Nước</th><th>Tổng</th><th>Hạn TT</th><th>TT</th><th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const st = stMap[inv.status]
                return (
                  <tr key={inv.id}>
                    <td><code className="text-xs font-mono text-slate-500">{inv.id}</code></td>
                    <td><span className="badge-blue">{inv.room}</span></td>
                    <td className="text-dark-700 font-medium">{inv.tenant}</td>
                    <td className="text-slate-500">{inv.month}</td>
                    <td>{(inv.rent/1000000).toFixed(1)}M</td>
                    <td>{((inv.electric+inv.water)/1000).toFixed(0)}K</td>
                    <td className="font-bold text-dark-900">{(inv.total/1000000).toFixed(2)}M</td>
                    <td className="text-slate-500 text-sm">{inv.due}</td>
                    <td><span className={st.cls}>{st.label}</span></td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-secondary btn-sm text-xs" id={`btn-view-inv-${inv.id}`}>Xem</button>
                        <button className="btn btn-secondary btn-sm text-xs" id={`btn-download-inv-${inv.id}`}><Download className="w-3 h-3" /></button>
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
