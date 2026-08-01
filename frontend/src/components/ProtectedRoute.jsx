import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { hasAdminAccess } from '../utils/roles';

export function ProtectedRoute({ adminOnly = false }) {
  const { token, user } = useAuthStore();
  const location = useLocation();

  if (!token) {
    return (
      <Navigate
        to={adminOnly ? '/admin_connecte' : '/login'}
        replace
        state={{ from: location }}
      />
    );
  }

  if (adminOnly && !hasAdminAccess(user)) {
    return <Navigate to="/profil" replace />;
  }

  return <Outlet />;
}
