import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import VaultPage from './pages/VaultPage';
import UploadPage from './pages/UploadPage';
import SecurityMonitorPage from './pages/SecurityMonitorPage';
import OSVisualizerPage from './pages/OSVisualizerPage';
import RansomwareDemoPage from './pages/RansomwareDemoPage';
import RoomsPage from './pages/RoomsPage';
import RoomDetailPage from './pages/RoomDetailPage';
import LandingPage from './pages/LandingPage';
import ShareAccessPage from './pages/ShareAccessPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-vault-bg">
        <div className="w-8 h-8 border-2 border-vault-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/?login=true" />;
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#111827',
            color: '#e2e8f0',
            border: '1px solid #1e293b',
          },
        }}
      />
      <Routes>
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />}
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/share/:token" element={<ShareAccessPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="vault" element={<VaultPage />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="rooms/:id" element={<RoomDetailPage />} />
          <Route path="security-monitor" element={<SecurityMonitorPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
