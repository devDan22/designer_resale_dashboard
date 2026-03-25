import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { getBag, createBag, updateBag } from '../api/bags.api';
import { getUsers } from '../api/users.api';
import { useAuthStore } from '../store/authStore';

type FormData = {
  brand: string; model: string; color: string; size: string; condition: string;
  serialNumber: string; purchasePrice: string; purchaseDate: string; sourceName: string;
  buyerId: string; authStatus: boolean; authNotes: string; listingPrice: string;
  platform: string; sellerId: string; salePrice: string; saleDate: string; buyerName: string; notes: string;
};

export default function BagFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data: bag } = useQuery({
    queryKey: ['bag', id],
    queryFn: () => getBag(parseInt(id!)),
    enabled: isEdit,
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: user?.role === 'ADMIN' || user?.role === 'MANAGER',
  });

  const buyers = users?.filter((u) => u.role === 'BUYER' && u.isActive) ?? [];
  const sellers = users?.filter((u) => u.role === 'SELLER' && u.isActive) ?? [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();

  useEffect(() => {
    if (bag) {
      reset({
        brand: bag.brand, model: bag.model, color: bag.color, size: bag.size ?? '',
        condition: bag.condition, serialNumber: bag.serialNumber ?? '',
        purchasePrice: String(bag.purchasePrice),
        purchaseDate: bag.purchaseDate.split('T')[0],
        sourceName: bag.sourceName,
        buyerId: String(bag.buyerId ?? ''),
        authStatus: bag.authStatus, authNotes: bag.authNotes ?? '',
        listingPrice: String(bag.listingPrice ?? ''),
        platform: bag.platform ?? '', sellerId: String(bag.sellerId ?? ''),
        salePrice: String(bag.salePrice ?? ''),
        saleDate: bag.saleDate ? bag.saleDate.split('T')[0] : '',
        buyerName: bag.buyerName ?? '', notes: bag.notes ?? '',
      });
    }
  }, [bag, reset]);

  const createMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => createBag(data),
    onSuccess: (bag) => { qc.invalidateQueries({ queryKey: ['bags'] }); navigate(`/bags/${bag.id}`); },
  });

  const updateMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => updateBag(parseInt(id!), data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bags'] }); qc.invalidateQueries({ queryKey: ['bag', id] }); navigate(`/bags/${id}`); },
  });

  const onSubmit = (data: FormData) => {
    const payload: Record<string, unknown> = {
      brand: data.brand, model: data.model, color: data.color,
      size: data.size || undefined, condition: data.condition,
      serialNumber: data.serialNumber || undefined,
      purchasePrice: data.purchasePrice, purchaseDate: data.purchaseDate,
      sourceName: data.sourceName,
      notes: data.notes || undefined,
    };
    if (data.buyerId) payload.buyerId = data.buyerId;
    if (['ADMIN', 'MANAGER'].includes(user?.role ?? '')) {
      payload.authStatus = data.authStatus;
      payload.authNotes = data.authNotes || undefined;
    }
    if (['ADMIN', 'MANAGER', 'SELLER'].includes(user?.role ?? '')) {
      payload.listingPrice = data.listingPrice || undefined;
      payload.platform = data.platform || undefined;
      if (data.sellerId) payload.sellerId = data.sellerId;
      payload.salePrice = data.salePrice || undefined;
      payload.saleDate = data.saleDate || undefined;
      payload.buyerName = data.buyerName || undefined;
    }
    isEdit ? updateMut.mutate(payload) : createMut.mutate(payload);
  };

  const isPending = createMut.isPending || updateMut.isPending;
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canSeeSaleFields = isAdminOrManager || user?.role === 'SELLER';

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 mb-2">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Bag' : 'Add New Bag'}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Identity */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Bag Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Brand *</label>
              <input className="input" {...register('brand', { required: true })} placeholder="Chanel" />
              {errors.brand && <p className="text-xs text-red-500 mt-1">Required</p>}
            </div>
            <div>
              <label className="label">Model *</label>
              <input className="input" {...register('model', { required: true })} placeholder="Classic Flap" />
              {errors.model && <p className="text-xs text-red-500 mt-1">Required</p>}
            </div>
            <div>
              <label className="label">Color *</label>
              <input className="input" {...register('color', { required: true })} placeholder="Black" />
              {errors.color && <p className="text-xs text-red-500 mt-1">Required</p>}
            </div>
            <div>
              <label className="label">Size</label>
              <input className="input" {...register('size')} placeholder="Medium" />
            </div>
            <div>
              <label className="label">Condition *</label>
              <select className="input" {...register('condition', { required: true })}>
                <option value="">Select…</option>
                <option value="NEW">New</option>
                <option value="EXCELLENT">Excellent</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
              </select>
              {errors.condition && <p className="text-xs text-red-500 mt-1">Required</p>}
            </div>
            <div>
              <label className="label">Serial Number</label>
              <input className="input" {...register('serialNumber')} placeholder="Optional" />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input h-20 resize-none" {...register('notes')} placeholder="Any additional notes…" />
          </div>
        </div>

        {/* Purchase */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Purchase Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Purchase Price *</label>
              <input className="input" type="number" step="0.01" {...register('purchasePrice', { required: true })} placeholder="0.00" />
              {errors.purchasePrice && <p className="text-xs text-red-500 mt-1">Required</p>}
            </div>
            <div>
              <label className="label">Purchase Date *</label>
              <input className="input" type="date" {...register('purchaseDate', { required: true })} />
              {errors.purchaseDate && <p className="text-xs text-red-500 mt-1">Required</p>}
            </div>
            <div>
              <label className="label">Source / Seller *</label>
              <input className="input" {...register('sourceName', { required: true })} placeholder="eBay, consignment, etc." />
              {errors.sourceName && <p className="text-xs text-red-500 mt-1">Required</p>}
            </div>
            {isAdminOrManager && buyers.length > 0 && (
              <div>
                <label className="label">Assign Buyer</label>
                <select className="input" {...register('buyerId')}>
                  <option value="">— Unassigned —</option>
                  {buyers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Auth — Admin/Manager only */}
        {isAdminOrManager && (
          <div className="card space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Authentication</h2>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="authStatus" {...register('authStatus')} className="rounded border-gray-300 text-brand-600" />
              <label htmlFor="authStatus" className="text-sm text-gray-700">Authenticated</label>
            </div>
            <div>
              <label className="label">Auth Notes</label>
              <textarea className="input h-16 resize-none" {...register('authNotes')} placeholder="Authentication notes…" />
            </div>
          </div>
        )}

        {/* Listing + Sale */}
        {canSeeSaleFields && (
          <div className="card space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Listing & Sale</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Listing Price</label>
                <input className="input" type="number" step="0.01" {...register('listingPrice')} placeholder="0.00" />
              </div>
              <div>
                <label className="label">Platform</label>
                <input className="input" {...register('platform')} placeholder="eBay, Vestiaire, etc." />
              </div>
              {isAdminOrManager && sellers.length > 0 && (
                <div>
                  <label className="label">Assign Seller</label>
                  <select className="input" {...register('sellerId')}>
                    <option value="">— Unassigned —</option>
                    {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Sale Price</label>
                <input className="input" type="number" step="0.01" {...register('salePrice')} placeholder="0.00" />
              </div>
              <div>
                <label className="label">Sale Date</label>
                <input className="input" type="date" {...register('saleDate')} />
              </div>
              <div>
                <label className="label">Buyer Name</label>
                <input className="input" {...register('buyerName')} placeholder="Customer name" />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={isPending}>
            {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Bag'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
