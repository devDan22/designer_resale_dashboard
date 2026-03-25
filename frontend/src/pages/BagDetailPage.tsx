import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBag, advanceStage, deletePhoto, setPrimaryPhoto, uploadPhotos, pushToShopify } from '../api/bags.api';
import { assetUrl } from '../lib/urls';
import { useAuthStore } from '../store/authStore';
import { BagStage, BagCondition } from '../types';
import { format } from 'date-fns';
import { useRef } from 'react';

const stageBadge: Record<BagStage, string> = {
  PURCHASED:     'bg-purple-100 text-purple-700',
  AUTHENTICATED: 'bg-blue-100 text-blue-700',
  LISTED:        'bg-amber-100 text-amber-700',
  SOLD:          'bg-green-100 text-green-700',
};

const stageOrder: BagStage[] = ['PURCHASED', 'AUTHENTICATED', 'LISTED', 'SOLD'];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export default function BagDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: bag, isLoading } = useQuery({
    queryKey: ['bag', id],
    queryFn: () => getBag(parseInt(id!)),
  });

  const advanceMut = useMutation({
    mutationFn: () => advanceStage(parseInt(id!)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bag', id] }),
  });

  const deletePicMut = useMutation({
    mutationFn: (photoId: number) => deletePhoto(parseInt(id!), photoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bag', id] }),
  });

  const setPrimaryMut = useMutation({
    mutationFn: (photoId: number) => setPrimaryPhoto(parseInt(id!), photoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bag', id] }),
  });

  const uploadMut = useMutation({
    mutationFn: (files: File[]) => uploadPhotos(parseInt(id!), files),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bag', id] }),
  });

  const shopifyPushMut = useMutation({
    mutationFn: () => pushToShopify(parseInt(id!)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bag', id] }),
  });


  if (isLoading) return <div className="text-gray-400">Loading…</div>;
  if (!bag) return <div className="text-red-500">Bag not found</div>;

  const currentIdx = stageOrder.indexOf(bag.stage);
  const canAdvance =
    currentIdx < stageOrder.length - 1 &&
    (user?.role === 'ADMIN' || user?.role === 'MANAGER' ||
      (user?.role === 'SELLER' && bag.sellerId === user.id));

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER' ||
    (user?.role === 'BUYER' && bag.buyerId === user?.id) ||
    (user?.role === 'SELLER' && bag.sellerId === user?.id);

  const margin = bag.salePrice ? ((bag.salePrice - bag.purchasePrice) / bag.purchasePrice * 100).toFixed(1) : null;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate('/inventory')} className="text-sm text-gray-500 hover:text-gray-700 mb-2">
            ← Back to inventory
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{bag.brand} {bag.model}</h1>
          <p className="text-gray-500">{bag.color}{bag.size ? ` · ${bag.size}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${stageBadge[bag.stage]}`}>
            {bag.stage.charAt(0) + bag.stage.slice(1).toLowerCase()}
          </span>
          {canEdit && (
            <button className="btn-secondary" onClick={() => navigate(`/bags/${id}/edit`)}>Edit</button>
          )}
          {canAdvance && (
            <button
              className="btn-primary"
              disabled={advanceMut.isPending}
              onClick={() => advanceMut.mutate()}
            >
              Advance to {stageOrder[currentIdx + 1].charAt(0) + stageOrder[currentIdx + 1].slice(1).toLowerCase()}
            </button>
          )}
        </div>
      </div>


      {/* Photos */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Photos</h2>
          <button className="btn-secondary text-xs" onClick={() => fileRef.current?.click()}>
            + Add Photos
          </button>
          <input
            type="file"
            ref={fileRef}
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length) uploadMut.mutate(files);
              e.target.value = '';
            }}
          />
        </div>
        {bag.photos.length > 0 ? (
          <div className="flex gap-3 flex-wrap">
            {bag.photos.map((photo) => (
              <div key={photo.id} className="relative group">
                <img
                  src={assetUrl(photo.url)}
                  alt=""
                  className={`w-32 h-32 object-cover rounded-lg border-2 ${photo.isPrimary ? 'border-brand-500' : 'border-gray-200'}`}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center gap-1 transition-opacity">
                  {!photo.isPrimary && (
                    <button
                      className="text-white text-xs bg-black/50 px-2 py-1 rounded hover:bg-black/70"
                      onClick={() => setPrimaryMut.mutate(photo.id)}
                    >⭐</button>
                  )}
                  <button
                    className="text-white text-xs bg-red-500/70 px-2 py-1 rounded hover:bg-red-600/70"
                    onClick={() => deletePicMut.mutate(photo.id)}
                  >✕</button>
                </div>
                {photo.isPrimary && (
                  <span className="absolute top-1 left-1 bg-brand-500 text-white text-xs px-1.5 py-0.5 rounded">Primary</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No photos yet. Click "Add Photos" to upload.</p>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Purchase Info */}
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Purchase Details</h2>
          <Detail label="Condition" value={bag.condition.charAt(0) + bag.condition.slice(1).toLowerCase()} />
          <Detail label="Serial Number" value={bag.serialNumber ?? '—'} />
          <Detail label="Purchase Price" value={fmt(bag.purchasePrice)} />
          <Detail label="Purchase Date" value={format(new Date(bag.purchaseDate), 'MMMM d, yyyy')} />
          <Detail label="Source" value={bag.sourceName} />
          <Detail label="Buyer" value={bag.buyer?.name ?? '—'} />
          {bag.notes && <Detail label="Notes" value={bag.notes} />}
        </div>

        {/* Auth + Listing + Sale */}
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Authentication</h2>
          <Detail label="Status" value={bag.authStatus ? '✅ Authenticated' : '⏳ Pending'} />
          {bag.authNotes && <Detail label="Notes" value={bag.authNotes} />}

          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 pt-2">Listing</h2>
          <Detail label="Listing Price" value={bag.listingPrice ? fmt(bag.listingPrice) : '—'} />
          <Detail label="Platform" value={bag.platform ?? '—'} />
          <Detail label="Seller" value={bag.seller?.name ?? '—'} />

          {bag.stage === 'SOLD' && (
            <>
              <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 pt-2">Sale</h2>
              <Detail label="Sale Price" value={bag.salePrice ? fmt(bag.salePrice) : '—'} />
              <Detail label="Sale Date" value={bag.saleDate ? format(new Date(bag.saleDate), 'MMMM d, yyyy') : '—'} />
              <Detail label="Buyer Name" value={bag.buyerName ?? '—'} />
              {margin && (
                <Detail label="Margin" value={`${margin}% (${fmt((bag.salePrice! - bag.purchasePrice))}`} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Shopify Status */}
      {(bag.stage === 'LISTED' || bag.shopifyProductId) && (user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
        <div className="card flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛍️</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">Shopify</p>
              {bag.shopifyProductId ? (
                <p className="text-xs text-green-600 font-medium">
                  ✓ Listed on Shopify
                  {bag.shopifyProductUrl && (
                    <> · <a href={bag.shopifyProductUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-green-800">View product</a></>
                  )}
                </p>
              ) : (
                <p className="text-xs text-amber-600">Not yet pushed to Shopify</p>
              )}
            </div>
          </div>
          <button
            className="btn-secondary text-xs whitespace-nowrap"
            disabled={shopifyPushMut.isPending}
            onClick={() => shopifyPushMut.mutate()}
          >
            {shopifyPushMut.isPending ? 'Pushing…' : bag.shopifyProductId ? 'Re-push to Shopify' : 'Push to Shopify'}
          </button>
        </div>
      )}

      {/* Pipeline Timeline */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Pipeline History</h2>
        <ol className="relative border-l border-gray-200 space-y-4 ml-3">
          {bag.stageHistory.map((h, i) => (
            <li key={h.id} className="ml-6">
              <span className={`absolute -left-2 flex items-center justify-center w-4 h-4 rounded-full ring-2 ring-white ${
                i === bag.stageHistory.length - 1 ? 'bg-brand-500' : 'bg-gray-300'
              }`} />
              <div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stageBadge[h.toStage as BagStage]}`}>
                  {h.toStage.charAt(0) + h.toStage.slice(1).toLowerCase()}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  {format(new Date(h.changedAt), 'MMM d, yyyy h:mm a')} by {h.changedBy.name}
                </p>
                {h.notes && <p className="text-xs text-gray-600 mt-0.5 italic">"{h.notes}"</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}
