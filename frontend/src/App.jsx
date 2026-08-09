import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './store/authStore';
import { hasAdminAccess } from './utils/roles';
import { paths } from './config/env';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfilePage from './pages/ProfilePage';
import MesCotisationsPage from './pages/MesCotisationsPage';
import PaiementPage from './pages/PaiementPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminMembresPage from './pages/admin/AdminMembresPage';
import AdminCotisationsPage from './pages/admin/AdminCotisationsPage';
import AdminBureauPage from './pages/admin/AdminBureauPage';
import AdminComptePage from './pages/admin/AdminComptePage';
import AdminActivitePage from './pages/admin/AdminActivitePage';

function HomeRedirect() {
  const { token, user, portal } = useAuthStore();
  if (!token) return <Navigate to={paths.login} replace />;
  // Dashboard uniquement si connexion via portail admin
  if (hasAdminAccess(user) && portal === 'admin') {
    return <Navigate to={paths.admin} replace />;
  }
  return <Navigate to={paths.profil} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path={paths.login} element={<LoginPage mode="membre" />} />
      <Route path={paths.adminLogin} element={<LoginPage mode="admin" />} />
      <Route path="/admin/login" element={<Navigate to={paths.adminLogin} replace />} />
      <Route path={paths.register} element={<RegisterPage />} />
      <Route path={paths.forgotPassword} element={<ForgotPasswordPage />} />
      <Route path={paths.resetPassword} element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path={paths.profil} element={<ProfilePage />} />
        <Route path={paths.mesCotisations} element={<MesCotisationsPage />} />
        <Route path={`${paths.paiement}/:activiteId`} element={<PaiementPage />} />
      </Route>

      <Route element={<ProtectedRoute adminOnly />}>
        <Route path={paths.admin} element={<AdminDashboardPage />} />
        <Route path={paths.adminMembres} element={<AdminMembresPage />} />
        <Route path={paths.adminCotisations} element={<AdminCotisationsPage />} />
        <Route path={paths.adminBureau} element={<AdminBureauPage />} />
        <Route path={paths.adminCompte} element={<AdminComptePage />} />
        <Route path={paths.adminActivite} element={<AdminActivitePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
