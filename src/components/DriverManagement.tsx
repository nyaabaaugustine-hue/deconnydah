import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Phone,
  X,
  Search,
  Loader2,
  AlertTriangle,
  User,
  ShieldCheck,
  Calendar,
  Award,
  CheckCircle2,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
  canWrite,
  canDelete,
} from '@/lib/apiClient';
import type { Driver } from '@/types/fleet';

const statusConfig: Record<string, { label: string; dot: string; gradient: string; icon: typeof CheckCircle2 }> = {
  active: { label: 'Active', dot: 'bg-emerald-500', gradient: 'from-emerald-500/20 via-emerald-500/10 to-transparent', icon: CheckCircle2 },
  inactive: { label: 'Inactive', dot: 'bg-slate-500', gradient: 'from-slate-500/20 via-slate-500/10 to-transparent', icon: X },
  on_leave: { label: 'On Leave', dot: 'bg-amber-500', gradient: 'from-amber-500/20 via-amber-500/10 to-transparent', icon: Calendar },
  terminated: { label: 'Terminated', dot: 'bg-red-500', gradient: 'from-red-500/20 via-red-500/10 to-transparent', icon: AlertTriangle },
};

export function DriverManagement({ role }: { role: string }) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getDrivers();
        if (!cancelled) setDrivers(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load drivers');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async (data: { fullName: string; phone: string; licenseNumber: string; hireDate: string; status: string }) => {
    try {
      if (editingDriver) {
        const updated = await updateDriver(editingDriver.id, data);
        setDrivers(prev => prev.map(d => d.id === editingDriver.id ? updated : d));
      } else {
        const created = await createDriver(data);
        setDrivers(prev => [...prev, created]);
      }
      setIsModalOpen(false);
      setEditingDriver(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save driver');
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async (id: string) => {
    try {
      await deleteDriver(id);
      setDrivers(prev => prev.filter(d => d.id !== id));
      setDeletingId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete driver');
      setDeletingId(null);
    }
  };

  const filteredDrivers = useMemo(() => drivers.filter(d => {
    const matchesSearch = d.fullName.toLowerCase().includes(search.toLowerCase()) || d.licenseNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [drivers, search, statusFilter]);

  // Premium loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 blur-lg -z-10" />
        </div>
        <p className="text-sm font-medium text-slate-600">Loading drivers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-red-400/30 to-red-600/30 blur-lg -z-10" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Failed to load drivers</h3>
        <p className="text-sm text-red-600 mb-6">{error}</p>
        <Button onClick={() => window.location.reload()} className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20 rounded-xl transition-all duration-300">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Premium Header ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-8 shadow-xl">
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_20%_30%,white,transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_80%_70%,#34d399,transparent_50%)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 items-center justify-center shadow-lg">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Driver Roster</h1>
              <p className="text-sm text-slate-300 mt-1">Manage driver profiles, licenses, and assignments.</p>
            </div>
          </div>
          {canWrite(role) && (
            <Button
              onClick={() => { setEditingDriver(null); setIsModalOpen(true); }}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/25 rounded-xl transition-all duration-300 hover:shadow-emerald-500/40 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Driver
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <MiniStat label="Total Drivers" value={drivers.length} icon={Users} variant="emerald" />
        <MiniStat label="Active" value={drivers.filter(d => d.status === 'active').length} icon={CheckCircle2} variant="emerald" />
        <MiniStat label="On Leave" value={drivers.filter(d => d.status === 'on_leave').length} icon={Calendar} variant="amber" />
        <MiniStat label="Inactive" value={drivers.filter(d => d.status === 'inactive').length} icon={X} variant="slate" />
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors duration-300" />
          <Input
            placeholder="Search by name or license..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-11 w-full sm:w-44 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl transition-all duration-300">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">✅ Active</SelectItem>
            <SelectItem value="on_leave">📅 On Leave</SelectItem>
            <SelectItem value="inactive">⛔ Inactive</SelectItem>
            <SelectItem value="terminated">🚫 Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Driver Cards Grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDrivers.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No drivers found</h3>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          filteredDrivers.map(driver => {
            const cfg = statusConfig[driver.status] || statusConfig.active;
            const initials = driver.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            return (
              <div key={driver.id} className="group relative">
                {/* Double-bezel card */}
                <div className="p-[1px] rounded-2xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:shadow-slate-200/50 dark:group-hover:shadow-black/20">
                  <div className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner transition-all duration-300">
                    {/* Top gradient bar */}
                    <div className={cn('h-1 bg-gradient-to-r opacity-60', cfg.gradient.replace('via-', '/10 via-').replace('to-', '/5 to-'))} />
                    
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3 pt-5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center font-bold text-lg border-2 border-slate-200 dark:border-slate-700 group-hover:border-emerald-200 dark:group-hover:border-emerald-800 transition-colors duration-300">
                            <span className="text-slate-700 dark:text-slate-300">{initials}</span>
                          </div>
                          <span className={cn('absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-[3px] border-white dark:border-slate-900', cfg.dot)} />
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold text-slate-900 dark:text-white">{driver.fullName}</CardTitle>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-mono">{driver.licenseNumber}</p>
                        </div>
                      </div>
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border shadow-sm',
                        driver.status === 'active' && 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
                        driver.status === 'on_leave' && 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
                        driver.status === 'inactive' && 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
                        driver.status === 'terminated' && 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800',
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                        {cfg.label}
                      </span>
                    </CardHeader>

                    <CardContent className="space-y-3 px-5 pb-5">
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{driver.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>ID: {driver.supervisorId ? driver.supervisorId.slice(0, 8) : 'Unassigned'}</span>
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        Hired: {new Date(driver.hireDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="flex gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        {canWrite(role) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setEditingDriver(driver); setIsModalOpen(true); }}
                            className="flex-1 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200"
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1.5" />
                            Edit
                          </Button>
                        )}
                        {canDelete(role) && (
                          deletingId === driver.id ? (
                            <div className="flex gap-1 flex-1">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => confirmDelete(driver.id)}
                                className="flex-1 rounded-xl transition-all duration-200"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                Confirm
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeletingId(null)}
                                className="flex-1 rounded-xl border-slate-200 dark:border-slate-700"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(driver.id)}
                              className="rounded-xl border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300 transition-all duration-200"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              Delete
                            </Button>
                          )
                        )}
                      </div>
                    </CardContent>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Modal ───────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <DriverFormModal
          driver={editingDriver}
          onSave={handleSave}
          onClose={() => { setIsModalOpen(false); setEditingDriver(null); }}
        />
      )}
    </div>
  );
}

// ── Mini Stat ─────────────────────────────────────────────────────────────────

const miniStatVariants = {
  emerald: { gradient: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20' },
  amber: { gradient: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/20' },
  slate: { gradient: 'from-slate-500 to-slate-600', shadow: 'shadow-slate-500/20' },
};

function MiniStat({ label, value, icon: Icon, variant }: {
  label: string;
  value: number;
  icon: typeof Users;
  variant: keyof typeof miniStatVariants;
}) {
  const cfg = miniStatVariants[variant];
  return (
    <div className="group relative">
      <div className="p-[1px] rounded-2xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-300 group-hover:shadow-md">
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-inner transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
            </div>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg transition-all duration-300 group-hover:scale-110', cfg.gradient, cfg.shadow)}>
              <Icon className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Driver Form Modal ─────────────────────────────────────────────────────────

function DriverFormModal({
  driver,
  onSave,
  onClose,
}: {
  driver: Driver | null;
  onSave: (d: { fullName: string; phone: string; licenseNumber: string; hireDate: string; status: string }) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    fullName: driver?.fullName ?? '',
    phone: driver?.phone ?? '',
    licenseNumber: driver?.licenseNumber ?? '',
    hireDate: driver?.hireDate ?? new Date().toISOString().split('T')[0],
    status: driver?.status ?? 'active',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      <div className="w-full max-w-lg animate-in zoom-in-95 duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" onClick={(e) => e.stopPropagation()}>
        <div className="p-[1px] rounded-2xl bg-gradient-to-br from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-2xl shadow-black/20">
          <div className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  {driver ? <Pencil className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                    {driver ? 'Edit Driver' : 'Add New Driver'}
                  </CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {driver ? 'Update driver information' : 'Fill in the driver details below'}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-5">
                <div className="flex flex-col items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center border-4 border-slate-200 dark:border-slate-700">
                    <User className="w-8 h-8 text-slate-500 dark:text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-400">Driver avatar</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</Label>
                  <Input id="fullName" value={formData.fullName} onChange={(e) => handleChange('fullName', e.target.value)} required placeholder="e.g. Kwame Mensah"
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</Label>
                    <Input id="phone" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} required placeholder="+233 24 000 0000"
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber" className="text-sm font-medium text-slate-700 dark:text-slate-300">License Number</Label>
                    <Input id="licenseNumber" value={formData.licenseNumber} onChange={(e) => handleChange('licenseNumber', e.target.value)} required placeholder="B.123456"
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hireDate" className="text-sm font-medium text-slate-700 dark:text-slate-300">Hire Date</Label>
                    <Input id="hireDate" type="date" value={formData.hireDate} onChange={(e) => handleChange('hireDate', e.target.value)} required
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</Label>
                    <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                      <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                        <SelectItem value="active">✅ Active</SelectItem>
                        <SelectItem value="on_leave">📅 On Leave</SelectItem>
                        <SelectItem value="inactive">⛔ Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={onClose}
                  className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20 rounded-xl transition-all duration-300 active:scale-[0.98]">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : (driver ? <Pencil className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />)}
                  {driver ? 'Save Changes' : 'Add Driver'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
