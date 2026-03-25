import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getBags } from '../api/bags.api';
import { useAuthStore } from '../store/authStore';
import { assetUrl } from '../lib/urls';
import { BagStage, BagCondition } from '../types';
import { format } from 'date-fns';

const stageBadge: Record<BagStage, string> = {
  PURCHASED:     'bg-purple-100 text-purple-700',
  AUTHENTICATED: 'bg-blue-100 text-blue-700',
  LISTED:        'bg-amber-100 text-amber-700',
  SOLD:          'bg-green-100 text-green-700',
};

const conditionBadge: Record<BagCondition, string> = {
  NEW:       'bg-emerald-100 text-emerald-700',
  EXCELLENT: 'bg-sky-100 text-sky-700',
  GOOD:      'bg-yellow-100 text-yellow-700',
  FAIR:      'bg-red-100 text-red-700',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export default function InventoryPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [condition, setCondition] = useState('');
  // 'all' | 'mine' | 'sold' — seller-specific view tabs
  const [sellerView, setSellerView] = useState<'all' | 'mine' | 'sold'>('all');

  const isSeller = user?.role === 'SELLER';

  const params = {
    page,
    limit: 25,
    ...(search && { search }),
    ...(stage && { stage }),
    ...(condition && { condition }),
    ...(isSeller && sellerView === 'mine' && { mine: 'true' }),
    ...(isSeller && sellerView === 'sold' && { mine: 'true', stage: 'SOLD' }),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['bags', params],
    queryFn: () => getBags(params),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        {(user?.role === 'ADMIN' || user?.role === 'BUYER') && (
          <button className="btn-primary" onClick={() => navigate('/bags/new')}>
            + Add Bag
          </button>
        )}
      </div>

      {/* Seller view tabs */}
      {isSeller && (
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {(['all', 'mine', 'sold'] as const).map((v) => (
            <button
              key={v}
              onClick={() => { setSellerView(v); setPage(1); setStage(''); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                sellerView === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {v === 'all' ? 'All Inventory' : v === 'mine' ? 'My Bags' : 'My Sales'}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          className="input w-64"
          placeholder="Search brand, model, serial…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select className="input w-40" value={stage} onChange={(e) => { setStage(e.target.value); setPage(1); }}>
          <option value="">All Stages</option>
          {['PURCHASED', 'AUTHENTICATED', 'LISTED', 'SOLD'].map((s) => (
            <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
          ))}
        </select>
        <select className="input w-40" value={condition} onChange={(e) => { setCondition(e.target.value); setPage(1); }}>
          <option value="">All Conditions</option>
          {['NEW', 'EXCELLENT', 'GOOD', 'FAIR'].map((c) => (
            <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
          ))}
        </select>
        {(search || stage || condition) && (
          <button className="btn-secondary text-xs" onClick={() => { setSearch(''); setStage(''); setCondition(''); setPage(1); }}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Photo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Brand / Model</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Condition</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Stage</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Cost</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">List Price</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Sale Price</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Purchased</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Buyer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.bags.map((bag) => (
                <tr
                  key={bag.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/bags/${bag.id}`)}
                >
                  <td className="px-4 py-3">
                    {bag.photos?.[0] ? (
                      <img src={assetUrl(bag.photos[0].url)} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg">👜</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{bag.brand}</p>
                    <p className="text-gray-500 text-xs">{bag.model} {bag.color && `· ${bag.color}`}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${conditionBadge[bag.condition]}`}>
                      {bag.condition.charAt(0) + bag.condition.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stageBadge[bag.stage]}`}>
                      {bag.stage.charAt(0) + bag.stage.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmt(bag.purchasePrice)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{bag.listingPrice ? fmt(bag.listingPrice) : '—'}</td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium">{bag.salePrice ? fmt(bag.salePrice) : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(bag.purchaseDate), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{bag.buyer?.name ?? '—'}</td>
                </tr>
              ))}
              {data?.bags.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-gray-400">No bags found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Showing {((page - 1) * 25) + 1}–{Math.min(page * 25, data.total)} of {data.total}</span>
          <div className="flex gap-2">
            <button className="btn-secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button className="btn-secondary" disabled={page === data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
