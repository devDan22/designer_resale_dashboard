import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getUserProfile } from '../api/users.api';
import { getBags } from '../api/bags.api';
import { BagStage, BagCondition, Role } from '../types';
import { format } from 'date-fns';
import { assetUrl } from '../lib/urls';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

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

const roleColors: Record<Role, string> = {
  ADMIN:   'bg-purple-100 text-purple-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  BUYER:   'bg-green-100 text-green-700',
  SELLER:  'bg-amber-100 text-amber-700',
};

type BuyTab = 'all' | 'active' | 'sold';
type SellTab = 'sold';

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userId = parseInt(id!);

  const [buyPage, setBuyPage] = useState(1);
  const [sellPage, setSellPage] = useState(1);
  const [buyFilter, setBuyFilter] = useState<BuyTab>('all');

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => getUserProfile(userId),
  });

  // Buyer bags
  const buyStageFilter = buyFilter === 'active' ? undefined : buyFilter === 'sold' ? 'SOLD' : undefined;
  const { data: buyBags, isLoading: buyLoading } = useQuery({
    queryKey: ['bags', 'buyer', userId, buyPage, buyFilter],
    queryFn: () => getBags({ buyerId: userId, limit: 20, page: buyPage, ...(buyStageFilter ? { stage: buyStageFilter } : {}), ...( buyFilter === 'active' ? {} : {}) }),
    enabled: !!profile && (profile.role === 'BUYER' || profile.role === 'ADMIN' || profile.role === 'MANAGER'),
  });

  // Seller bags
  const { data: sellBags, isLoading: sellLoading } = useQuery({
    queryKey: ['bags', 'seller', userId, sellPage],
    queryFn: () => getBags({ sellerId: userId, stage: 'SOLD', limit: 20, page: sellPage }),
    enabled: !!profile && (profile.role === 'SELLER' || profile.role === 'ADMIN' || profile.role === 'MANAGER'),
  });

  if (profileLoading) return <div className="text-gray-400">Loading…</div>;
  if (!profile) return <div className="text-red-500">User not found</div>;

  const isBuyer  = profile.role === 'BUYER';
  const isSeller = profile.role === 'SELLER';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <button onClick={() => navigate('/users')} className="text-sm text-gray-500 hover:text-gray-700 mb-3">
          ← Back to users
        </button>

        <div className="card flex items-start justify-between gap-4">
          {/* Avatar + info */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-2xl font-bold text-brand-700 flex-shrink-0">
              {profile.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{profile.name}</h1>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleColors[profile.role as Role]}`}>
                  {profile.role}
                </span>
                {!profile.isActive && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{profile.email}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Member since {format(new Date(profile.createdAt), 'MMMM yyyy')}
              </p>
            </div>
          </div>

          {/* Role-specific KPIs */}
          <div className="flex gap-6 flex-wrap">
            {isBuyer && (
              <>
                <Stat label="Total Bought"   value={profile.totalBought.toLocaleString()} />
                <Stat label="Active in Pipeline" value={profile.activeBags.toString()} accent="amber" />
                <Stat label="Total Spend"    value={fmt(profile.totalSpend)} />
                <Stat label="Avg Cost"       value={profile.totalBought > 0 ? fmt(profile.totalSpend / profile.totalBought) : '—'} />
              </>
            )}
            {isSeller && (
              <>
                <Stat label="Total Sold"     value={profile.totalSold.toLocaleString()} />
                <Stat label="Total Revenue"  value={fmt(profile.totalRevenue)} />
                <Stat label="Total Profit"   value={fmt(profile.totalProfit)} accent="green" />
                <Stat label="Avg Margin"     value={profile.totalSold > 0 ? `${profile.avgMargin}%` : '—'} accent="green" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Buyer: purchased bags ──────────────────────────────────────────── */}
      {isBuyer && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-semibold text-gray-900">Purchase History</h2>
            {/* Filter pills */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {(['all', 'active', 'sold'] as BuyTab[]).map((f) => (
                <button
                  key={f}
                  onClick={() => { setBuyFilter(f); setBuyPage(1); }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${buyFilter === f ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Sold'}
                </button>
              ))}
            </div>
          </div>

          <BagTable
            bags={buyBags?.bags ?? []}
            loading={buyLoading}
            mode="buy"
            page={buyPage}
            totalPages={buyBags?.totalPages ?? 1}
            total={buyBags?.total ?? 0}
            onPage={setBuyPage}
            onRowClick={(bagId) => navigate(`/bags/${bagId}`)}
          />
        </div>
      )}

      {/* ── Seller: sold bags ──────────────────────────────────────────────── */}
      {isSeller && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Sales History</h2>
          <BagTable
            bags={sellBags?.bags ?? []}
            loading={sellLoading}
            mode="sell"
            page={sellPage}
            totalPages={sellBags?.totalPages ?? 1}
            total={sellBags?.total ?? 0}
            onPage={setSellPage}
            onRowClick={(bagId) => navigate(`/bags/${bagId}`)}
          />
        </div>
      )}

      {/* Admin / Manager — no bags directly attributed */}
      {!isBuyer && !isSeller && (
        <div className="card text-center py-10">
          <p className="text-gray-400 text-sm">
            {profile.role === 'ADMIN' || profile.role === 'MANAGER'
              ? 'Admins and managers oversee the full pipeline but are not directly assigned as buyers or sellers.'
              : 'No activity to display.'}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Stat({ label, value, accent }: { label: string; value: string; accent?: 'green' | 'amber' }) {
  const color = accent === 'green' ? 'text-green-600' : accent === 'amber' ? 'text-amber-600' : 'text-gray-900';
  return (
    <div className="text-right">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

interface BagRow {
  id: number;
  brand: string;
  model: string;
  color: string;
  condition: BagCondition;
  stage: BagStage;
  purchasePrice: number;
  purchaseDate: string;
  listingPrice: number | null;
  salePrice: number | null;
  saleDate: string | null;
  photos: { url: string; isPrimary: boolean }[];
}

function BagTable({
  bags, loading, mode, page, totalPages, total, onPage, onRowClick,
}: {
  bags: BagRow[];
  loading: boolean;
  mode: 'buy' | 'sell';
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
  onRowClick: (id: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Bag</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Condition</th>
                {mode === 'buy' && <th className="text-left px-4 py-3 font-medium text-gray-600">Stage</th>}
                <th className="text-right px-4 py-3 font-medium text-gray-600">Cost</th>
                {mode === 'sell' && <th className="text-right px-4 py-3 font-medium text-gray-600">Sale Price</th>}
                {mode === 'sell' && <th className="text-right px-4 py-3 font-medium text-gray-600">Profit</th>}
                {mode === 'sell' && <th className="text-right px-4 py-3 font-medium text-gray-600">Margin</th>}
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  {mode === 'buy' ? 'Purchased' : 'Sold'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bags.map((bag) => {
                const profit = bag.salePrice != null ? bag.salePrice - bag.purchasePrice : null;
                const margin = profit != null && bag.purchasePrice > 0
                  ? ((profit / bag.purchasePrice) * 100).toFixed(1)
                  : null;
                const primary = bag.photos?.find((p) => p.isPrimary) ?? bag.photos?.[0];

                return (
                  <tr
                    key={bag.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onRowClick(bag.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {primary ? (
                          <img src={assetUrl(primary.url)} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" alt="" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-base flex-shrink-0">👜</div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{bag.brand}</p>
                          <p className="text-xs text-gray-400">{bag.model} · {bag.color}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${conditionBadge[bag.condition]}`}>
                        {bag.condition.charAt(0) + bag.condition.slice(1).toLowerCase()}
                      </span>
                    </td>
                    {mode === 'buy' && (
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stageBadge[bag.stage]}`}>
                          {bag.stage.charAt(0) + bag.stage.slice(1).toLowerCase()}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-right text-gray-700">{fmt(bag.purchasePrice)}</td>
                    {mode === 'sell' && (
                      <td className="px-4 py-3 text-right text-gray-700">
                        {bag.salePrice != null ? fmt(bag.salePrice) : '—'}
                      </td>
                    )}
                    {mode === 'sell' && (
                      <td className={`px-4 py-3 text-right font-medium ${profit != null && profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {profit != null ? fmt(profit) : '—'}
                      </td>
                    )}
                    {mode === 'sell' && (
                      <td className="px-4 py-3 text-right text-gray-500">
                        {margin != null ? `${margin}%` : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {mode === 'buy'
                        ? format(new Date(bag.purchaseDate), 'MMM d, yyyy')
                        : bag.saleDate ? format(new Date(bag.saleDate), 'MMM d, yyyy') : '—'}
                    </td>
                  </tr>
                );
              })}
              {bags.length === 0 && !loading && (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">No records found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{total.toLocaleString()} total</span>
          <div className="flex gap-2">
            <button className="btn-secondary" disabled={page === 1} onClick={() => onPage(page - 1)}>Previous</button>
            <span className="px-3 py-2 text-xs">{page} / {totalPages}</span>
            <button className="btn-secondary" disabled={page === totalPages} onClick={() => onPage(page + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
