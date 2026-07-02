import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Bell,
  Menu,
  LogOut,
  ChevronDown,
  UserCircle,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/projects', label: 'Projects', icon: FolderKanban },
  { path: '/team', label: 'Team', icon: Users },
];

export function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-secondary-200 z-50 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-secondary-100">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
              <FolderKanban className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-secondary-900">CodeAlpha</h1>
              <p className="text-xs text-secondary-500">Project Manager</p>
            </div>
          </Link>
        </div>

        <nav className="p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-secondary-100">
          <div className="text-xs text-secondary-400 text-center">
            CodeAlpha Project Management
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navigation */}
        <header className="bg-white border-b border-secondary-200 sticky top-0 z-30">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-secondary-100 rounded-lg"
            >
              <Menu className="w-6 h-6 text-secondary-600" />
            </button>

            <div className="flex-1 hidden lg:block" />

            <div className="flex items-center gap-3">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 hover:bg-secondary-100 rounded-lg relative"
                >
                  <Bell className="w-5 h-5 text-secondary-600" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full" />
                </button>

                {notificationsOpen && (
                  <div className="dropdown animate-scale-in">
                    <div className="px-4 py-3 border-b border-secondary-100">
                      <h3 className="font-semibold text-secondary-900">Notifications</h3>
                    </div>
                    <div className="max-h-64 overflow-auto">
                      <div className="px-4 py-8 text-center text-secondary-400 text-sm">
                        No new notifications
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 hover:bg-secondary-100 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <UserCircle className="w-5 h-5 text-primary-600" />
                    )}
                  </div>
                  <span className="font-medium text-secondary-700 hidden sm:block">
                    {profile?.name || 'User'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-secondary-400" />
                </button>

                {userMenuOpen && (
                  <div className="dropdown animate-scale-in">
                    <div className="px-4 py-3 border-b border-secondary-100">
                      <p className="font-medium text-secondary-900">{profile?.name}</p>
                      <p className="text-sm text-secondary-500">{profile?.id}</p>
                    </div>
                    <div className="py-2">
                      <button
                        onClick={handleSignOut}
                        className="dropdown-item text-danger-600 hover:bg-danger-50 w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>

      {/* Click outside handlers */}
      {(userMenuOpen || notificationsOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setUserMenuOpen(false);
            setNotificationsOpen(false);
          }}
        />
      )}
    </div>
  );
}
