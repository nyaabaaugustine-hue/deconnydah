import { useState, useEffect } from 'react';
import { getMe, logout, type AuthUser } from '@/lib/apiClient';
import { AdminLogin } from '@/components/AdminLogin';
import { ForceChangePassword } from '@/components/ForceChangePassword';
import { FleetDashboard } from '@/components/FleetDashboard';
import { VehicleProfile } from '@/components/VehicleProfile';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { DriverManagement } from '@/components/DriverManagement';
import { InspectionsView } from '@/components/InspectionsView';
import { UserManagement } from '@/components/UserManagement';
import { cn } from '@/lib/utils';
import {
  LogOut,
  Loader2,
  ShieldCheck,
  Shield,
  Eye,
  LayoutDashboard,
  TrendingUp,
  Users,
  ClipboardCheck,
  Settings,
  ChevronLeft,
  Menu,
  X,
  Truck,
  Moon,
  Sun,
} from 'lucide-react';

const ROLE_BADGES = {
  admin: { label: 'Admin', icon: ShieldCheck, color: 'from-red-500 to-red-600' },
  manager: { label: 'Manager', icon: Shield, color: 'from-blue-500 to-blue-600' },
  viewer: { label: 'Viewer', icon: Eye, color: 'from-slate-500 to-slate-600' },
};

type View = 'dashboard' | 'analytics' | 'vehicle' | 'drivers' | 'inspections' | 'users';

const NAV_ITEMS: { view: View; label: string; icon: typeof LayoutDashboard; roles?: string[] }[] = [
  { view: 'dashboard', label: 'Fleet Dashboard', icon: LayoutDashboard },
  { view: 'analytics', label: 'Analytics', icon: TrendingUp },
  { view: 'drivers', label: 'Drivers', icon: Users },
  { view: 'inspections', label: 'Inspections', icon: ClipboardCheck },
  { view: 'users', label: 'User Management', icon: Settings, roles: ['admin'] },
];

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Sync dark mode class to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    getMe().then((u) => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  const handleLogin = async () => {
    const u = await getMe();
    setUser(u);
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setActiveView('dashboard');
    setSelectedVehicleId(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/20">
              <Truck className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 blur-xl -z-10 animate-pulse" />
          </div>
          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading fleet system...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  if (user.mustChangePassword) {
    return (
      <ForceChangePassword
        onChanged={() => setUser({ ...user, mustChangePassword: false })}
        onLogout={handleLogout}
      />
    );
  }

  const role = user.role;
  const roleBadge = ROLE_BADGES[role] || ROLE_BADGES.viewer;
  const RoleBadgeIcon = roleBadge.icon;

  const handleSelectVehicle = (id: string) => {
    setSelectedVehicleId(id);
    setActiveView('vehicle');
    setIsSidebarOpen(false);
  };

  const handleNavigate = (view: View) => {
    setActiveView(view);
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex">
      {/* ── Mobile overlay ──────────────────────────────────────────────────── */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-50 lg:z-0 h-full lg:h-screen w-[280px] flex flex-col flex-shrink-0',
          'bg-slate-900 dark:bg-slate-950 border-r border-slate-800/50',
          'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Sidebar glow */}
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(ellipse_at_top,#34d399,transparent_60%)] pointer-events-none" />

        {/* Brand */}
        <div className="relative px-6 pt-8 pb-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-lg text-white leading-tight">Degoony</h1>
              <p className="text-xs text-slate-400">Evergreen Logistics</p>
            </div>
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="absolute top-6 right-4 p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item, idx) => {
            if (item.roles && !item.roles.includes(role)) return null;
            const isActive = activeView === item.view;
            const Icon = item.icon;
            return (
              <button
                key={item.view}
                onClick={() => handleNavigate(item.view)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-[1.02] will-change-transform'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                )}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <Icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-white' : 'text-slate-500')} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="relative px-4 py-5 border-t border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-lg shadow-emerald-500/10">
              {user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.displayName}</p>
              <div className="flex items-center gap-1.5 mt-1">
            <span className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border border-white/10',
              'bg-gradient-to-r text-white/90',
              roleBadge.color
            )}>
                  <RoleBadgeIcon className="w-2.5 h-2.5" />
                  {roleBadge.label}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-500 hover:text-white transition-all duration-200"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Area ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              {/* Breadcrumb-ish area */}
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <span className="text-slate-400">Degoony</span>
                <ChevronLeft className="w-3 h-3 text-slate-300 rotate-180" />
                <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                  {activeView === 'vehicle' ? 'Vehicle Profile' : NAV_ITEMS.find(n => n.view === activeView)?.label || activeView}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-200"
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className={cn('w-2 h-2 rounded-full bg-emerald-500 animate-pulse')} />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-x-auto">
          {activeView === 'dashboard' && <FleetDashboard onSelectVehicle={handleSelectVehicle} role={role} />}
          {activeView === 'analytics' && <AnalyticsDashboard />}
          {activeView === 'drivers' && <DriverManagement role={role} />}
          {activeView === 'inspections' && <InspectionsView role={role} />}
          {activeView === 'users' && <UserManagement />}
          {activeView === 'vehicle' && selectedVehicleId && (
            <VehicleProfile vehicleId={selectedVehicleId} onBack={() => handleNavigate('dashboard')} role={role} />
          )}
        </main>
      </div>
    </div>
  );
}


