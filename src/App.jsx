import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthProvider';

// Impor Halaman dan Komponen
import HomePage from './pages/HomePage.jsx';
import CampaignPage from './pages/CampaignPages.jsx';
import AuthPage from './pages/Auth.jsx';
import DashboardPage from './pages/Dashboard.jsx';
import Navbar from './components/shared/Navbar.jsx';

// Komponen untuk melindungi route
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) {
    // Jika tidak ada user, arahkan ke halaman login
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Komponen untuk halaman login, agar tidak bisa diakses jika sudah login
function PublicOnlyRoute({ children }) {
    const { user } = useAuth();
    if (user) {
        // Jika sudah login, arahkan ke dashboard
        return <Navigate to="/dashboard" replace />;
    }
    return children;
}

function App() {
  return (
    <AuthProvider>
      <div className="bg-background min-h-screen">
        <Navbar /> {/* Navbar akan selalu tampil */}
        <main>
          <Routes>
            
            {/* Route Publik */}
            <Route path="/" element={<HomePage />} />
            <Route path="/c/:slug" element={<CampaignPage />} /> 
            <Route 
              path="/login" 
              element={
                <PublicOnlyRoute>
                  <AuthPage />
                </PublicOnlyRoute>
              } 
            />

            {/* Route yang Dilindungi */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />

            {/* Fallback route, jika halaman tidak ditemukan */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;