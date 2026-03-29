import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import HrDashboard from './pages/HrDashboard';
import DownloadDutyCard from './pages/DownloadDutyCard';

// 🔹 Loader
const Loader = () => (
  <div className="flex items-center justify-center h-screen">
    <p className="text-gray-600">Loading...</p>
  </div>
);

// 🔹 Role Redirect
function DashboardRedirect() {
  const { user, employeeData, loading } = useAuth();

  // wait until auth resolved
  if (loading) return <Loader />;

  // if no user → login
  if (!user) return <Navigate to="/login" replace />;

  // if employeeData இன்னும் வரல → wait
  if (!employeeData) return <Loader />;

  // redirect based on role
  if (employeeData.role === 'hr') return <Navigate to="/hr" replace />;
  if (employeeData.role === 'manager') return <Navigate to="/manager" replace />;

  return <Navigate to="/employee" replace />;
}

// 🔹 Public Route
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <Loader />;

  if (user) return <Navigate to="/" replace />;

  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* 🔓 Login */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* 🔐 Protected */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>

              <Route path="/" element={<DashboardRedirect />} />

              {/* 🔥 COMMON ROUTES */}
              <Route path="/employee" element={<EmployeeDashboard />} />
              <Route path="/download" element={<DownloadDutyCard />} />  {/* ✅ NEW */}

              {/* 🔒 Manager + HR */}
              <Route element={<ProtectedRoute allowedRoles={['manager', 'hr']} />}>
                <Route path="/manager" element={<ManagerDashboard />} />
              </Route>

              {/* 🔒 HR ONLY */}
              <Route element={<ProtectedRoute allowedRoles={['hr']} />}>
                <Route path="/hr" element={<HrDashboard />} />
              </Route>

            </Route>
          </Route>

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>

      <Toaster position="bottom-center" />
    </AuthProvider>
  );
}

export default App;