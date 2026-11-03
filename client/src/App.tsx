import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Accueil from './pages/Accueil';
import Services from './pages/Services';
import Reservation from './pages/Reservation';
import Confirmation from './pages/Confirmation';
import MesRdv from './pages/MesRdv';
import AdminConnexion from './pages/admin/Connexion';
import AdminDashboard from './pages/admin/Dashboard';
import AdminPlanning from './pages/admin/Planning';
import AdminClients from './pages/admin/Clients';
import AdminAgenda from './pages/admin/Agenda';
import AdminPrestations from './pages/admin/Prestations';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ClientAuthProvider } from './contexts/ClientAuthContext';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ClientAuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Accueil />} />
          <Route path="/services" element={<Services />} />
          <Route path="/reservation" element={<Reservation />} />
          <Route path="/confirmation/:id" element={<Confirmation />} />
          <Route path="/mes-rdv" element={<MesRdv />} />
          <Route path="/login" element={<AdminConnexion />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminConnexion />} />
          <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/planning" element={<AdminRoute><AdminPlanning /></AdminRoute>} />
          <Route path="/admin/clients" element={<AdminRoute><AdminClients /></AdminRoute>} />
          <Route path="/admin/agenda" element={<AdminRoute><AdminAgenda /></AdminRoute>} />
          <Route path="/admin/prestations" element={<AdminRoute><AdminPrestations /></AdminRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </ClientAuthProvider>
    </AuthProvider>
  );
}
