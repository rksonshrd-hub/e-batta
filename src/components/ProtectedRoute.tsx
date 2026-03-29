import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

// 🔹 Loader
const Loader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
  </div>
);

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { user, employeeData, loading } = useAuth();

  console.log("🛡️ ProtectedRoute:", { user, employeeData, loading });

  // 🔹 Only block while auth loading
  if (loading) {
    return <Loader />;
  }

  // 🔹 Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 🔥 IMPORTANT: employeeData wait pannala → allow render
  // (avoid refresh / tab switch issue)

  // 🔹 Role restriction (only when employeeData available)
  if (allowedRoles && employeeData) {
    if (!allowedRoles.includes(employeeData.role)) {
      console.warn("⛔ Access denied for role:", employeeData.role);

      if (employeeData.role === 'hr') return <Navigate to="/hr" replace />;
      if (employeeData.role === 'manager') return <Navigate to="/manager" replace />;
      return <Navigate to="/employee" replace />;
    }
  }

  return <Outlet />;
};