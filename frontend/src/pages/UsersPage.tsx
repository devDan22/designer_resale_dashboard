import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getUsers, createUser, updateUser, deactivateUser, getUserActivity } from '../api/users.api';
import { User, Role, ManagerType, UserActivity } from '../types';
import { format } from 'date-fns';

const roleColors: Record<Role, string> = {
  ADMIN:   'bg-purple-100 text-purple-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  BUYER:   'bg-green-100 text-green-700',
  SELLER:  'bg-amber-100 text-amber-700',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

type FormState = { name: string; email: string; role: string; managerType: string; password: string };
const empty: FormState = { name: '', email: '', role: 'BUYER', managerType: '', password: '' };

type Tab = 'team' | 'manage';

export default function UsersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('team');

  const { data: users, isLoading: usersLoading } = useQuery({ queryKey: ['users'], queryFn: getUsers });
  const { data: activity, isLoading: activityLoading } = useQuery({ queryKey: ['users-activity'], queryFn: getUserActivity });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState('');

  // Role-change modal state
  const [roleTarget, setRoleTarget] = useState<User | null>(null);
  const [roleForm, setRoleForm] = useState<{ role: string; managerType: string }>({ role: '', managerType: '' });
  const [roleError, setRoleError] = useState('');

  const roleMut = useMutation({
    mutationFn: () => updateUser(roleTarget!.id, {
      role: roleForm.role as Role,
      managerType: roleForm.role === 'MANAGER' && roleForm.managerType ? roleForm.managerType as ManagerType : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users-activity'] });
      setRoleTarget(null);
    },
    onError: (e: Error) => setRoleError(e.message),
  });

  const openRoleChange = (user: User) => {
    setRoleTarget(user);
    setRoleForm({ role: user.role, managerType: user.managerType ?? '' });
    setRoleError('');
  };

  const createMut = useMutation({
    mutationFn: () => createUser({ ...form, role: form.role as Role, managerType: form.role === 'MANAGER' && form.managerType ? form.managerType as ManagerType : undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users-activity'] });
      setShowForm(false); setForm(empty);
    },
    onError: (e: Error) => setError(e.message),
  });

  const updateMut = useMutation({
    mutationFn: () => updateUser(editing!.id, {
      name: form.name,
      role: form.role as Role,
      managerType: form.role === 'MANAGER' && form.managerType ? form.managerType as ManagerType : undefined,
      ...(form.password ? { password: form.password } : {}),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users-activity'] });
      setEditing(null); setForm(empty);
    },
    onError: (e: Error) => setError(e.message),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: number) => deactivateUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users-activity'] });
    },
  });

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({ name: user.name, email: user.email, role: user.role, managerType: user.managerType ?? '', password: '' });
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    editing ? updateMut.mutate() : createMut.mutate();
  };

  const buyers  = activity?.filter((u) => u.role === 'BUYER')  ?? [];
  const sellers = activity?.filter((u) => u.role === 'SELLER') ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <button className="btn-primary" onClick={() => { setShowForm(true); setEditing(null); setForm(empty); }}>
          + Add User
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {([['team', 'Team Activity'], ['manage', 'Manage Users']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Team Activity ─────────────────────────────────────────────────── */}
      {tab === 'team' && (
        <div className="space-y-6">
          {activityLoading ? (
            <div className="text-gray-400 p-4">Loading activity…</div>
          ) : (
            <>
              {/* Buyers */}
              <div className="card">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Buyers — Purchase Activity</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                      <th className="pb-2 font-medium">Name</th>
                      <th className="pb-2 font-medium text-right">Bags Bought</th>
                      <th className="pb-2 font-medium text-right">Active in Pipeline</th>
                      <th className="pb-2 font-medium text-right">Total Spend</th>
                      <th className="pb-2 font-medium text-right">Avg per Bag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {buyers
                      .sort((a, b) => b.totalBought - a.totalBought)
                      .map((u) => (
                        <tr key={u.id} className={!u.isActive ? 'opacity-40' : ''}>
                          <td className="py-3">
                            <button className="text-left hover:underline" onClick={() => navigate(`/users/${u.id}`)}>
                              <p className="font-medium text-brand-700">{u.name}</p>
                              <p className="text-xs text-gray-400">{u.email}</p>
                            </button>
                          </td>
                          <td className="py-3 text-right">
                            <span className="text-lg font-bold text-gray-900">{u.totalBought.toLocaleString()}</span>
                          </td>
                          <td className="py-3 text-right">
                            <span className={`font-medium ${u.activeBags > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                              {u.activeBags}
                            </span>
                          </td>
                          <td className="py-3 text-right font-medium text-gray-700">{fmt(u.totalSpend)}</td>
                          <td className="py-3 text-right text-gray-500">
                            {u.totalBought > 0 ? fmt(u.totalSpend / u.totalBought) : '—'}
                          </td>
                        </tr>
                      ))}
                    {buyers.length === 0 && (
                      <tr><td colSpan={5} className="py-6 text-center text-gray-400">No buyers yet</td></tr>
                    )}
                  </tbody>
                  {buyers.length > 0 && (
                    <tfoot className="border-t-2 border-gray-200">
                      <tr>
                        <td className="pt-3 text-xs font-semibold text-gray-500 uppercase">Total</td>
                        <td className="pt-3 text-right font-bold text-gray-900">
                          {buyers.reduce((s, u) => s + u.totalBought, 0).toLocaleString()}
                        </td>
                        <td className="pt-3 text-right font-bold text-amber-600">
                          {buyers.reduce((s, u) => s + u.activeBags, 0)}
                        </td>
                        <td className="pt-3 text-right font-bold text-gray-900">
                          {fmt(buyers.reduce((s, u) => s + u.totalSpend, 0))}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Sellers */}
              <div className="card">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Sellers — Sales Performance</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                      <th className="pb-2 font-medium">Name</th>
                      <th className="pb-2 font-medium text-right">Bags Sold</th>
                      <th className="pb-2 font-medium text-right">Total Revenue</th>
                      <th className="pb-2 font-medium text-right">Total Profit</th>
                      <th className="pb-2 font-medium text-right">Avg Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sellers
                      .sort((a, b) => b.totalProfit - a.totalProfit)
                      .map((u) => (
                        <tr key={u.id} className={!u.isActive ? 'opacity-40' : ''}>
                          <td className="py-3">
                            <button className="text-left hover:underline" onClick={() => navigate(`/users/${u.id}`)}>
                              <p className="font-medium text-brand-700">{u.name}</p>
                              <p className="text-xs text-gray-400">{u.email}</p>
                            </button>
                          </td>
                          <td className="py-3 text-right">
                            <span className="text-lg font-bold text-gray-900">{u.totalSold.toLocaleString()}</span>
                          </td>
                          <td className="py-3 text-right font-medium text-gray-700">{fmt(u.totalRevenue)}</td>
                          <td className="py-3 text-right font-bold text-green-600">{fmt(u.totalProfit)}</td>
                          <td className="py-3 text-right">
                            <span className={`font-medium ${u.avgMargin >= 40 ? 'text-green-600' : u.avgMargin >= 25 ? 'text-amber-600' : 'text-red-500'}`}>
                              {u.totalSold > 0 ? `${u.avgMargin}%` : '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {sellers.length === 0 && (
                      <tr><td colSpan={5} className="py-6 text-center text-gray-400">No sellers yet</td></tr>
                    )}
                  </tbody>
                  {sellers.length > 0 && (
                    <tfoot className="border-t-2 border-gray-200">
                      <tr>
                        <td className="pt-3 text-xs font-semibold text-gray-500 uppercase">Total</td>
                        <td className="pt-3 text-right font-bold text-gray-900">
                          {sellers.reduce((s, u) => s + u.totalSold, 0).toLocaleString()}
                        </td>
                        <td className="pt-3 text-right font-bold text-gray-900">
                          {fmt(sellers.reduce((s, u) => s + u.totalRevenue, 0))}
                        </td>
                        <td className="pt-3 text-right font-bold text-green-600">
                          {fmt(sellers.reduce((s, u) => s + u.totalProfit, 0))}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Manage Users ──────────────────────────────────────────────────── */}
      {tab === 'manage' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {usersLoading ? (
            <div className="p-8 text-center text-gray-400">Loading…</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users?.map((u) => (
                  <tr key={u.id} className={!u.isActive ? 'opacity-50' : ''}>
                    <td className="px-4 py-3">
                      <button className="text-left hover:underline" onClick={() => navigate(`/users/${u.id}`)}>
                        <p className="font-medium text-brand-700">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${roleColors[u.role]}`}>{u.role}</span>
                        {u.role === 'MANAGER' && u.managerType && (
                          <span className="text-xs text-gray-400">{u.managerType.charAt(0) + u.managerType.slice(1).toLowerCase()} Manager</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(u.createdAt), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button className="text-xs text-brand-600 hover:underline" onClick={() => openRoleChange(u)}>Change Role</button>
                        <button className="text-xs text-gray-500 hover:underline" onClick={() => openEdit(u)}>Edit</button>
                        {u.isActive && (
                          <button className="text-xs text-red-500 hover:underline" onClick={() => deactivateMut.mutate(u.id)}>
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Change Role modal ─────────────────────────────────────────────── */}
      {roleTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">Change Role</h2>
              <p className="text-sm text-gray-500 mt-0.5">{roleTarget.name}</p>
            </div>
            <div>
              <label className="label">New Role</label>
              <select
                className="input"
                value={roleForm.role}
                onChange={(e) => setRoleForm((f) => ({ ...f, role: e.target.value, managerType: '' }))}
              >
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="BUYER">Buyer</option>
                <option value="SELLER">Seller</option>
              </select>
            </div>
            {roleForm.role === 'MANAGER' && (
              <div>
                <label className="label">Manager Type</label>
                <select
                  className="input"
                  value={roleForm.managerType}
                  onChange={(e) => setRoleForm((f) => ({ ...f, managerType: e.target.value }))}
                >
                  <option value="">— Select type —</option>
                  <option value="BUYING">Buying Manager</option>
                  <option value="SELLING">Selling Manager</option>
                  <option value="BOTH">Both (Buying & Selling)</option>
                </select>
              </div>
            )}
            {roleError && <p className="text-xs text-red-500">{roleError}</p>}
            <div className="flex gap-2 pt-2">
              <button
                className="btn-primary flex-1"
                disabled={roleMut.isPending || (roleForm.role === 'MANAGER' && !roleForm.managerType)}
                onClick={() => roleMut.mutate()}
              >
                Save
              </button>
              <button className="btn-secondary flex-1" onClick={() => setRoleTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit modal ───────────────────────────────────────────── */}
      {(showForm || editing) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="font-semibold text-gray-900">{editing ? 'Edit User' : 'New User'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">Name</label>
                <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              {!editing && (
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
                </div>
              )}
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value, managerType: '' }))}>
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="BUYER">Buyer</option>
                  <option value="SELLER">Seller</option>
                </select>
              </div>
              {form.role === 'MANAGER' && (
                <div>
                  <label className="label">Manager Type</label>
                  <select className="input" value={form.managerType} onChange={(e) => setForm((f) => ({ ...f, managerType: e.target.value }))}>
                    <option value="">— Select type —</option>
                    <option value="BUYING">Buying Manager</option>
                    <option value="SELLING">Selling Manager</option>
                    <option value="BOTH">Both (Buying & Selling)</option>
                  </select>
                </div>
              )}
              <div>
                <label className="label">{editing ? 'New Password (leave blank to keep)' : 'Password'}</label>
                <input type="password" className="input" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required={!editing} />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={createMut.isPending || updateMut.isPending}>
                  {editing ? 'Save' : 'Create'}
                </button>
                <button type="button" className="btn-secondary flex-1" onClick={() => { setShowForm(false); setEditing(null); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
