import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { HomePage } from '../pages/HomePage.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { CriarContaPage } from '../pages/CriarContaPage.jsx';
import { UserPage } from '../pages/UserPage.jsx';
import { DashboardUtente } from '../pages/DashboardUtente.jsx';
import { DashboardStaff } from '../pages/DashboardStaff.jsx';
import { ListaUtentes } from '../pages/ListaUtentes.jsx';
import { CriarUtente } from '../pages/CriarUtente.jsx';
import { EditarUtente } from '../pages/EditarUtente.jsx';
import { ListaConsultas } from '../pages/ListaConsultas.jsx';
import { AgendarConsulta } from '../pages/AgendarConsulta.jsx';
import { EditarConsulta } from '../pages/EditarConsulta.jsx';
import { DetalhesConsulta } from '../pages/DetalhesConsulta.jsx';
import { PaginaCalendario } from '../pages/PaginaCalendario.jsx';
import { ListaSalas } from '../pages/ListaSalas.jsx';
import { VerConsultasSala } from '../pages/VerConsultasSala.jsx';
import { CriarFichaAvaliacao } from '../pages/CriarFichaAvaliacao.jsx';
import { CriarFichaPsicologia } from '../pages/CriarFichaPsicologia.jsx';
import { CriarFichaTerapiaFala } from '../pages/CriarFichaTerapiaFala.jsx';
import { CriarFichaNutricao } from '../pages/CriarFichaNutricao.jsx';
import { VerFichaAvaliacao } from '../pages/VerFichaAvaliacao.jsx';
import { VerFichaPsicologia } from '../pages/VerFichaPsicologia.jsx';
import { VerFichaTerapiaFala } from '../pages/VerFichaTerapiaFala.jsx';
import { VerFichaNutricao } from '../pages/VerFichaNutricao.jsx';
import { CompletarPerfilPage } from '../pages/CompletarPerfilPage.jsx';
import { AtivarContaPage } from '../pages/AtivarContaPage.jsx';
import { TransferirUtentes } from '../pages/TransferirUtentes.jsx';
import { Layout } from '../components/Layout.jsx';
import { Navbar } from '../components/Navbar.jsx';

function PublicLayout({ children }) {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
}

export function AppRoutes() {
  const { isAuthenticated, user } = useAuth();
  const canAccessFichaAvaliacao = user?.role === 'admin'
    || (user?.role === 'terapeuta' && (
      String(user?.tipo || '').toLowerCase().includes('professor') ||
      String(user?.tipo || '').toLowerCase().includes('aluno')
    ));

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/criar-conta" element={<CriarContaPage />} />
      <Route path="/ativar-conta" element={<AtivarContaPage />} />
      <Route
        path="/"
        element={
          <PublicLayout>
            <HomePage />
          </PublicLayout>
        }
      />

      {/* Dashboard Routes - Redirect based on role */}
      <Route
        path="/dashboard"
        element={
          isAuthenticated ? (
            user?.role === 'terapeuta' && !user?.area_clinica_id ? (
              <Navigate to="/completar-perfil" replace />
            ) : user?.role === 'utente' ? (
              <Layout><DashboardUtente /></Layout>
            ) : (
              <Layout><DashboardStaff /></Layout>
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/dashboard/staff"
        element={
          isAuthenticated && user?.role !== 'utente' ? (
            <Layout><DashboardStaff /></Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/completar-perfil"
        element={
          isAuthenticated ? (
            <CompletarPerfilPage />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/user"
        element={
          <ProtectedRoute>
            <UserPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/calendario"
        element={
          isAuthenticated ? (
            <Layout><PaginaCalendario /></Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/utentes"
        element={
          <ProtectedRoute>
            <ListaUtentes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/utentes/novo"
        element={
          <ProtectedRoute>
            <CriarUtente />
          </ProtectedRoute>
        }
      />
      <Route
        path="/utentes/transferir"
        element={
          isAuthenticated && (user?.role === 'admin' || user?.role === 'administrativo') ? (
            <Layout><TransferirUtentes /></Layout>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />
      <Route
        path="/utentes/:id/editar"
        element={
          <ProtectedRoute>
            <EditarUtente />
          </ProtectedRoute>
        }
      />
      <Route
        path="/utentes/:id/perfil"
        element={
          <ProtectedRoute>
            <UserPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/consultas"
        element={
          <ProtectedRoute>
            <ListaConsultas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/consultas/nova"
        element={
          <ProtectedRoute>
            <AgendarConsulta />
          </ProtectedRoute>
        }
      />
      <Route
        path="/consultas/:id/editar"
        element={
          <ProtectedRoute>
            <EditarConsulta />
          </ProtectedRoute>
        }
      />
      <Route
        path="/consultas/:id/detalhes"
        element={
          <ProtectedRoute>
            <DetalhesConsulta />
          </ProtectedRoute>
        }
      />
      <Route
        path="/salas"
        element={
          <ProtectedRoute>
            <ListaSalas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/salas/:salaId"
        element={
          <ProtectedRoute>
            <VerConsultasSala />
          </ProtectedRoute>
        }
      />
      <Route
        path="/fichas-avaliacao/nova"
        element={
          isAuthenticated && canAccessFichaAvaliacao ? (
            <Layout><CriarFichaAvaliacao /></Layout>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />
      <Route
        path="/fichas-psicologia/nova"
        element={
          isAuthenticated && canAccessFichaAvaliacao ? (
            <Layout><CriarFichaPsicologia /></Layout>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />
      <Route
        path="/fichas-terapia-fala/nova"
        element={
          isAuthenticated && canAccessFichaAvaliacao ? (
            <Layout><CriarFichaTerapiaFala /></Layout>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />
      <Route
        path="/fichas-nutricao/nova"
        element={
          isAuthenticated && canAccessFichaAvaliacao ? (
            <Layout><CriarFichaNutricao /></Layout>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />
      <Route path="/fichas-avaliacao/:id" element={isAuthenticated ? <Layout><VerFichaAvaliacao /></Layout> : <Navigate to="/" replace />} />
      <Route path="/fichas-psicologia/:id" element={isAuthenticated ? <Layout><VerFichaPsicologia /></Layout> : <Navigate to="/" replace />} />
      <Route path="/fichas-terapia-fala/:id" element={isAuthenticated ? <Layout><VerFichaTerapiaFala /></Layout> : <Navigate to="/" replace />} />
      <Route path="/fichas-nutricao/:id" element={isAuthenticated ? <Layout><VerFichaNutricao /></Layout> : <Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
