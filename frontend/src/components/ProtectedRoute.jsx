import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { hasAdminAccess } from '../utils/roles';
import { paths } from '../config/env';

export function ProtectedRoute({ adminOnly = false }) {
  const { token, user } = useAuthStore();
  const location = useLocation();

  if (!token) {
    return (
      <Navigate
        to={adminOnly ? paths.adminLogin : paths.login}
        replace
        state={{ from: location }}
      />
    );
  }

  if (adminOnly && !hasAdminAccess(user)) {
    return <Navigate to={paths.profil} replace />;
  }

  return <Outlet />;
}
