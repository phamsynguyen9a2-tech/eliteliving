'use client'

import {
  Home, Users, FileText, TrendingUp, DollarSign,
  CalendarDays, AlertCircle, CheckCircle2, Clock, ArrowUpRight
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'



const revenueData = [
  { month: 'T9', revenue: 48000000 },
  { month: 'T10', revenue: 52000000 },
  { month: 'T11', revenue: 49000000 },
  { month: 'T12', revenue: 61000000 },
  { month: 'T1', revenue: 58000000 },
  { month: 'T2', revenue: 65000000 },
]

const roomStatusData = [
  { name: 'Còn trống', value: 12, color: '#22c55e' },
  { name: 'Đang thuê', value: 45, color: '#3b82f6' },
  { name: 'Đặt lịch', value: 8, color: '#f59e0b' },
  { name: 'Giữ chỗ', value: 5, color: '#f97316' },
  { name: 'Bảo trì', value: 3, color: '#94a3b8' },
]

const recentActivities = [
  { icon: CalendarDays, color: 'text-blue-500 bg-blue-50', msg: 'Trần Thị Mai đặt lịch xem Phòng TP.201', time: '5 phút trước' },
  { icon: CheckCircle2, color: 'text-green-500 bg-green-50', msg: 'Hợp đồng HĐ-2026-089 được ký kết', time: '30 phút trước' },
  { icon: DollarSign, color: 'text-emerald-500 bg-emerald-50', msg: 'Hóa đơn tháng 8 – Phòng TP.102 đã thanh toán', time: '1 giờ trước' },
  { icon: AlertCircle, color: 'text-orange-500 bg-orange-50', msg: '3 hóa đơn sắp đến hạn thanh toán', time: '2 giờ trước' },
  { icon: Users, color: 'text-purple-500 bg-purple-50', msg: 'Người dùng mới: Lê Minh Tuấn đăng ký', time: '3 giờ trước' },
]

const statsCards = [
  { label: 'Tổng phòng', value: '73', sub: '+2 tháng này', icon: Home, iconBg: 'bg-blue-100', iconColor: 'text-blue-600', trend: 'up' },
  { label: 'Người dùng', value: '1,248', sub: '+34 tháng này', icon: Users, iconBg: 'bg-purple-100', iconColor: 'text-purple-600', trend: 'up' },
  { label: 'Hợp đồng', value: '45', sub: '3 hết hạn sắp tới', icon: FileText, iconBg: 'bg-green-100', iconColor: 'text-green-600', trend: 'up' },
  { label: 'Doanh thu T8', value: '65M', sub: '+12% so với T7', icon: TrendingUp, iconBg: 'bg-orange-100', iconColor: 'text-orange-600', trend: 'up' },
]

export default function AdminDashboardPage() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Quản trị</h1>
          <p className="page-subtitle">Tổng quan hệ thống – Tháng 8/2026</p>
        </div>
        <div className="flex gap-2">
          <select className="form-select w-40" id="admin-dashboard-period">
            <option>Tháng 8/2026</option>
            <option>Tháng 7/2026</option>
            <option>Quý 3/2026</option>
          </select>
          <button className="btn btn-primary">
            <ArrowUpRight className="w-4 h-4" /> Xuất báo cáo
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statsCards.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="stat-card">
              <div className={`stat-icon ${s.iconBg}`}>
                <Icon className={`w-6 h-6 ${s.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                <p className="text-2xl font-bold text-dark-900 mt-0.5">{s.value}</p>
                <p className="text-xs text-green-600 font-medium mt-0.5 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />{s.sub}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-dark-800">Doanh thu theo tháng</h2>
              <p className="text-xs text-slate-400 mt-0.5">6 tháng gần nhất</p>
            </div>
            <span className="badge-green">+12%</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000000}M`} />
              <Tooltip formatter={(v: number) => [`${(v / 1000000).toFixed(1)}M đ`, 'Doanh thu']} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorRevenue)" dot={{ fill: '#3b82f6', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Room status chart */}
        <div className="card">
          <h2 className="font-semibold text-dark-800 mb-1">Trạng thái phòng</h2>
          <p className="text-xs text-slate-400 mb-4">Tổng 73 phòng</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={roomStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {roomStatusData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v} phòng`]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {roomStatusData.map(s => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                  <span className="text-slate-600">{s.name}</span>
                </div>
                <span className="font-semibold text-dark-800">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activities & top rooms */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Activities */}
        <div className="card">
          <h2 className="font-semibold text-dark-800 mb-4">Hoạt động gần đây</h2>
          <div className="space-y-3">
            {recentActivities.map((a, i) => {
              const Icon = a.icon
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${a.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-dark-700">{a.msg}</p>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{a.time}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Overdue invoices */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-dark-800">Hóa đơn quá hạn</h2>
            <span className="badge-red">3 hóa đơn</span>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Phòng</th>
                  <th>Người thuê</th>
                  <th>Số tiền</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { room: 'TP-102', tenant: 'Trần Thị Mai', amount: '5.5M', days: 5 },
                  { room: 'TP-201', tenant: 'Lê Văn Nam', amount: '4.8M', days: 12 },
                  { room: 'TP-305', tenant: 'Phạm Thị Lan', amount: '6.2M', days: 20 },
                ].map((inv) => (
                  <tr key={inv.room}>
                    <td className="font-medium">{inv.room}</td>
                    <td className="text-slate-600">{inv.tenant}</td>
                    <td className="font-semibold text-dark-800">{inv.amount}</td>
                    <td><span className="badge-red">Quá {inv.days} ngày</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
