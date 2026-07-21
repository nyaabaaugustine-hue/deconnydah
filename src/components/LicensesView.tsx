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
  Award,
  ShieldCheck,
  FileText,
  Hash,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
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

interface DriverLicense {
  id: string;
  driverId: string;
  driverName?: string;
  licenseClass: string;
  licenseNumber: string;
  issueDate: string;
  expiryDate: string;
  issuingAuthority: string;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const statVariants = {
  emerald: { gradient: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20' },
  blue: { gradient: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20' },
  amber: { gradient: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/20' },
  red: { gradient: 'from-red-500 to-red-600', shadow: 'shadow-red-500/20' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string | undefined | null): string {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getExpiryStatus(expiryDate: string): 'valid' | 'expiring_soon' | 'expired' {
  const now = new Date();
  const expiry = new Date(expiryDate);
  if (expiry < now) return 'expired';
  const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 30) return 'expiring_soon';
  return 'valid';
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  valid: {
    label: 'Valid',
    color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  expiring_soon: {
    label: 'Expiring Soon',
    color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  expired: {
    label: 'Expired',
    color: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800',
    dot: 'bg-red-500',
  },
  suspended: {
    label: 'Suspended',
    color: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-500',
  },
};

// ── API stubs (to be replaced when apiClient adds these) ─────────────────────

async function getDriverLicenses(): Promise<DriverLicense[]> {
  const res = await fetch('/api/driver-licenses');
  if (!res.ok) throw new Error('Failed to load licenses');
  return res.json();
}

async function createDriverLicense(data: Partial<DriverLicense>): Promise<DriverLicense> {
  const res = await fetch('/api/driver-licenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to create license');
  return res.json();
}

async function updateDriverLicense(id: string, data: Partial<DriverLicense>): Promise<DriverLicense> {
  const res = await fetch(`/api/driver-licenses/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to update license');
  return res.json();
}

async function deleteDriverLicense(id: string): Promise<void> {
  const res = await fetch(`/api/driver-licenses/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete license');
}

// ── Main Component ────────────────────────────────────────────────────────────

export function LicensesView({ role }: { role: string }) {
  const [licenses, setLicenses] = useState<DriverLicense[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [showForm, setShowForm] = useState(false);
  const [editingLicense, setEditingLicense] = useState<DriverLicense | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    driverId: '',
    licenseClass: 'B',
    licenseNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    issuingAuthority: '',
    status: 'valid',
    notes: '',
  });

  const canWriteRole = canWrite(role);
  const canDeleteRole = canDelete(role);

  // ── Data Loading ──────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lic, drvs] = await Promise.all([
        getDriverLicenses(),
        getDrivers(),
      ]);
      lic.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLicenses(lic);
      setDrivers(drvs);
    } catch (err: any) {
      setError(err.message || 'Failed to load licenses');
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
    const now = new Date();
    const total = licenses.length;
    const valid = licenses.filter((l) => {
      const s = l.status === 'valid' ? getExpiryStatus(l.expiryDate) : l.status;
      return s === 'valid';
    }).length;
    const expiringSoon = licenses.filter((l) => getExpiryStatus(l.expiryDate) === 'expiring_soon').length;
    const expired = licenses.filter((l) => getExpiryStatus(l.expiryDate) === 'expired').length;
    return { total, valid, expiringSoon, expired };
  }, [licenses]);

  // ── Filtered ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return licenses.filter((l) => {
      const driverName = driverMap.get(l.driverId)?.fullName || l.driverName || '';
      const matchesSearch =
        !search ||
        driverName.toLowerCase().includes(search.toLowerCase()) ||
        l.licenseNumber.toLowerCase().includes(search.toLowerCase());
      const effectiveStatus = l.status === 'valid' ? getExpiryStatus(l.expiryDate) : l.status;
      const matchesStatus = statusFilter === 'all' || effectiveStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [licenses, search, statusFilter, driverMap]);

  // ── Form Handlers ─────────────────────────────────────────────────────────

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () =>
    setForm({
      driverId: '',
      licenseClass: 'B',
      licenseNumber: '',
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      issuingAuthority: '',
      status: 'valid',
      notes: '',
    });

  const openCreate = () => {
    resetForm();
    setEditingLicense(null);
    setShowForm(true);
  };

  const openEdit = (license: DriverLicense) => {
    setForm({
      driverId: license.driverId,
      licenseClass: license.licenseClass,
      licenseNumber: license.licenseNumber,
      issueDate: license.issueDate,
      expiryDate: license.expiryDate,
      issuingAuthority: license.issuingAuthority,
      status: license.status,
      notes: license.notes || '',
    });
    setEditingLicense(license);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.driverId || !form.licenseNumber || !form.issueDate || !form.expiryDate) return;
    setSaving(true);
    try {
      const payload: Partial<DriverLicense> = {
        driverId: form.driverId,
        licenseClass: form.licenseClass,
        licenseNumber: form.licenseNumber,
        issueDate: form.issueDate,
        expiryDate: form.expiryDate,
        issuingAuthority: form.issuingAuthority,
        status: form.status,
        notes: form.notes,
      };
      if (editingLicense) {
        const updated = await updateDriverLicense(editingLicense.id, payload);
        setLicenses((prev) => prev.map((l) => (l.id === editingLicense.id ? updated : l)));
      } else {
        const created = await createDriverLicense(payload);
        setLicenses((prev) => [created, ...prev]);
      }
      setShowForm(false);
      resetForm();
      setEditingLicense(null);
      notify.success(editingLicense ? 'License updated' : 'License created');
    } catch (err: any) {
      notify.error(err.message || 'Failed to save license');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDriverLicense(id);
      setLicenses((prev) => prev.filter((l) => l.id !== id));
      setDeletingId(null);
      notify.success('License deleted');
    } catch (err: any) {
      notify.error(err.message || 'Failed to delete license');
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
        <p className="text-sm font-medium text-slate-600">Loading licenses...</p>
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
        <h3 className="text-lg font-bold text-slate-900 mb-1">Failed to load licenses</h3>
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
              <Award className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Driver Licenses
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                Manage driver licenses, expiry dates, and compliance.
              </p>
            </div>
          </div>
          {canWriteRole && (
            <Button
              onClick={openCreate}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/25 rounded-xl transition-all duration-300 hover:shadow-emerald-500/40 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add License
            </Button>
          )}
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <MiniStat label="Total Licenses" value={stats.total} icon={Award} variant="emerald" />
        <MiniStat label="Valid" value={stats.valid} icon={CheckCircle2} variant="emerald" />
        <MiniStat label="Expiring Soon" value={stats.expiringSoon} icon={Clock} variant="amber" />
        <MiniStat label="Expired" value={stats.expired} icon={XCircle} variant="red" />
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors duration-300" />
          <Input
            placeholder="Search by driver name or license number..."
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
            <SelectItem value="valid">Valid</SelectItem>
            <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No licenses found"
          subtitle={
            search || statusFilter !== 'all'
              ? 'Try adjusting your filters.'
              : 'Add your first driver license to get started.'
          }
        />
      ) : (
        <DataTable>
          <TableHeader>
            <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Class</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">License #</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Issue Date</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiry Date</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Authority</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
              {canWriteRole && <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((license) => {
              const driver = driverMap.get(license.driverId);
              const effectiveStatus = license.status === 'valid' ? getExpiryStatus(license.expiryDate) : license.status;
              const sCfg = statusConfig[effectiveStatus] || statusConfig.valid;
              return (
                <TableRow
                  key={license.id}
                  className="border-slate-100 dark:border-slate-800/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/20 flex-shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {driver?.fullName || license.driverName || '\u2014'}
                        </p>
                        <p className="text-xs text-slate-400 truncate md:hidden font-mono">
                          {license.licenseNumber}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {license.licenseClass}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm text-slate-600 dark:text-slate-400 font-mono">
                      {license.licenseNumber}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      {formatDate(license.issueDate)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      {formatDate(license.expiryDate)}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-sm text-slate-500 dark:text-slate-400 truncate block max-w-[180px]">
                      {license.issuingAuthority || '\u2014'}
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
                        {deletingId === license.id ? (
                          <div className="flex gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(license.id)}
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
                              onClick={() => openEdit(license)}
                              className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all duration-200"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            {canDeleteRole && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingId(license.id)}
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

      {/* ── Add/Edit License Modal ──────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => { setShowForm(false); resetForm(); setEditingLicense(null); }}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 ease-smooth-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-[1px] rounded-2xl bg-gradient-to-br from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-2xl shadow-black/20">
              <div className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner flex flex-col max-h-[90vh]">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      {editingLicense ? <Pencil className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        {editingLicense ? 'Edit License' : 'Add New License'}
                      </CardTitle>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {editingLicense ? 'Update license information.' : 'Register a new driver license.'}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); resetForm(); setEditingLicense(null); }} className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {/* Row: Driver + License Class */}
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
                        License Class *
                      </Label>
                      <Select
                        value={form.licenseClass}
                        onValueChange={(v) => updateForm('licenseClass', v)}
                      >
                        <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300">
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg">
                          <SelectItem value="A">A - Motorcycle</SelectItem>
                          <SelectItem value="B">B - Light Vehicle</SelectItem>
                          <SelectItem value="C">C - Heavy Vehicle</SelectItem>
                          <SelectItem value="D">D - Bus</SelectItem>
                          <SelectItem value="E">E - Trailer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* License Number */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      License Number *
                    </Label>
                    <Input
                      value={form.licenseNumber}
                      onChange={(e) => updateForm('licenseNumber', e.target.value)}
                      placeholder="e.g. DL-2024-001"
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                    />
                  </div>

                  {/* Row: Issue Date + Expiry Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Issue Date *
                      </Label>
                      <Input
                        type="date"
                        value={form.issueDate}
                        onChange={(e) => updateForm('issueDate', e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Expiry Date *
                      </Label>
                      <Input
                        type="date"
                        value={form.expiryDate}
                        onChange={(e) => updateForm('expiryDate', e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </div>

                  {/* Row: Authority + Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Issuing Authority
                      </Label>
                      <Input
                        value={form.issuingAuthority}
                        onChange={(e) => updateForm('issuingAuthority', e.target.value)}
                        placeholder="e.g. DVLA Ghana"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
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
                          <SelectItem value="valid">Valid</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                    onClick={() => { setShowForm(false); resetForm(); setEditingLicense(null); }}
                    className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={saving || !form.driverId || !form.licenseNumber || !form.issueDate || !form.expiryDate}
                    className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20 rounded-xl transition-all duration-300 active:scale-[0.98]"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : editingLicense ? (
                      <Pencil className="w-4 h-4 mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {editingLicense ? 'Save Changes' : 'Add License'}
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
  icon: typeof Award;
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
  icon: typeof Award;
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
