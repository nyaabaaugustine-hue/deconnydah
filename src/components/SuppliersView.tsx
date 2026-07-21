import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  AlertTriangle,
  Store,
  Star,
  Phone,
  Mail,
  MapPin,
  Wrench,
  Car,
  Truck,
  Package,
  MoreHorizontal,
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
  getServiceProviders,
  createServiceProvider,
  updateServiceProvider,
  deleteServiceProvider,
  canWrite,
  canDelete,
  type ServiceProvider,
} from '@/lib/apiClient';

// ── Config ────────────────────────────────────────────────────────────────────

const statVariants = {
  emerald: { gradient: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20' },
  blue: { gradient: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20' },
  purple: { gradient: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/20' },
  amber: { gradient: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/20' },
};

const typeConfig: Record<string, { label: string; color: string; dot: string; icon: typeof Store }> = {
  workshop: {
    label: 'Workshop',
    color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
    icon: Wrench,
  },
  dealer: {
    label: 'Dealer',
    color: 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800',
    dot: 'bg-purple-500',
    icon: Car,
  },
  tow: {
    label: 'Tow Service',
    color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
    icon: Truck,
  },
  parts_store: {
    label: 'Parts Store',
    color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
    icon: Package,
  },
  other: {
    label: 'Other',
    color: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-500',
    icon: MoreHorizontal,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            'w-3.5 h-3.5',
            i <= rating
              ? 'text-amber-400 fill-amber-400'
              : 'text-slate-200 dark:text-slate-700'
          )}
        />
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function SuppliersView({ role }: { role: string }) {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ServiceProvider | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    type: 'workshop',
    phone: '',
    email: '',
    address: '',
    specialties: '',
    rating: '0',
    notes: '',
  });

  const canWriteRole = canWrite(role);
  const canDeleteRole = canDelete(role);

  // ── Data Loading ──────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getServiceProviders();
      data.sort((a, b) => a.name.localeCompare(b.name));
      setProviders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = providers.length;
    const workshops = providers.filter((p) => p.type === 'workshop').length;
    const partsStores = providers.filter((p) => p.type === 'parts_store').length;
    const dealers = providers.filter((p) => p.type === 'dealer').length;
    return { total, workshops, partsStores, dealers };
  }, [providers]);

  // ── Filtered ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return providers.filter((p) => {
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.phone.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' || p.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [providers, search, typeFilter]);

  // ── Form Handlers ─────────────────────────────────────────────────────────

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () =>
    setForm({
      name: '',
      type: 'workshop',
      phone: '',
      email: '',
      address: '',
      specialties: '',
      rating: '0',
      notes: '',
    });

  const openCreate = () => {
    resetForm();
    setEditingProvider(null);
    setShowForm(true);
  };

  const openEdit = (provider: ServiceProvider) => {
    setForm({
      name: provider.name,
      type: provider.type,
      phone: provider.phone,
      email: provider.email,
      address: provider.address,
      specialties: provider.specialties,
      rating: provider.rating?.toString() || '0',
      notes: provider.notes || '',
    });
    setEditingProvider(provider);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.type) return;
    setSaving(true);
    try {
      const payload: Partial<ServiceProvider> = {
        name: form.name,
        type: form.type,
        phone: form.phone,
        email: form.email,
        address: form.address,
        specialties: form.specialties,
        rating: form.rating ? Number(form.rating) : 0,
        notes: form.notes,
      };
      if (editingProvider) {
        const updated = await updateServiceProvider(editingProvider.id, payload);
        setProviders((prev) => prev.map((p) => (p.id === editingProvider.id ? updated : p)));
      } else {
        const created = await createServiceProvider(payload);
        setProviders((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setShowForm(false);
      resetForm();
      setEditingProvider(null);
      notify.success(editingProvider ? 'Supplier updated' : 'Supplier created');
    } catch (err: any) {
      notify.error(err.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteServiceProvider(id);
      setProviders((prev) => prev.filter((p) => p.id !== id));
      setDeletingId(null);
      notify.success('Supplier deleted');
    } catch (err: any) {
      notify.error(err.message || 'Failed to delete supplier');
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
        <p className="text-sm font-medium text-slate-600">Loading suppliers...</p>
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
        <h3 className="text-lg font-bold text-slate-900 mb-1">Failed to load suppliers</h3>
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
              <Store className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Suppliers
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                Service providers, workshops, and parts dealers.
              </p>
            </div>
          </div>
          {canWriteRole && (
            <Button
              onClick={openCreate}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/25 rounded-xl transition-all duration-300 hover:shadow-emerald-500/40 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Supplier
            </Button>
          )}
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <MiniStat label="Total Suppliers" value={stats.total} icon={Store} variant="emerald" />
        <MiniStat label="Workshops" value={stats.workshops} icon={Wrench} variant="blue" />
        <MiniStat label="Parts Stores" value={stats.partsStores} icon={Package} variant="amber" />
        <MiniStat label="Dealers" value={stats.dealers} icon={Car} variant="purple" />
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors duration-300" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-11 w-full sm:w-44 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="workshop">Workshop</SelectItem>
            <SelectItem value="dealer">Dealer</SelectItem>
            <SelectItem value="tow">Tow Service</SelectItem>
            <SelectItem value="parts_store">Parts Store</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No suppliers found"
          subtitle={
            search || typeFilter !== 'all'
              ? 'Try adjusting your filters.'
              : 'Add your first supplier to get started.'
          }
        />
      ) : (
        <DataTable>
          <TableHeader>
            <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Phone</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Email</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden xl:table-cell">Address</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden 2xl:table-cell">Specialties</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rating</TableHead>
              {canWriteRole && <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((provider) => {
              const tCfg = typeConfig[provider.type] || typeConfig.other;
              return (
                <TableRow
                  key={provider.id}
                  className="border-slate-100 dark:border-slate-800/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/20 flex-shrink-0">
                        <tCfg.icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">
                        {provider.name}
                      </p>
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
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      {provider.phone || '\u2014'}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-sm text-slate-500 dark:text-slate-400 truncate block max-w-[180px]">
                      {provider.email || '\u2014'}
                    </span>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <span className="text-sm text-slate-500 dark:text-slate-400 truncate block max-w-[160px]">
                      {provider.address || '\u2014'}
                    </span>
                  </TableCell>
                  <TableCell className="hidden 2xl:table-cell">
                    <span className="text-sm text-slate-500 dark:text-slate-400 truncate block max-w-[140px]">
                      {provider.specialties || '\u2014'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StarRating rating={provider.rating || 0} />
                  </TableCell>
                  {canWriteRole && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {deletingId === provider.id ? (
                          <div className="flex gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(provider.id)}
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
                              onClick={() => openEdit(provider)}
                              className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all duration-200"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            {canDeleteRole && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingId(provider.id)}
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

      {/* ── Add/Edit Supplier Modal ──────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => { setShowForm(false); resetForm(); setEditingProvider(null); }}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 ease-smooth-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-[1px] rounded-2xl bg-gradient-to-br from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-2xl shadow-black/20">
              <div className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner flex flex-col max-h-[90vh]">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      {editingProvider ? <Pencil className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        {editingProvider ? 'Edit Supplier' : 'Add New Supplier'}
                      </CardTitle>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {editingProvider ? 'Update supplier information.' : 'Register a new service provider.'}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); resetForm(); setEditingProvider(null); }} className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {/* Row: Name + Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Name *
                      </Label>
                      <Input
                        value={form.name}
                        onChange={(e) => updateForm('name', e.target.value)}
                        placeholder="e.g. Accra Auto Workshop"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Type *
                      </Label>
                      <Select
                        value={form.type}
                        onValueChange={(v) => updateForm('type', v)}
                      >
                        <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg">
                          <SelectItem value="workshop">Workshop</SelectItem>
                          <SelectItem value="dealer">Dealer</SelectItem>
                          <SelectItem value="tow">Tow Service</SelectItem>
                          <SelectItem value="parts_store">Parts Store</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Row: Phone + Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Phone
                      </Label>
                      <Input
                        value={form.phone}
                        onChange={(e) => updateForm('phone', e.target.value)}
                        placeholder="+233 24 000 0000"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Email
                      </Label>
                      <Input
                        value={form.email}
                        onChange={(e) => updateForm('email', e.target.value)}
                        placeholder="info@example.com"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Address
                    </Label>
                    <Input
                      value={form.address}
                      onChange={(e) => updateForm('address', e.target.value)}
                      placeholder="e.g. 123 Main St, Accra"
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                    />
                  </div>

                  {/* Specialties */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Specialties
                    </Label>
                    <Input
                      value={form.specialties}
                      onChange={(e) => updateForm('specialties', e.target.value)}
                      placeholder="e.g. Engine repair, Body work"
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                    />
                  </div>

                  {/* Rating */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Rating
                    </Label>
                    <Select
                      value={form.rating}
                      onValueChange={(v) => updateForm('rating', v)}
                    >
                      <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
                        <SelectValue placeholder="Select rating" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg">
                        <SelectItem value="0">No rating</SelectItem>
                        <SelectItem value="1">1 Star</SelectItem>
                        <SelectItem value="2">2 Stars</SelectItem>
                        <SelectItem value="3">3 Stars</SelectItem>
                        <SelectItem value="4">4 Stars</SelectItem>
                        <SelectItem value="5">5 Stars</SelectItem>
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
                    onClick={() => { setShowForm(false); resetForm(); setEditingProvider(null); }}
                    className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={saving || !form.name || !form.type}
                    className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20 rounded-xl transition-all duration-300 active:scale-[0.98]"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : editingProvider ? (
                      <Pencil className="w-4 h-4 mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {editingProvider ? 'Save Changes' : 'Add Supplier'}
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
  icon: typeof Store;
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
  icon: typeof Store;
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
