import { useState, useEffect, useMemo } from 'react';
import {
  Wrench,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Loader2,
  AlertTriangle,
  X,
  Search,
  Filter,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertOctagon,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  getWorkOrders,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  getVehicles,
  canWrite,
  canDelete,
} from '@/lib/apiClient';
import type { WorkOrder } from '@/lib/apiClient';
import type { Vehicle } from '@/types/fleet';

const priorityConfig: Record<string, { label: string; color: string; dot: string }> = {
  urgent: {
    label: 'Urgent',
    color: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800',
    dot: 'bg-red-500',
  },
  high: {
    label: 'High',
    color: 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800',
    dot: 'bg-orange-500',
  },
  medium: {
    label: 'Medium',
    color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  low: {
    label: 'Low',
    color: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
};

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  pending: {
    label: 'Pending',
    color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  approved: {
    label: 'Approved',
    color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800',
    dot: 'bg-indigo-500',
  },
  completed: {
    label: 'Completed',
    color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
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
  amber: { gradient: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/20' },
  indigo: { gradient: 'from-indigo-500 to-indigo-600', shadow: 'shadow-indigo-500/20' },
  slate: { gradient: 'from-slate-500 to-slate-600', shadow: 'shadow-slate-500/20' },
};

const filterTabs = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
] as const;

export function OperationsView({ role }: { role: string }) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    vehicleId: '',
    priority: 'medium' as string,
    assignedTo: '',
    estimatedCost: '',
    dueDate: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [wo, v] = await Promise.all([
          getWorkOrders(),
          getVehicles(),
        ]);
        if (!cancelled) {
          setWorkOrders(wo);
          setVehicles(v);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load work orders');
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

  const filtered = useMemo(() => workOrders.filter(wo => {
    const matchesStatus = statusFilter === 'all' || wo.status === statusFilter;
    if (!search) return matchesStatus;
    const q = search.toLowerCase();
    const vehicle = vehicleMap.get(wo.vehicleId);
    const vehicleLabel = vehicle ? `${vehicle.plateNumber} ${vehicle.make} ${vehicle.model}`.toLowerCase() : '';
    return matchesStatus && (
      wo.title.toLowerCase().includes(q) ||
      vehicleLabel.includes(q) ||
      wo.assignedTo.toLowerCase().includes(q) ||
      wo.description.toLowerCase().includes(q)
    );
  }), [workOrders, statusFilter, search, vehicleMap]);

  const stats = useMemo(() => ({
    total: workOrders.length,
    pending: workOrders.filter(wo => wo.status === 'pending').length,
    inProgress: workOrders.filter(wo => wo.status === 'in_progress').length,
    completed: workOrders.filter(wo => wo.status === 'completed').length,
  }), [workOrders]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      vehicleId: '',
      priority: 'medium',
      assignedTo: '',
      estimatedCost: '',
      dueDate: '',
    });
  };

  const openCreate = () => {
    setEditingOrder(null);
    resetForm();
    setShowForm(true);
  };

  const openEdit = (wo: WorkOrder) => {
    setEditingOrder(wo);
    setFormData({
      title: wo.title,
      description: wo.description,
      vehicleId: wo.vehicleId,
      priority: wo.priority,
      assignedTo: wo.assignedTo,
      estimatedCost: wo.estimatedCost ? String(wo.estimatedCost) : '',
      dueDate: wo.dueDate ?? '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.vehicleId) return;
    setSaving(true);
    try {
      const payload: Partial<WorkOrder> = {
        title: formData.title,
        description: formData.description,
        vehicleId: formData.vehicleId,
        priority: formData.priority as WorkOrder['priority'],
        assignedTo: formData.assignedTo,
        estimatedCost: formData.estimatedCost ? Number(formData.estimatedCost) : 0,
        dueDate: formData.dueDate || undefined,
      };
      if (editingOrder) {
        const updated = await updateWorkOrder(editingOrder.id, payload);
        setWorkOrders(prev => prev.map(wo => wo.id === editingOrder.id ? updated : wo));
      } else {
        const created = await createWorkOrder(payload);
        setWorkOrders(prev => [created, ...prev]);
      }
      setShowForm(false);
      setEditingOrder(null);
      resetForm();
      notify.success(editingOrder ? 'Work order updated' : 'Work order created');
    } catch (err: any) {
      notify.error(err.message || 'Failed to save work order');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (id: string) => {
    try {
      await deleteWorkOrder(id);
      setWorkOrders(prev => prev.filter(wo => wo.id !== id));
      setDeletingId(null);
      notify.success('Work order deleted');
    } catch (err: any) {
      notify.error(err.message || 'Failed to delete work order');
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
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-amber-400/30 to-amber-600/30 blur-lg -z-10" />
        </div>
        <p className="text-sm font-medium text-slate-600">Loading work orders...</p>
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
        <h3 className="text-lg font-bold text-slate-900 mb-1">Failed to load work orders</h3>
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950 p-8 shadow-xl">
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_20%_30%,white,transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_80%_70%,#f59e0b,transparent_50%)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 items-center justify-center shadow-lg">
              <Wrench className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Work Orders</h1>
              <p className="text-sm text-slate-300 mt-1">Manage maintenance work orders and service requests.</p>
            </div>
          </div>
          {canWrite(role) && (
            <Button
              onClick={openCreate}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-lg shadow-amber-500/25 rounded-xl transition-all duration-300 hover:shadow-amber-500/40 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Work Order
            </Button>
          )}
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <MiniStat label="Total Orders" value={stats.total} icon={ClipboardList} variant="slate" />
        <MiniStat label="Pending" value={stats.pending} icon={Clock} variant="amber" />
        <MiniStat label="In Progress" value={stats.inProgress} icon={Wrench} variant="indigo" />
        <MiniStat label="Completed" value={stats.completed} icon={CheckCircle2} variant="emerald" />
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors duration-300" />
            <Input
              placeholder="Search by title, vehicle, or assignee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-300"
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
                  {tab.id === 'pending' && stats.pending}
                  {tab.id === 'in_progress' && stats.inProgress}
                  {tab.id === 'completed' && stats.completed}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Work Orders Table ──────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mb-4">
            <Wrench className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No work orders found</h3>
          <p className="text-sm text-slate-400 mt-1">
            {statusFilter !== 'all' ? 'Try changing the filter.' : 'Create a work order to get started.'}
          </p>
        </div>
      ) : (
        <div className="group relative">
          <div className="p-[1px] rounded-2xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm">
            <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-inner overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Vehicle</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Assigned To</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden xl:table-cell">Due Date</TableHead>
                    {canWrite(role) && (
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((wo) => {
                    const vehicle = vehicleMap.get(wo.vehicleId);
                    const pCfg = priorityConfig[wo.priority] || priorityConfig.medium;
                    const sCfg = statusConfig[wo.status] || statusConfig.pending;
                    return (
                      <TableRow key={wo.id} className="border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <TableCell>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[220px]">
                              {wo.title}
                            </p>
                            <p className="text-xs text-slate-400 truncate max-w-[220px]">
                              {wo.description || 'No description'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/20 flex-shrink-0">
                              <ClipboardList className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                              {vehicle ? `${vehicle.plateNumber}` : wo.vehicleId.slice(0, 8)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border shadow-sm',
                            pCfg.color
                          )}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', pCfg.dot)} />
                            {pCfg.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border shadow-sm',
                            sCfg.color
                          )}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', sCfg.dot)} />
                            {sCfg.label}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm text-slate-600 dark:text-slate-400 truncate block max-w-[160px]">
                            {wo.assignedTo || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <div className={cn(
                            'flex items-center gap-1.5 text-sm',
                            wo.dueDate && new Date(wo.dueDate) < new Date() && wo.status !== 'completed' && wo.status !== 'cancelled'
                              ? 'text-red-600 dark:text-red-400 font-semibold'
                              : 'text-slate-500 dark:text-slate-400'
                          )}>
                            {wo.dueDate && new Date(wo.dueDate) < new Date() && wo.status !== 'completed' && wo.status !== 'cancelled' && (
                              <AlertTriangle className="w-3.5 h-3.5" />
                            )}
                            {formatDate(wo.dueDate)}
                          </div>
                        </TableCell>
                        {canWrite(role) && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(wo)}
                                className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all duration-200"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              {canDelete(role) && (
                                deletingId === wo.id ? (
                                  <div className="flex gap-1">
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => confirmDelete(wo.id)}
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
                                    onClick={() => setDeletingId(wo.id)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => { setShowForm(false); setEditingOrder(null); resetForm(); }}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 ease-smooth-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-[1px] rounded-2xl bg-gradient-to-br from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-2xl shadow-black/20">
              <div className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner flex flex-col max-h-[90vh]">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                      {editingOrder ? <Pencil className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        {editingOrder ? 'Edit Work Order' : 'New Work Order'}
                      </CardTitle>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {editingOrder ? 'Update work order details' : 'Create a maintenance work order'}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditingOrder(null); resetForm(); }} className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Title *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Brake pad replacement, Oil change..."
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the work to be done..."
                      className="min-h-[80px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-300"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Vehicle *</Label>
                      <Select value={formData.vehicleId} onValueChange={(v) => setFormData(prev => ({ ...prev, vehicleId: v }))}>
                        <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-300">
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
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Priority</Label>
                      <Select value={formData.priority} onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}>
                        <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg">
                          <SelectItem value="urgent">🔴 Urgent</SelectItem>
                          <SelectItem value="high">🟠 High</SelectItem>
                          <SelectItem value="medium">🟡 Medium</SelectItem>
                          <SelectItem value="low">⚪ Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Assigned To</Label>
                      <Input
                        value={formData.assignedTo}
                        onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                        placeholder="e.g. John's Garage, In-house team..."
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Estimated Cost</Label>
                      <Input
                        type="number"
                        value={formData.estimatedCost}
                        onChange={(e) => setFormData(prev => ({ ...prev, estimatedCost: e.target.value }))}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Due Date</Label>
                    <Input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => { setShowForm(false); setEditingOrder(null); resetForm(); }}
                    className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving || !formData.title || !formData.vehicleId}
                    className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg shadow-amber-500/20 rounded-xl transition-all duration-300 active:scale-[0.98]"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : (editingOrder ? <Pencil className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />)}
                    {editingOrder ? 'Save Changes' : 'Create Work Order'}
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
  icon: typeof Wrench;
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
