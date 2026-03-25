import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const links = [
  { to: '/', label: 'Dashboard', icon: '📊', roles: ['ADMIN', 'MANAGER'] },
  { to: '/inventory', label: 'Inventory', icon: '👜', roles: ['ADMIN', 'MANAGER', 'BUYER', 'SELLER'] },
  { to: '/reports', label: 'Reports', icon: '📈', roles: ['ADMIN', 'MANAGER'] },
  { to: '/users', label: 'Users', icon: '👥', roles: ['ADMIN'] },
];

export default function Sidebar({ open }: { open: boolean }) {
  const user = useAuthStore((s) => s.user);

  const allowed = links.filter((l) => user && l.roles.includes(user.role));

  return (
    <aside
      className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-200 ${
        open ? 'w-56' : 'w-16'
      }`}
    >
      <div className={`flex items-center h-16 px-4 border-b border-gray-200 ${open ? 'gap-3' : 'justify-center'}`}>
        <span className="text-2xl">👜</span>
        {open && <span className="font-bold text-brand-700 text-sm leading-tight">Resale<br/>Dashboard</span>}
      </div>
      <nav className="flex-1 py-4 space-y-1 px-2">
        {allowed.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100'
              } ${!open ? 'justify-center' : ''}`
            }
          >
            <span className="text-lg">{link.icon}</span>
            {open && <span>{link.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
