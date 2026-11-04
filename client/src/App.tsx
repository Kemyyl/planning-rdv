import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Accueil from './pages/Accueil';
import Services from './pages/Services';
import Reservation from './pages/Reservation';
import Confirmation from './pages/Confirmation';
import MesRdv from './pages/MesRdv';
import MesDevis from './pages/MesDevis';
import MesFactures from './pages/MesFactures';
import DefinirMotDePasse from './pages/DefinirMotDePasse';
import Profil from './pages/Profil';
import Formations from './pages/Formations';
import FormationDetail from './pages/FormationDetail';
import MesFormations from './pages/MesFormations';
import Apprendre from './pages/Apprendre';
import AdminConnexion from './pages/admin/Connexion';
import AdminDashboard from './pages/admin/Dashboard';
import AdminPlanning from './pages/admin/Planning';
import AdminClients from './pages/admin/Clients';
import AdminAgenda from './pages/admin/Agenda';
import AdminPrestations from './pages/admin/Prestations';
import AdminDevis from './pages/admin/Devis';
import AdminFactures from './pages/admin/Factures';
import AdminDemandes from './pages/admin/Demandes';
import AdminFormations from './pages/admin/Formations';
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
          <Route path="/confirmation/:jeton" element={<Confirmation />} />
          <Route path="/mes-rdv" element={<MesRdv />} />
          <Route path="/mes-devis" element={<MesDevis />} />
          <Route path="/mes-factures" element={<MesFactures />} />
          <Route path="/definir-mot-de-passe" element={<DefinirMotDePasse />} />
          <Route path="/profil" element={<Profil />} />
          <Route path="/formations" element={<Formations />} />
          <Route path="/formations/:slug" element={<FormationDetail />} />
          <Route path="/login" element={<AdminConnexion />} />

          {/* Client */}
          <Route path="/mes-formations" element={<MesFormations />} />
          <Route path="/mes-formations/:formationId/apprendre" element={<Apprendre />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminConnexion />} />
          <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/planning" element={<AdminRoute><AdminPlanning /></AdminRoute>} />
          <Route path="/admin/clients" element={<AdminRoute><AdminClients /></AdminRoute>} />
          <Route path="/admin/agenda" element={<AdminRoute><AdminAgenda /></AdminRoute>} />
          <Route path="/admin/prestations" element={<AdminRoute><AdminPrestations /></AdminRoute>} />
          <Route path="/admin/devis" element={<AdminRoute><AdminDevis /></AdminRoute>} />
          <Route path="/admin/factures" element={<AdminRoute><AdminFactures /></AdminRoute>} />
          <Route path="/admin/demandes" element={<AdminRoute><AdminDemandes /></AdminRoute>} />
          <Route path="/admin/formations" element={<AdminRoute><AdminFormations /></AdminRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </ClientAuthProvider>
    </AuthProvider>
  );
}
