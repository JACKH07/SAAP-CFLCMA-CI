import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './store/authStore';
import { hasAdminAccess } from './utils/roles';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import MesCotisationsPage from './pages/MesCotisationsPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminMembresPage from './pages/admin/AdminMembresPage';
import AdminCotisationsPage from './pages/admin/AdminCotisationsPage';

function HomeRedirect() {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return <Navigate to={hasAdminAccess(user) ? '/admin' : '/profil'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage mode="membre" />} />
      <Route path="/admin_connecte" element={<LoginPage mode="admin" />} />
      <Route path="/admin/login" element={<Navigate to="/admin_connecte" replace />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/profil" element={<ProfilePage />} />
        <Route path="/mes-cotisations" element={<MesCotisationsPage />} />
      </Route>

      <Route element={<ProtectedRoute adminOnly />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/membres" element={<AdminMembresPage />} />
        <Route path="/admin/cotisations" element={<AdminCotisationsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
