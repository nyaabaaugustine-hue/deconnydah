import { useState, useEffect, type ReactNode } from 'react';
import { getMe, logout, type AuthUser } from '@/lib/apiClient';
import { AdminLogin } from '@/components/AdminLogin';
import { ForceChangePassword } from '@/components/ForceChangePassword';
import { FleetDashboard } from '@/components/FleetDashboard';
import { VehicleProfile } from '@/components/VehicleProfile';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { DriverManagement } from '@/components/DriverManagement';
import { InspectionsView } from '@/components/InspectionsView';
import { UserManagement } from '@/components/UserManagement';
import { AssignmentsView } from '@/components/AssignmentsView';
import { OperationsView } from '@/components/OperationsView';
import { MaintenanceView } from '@/components/MaintenanceView';
import { FuelView } from '@/components/FuelView';
import { ExpensesView } from '@/components/ExpensesView';
import { DocumentsView } from '@/components/DocumentsView';
import { AccidentsView } from '@/components/AccidentsView';
import { ReportsView } from '@/components/ReportsView';
import { NotificationsView } from '@/components/NotificationsView';
import { SettingsView } from '@/components/SettingsView';
import { AuditView } from '@/components/AuditView';
import { LicensesView } from '@/components/LicensesView';
import { ContractsView } from '@/components/ContractsView';
import { EvaluationsView } from '@/components/EvaluationsView';
import { SparePartsView } from '@/components/SparePartsView';
import { SuppliersView } from '@/components/SuppliersView';
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
  ChevronDown,
  Menu,
  X,
  Truck,
  Moon,
  Sun,
  Car,
  UserCheck,
  ClipboardList,
  Wrench,
  Fuel,
  Wallet,
  FileText,
  AlertTriangle,
  BarChart3,
  Bell,
  ShieldAlert,
  FolderOpen,
  History,
} from 'lucide-react';

const ROLE_BADGES = {
  admin: { label: 'Admin', icon: ShieldCheck, color: 'from-red-500 to-red-600' },
  manager: { label: 'Manager', icon: Shield, color: 'from-blue-500 to-blue-600' },
  viewer: { label: 'Viewer', icon: Eye, color: 'from-slate-500 to-slate-600' },
};

type View =
  | 'dashboard' | 'analytics' | 'vehicle'
  | 'vehicles' | 'vehicle-categories' | 'vehicle-lifecycle'
  | 'drivers' | 'driver-licenses' | 'driver-contracts' | 'driver-evaluations'
  | 'assignments' | 'assignment-history'
  | 'operations' | 'work-orders' | 'usage-records' | 'scheduling'
  | 'maintenance' | 'services' | 'repairs' | 'spare-parts' | 'suppliers'
  | 'fuel'
  | 'expenses'
  | 'documents'
  | 'accidents'
  | 'reports'
  | 'notifications'
  | 'users'
  | 'settings'
  | 'audit';

interface NavChild { view: View; label: string; }
interface NavSection {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  children: NavChild[];
  roles?: string[];
}

const NAV_SECTIONS: NavSection[] = [
  { id: 'home', label: 'Dashboard', icon: LayoutDashboard, children: [{ view: 'dashboard', label: 'Overview' }] },
  {
    id: 'fleet', label: 'Fleet Management', icon: Truck,
    children: [
      { view: 'vehicles', label: 'Vehicles' },
      { view: 'vehicle-categories', label: 'Categories' },
      { view: 'assignments', label: 'Assignments' },
      { view: 'vehicle-lifecycle', label: 'Lifecycle' },
    ],
  },
  {
    id: 'drivers-section', label: 'Drivers', icon: Users,
    children: [
      { view: 'drivers', label: 'Driver List' },
      { view: 'driver-licenses', label: 'Licenses' },
      { view: 'driver-contracts', label: 'Contracts' },
      { view: 'driver-evaluations', label: 'Evaluations' },
    ],
  },
  {
    id: 'operations', label: 'Operations', icon: ClipboardList,
    children: [
      { view: 'work-orders', label: 'Work Orders' },
      { view: 'usage-records', label: 'Usage Records' },
      { view: 'scheduling', label: 'Scheduling' },
    ],
  },
  {
    id: 'maintenance', label: 'Maintenance', icon: Wrench,
    children: [
      { view: 'services', label: 'Services' },
      { view: 'repairs', label: 'Repairs' },
      { view: 'spare-parts', label: 'Spare Parts' },
      { view: 'suppliers', label: 'Suppliers' },
    ],
  },
  { id: 'fuel', label: 'Fuel Management', icon: Fuel, children: [{ view: 'fuel', label: 'Fuel Records' }] },
  { id: 'expenses', label: 'Expenses & Finance', icon: Wallet, children: [{ view: 'expenses', label: 'Expenses' }] },
  { id: 'documents', label: 'Documents', icon: FolderOpen, children: [{ view: 'documents', label: 'All Documents' }] },
  { id: 'accidents', label: 'Accidents & Incidents', icon: AlertTriangle, children: [{ view: 'accidents', label: 'Reports' }] },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, children: [{ view: 'reports', label: 'Reports' }, { view: 'analytics', label: 'Analytics' }] },
  { id: 'notifications', label: 'Notifications', icon: Bell, children: [{ view: 'notifications', label: 'All Notifications' }], roles: ['admin', 'manager'] },
  { id: 'users', label: 'Users & Roles', icon: UserCheck, children: [{ view: 'users', label: 'User Management' }], roles: ['admin'] },
  { id: 'settings', label: 'Settings', icon: Settings, children: [{ view: 'settings', label: 'System Settings' }], roles: ['admin'] },
  { id: 'audit', label: 'Audit Logs', icon: History, children: [{ view: 'audit', label: 'Activity Logs' }], roles: ['admin'] },
];

const VIEW_LABELS: Record<string, string> = {};
NAV_SECTIONS.forEach(s => {
  s.children.forEach(c => { VIEW_LABELS[c.view] = c.label; });
  VIEW_LABELS[s.id] = s.label;
});

function SidebarSection({
  section,
  activeView,
  onNavigate,
  role,
  expandedSections,
  onToggle,
}: {
  section: NavSection;
  activeView: View;
  onNavigate: (view: View) => void;
  role: string;
  expandedSections: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (section.roles && !section.roles.includes(role)) return null;

  const isExpanded = expandedSections.has(section.id);
  const hasActiveChild = section.children.some(c => c.view === activeView);
  const isDirectActive = section.children.length === 1 && section.children[0].view === activeView;
  const Icon = section.icon;

  if (section.children.length === 1) {
    const child = section.children[0];
    const isActive = activeView === child.view;
    return (
      <button
        onClick={() => onNavigate(child.view)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
            : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
        )}
      >
        <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-white' : 'text-slate-500')} />
        <span>{child.label}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => onToggle(section.id)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
          hasActiveChild
            ? 'text-white'
            : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
        )}
      >
        <Icon className={cn('w-4 h-4 flex-shrink-0', hasActiveChild ? 'text-emerald-400' : 'text-slate-500')} />
        <span className="flex-1 text-left">{section.label}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', isExpanded && 'rotate-180')} />
      </button>
      {isExpanded && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-800 pl-3">
          {section.children.map(child => {
            const isActive = activeView === child.view;
            return (
              <button
                key={child.view}
                onClick={() => onNavigate(child.view)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150',
                  isActive
                    ? 'bg-emerald-600/20 text-emerald-400'
                    : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', isActive ? 'bg-emerald-400' : 'bg-slate-600')} />
                <span>{child.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    return new Set(['home']);
  });
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

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
            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-xl shadow-emerald-500/20">
              <img src="/logo.png" alt="Degoony Evergreen Logistics" className="w-full h-full object-cover" />
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
    // Auto-expand the section containing this view
    for (const section of NAV_SECTIONS) {
      if (section.children.some(c => c.view === view)) {
        setExpandedSections(prev => {
          const next = new Set(prev);
          next.add(section.id);
          return next;
        });
        break;
      }
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-50 lg:z-0 h-full lg:h-screen w-[280px] flex flex-col flex-shrink-0',
          'bg-slate-900 dark:bg-slate-950 border-r border-slate-800/50',
          'transition-all duration-300',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(ellipse_at_top,#34d399,transparent_60%)] pointer-events-none" />

        <div className="relative px-6 pt-6 pb-4 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-emerald-500/10 flex-shrink-0">
              <img src="/logo.png" alt="Degoony" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base text-white leading-tight">Degoony</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Fleet ERP</p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_SECTIONS.map(section => (
            <SidebarSection
              key={section.id}
              section={section}
              activeView={activeView}
              onNavigate={handleNavigate}
              role={role}
              expandedSections={expandedSections}
              onToggle={toggleSection}
            />
          ))}
        </nav>

        <div className="relative px-3 py-4 border-t border-slate-800/50">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-lg shadow-emerald-500/10">
              {user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.displayName}</p>
              <span className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold border border-white/10 mt-0.5',
                'bg-gradient-to-r text-white/90',
                roleBadge.color
              )}>
                <RoleBadgeIcon className="w-2 h-2" />
                {roleBadge.label}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-all duration-200"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-4 lg:px-8 h-14">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <span className="text-slate-400">Degoony</span>
                <ChevronLeft className="w-3 h-3 text-slate-300 rotate-180" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {activeView === 'vehicle' ? 'Vehicle Profile' : VIEW_LABELS[activeView] || activeView}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-200"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Online</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 overflow-x-auto">
          {activeView === 'dashboard' && <FleetDashboard onSelectVehicle={handleSelectVehicle} role={role} />}
          {activeView === 'vehicle' && selectedVehicleId && (
            <VehicleProfile vehicleId={selectedVehicleId} onBack={() => handleNavigate('dashboard')} role={role} />
          )}
          {activeView === 'vehicles' && <FleetDashboard onSelectVehicle={handleSelectVehicle} role={role} />}
          {activeView === 'analytics' && <AnalyticsDashboard />}
          {activeView === 'drivers' && <DriverManagement role={role} />}
          {activeView === 'users' && <UserManagement />}
          {activeView === 'assignments' && <AssignmentsView role={role} />}
          {activeView === 'work-orders' && <OperationsView role={role} />}
          {activeView === 'maintenance' && <MaintenanceView role={role} />}
          {activeView === 'services' && <MaintenanceView role={role} />}
          {activeView === 'fuel' && <FuelView role={role} />}
          {activeView === 'expenses' && <ExpensesView role={role} />}
          {activeView === 'documents' && <DocumentsView role={role} />}
          {activeView === 'accidents' && <AccidentsView role={role} />}
          {activeView === 'reports' && <ReportsView />}
          {activeView === 'notifications' && <NotificationsView />}
          {activeView === 'settings' && <SettingsView />}
          {activeView === 'audit' && <AuditView />}
          {activeView === 'vehicle-categories' && <MaintenanceView role={role} />}
          {activeView === 'vehicle-lifecycle' && <MaintenanceView role={role} />}
          {activeView === 'driver-licenses' && <LicensesView role={role} />}
          {activeView === 'driver-contracts' && <ContractsView role={role} />}
          {activeView === 'driver-evaluations' && <EvaluationsView role={role} />}
          {activeView === 'assignment-history' && <AssignmentsView role={role} />}
          {activeView === 'usage-records' && <OperationsView role={role} />}
          {activeView === 'scheduling' && <OperationsView role={role} />}
          {activeView === 'repairs' && <MaintenanceView role={role} />}
          {activeView === 'spare-parts' && <SparePartsView role={role} />}
          {activeView === 'suppliers' && <SuppliersView role={role} />}
        </main>
      </div>
    </div>
  );
}
