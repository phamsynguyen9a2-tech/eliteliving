import type { Metadata } from 'next'
import { FileText, Download, ChevronRight } from 'lucide-react'

export const metadata: Metadata = { title: 'Hợp đồng' }

const contracts = [
  { id: 'HĐ-2026-089', room: 'TP-102', area: 'Khu trọ Tân Phú', start: '01/06/2026', end: '31/05/2027', rent: 5200000, status: 'ACTIVE', tenant: 'Trần Thị Mai' },
]

const stMap: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'Đang hiệu lực', cls: 'badge-blue' },
  PENDING: { label: 'Chờ ký', cls: 'badge-yellow' },
  EXPIRED: { label: 'Hết hạn', cls: 'badge-gray' },
  TERMINATED: { label: 'Chấm dứt', cls: 'badge-red' },
}

export default function TenantContractsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in space-y-5">
      <h1 className="page-title">Hợp đồng của tôi</h1>
      {contracts.map(c => {
        const st = stMap[c.status]
        return (
          <div key={c.id} className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-primary-500" />
                  <code className="font-mono text-sm font-semibold text-dark-800">{c.id}</code>
                </div>
                <p className="text-slate-500 text-sm">Phòng {c.room} – {c.area}</p>
              </div>
              <span className={st.cls}>{st.label}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-dark-50 rounded-xl">
              <div><p className="text-xs text-slate-400">Bắt đầu</p><p className="font-semibold text-sm">{c.start}</p></div>
              <div><p className="text-xs text-slate-400">Kết thúc</p><p className="font-semibold text-sm">{c.end}</p></div>
              <div><p className="text-xs text-slate-400">Tiền thuê</p><p className="font-semibold text-sm text-primary-600">{(c.rent/1000000).toFixed(1)}M/tháng</p></div>
            </div>
            <div className="flex gap-2">
              <button id={`btn-view-contract-${c.id}`} className="btn btn-secondary text-sm flex items-center gap-1">
                <ChevronRight className="w-4 h-4" /> Xem chi tiết
              </button>
              <button id={`btn-download-contract-${c.id}`} className="btn btn-secondary text-sm flex items-center gap-1">
                <Download className="w-4 h-4" /> Tải PDF
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
