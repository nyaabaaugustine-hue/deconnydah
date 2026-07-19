import { useState, useEffect } from 'react';
import { getMe, logout, type AuthUser, canWrite, canDelete } from '@/lib/apiClient';
import { AdminLogin } from '@/components/AdminLogin';
import { FleetDashboard } from '@/components/FleetDashboard';
import { VehicleProfile } from '@/components/VehicleProfile';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { DriverManagement } from '@/components/DriverManagement';
import { InspectionsView } from '@/components/InspectionsView';
import { UserManagement } from '@/components/UserManagement';
import { LogOut, Loader2, Shield, ShieldCheck, Eye } from 'lucide-react';

const ROLE_BADGES = {
  admin: { label: 'Admin', icon: ShieldCheck, color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  manager: { label: 'Manager', icon: Shield, color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  viewer: { label: 'Viewer', icon: Eye, color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
};

type View = 'dashboard' | 'analytics' | 'vehicle' | 'drivers' | 'inspections' | 'users';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm text-slate-500">Loading fleet system...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  const role = user.role;
  const roleBadge = ROLE_BADGES[role] || ROLE_BADGES.viewer;
  const RoleBadgeIcon = roleBadge.icon;

  const handleSelectVehicle = (id: string) => {
    setSelectedVehicleId(id);
    setActiveView('vehicle');
    setIsMenuOpen(false);
  };

  const handleNavigate = (view: View) => {
    setActiveView(view);
    setIsMenuOpen(false);
  };

  const navItems: { view: View; label: string; icon: string; roles?: string[] }[] = [
    {
      view: 'dashboard',
      label: 'Fleet Dashboard',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>',
    },
    {
      view: 'analytics',
      label: 'Analytics',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>',
    },
    {
      view: 'drivers',
      label: 'Drivers',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    },
    {
      view: 'inspections',
      label: 'Inspections',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>',
    },
    {
      view: 'users',
      label: 'Users',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      roles: ['admin'],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-slate-900 text-white sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <img src="/favicon.png" alt="Degoony Evergreen Logo" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-bold">Degoony Evergreen</span>
        </div>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          )}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`w-full lg:w-64 lg:min-h-screen bg-slate-900 text-white flex flex-col flex-shrink-0 transition-all duration-300 overflow-hidden ${
          isMenuOpen ? 'max-h-screen border-b border-slate-800' : 'max-h-0 lg:max-h-screen'
        }`}
      >
        <div className="p-6 border-b border-slate-800 hidden lg:block">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="Degoony Evergreen Logo" className="w-10 h-10 rounded-xl object-cover shadow-lg" />
            <div>
              <h1 className="font-bold text-lg leading-tight">Degoony</h1>
              <p className="text-xs text-slate-400">Evergreen Logistics</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            if (item.roles && !item.roles.includes(role)) return null;
            return (
              <button
                key={item.view}
                onClick={() => handleNavigate(item.view)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeView === item.view ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span dangerouslySetInnerHTML={{ __html: item.icon }} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold text-white">
              {user.displayName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.displayName}</p>
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${roleBadge.color}`}>
                  <RoleBadgeIcon className="w-2.5 h-2.5" />
                  {roleBadge.label}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-8 overflow-x-hidden">
        {activeView === 'dashboard' && <FleetDashboard onSelectVehicle={handleSelectVehicle} role={role} />}
        {activeView === 'analytics' && <AnalyticsDashboard />}
        {activeView === 'drivers' && <DriverManagement role={role} />}
        {activeView === 'inspections' && <InspectionsView role={role} />}
        {activeView === 'users' && <UserManagement />}
        {activeView === 'vehicle' && selectedVehicleId && (
          <VehicleProfile vehicleId={selectedVehicleId} onBack={() => handleNavigate('dashboard')} />
        )}
      </main>
    </div>
  );
}
