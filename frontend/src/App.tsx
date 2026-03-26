import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useQuery } from '@tanstack/react-query';
import { getMe } from './api/auth.api';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import BagDetailPage from './pages/BagDetailPage';
import BagFormPage from './pages/BagFormPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import UserProfilePage from './pages/UserProfilePage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, login } = useAuthStore();

  const { isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const user = await getMe();
      login(token!, user);
      return user;
    },
    enabled: !!token && !useAuthStore.getState().user,
    retry: false,
  });

  if (!token) return <Navigate to="/login" replace />;
  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>;
  return <>{children}</>;
}

function RequireRole({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const user = useAuthStore((s) => s.user);
  if (user && !roles.includes(user.role)) return <Navigate to="/inventory" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route index element={<RequireRole roles={['ADMIN', 'MANAGER']}><DashboardPage /></RequireRole>} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="bags/new" element={<BagFormPage />} />
          <Route path="bags/:id" element={<BagDetailPage />} />
          <Route path="bags/:id/edit" element={<BagFormPage />} />
          <Route path="reports" element={<RequireRole roles={['ADMIN', 'MANAGER']}><ReportsPage /></RequireRole>} />
          <Route path="users" element={<RequireRole roles={['ADMIN']}><UsersPage /></RequireRole>} />
          <Route path="users/:id" element={<RequireRole roles={['ADMIN']}><UserProfilePage /></RequireRole>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
