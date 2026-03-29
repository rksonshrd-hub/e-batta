import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, ClipboardList, Users, FileText, Download } from 'lucide-react';

export default function Layout() {
  const { employeeData, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

      {/* 🔷 Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">

            {/* 🔷 Left */}
            <div className="flex items-center gap-6">

              {/* Logo */}
              <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
                E-Batta
              </span>

              {/* Nav Links */}
              <div className="hidden sm:flex items-center gap-2">
                {getNavLinks().map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.path);

                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${isActive
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                        }
                    `}
                    >
                      <Icon className="w-4 h-4" />
                      {item.name}

                      {/* 🔥 Active underline */}
                      {isActive && (
                        <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-blue-600 rounded-full"></span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* 🔷 Right */}
            <div className="flex items-center gap-4">

              {/* User Info */}
              <div className="hidden sm:flex items-center gap-3">

                {/* Avatar */}
                <div className="w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold">
                  {employeeData.emp_name?.charAt(0)}
                </div>

                {/* Name + Code */}
                <div className="text-sm">
                  <div className="font-semibold text-gray-800">
                    {employeeData.emp_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {employeeData.emp_code}
                  </div>
                </div>

                {/* Role Badge */}
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold uppercase">
                  {employeeData.role}
                </span>
              </div>

              {/* Logout */}
              <button
                onClick={handleSignOut}
                className="p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </button>

            </div>

          </div>
        </div>
      </nav>

      {/* 🔷 Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <Outlet />
        </div>
      </main>

    </div>
  );
}