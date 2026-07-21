import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  AlertTriangle,
  Calendar,
  FileText,
  GraduationCap,
  Briefcase,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  getDrivers,
  canWrite,
  canDelete,
} from '@/lib/apiClient';
import type { Driver } from '@/types/fleet';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DriverContract {
  id: string;
  driverId: string;
  driverName?: string;
  contractType: string;
  startDate: string;
  endDate: string | null;
  education: string;
  qualifications: string;
  experienceYears: number;
  salary: number;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const statVariants = {
  emerald: { gradient: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20' },
  blue: { gradient: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20' },
  red: { gradient: 'from-red-500 to-red-600', shadow: 'shadow-red-500/20' },
  slate: { gradient: 'from-slate-500 to-slate-600', shadow: 'shadow-slate-500/20' },
};

const typeConfig: Record<string, { label: string; color: string; dot: string }> = {
  full_time: {
    label: 'Full Time',
    color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
  part_time: {
    label: 'Part Time',
    color: 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800',
    dot: 'bg-purple-500',
  },
  contract: {
    label: 'Contract',
    color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  probation: {
    label: 'Probation',
    color: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-500',
  },
};

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  active: {
    label: 'Active',
    color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  expired: {
    label: 'Expired',
    color: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800',
    dot: 'bg-red-500',
  },
  terminated: {
    label: 'Terminated',
    color: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-500',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string | undefined | null): string {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatGH(n: number): string {
  return `GH\u20B5${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── API stubs (to be replaced when apiClient adds these) ─────────────────────

async function getDriverContracts(): Promise<DriverContract[]> {
  const res = await fetch('/api/driver-contracts');
  if (!res.ok) throw new Error('Failed to load contracts');
  return res.json();
}

async function createDriverContract(data: Partial<DriverContract>): Promise<DriverContract> {
  const res = await fetch('/api/driver-contracts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to create contract');
  return res.json();
}

async function updateDriverContract(id: string, data: Partial<DriverContract>): Promise<DriverContract> {
  const res = await fetch(`/api/driver-contracts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to update contract');
  return res.json();
}

async function deleteDriverContract(id: string): Promise<void> {
  const res = await fetch(`/api/driver-contracts/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete contract');
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ContractsView({ role }: { role: string }) {
  const [contracts, setContracts] = useState<DriverContract[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [showForm, setShowForm] = useState(false);
  const [editingContract, setEditingContract] = useState<DriverContract | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    driverId: '',
    contractType: 'full_time',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    education: '',
    qualifications: '',
    experienceYears: '',
    salary: '',
    status: 'active',
    notes: '',
  });

  const canWriteRole = canWrite(role);
  const canDeleteRole = canDelete(role);

  // ── Data Loading ──────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cts, drvs] = await Promise.all([
        getDriverContracts(),
        getDrivers(),
      ]);
      cts.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      setContracts(cts);
      setDrivers(drvs);
    } catch (err: any) {
      setError(err.message || 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Driver Map ────────────────────────────────────────────────────────────

  const driverMap = useMemo(() => {
    const map = new Map<string, Driver>();
    drivers.forEach((d) => map.set(d.id, d));
    return map;
  }, [drivers]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = contracts.length;
    const active = contracts.filter((c) => c.status === 'active').length;
    const expired = contracts.filter((c) => c.status === 'expired').length;
    const terminated = contracts.filter((c) => c.status === 'terminated').length;
    return { total, active, expired, terminated };
  }, [contracts]);

  // ── Filtered ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      const driverName = driverMap.get(c.driverId)?.fullName || c.driverName || '';
      const matchesSearch =
        !search ||
        driverName.toLowerCase().includes(search.toLowerCase()) ||
        c.contractType.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [contracts, search, statusFilter, driverMap]);

  // ── Form Handlers ─────────────────────────────────────────────────────────

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () =>
    setForm({
      driverId: '',
      contractType: 'full_time',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      education: '',
      qualifications: '',
      experienceYears: '',
      salary: '',
      status: 'active',
      notes: '',
    });

  const openCreate = () => {
    resetForm();
    setEditingContract(null);
    setShowForm(true);
  };

  const openEdit = (contract: DriverContract) => {
    setForm({
      driverId: contract.driverId,
      contractType: contract.contractType,
      startDate: contract.startDate,
      endDate: contract.endDate || '',
      education: contract.education || '',
      qualifications: contract.qualifications || '',
      experienceYears: contract.experienceYears?.toString() || '',
      salary: contract.salary?.toString() || '',
      status: contract.status,
      notes: contract.notes || '',
    });
    setEditingContract(contract);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.driverId || !form.startDate || !form.status) return;
    setSaving(true);
    try {
      const payload: Partial<DriverContract> = {
        driverId: form.driverId,
        contractType: form.contractType,
        startDate: form.startDate,
        endDate: form.endDate || null,
        education: form.education,
        qualifications: form.qualifications,
        experienceYears: form.experienceYears ? Number(form.experienceYears) : 0,
        salary: form.salary ? Number(form.salary) : 0,
        status: form.status,
        notes: form.notes,
      };
      if (editingContract) {
        const updated = await updateDriverContract(editingContract.id, payload);
        setContracts((prev) => prev.map((c) => (c.id === editingContract.id ? updated : c)));
      } else {
        const created = await createDriverContract(payload);
        setContracts((prev) => [created, ...prev]);
      }
      setShowForm(false);
      resetForm();
      setEditingContract(null);
      notify.success(editingContract ? 'Contract updated' : 'Contract created');
    } catch (err: any) {
      notify.error(err.message || 'Failed to save contract');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDriverContract(id);
      setContracts((prev) => prev.filter((c) => c.id !== id));
      setDeletingId(null);
      notify.success('Contract deleted');
    } catch (err: any) {
      notify.error(err.message || 'Failed to delete contract');
      setDeletingId(null);
    }
  };

  // ── Loading State ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 blur-lg -z-10" />
        </div>
        <p className="text-sm font-medium text-slate-600">Loading contracts...</p>
      </div>
    );
  }

  // ── Error State ───────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-red-400/30 to-red-600/30 blur-lg -z-10" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Failed to load contracts</h3>
        <p className="text-sm text-red-600 mb-6">{error}</p>
        <Button
          onClick={loadAll}
          className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/20 rounded-xl"
        >
          Retry
        </Button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ── Premium Header ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-8 shadow-xl">
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_20%_30%,white,transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_80%_70%,#34d399,transparent_50%)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 items-center justify-center shadow-lg">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Contracts
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                Manage employment contracts, qualifications, and compensation.
              </p>
            </div>
          </div>
          {canWriteRole && (
            <Button
              onClick={openCreate}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/25 rounded-xl transition-all duration-300 hover:shadow-emerald-500/40 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Contract
            </Button>
          )}
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <MiniStat label="Total Contracts" value={stats.total} icon={FileText} variant="emerald" />
        <MiniStat label="Active" value={stats.active} icon={CheckCircle2} variant="emerald" />
        <MiniStat label="Expired" value={stats.expired} icon={XCircle} variant="red" />
        <MiniStat label="Terminated" value={stats.terminated} icon={Clock} variant="slate" />
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors duration-300" />
          <Input
            placeholder="Search by driver name or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-11 w-full sm:w-44 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No contracts found"
          subtitle={
            search || statusFilter !== 'all'
              ? 'Try adjusting your filters.'
              : 'Add your first contract to get started.'
          }
        />
      ) : (
        <DataTable>
          <TableHeader>
            <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Start Date</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">End Date</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden xl:table-cell">Education</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden xl:table-cell">Experience</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden 2xl:table-cell">Salary</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
              {canWriteRole && <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((contract) => {
              const driver = driverMap.get(contract.driverId);
              const tCfg = typeConfig[contract.contractType] || typeConfig.full_time;
              const sCfg = statusConfig[contract.status] || statusConfig.active;
              return (
                <TableRow
                  key={contract.id}
                  className="border-slate-100 dark:border-slate-800/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/20 flex-shrink-0">
                        <Briefcase className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {driver?.fullName || contract.driverName || '\u2014'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border shadow-sm',
                        tCfg.color
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full', tCfg.dot)} />
                      {tCfg.label}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      {formatDate(contract.startDate)}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {formatDate(contract.endDate)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <span className="text-sm text-slate-500 dark:text-slate-400 truncate block max-w-[140px]">
                      {contract.education || '\u2014'}
                    </span>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {contract.experienceYears ? `${contract.experienceYears} yrs` : '\u2014'}
                    </span>
                  </TableCell>
                  <TableCell className="hidden 2xl:table-cell">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {contract.salary ? formatGH(contract.salary) : '\u2014'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border shadow-sm',
                        sCfg.color
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full', sCfg.dot)} />
                      {sCfg.label}
                    </span>
                  </TableCell>
                  {canWriteRole && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {deletingId === contract.id ? (
                          <div className="flex gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(contract.id)}
                              className="rounded-xl transition-all duration-200"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              Confirm
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeletingId(null)}
                              className="rounded-xl border-slate-200 dark:border-slate-700"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(contract)}
                              className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all duration-200"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            {canDeleteRole && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingId(contract.id)}
                                className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </DataTable>
      )}

      {/* ── Add/Edit Contract Modal ──────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => { setShowForm(false); resetForm(); setEditingContract(null); }}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 ease-smooth-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-[1px] rounded-2xl bg-gradient-to-br from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-2xl shadow-black/20">
              <div className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner flex flex-col max-h-[90vh]">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      {editingContract ? <Pencil className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        {editingContract ? 'Edit Contract' : 'Add New Contract'}
                      </CardTitle>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {editingContract ? 'Update contract information.' : 'Create a new driver contract.'}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); resetForm(); setEditingContract(null); }} className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {/* Row: Driver + Contract Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Driver *
                      </Label>
                      <Select
                        value={form.driverId}
                        onValueChange={(v) => updateForm('driverId', v)}
                      >
                        <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300">
                          <SelectValue placeholder="Select driver" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg max-h-60">
                          {drivers.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Contract Type
                      </Label>
                      <Select
                        value={form.contractType}
                        onValueChange={(v) => updateForm('contractType', v)}
                      >
                        <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg">
                          <SelectItem value="full_time">Full Time</SelectItem>
                          <SelectItem value="part_time">Part Time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="probation">Probation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Row: Start Date + End Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Start Date *
                      </Label>
                      <Input
                        type="date"
                        value={form.startDate}
                        onChange={(e) => updateForm('startDate', e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        End Date
                      </Label>
                      <Input
                        type="date"
                        value={form.endDate}
                        onChange={(e) => updateForm('endDate', e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </div>

                  {/* Education */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Education
                    </Label>
                    <textarea
                      value={form.education}
                      onChange={(e) => updateForm('education', e.target.value)}
                      placeholder="Educational background..."
                      rows={2}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 resize-none transition-all duration-300"
                    />
                  </div>

                  {/* Qualifications */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Qualifications
                    </Label>
                    <textarea
                      value={form.qualifications}
                      onChange={(e) => updateForm('qualifications', e.target.value)}
                      placeholder="Professional qualifications..."
                      rows={2}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 resize-none transition-all duration-300"
                    />
                  </div>

                  {/* Row: Experience + Salary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Experience (years)
                      </Label>
                      <Input
                        type="number"
                        value={form.experienceYears}
                        onChange={(e) => updateForm('experienceYears', e.target.value)}
                        placeholder="0"
                        min="0"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Salary (GH\u20B5)
                      </Label>
                      <Input
                        type="number"
                        value={form.salary}
                        onChange={(e) => updateForm('salary', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </div>

                  {/* Row: Status */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Status *
                    </Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => updateForm('status', v)}
                    >
                      <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Notes
                    </Label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => updateForm('notes', e.target.value)}
                      placeholder="Additional notes..."
                      rows={3}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 resize-none transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => { setShowForm(false); resetForm(); setEditingContract(null); }}
                    className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={saving || !form.driverId || !form.startDate}
                    className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20 rounded-xl transition-all duration-300 active:scale-[0.98]"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : editingContract ? (
                      <Pencil className="w-4 h-4 mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {editingContract ? 'Save Changes' : 'Add Contract'}
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

// ── Reusable Sub-components ────────────────────────────────────────────────────

function DataTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="group relative">
      <div className="p-[1px] rounded-2xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm">
        <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-inner overflow-hidden">
          <Table>{children}</Table>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof FileText;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">{title}</h3>
      <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  variant,
}: {
  label: string;
  value: string | number;
  icon: typeof FileText;
  variant: keyof typeof statVariants;
}) {
  const cfg = statVariants[variant];
  return (
    <div className="group relative">
      <div className="p-[1px] rounded-2xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-300 group-hover:shadow-md">
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-inner transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                {label}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
            </div>
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg transition-all duration-300 group-hover:scale-110',
                cfg.gradient,
                cfg.shadow
              )}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
