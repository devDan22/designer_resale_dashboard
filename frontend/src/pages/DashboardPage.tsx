import { useQuery } from '@tanstack/react-query';
import { getKpis } from '../api/dashboard.api';
import { getProfitLoss } from '../api/reports.api';
import { getUserActivity } from '../api/users.api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BagStage } from '../types';
import { useNavigate } from 'react-router-dom';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const stageConfig: Record<BagStage, { label: string; color: string; bg: string }> = {
  PURCHASED:     { label: 'Purchased',    color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  AUTHENTICATED: { label: 'Authenticated', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  LISTED:        { label: 'Listed',       color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  SOLD:          { label: 'Sold',         color: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: kpis, isLoading } = useQuery({ queryKey: ['kpis'], queryFn: getKpis });
  const { data: pl } = useQuery({ queryKey: ['profit-loss'], queryFn: () => getProfitLoss() });
  const { data: activity } = useQuery({ queryKey: ['users-activity'], queryFn: getUserActivity });

  const topBuyers  = activity?.filter((u) => u.role === 'BUYER' && u.isActive).sort((a, b) => b.totalBought - a.totalBought).slice(0, 5) ?? [];
  const topSellers = activity?.filter((u) => u.role === 'SELLER' && u.isActive).sort((a, b) => b.totalProfit - a.totalProfit).slice(0, 5) ?? [];

  if (isLoading) return <div className="text-gray-500">Loading dashboard…</div>;
  if (!kpis) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Inventory Value</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(kpis.totalInventoryValue)}</p>
          <p className="text-xs text-gray-400 mt-1">unsold bags at cost</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide">This Month P&L</p>
          <p className={`text-2xl font-bold mt-1 ${kpis.monthlyProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {fmt(kpis.monthlyProfitLoss)}
          </p>
          <p className="text-xs text-gray-400 mt-1">vs {fmt(kpis.lastMonthProfitLoss)} last month</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Margin</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{kpis.avgMarginPercent}%</p>
          <p className="text-xs text-gray-400 mt-1">on bags sold this month</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Bags Sold (Month)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{kpis.totalBagsThisMonth}</p>
          <p className="text-xs text-gray-400 mt-1">completed sales</p>
        </div>
      </div>

      {/* Stage Breakdown */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Pipeline Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.keys(stageConfig) as BagStage[]).map((stage) => {
            const cfg = stageConfig[stage];
            const count = kpis.bagsByStage[stage] ?? 0;
            return (
              <div key={stage} className={`rounded-lg border p-4 ${cfg.bg}`}>
                <p className={`text-2xl font-bold ${cfg.color}`}>{count}</p>
                <p className={`text-xs font-medium mt-1 ${cfg.color}`}>{cfg.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Profit Chart */}
      {pl && pl.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Profit & Loss — Last 12 Months</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={pl}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" name="Revenue" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="cost" stroke="#f87171" name="Cost" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="profit" stroke="#10b981" name="Profit" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Team Activity */}
      {(topBuyers.length > 0 || topSellers.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Buyers */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Top Buyers</h2>
              <button onClick={() => navigate('/users')} className="text-xs text-brand-600 hover:underline">View all →</button>
            </div>
            <div className="space-y-2">
              {topBuyers.map((u, i) => (
                <div key={u.id} className="flex items-center gap-3">
                  <span className="w-5 text-xs text-gray-400 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <button className="text-sm font-medium text-brand-700 hover:underline truncate" onClick={() => navigate(`/users/${u.id}`)}>{u.name}</button>
                      <span className="text-sm font-bold text-gray-900 ml-2">{u.totalBought.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <div className="h-1.5 flex-1 bg-gray-100 rounded-full mr-3">
                        <div
                          className="h-1.5 bg-green-400 rounded-full"
                          style={{ width: `${Math.min(100, (u.totalBought / (topBuyers[0]?.totalBought || 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{fmt(u.totalSpend)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Sellers */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Top Sellers</h2>
              <button onClick={() => navigate('/users')} className="text-xs text-brand-600 hover:underline">View all →</button>
            </div>
            <div className="space-y-2">
              {topSellers.map((u, i) => (
                <div key={u.id} className="flex items-center gap-3">
                  <span className="w-5 text-xs text-gray-400 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <button className="text-sm font-medium text-brand-700 hover:underline truncate" onClick={() => navigate(`/users/${u.id}`)}>{u.name}</button>
                      <span className="text-sm font-bold text-green-600 ml-2">{fmt(u.totalProfit)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <div className="h-1.5 flex-1 bg-gray-100 rounded-full mr-3">
                        <div
                          className="h-1.5 bg-brand-400 rounded-full"
                          style={{ width: `${Math.min(100, (u.totalProfit / (topSellers[0]?.totalProfit || 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{u.totalSold} sold · {u.avgMargin}% margin</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
