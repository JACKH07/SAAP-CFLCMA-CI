import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { hasAdminAccess } from '../utils/roles';
import { paths } from '../config/env';

export function ProtectedRoute({ adminOnly = false }) {
  const { token, user, setPortal } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (token && adminOnly && hasAdminAccess(user)) {
      setPortal('admin');
    }
  }, [token, adminOnly, user, setPortal]);

  // Non connecté : page login membre (pas la page admin),
  // sauf si on vise clairement l’espace admin → alors admin_connecte
  if (!token) {
    const to = adminOnly ? paths.adminLogin : paths.login;
    return <Navigate to={to} replace state={{ from: location }} />;
  }

  // Membre connecté qui tente d’ouvrir l’admin → profil (pas admin_connecte)
  if (adminOnly && !hasAdminAccess(user)) {
    return <Navigate to={paths.profil} replace />;
  }

  return <Outlet />;
}
