import type { Metadata } from 'next'
import { BarChart3, TrendingUp, PieChart as PieIcon, Download } from 'lucide-react'

export const metadata: Metadata = { title: 'Báo cáo & Phân tích' }

export default function AdminReportsPage() {
  return (
    <div className="animate-fade-in space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Báo cáo & Phân tích</h1>
          <p className="page-subtitle">Tổng quan dữ liệu kinh doanh và hiệu quả hệ thống</p>
        </div>
        <button className="btn btn-primary" id="btn-export-report"><Download className="w-4 h-4" /> Xuất báo cáo</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Doanh thu & Tỷ lệ phòng trống', icon: TrendingUp, desc: 'Biểu đồ doanh thu theo tháng, tỷ lệ lấp đầy phòng theo khu vực', color: 'text-blue-500 bg-blue-50' },
          { title: 'Phân tích khu vực nhu cầu cao', icon: PieIcon, desc: 'Quận/huyện có nhiều lượt tìm kiếm, đặt lịch và chuyển đổi nhất', color: 'text-green-500 bg-green-50' },
          { title: 'Hiệu quả mô-đun gợi ý', icon: BarChart3, desc: 'Tỷ lệ click, đặt lịch từ gợi ý AI, độ chính xác Top-K recommendations', color: 'text-purple-500 bg-purple-50' },
        ].map(r => {
          const Icon = r.icon
          return (
            <div key={r.title} className="card hover:shadow-card-hover transition-shadow cursor-pointer">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${r.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-dark-800 mb-1">{r.title}</h3>
              <p className="text-sm text-slate-500">{r.desc}</p>
            </div>
          )
        })}
      </div>

      {/* Placeholder charts */}
      <div className="card">
        <h2 className="font-semibold text-dark-800 mb-4">Dashboard Thống kê (sẽ tích hợp dữ liệu thật từ DB ở Tuần 7)</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            'Doanh thu theo tháng (Area Chart)',
            'Phân bổ trạng thái phòng (Pie Chart)',
            'Top 10 phòng được quan tâm nhất (Bar Chart)',
            'Tỷ lệ chuyển đổi lịch xem → thuê (Line Chart)',
          ].map(c => (
            <div key={c} className="aspect-video bg-gradient-to-br from-dark-50 to-dark-100 rounded-2xl border border-dark-200 flex items-center justify-center">
              <div className="text-center text-slate-400">
                <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm font-medium">{c}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
