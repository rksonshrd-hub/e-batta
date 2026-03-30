import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, ClipboardList, Users, FileText, Download } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const { employeeData, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // 🔹 Handle logout safely
  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  // 🔹 Navigation links
  const getNavLinks = () => {
    if (!employeeData) return [];

    const role = employeeData.role;
    const links = [];

    // 🔹 HR
    if (role === 'hr') {
      links.push({ name: 'HR Dashboard', path: '/hr', icon: Users });
    }

    // 🔹 Manager / HR
    if (role === 'manager' || role === 'hr') {
      links.push({ name: 'Team Entries', path: '/manager', icon: ClipboardList });
    }

    // 🔹 Common
    links.push({ name: 'My Entries', path: '/employee', icon: FileText });

    // 🔥 NEW TAB (FOR ALL USERS)
    links.push({
      name: 'Download Duty Card',
      path: '/download',
      icon: Download, // or change icon
    });

    return links;
  };

  // 🔹 Loading fallback
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!employeeData) {
    return null; // or navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">

      {/* 🔥 BACKDROP */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* 🔥 SLIDE DRAWER */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-white z-40 shadow-xl transform transition-transform duration-300 ease-in-out
      ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <span className="text-lg font-bold text-blue-600">E-Batta</span>
          <button onClick={() => setMenuOpen(false)}>✕</button>
        </div>

        {/* User Info */}
        <div className="p-4 flex items-center gap-3 border-b">
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500 text-white font-bold">
            {employeeData.emp_name?.charAt(0)}
          </div>
          <div>
            <div className="font-semibold">{employeeData.emp_name}</div>
            <div className="text-xs text-gray-500">{employeeData.emp_code}</div>
          </div>
        </div>

        {/* Nav Links */}
        <div className="p-3 space-y-2">
          {getNavLinks().map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Logout */}
        <div className="p-3 border-t">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-red-600 hover:bg-red-50 transition"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* 🔷 NAVBAR */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16 gap-4">

            {/* LEFT */}
            <div className="flex items-center gap-3">

              {/* ☰ Mobile */}
              <button
                className="sm:hidden p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                ☰
              </button>

              {/* Logo */}
              <span className="text-xl font-bold text-blue-600">
                E-Batta
              </span>

              {/* 💻 Desktop Tabs */}
              <div className="hidden sm:flex items-center gap-2 ml-6">
                {getNavLinks().map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.path);

                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
                    ${isActive
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>

            </div>

            {/* RIGHT 🔥 IMPORTANT */}
            <div className="flex items-center gap-4 shrink-0">

              {/* Name + Code */}
              <div className="text-right text-sm hidden sm:block">
                <div className="font-semibold text-gray-800 whitespace-nowrap">
                  {employeeData.emp_name}
                </div>
                <div className="text-gray-500 text-xs whitespace-nowrap">
                  {employeeData.emp_code}
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleSignOut}
                className="p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-5 w-5" />
              </button>

            </div>

          </div>
        </div>
      </nav>

      {/* 🔷 PAGE CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <Outlet />
        </div>
      </main>

    </div>
  );
}