import { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  User,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Loader2,
  AlertTriangle,
  X,
  Search,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { notify } from '../lib/notify';
import {
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getVehicles,
  getDrivers,
  canWrite,
  canDelete,
} from '@/lib/apiClient';
import type { VehicleAssignment } from '@/lib/apiClient';
import type { Vehicle, Driver } from '@/types/fleet';

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  active: {
    label: 'Active',
    color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  completed: {
    label: 'Completed',
    color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
};

const statVariants = {
  emerald: { gradient: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20' },
  blue: { gradient: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20' },
  slate: { gradient: 'from-slate-500 to-slate-600', shadow: 'shadow-slate-500/20' },
  indigo: { gradient: 'from-indigo-500 to-indigo-600', shadow: 'shadow-indigo-500/20' },
};

const filterTabs = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
] as const;

export function AssignmentsView({ role }: { role: string }) {
  const [assignments, setAssignments] = useState<VehicleAssignment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<VehicleAssignment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    vehicleId: '',
    driverId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    purpose: '',
    notes: '',
    status: 'active' as string,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [a, v, d] = await Promise.all([
          getAssignments(),
          getVehicles(),
          getDrivers(),
        ]);
        if (!cancelled) {
          setAssignments(a);
          setVehicles(v);
          setDrivers(d);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load assignments');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const vehicleMap = useMemo(() => {
    const map = new Map<string, Vehicle>();
    vehicles.forEach(v => map.set(v.id, v));
    return map;
  }, [vehicles]);

  const driverMap = useMemo(() => {
    const map = new Map<string, Driver>();
    drivers.forEach(d => map.set(d.id, d));
    return map;
  }, [drivers]);

  const filtered = useMemo(() => assignments.filter(a => {
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    if (!search) return matchesStatus;
    const q = search.toLowerCase();
    const vehicle = vehicleMap.get(a.vehicleId);
    const driver = driverMap.get(a.driverId);
    const vehicleLabel = vehicle ? `${vehicle.plateNumber} ${vehicle.make} ${vehicle.model}`.toLowerCase() : '';
    const driverLabel = driver?.fullName.toLowerCase() ?? a.driverName?.toLowerCase() ?? '';
    const purposeLabel = a.purpose.toLowerCase();
    return matchesStatus && (vehicleLabel.includes(q) || driverLabel.includes(q) || purposeLabel.includes(q));
  }), [assignments, statusFilter, search, vehicleMap, driverMap]);

  const stats = useMemo(() => ({
    total: assignments.length,
    active: assignments.filter(a => a.status === 'active').length,
    completed: assignments.filter(a => a.status === 'completed').length,
    cancelled: assignments.filter(a => a.status === 'cancelled').length,
  }), [assignments]);

  const resetForm = () => {
    setFormData({
      vehicleId: '',
      driverId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      purpose: '',
      notes: '',
      status: 'active',
    });
  };

  const openCreate = () => {
    setEditingAssignment(null);
    resetForm();
    setShowForm(true);
  };

  const openEdit = (a: VehicleAssignment) => {
    setEditingAssignment(a);
    setFormData({
      vehicleId: a.vehicleId,
      driverId: a.driverId,
      startDate: a.startDate,
      endDate: a.endDate ?? '',
      purpose: a.purpose,
      notes: a.notes,
      status: a.status,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.vehicleId || !formData.driverId || !formData.startDate || !formData.purpose) return;
    setSaving(true);
    try {
      const payload: Partial<VehicleAssignment> = {
        vehicleId: formData.vehicleId,
        driverId: formData.driverId,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        purpose: formData.purpose,
        notes: formData.notes,
        status: formData.status as VehicleAssignment['status'],
      };
      if (editingAssignment) {
        const updated = await updateAssignment(editingAssignment.id, payload);
        setAssignments(prev => prev.map(a => a.id === editingAssignment.id ? updated : a));
      } else {
        const created = await createAssignment(payload);
        setAssignments(prev => [created, ...prev]);
      }
      setShowForm(false);
      setEditingAssignment(null);
      resetForm();
      notify.success(editingAssignment ? 'Assignment updated' : 'Assignment created');
    } catch (err: any) {
      notify.error(err.message || 'Failed to save assignment');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (id: string) => {
    try {
      await deleteAssignment(id);
      setAssignments(prev => prev.filter(a => a.id !== id));
      setDeletingId(null);
      notify.success('Assignment deleted');
    } catch (err: any) {
      notify.error(err.message || 'Failed to delete assignment');
      setDeletingId(null);
    }
  };

  const formatDate = (d: string | undefined | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 blur-lg -z-10" />
        </div>
        <p className="text-sm font-medium text-slate-600">Loading assignments...</p>
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
        <h3 className="text-lg font-bold text-slate-900 mb-1">Failed to load assignments</h3>
        <p className="text-sm text-red-600 mb-6">{error}</p>
        <Button onClick={() => window.location.reload()} className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/20 rounded-xl">
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
              <Truck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Vehicle Assignments</h1>
              <p className="text-sm text-slate-300 mt-1">Assign vehicles to drivers and track active assignments.</p>
            </div>
          </div>
          {canWrite(role) && (
            <Button
              onClick={openCreate}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/25 rounded-xl transition-all duration-300 hover:shadow-emerald-500/40 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Assign Vehicle
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <MiniStat label="Total" value={stats.total} icon={Truck} variant="emerald" />
        <MiniStat label="Active" value={stats.active} icon={Calendar} variant="indigo" />
        <MiniStat label="Completed" value={stats.completed} icon={Pencil} variant="blue" />
        <MiniStat label="Cancelled" value={stats.cancelled} icon={AlertTriangle} variant="slate" />
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors duration-300" />
            <Input
              placeholder="Search by vehicle, driver, or purpose..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
            />
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-fit">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                'px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200',
                statusFilter === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              {tab.label}
              {tab.id !== 'all' && (
                <span className="ml-1.5 text-xs text-slate-400">
                  {tab.id === 'active' && stats.active}
                  {tab.id === 'completed' && stats.completed}
                  {tab.id === 'cancelled' && stats.cancelled}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Assignments Table ──────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mb-4">
            <Truck className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No assignments found</h3>
          <p className="text-sm text-slate-400 mt-1">
            {statusFilter !== 'all' ? 'Try changing the filter.' : 'Assign a vehicle to a driver to get started.'}
          </p>
        </div>
      ) : (
        <div className="group relative">
          <div className="p-[1px] rounded-2xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm">
            <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-inner overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Start Date</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">End Date</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden xl:table-cell">Purpose</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
                    {canWrite(role) && (
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => {
                    const vehicle = vehicleMap.get(a.vehicleId);
                    const driver = driverMap.get(a.driverId);
                    const cfg = statusConfig[a.status] || statusConfig.active;
                    return (
                      <TableRow key={a.id} className="border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/20 flex-shrink-0">
                              <Truck className="w-4 h-4 text-white" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                {vehicle?.plateNumber ?? a.vehicleId.slice(0, 8)}
                              </p>
                              <p className="text-xs text-slate-400 truncate">
                                {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : '—'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                              <User className="w-3.5 h-3.5 text-slate-500" />
                            </div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                              {driver?.fullName ?? a.driverName ?? '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formatDate(a.startDate)}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            {formatDate(a.endDate)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <span className="text-sm text-slate-600 dark:text-slate-400 truncate max-w-[200px] block">
                            {a.purpose}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border shadow-sm',
                            cfg.color
                          )}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                            {cfg.label}
                          </span>
                        </TableCell>
                        {canWrite(role) && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(a)}
                                className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all duration-200"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              {canDelete(role) && (
                                deletingId === a.id ? (
                                  <div className="flex gap-1">
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => confirmDelete(a.id)}
                                      className="h-8 px-2.5 rounded-xl text-xs"
                                    >
                                      <Trash2 className="w-3 h-3 mr-1" />
                                      Confirm
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setDeletingId(null)}
                                      className="h-8 w-8 p-0 rounded-xl"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeletingId(a.id)}
                                    className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* ── Create/Edit Modal ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => { setShowForm(false); setEditingAssignment(null); resetForm(); }}>
          <div className="w-full max-w-lg animate-in zoom-in-95 duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" onClick={(e) => e.stopPropagation()}>
            <div className="p-[1px] rounded-2xl bg-gradient-to-br from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-2xl shadow-black/20">
              <div className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      {editingAssignment ? <Pencil className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        {editingAssignment ? 'Edit Assignment' : 'New Vehicle Assignment'}
                      </CardTitle>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {editingAssignment ? 'Update assignment details' : 'Assign a vehicle to a driver'}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditingAssignment(null); resetForm(); }} className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>

                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Vehicle *</Label>
                      <Select value={formData.vehicleId} onValueChange={(v) => setFormData(prev => ({ ...prev, vehicleId: v }))}>
                        <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300">
                          <SelectValue placeholder="Select vehicle" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg max-h-60">
                          {vehicles.map(v => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.plateNumber} — {v.year} {v.make} {v.model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Driver *</Label>
                      <Select value={formData.driverId} onValueChange={(v) => setFormData(prev => ({ ...prev, driverId: v }))}>
                        <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300">
                          <SelectValue placeholder="Select driver" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg max-h-60">
                          {drivers.map(d => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.fullName} ({d.licenseNumber})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Start Date *</Label>
                      <Input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">End Date</Label>
                      <Input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Purpose *</Label>
                    <Input
                      value={formData.purpose}
                      onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                      placeholder="e.g. Daily route operations, delivery run..."
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes</Label>
                    <Input
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any additional notes..."
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                      <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => { setShowForm(false); setEditingAssignment(null); resetForm(); }}
                    className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving || !formData.vehicleId || !formData.driverId || !formData.startDate || !formData.purpose}
                    className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20 rounded-xl transition-all duration-300 active:scale-[0.98]"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : (editingAssignment ? <Pencil className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />)}
                    {editingAssignment ? 'Save Changes' : 'Create Assignment'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mini Stat ─────────────────────────────────────────────────────────────────

function MiniStat({ label, value, icon: Icon, variant }: {
  label: string;
  value: number;
  icon: typeof Truck;
  variant: keyof typeof statVariants;
}) {
  const cfg = statVariants[variant];
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
