import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProfitLoss, getInventoryByBrand, getSalesVelocity, getBuyVsSell } from '../api/reports.api';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import Papa from 'papaparse';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

const tabs = ['Profit & Loss', 'Inventory by Brand', 'Sales Velocity', 'Buy vs Sell'] as const;
type Tab = typeof tabs[number];

function exportCsv(data: Record<string, unknown>[], filename: string) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('Profit & Loss');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: pl } = useQuery({ queryKey: ['pl', from, to], queryFn: () => getProfitLoss(from, to), enabled: tab === 'Profit & Loss' });
  const { data: inv } = useQuery({ queryKey: ['inv-brand'], queryFn: getInventoryByBrand, enabled: tab === 'Inventory by Brand' });
  const { data: vel } = useQuery({ queryKey: ['velocity', from, to], queryFn: () => getSalesVelocity(from, to), enabled: tab === 'Sales Velocity' });
  const { data: bvs } = useQuery({ queryKey: ['buy-vs-sell'], queryFn: getBuyVsSell, enabled: tab === 'Buy vs Sell' });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Date range (for applicable tabs) */}
      {(tab === 'Profit & Loss' || tab === 'Sales Velocity') && (
        <div className="flex gap-3 items-center">
          <input type="date" className="input w-40 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-gray-400">to</span>
          <input type="date" className="input w-40 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      )}

      {/* P&L */}
      {tab === 'Profit & Loss' && pl && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Profit & Loss by Month</h2>
            <button className="btn-secondary text-xs" onClick={() => exportCsv(pl, 'profit-loss.csv')}>Export CSV</button>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={pl}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Line dataKey="revenue" stroke="#8b5cf6" name="Revenue" strokeWidth={2} dot={false} />
              <Line dataKey="cost" stroke="#f87171" name="Cost" strokeWidth={2} dot={false} />
              <Line dataKey="profit" stroke="#10b981" name="Profit" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          {/* Summary table */}
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500 border-b">
              <th className="pb-2">Month</th><th className="pb-2 text-right">Revenue</th>
              <th className="pb-2 text-right">Cost</th><th className="pb-2 text-right">Profit</th>
              <th className="pb-2 text-right">Units</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {pl.map((r: Record<string, unknown>) => (
                <tr key={r.month as string}>
                  <td className="py-1.5 text-gray-600">{r.month as string}</td>
                  <td className="py-1.5 text-right text-gray-700">{fmt(r.revenue as number)}</td>
                  <td className="py-1.5 text-right text-gray-500">{fmt(r.cost as number)}</td>
                  <td className={`py-1.5 text-right font-medium ${(r.profit as number) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(r.profit as number)}</td>
                  <td className="py-1.5 text-right text-gray-400">{r.count as number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inventory by Brand */}
      {tab === 'Inventory by Brand' && inv && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Active Inventory by Brand</h2>
            <button className="btn-secondary text-xs" onClick={() => exportCsv(inv, 'inventory-by-brand.csv')}>Export CSV</button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={inv} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis dataKey="brand" type="category" width={100} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="value" name="Inventory Value" radius={[0, 4, 4, 0]}>
                {inv.map((_: unknown, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sales Velocity */}
      {tab === 'Sales Velocity' && vel && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Avg Days to Sell by Brand</h2>
            <button className="btn-secondary text-xs" onClick={() => exportCsv(vel, 'sales-velocity.csv')}>Export CSV</button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vel} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} label={{ value: 'Days', position: 'insideBottom', offset: -5 }} />
              <YAxis dataKey="brand" type="category" width={100} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v} days`, 'Avg Days to Sell']} />
              <Bar dataKey="avgDaysToSell" name="Avg Days" radius={[0, 4, 4, 0]}>
                {vel.map((_: unknown, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Buy vs Sell */}
      {tab === 'Buy vs Sell' && bvs && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Avg Buy vs Sell Price by Brand</h2>
            <button className="btn-secondary text-xs" onClick={() => exportCsv(bvs, 'buy-vs-sell.csv')}>Export CSV</button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bvs}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="brand" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Bar dataKey="avgBuyPrice" name="Avg Buy Price" fill="#f87171" radius={[4, 4, 0, 0]} />
              <Bar dataKey="avgSellPrice" name="Avg Sell Price" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500 border-b">
              <th className="pb-2">Brand</th><th className="pb-2 text-right">Avg Buy</th>
              <th className="pb-2 text-right">Avg Sell</th><th className="pb-2 text-right">Avg Margin</th>
              <th className="pb-2 text-right">Sales</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {bvs.map((r: Record<string, unknown>) => (
                <tr key={r.brand as string}>
                  <td className="py-1.5 text-gray-700 font-medium">{r.brand as string}</td>
                  <td className="py-1.5 text-right text-gray-500">{fmt(r.avgBuyPrice as number)}</td>
                  <td className="py-1.5 text-right text-gray-700">{fmt(r.avgSellPrice as number)}</td>
                  <td className="py-1.5 text-right text-green-600 font-medium">{r.avgMargin as number}%</td>
                  <td className="py-1.5 text-right text-gray-400">{r.count as number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
