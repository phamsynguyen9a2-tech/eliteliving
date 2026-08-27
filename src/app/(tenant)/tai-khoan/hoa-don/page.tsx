import type { Metadata } from 'next'
import { Receipt, CreditCard, CheckCircle2 } from 'lucide-react'

export const metadata: Metadata = { title: 'Hóa đơn' }

const invoices = [
  { id: 'HD-2026-008', month: '8/2026', room: 'TP-102', rent: 5200000, electric: 480000, water: 120000, total: 5800000, due: '10/09/2026', status: 'UNPAID' },
  { id: 'HD-2026-007', month: '7/2026', room: 'TP-102', rent: 5200000, electric: 420000, water: 105000, total: 5725000, due: '10/08/2026', status: 'PAID' },
  { id: 'HD-2026-006', month: '6/2026', room: 'TP-102', rent: 5200000, electric: 390000, water: 110000, total: 5700000, due: '10/07/2026', status: 'PAID' },
]

const stMap: Record<string, { label: string; cls: string }> = {
  UNPAID: { label: 'Chưa thanh toán', cls: 'badge-orange' },
  PAID: { label: 'Đã thanh toán', cls: 'badge-green' },
  OVERDUE: { label: 'Quá hạn', cls: 'badge-red' },
}

export default function TenantInvoicesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in space-y-5">
      <h1 className="page-title">Hóa đơn của tôi</h1>
      {invoices.map(inv => {
        const st = stMap[inv.status]
        return (
          <div key={inv.id} className={`card ${inv.status === 'UNPAID' ? 'border-orange-200 bg-orange-50/30' : ''}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${inv.status === 'PAID' ? 'bg-green-100' : 'bg-orange-100'}`}>
                  {inv.status === 'PAID' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Receipt className="w-5 h-5 text-orange-600" />}
                </div>
                <div>
                  <p className="font-semibold text-dark-800">Hóa đơn tháng {inv.month}</p>
                  <p className="text-xs text-slate-400">Phòng {inv.room} • Mã: {inv.id}</p>
                </div>
              </div>
              <span className={st.cls}>{st.label}</span>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4 p-4 bg-white rounded-xl border border-dark-100">
              <div><p className="text-xs text-slate-400">Tiền thuê</p><p className="font-semibold text-sm">{(inv.rent/1000000).toFixed(1)}M</p></div>
              <div><p className="text-xs text-slate-400">Tiền điện</p><p className="font-semibold text-sm">{(inv.electric/1000).toFixed(0)}K</p></div>
              <div><p className="text-xs text-slate-400">Tiền nước</p><p className="font-semibold text-sm">{(inv.water/1000).toFixed(0)}K</p></div>
              <div><p className="text-xs text-slate-400">Tổng cộng</p><p className="font-bold text-primary-600">{(inv.total/1000000).toFixed(2)}M</p></div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Hạn thanh toán: <span className="font-medium text-dark-700">{inv.due}</span></p>
              {inv.status === 'UNPAID' && (
                <button id={`btn-pay-${inv.id}`} className="btn btn-primary text-sm flex items-center gap-1">
                  <CreditCard className="w-4 h-4" /> Thanh toán ngay
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
