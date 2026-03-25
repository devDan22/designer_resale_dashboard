import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-purple-100 text-purple-700',
    MANAGER: 'bg-blue-100 text-blue-700',
    BUYER: 'bg-green-100 text-green-700',
    SELLER: 'bg-amber-100 text-amber-700',
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      <button onClick={onMenuClick} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
        ☰
      </button>
      <div className="flex items-center gap-3">
        {user && (
          <>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${roleColors[user.role]}`}>
              {user.role}
            </span>
            <span className="text-sm text-gray-700">{user.name}</span>
          </>
        )}
        <button onClick={handleLogout} className="btn-secondary text-xs px-3 py-1.5">
          Sign out
        </button>
      </div>
    </header>
  );
}
