import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wrench,
  Plus,
  Calendar,
  DollarSign,
  Search,
  AlertTriangle,
  Clock,
  Package,
  Truck,
  Loader2,
  Star,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  getServiceLogsForVehicle,
  createServiceLog,
  getVehicles,
  getWorkOrders,
  getSpareParts,
  getServiceProviders,
  createSparePart,
  createServiceProvider,
  canWrite,
} from '@/lib/apiClient';
import type {
  WorkOrder,
  SparePart,
  ServiceProvider,
} from '@/lib/apiClient';
import type { ServiceLog, Vehicle } from '@/types/fleet';

// ── Config ────────────────────────────────────────────────────────────────────

const statVariants = {
  emerald: { gradient: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20' },
  blue: { gradient: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20' },
  amber: { gradient: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/20' },
  red: { gradient: 'from-red-500 to-red-600', shadow: 'shadow-red-500/20' },
  indigo: { gradient: 'from-indigo-500 to-indigo-600', shadow: 'shadow-indigo-500/20' },
};

const tabs = [
  { id: 'services', label: 'Services', icon: Wrench },
  { id: 'repairs', label: 'Repairs', icon: Wrench },
  { id: 'parts', label: 'Spare Parts', icon: Package },
  { id: 'suppliers', label: 'Suppliers', icon: Truck },
] as const;

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

const woStatusConfig: Record<string, { label: string; color: string; dot: string }> = {
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
  cancelled: {
    label: 'Cancelled',
    color: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatGH(n: number): string {
  return `GH₵${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string | undefined | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            'w-3.5 h-3.5',
            i < Math.round(rating)
              ? 'text-amber-400 fill-amber-400'
              : 'text-slate-200 dark:text-slate-700'
          )}
        />
      ))}
      {rating > 0 && (
        <span className="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

// ── Enriched Service Log ──────────────────────────────────────────────────────

interface EnrichedServiceLog extends ServiceLog {
  _vehicle?: Vehicle;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function MaintenanceView({ role }: { role: string }) {
  const [activeTab, setActiveTab] = useState<string>('services');

  // Data
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allServices, setAllServices] = useState<EnrichedServiceLog[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Dialog states
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showPartForm, setShowPartForm] = useState(false);
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Service form
  const [svcForm, setSvcForm] = useState({
    vehicleId: '',
    serviceDate: '',
    mileageKm: '',
    serviceType: '',
    partsReplaced: '',
    workshop: '',
    cost: '',
  });

  // Part form
  const [partForm, setPartForm] = useState({
    name: '',
    partNumber: '',
    category: '',
    quantity: '',
    minQuantity: '',
    unitCost: '',
    supplier: '',
    location: '',
  });

  // Provider form
  const [provForm, setProvForm] = useState({
    name: '',
    type: '',
    phone: '',
    email: '',
    address: '',
    specialties: '',
    rating: '',
    notes: '',
  });

  const canWriteRole = canWrite(role);

  // ── Data Loading ──────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const v = await getVehicles();
      setVehicles(v);

      const [wo, parts, provs] = await Promise.all([
        getWorkOrders(),
        getSpareParts(),
        getServiceProviders(),
      ]);
      setWorkOrders(wo);
      setSpareParts(parts);
      setProviders(provs);

      // Fetch service logs for every vehicle in parallel
      const serviceResults = await Promise.allSettled(
        v.map((veh) => getServiceLogsForVehicle(veh.id))
      );

      const enriched: EnrichedServiceLog[] = [];
      serviceResults.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          res.value.forEach((log) => {
            enriched.push({ ...log, _vehicle: v[idx] });
          });
        }
      });

      // Sort newest first
      enriched.sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
      setAllServices(enriched);
    } catch (err: any) {
      setError(err.message || 'Failed to load maintenance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Vehicle Map ───────────────────────────────────────────────────────────

  const vehicleMap = useMemo(() => {
    const map = new Map<string, Vehicle>();
    vehicles.forEach((v) => map.set(v.id, v));
    return map;
  }, [vehicles]);

  // ── Summary Stats ─────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalCost = allServices.reduce((sum, s) => sum + (s.cost || 0), 0);
    const lowStock = spareParts.filter((p) => (p.quantity ?? 0) <= (p.minQuantity ?? 0)).length;
    const activeWO = workOrders.filter(
      (wo) => wo.status === 'pending' || wo.status === 'in_progress'
    ).length;
    return {
      totalServices: allServices.length,
      totalCost,
      lowStock,
      activeWO,
    };
  }, [allServices, spareParts, workOrders]);

  // ── Filtered Services ─────────────────────────────────────────────────────

  const filteredServices = useMemo(() => {
    if (!search) return allServices;
    const q = search.toLowerCase();
    return allServices.filter((s) => {
      const v = vehicleMap.get(s.vehicleId);
      const vLabel = v
        ? `${v.plateNumber} ${v.make} ${v.model}`.toLowerCase()
        : '';
      return (
        s.serviceType.toLowerCase().includes(q) ||
        s.workshop.toLowerCase().includes(q) ||
        vLabel.includes(q)
      );
    });
  }, [allServices, search, vehicleMap]);

  // ── Filtered Repairs ──────────────────────────────────────────────────────

  const filteredRepairs = useMemo(() => {
    const visible = workOrders.filter(
      (wo) => wo.status === 'in_progress' || wo.status === 'completed'
    );
    if (!search) return visible;
    const q = search.toLowerCase();
    return visible.filter((wo) => {
      const v = vehicleMap.get(wo.vehicleId);
      const vLabel = v
        ? `${v.plateNumber} ${v.make} ${v.model}`.toLowerCase()
        : '';
      return (
        wo.title.toLowerCase().includes(q) ||
        wo.assignedTo.toLowerCase().includes(q) ||
        vLabel.includes(q)
      );
    });
  }, [workOrders, search, vehicleMap]);

  // ── Filtered Parts ────────────────────────────────────────────────────────

  const filteredParts = useMemo(() => {
    if (!search) return spareParts;
    const q = search.toLowerCase();
    return spareParts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.partNumber.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.supplier.toLowerCase().includes(q)
    );
  }, [spareParts, search]);

  // ── Filtered Providers ────────────────────────────────────────────────────

  const filteredProviders = useMemo(() => {
    if (!search) return providers;
    const q = search.toLowerCase();
    return providers.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        p.specialties.toLowerCase().includes(q)
    );
  }, [providers, search]);

  // ── Reset helpers ─────────────────────────────────────────────────────────

  const resetSearch = () => setSearch('');

  // ── Add Service ───────────────────────────────────────────────────────────

  const handleSaveService = async () => {
    if (!svcForm.vehicleId || !svcForm.serviceDate || !svcForm.serviceType) return;
    setSaving(true);
    try {
      const payload: Partial<ServiceLog> = {
        vehicleId: svcForm.vehicleId,
        serviceDate: svcForm.serviceDate,
        mileageKm: svcForm.mileageKm ? Number(svcForm.mileageKm) : 0,
        serviceType: svcForm.serviceType,
        partsReplaced: svcForm.partsReplaced,
        workshop: svcForm.workshop,
        cost: svcForm.cost ? Number(svcForm.cost) : 0,
      };
      const created = await createServiceLog(payload);
      const v = vehicleMap.get(payload.vehicleId!);
      setAllServices((prev) => [{ ...created, _vehicle: v }, ...prev]);
      setShowServiceForm(false);
      setSvcForm({
        vehicleId: '',
        serviceDate: '',
        mileageKm: '',
        serviceType: '',
        partsReplaced: '',
        workshop: '',
        cost: '',
      });
    } catch (err: any) {
      alert(err.message || 'Failed to save service log');
    } finally {
      setSaving(false);
    }
  };

  // ── Add Spare Part ────────────────────────────────────────────────────────

  const handleSavePart = async () => {
    if (!partForm.name || !partForm.partNumber) return;
    setSaving(true);
    try {
      const payload: Partial<SparePart> = {
        name: partForm.name,
        partNumber: partForm.partNumber,
        category: partForm.category,
        quantity: partForm.quantity ? Number(partForm.quantity) : 0,
        minQuantity: partForm.minQuantity ? Number(partForm.minQuantity) : 0,
        unitCost: partForm.unitCost ? Number(partForm.unitCost) : 0,
        supplier: partForm.supplier,
        location: partForm.location,
      };
      const created = await createSparePart(payload);
      setSpareParts((prev) => [created, ...prev]);
      setShowPartForm(false);
      setPartForm({
        name: '',
        partNumber: '',
        category: '',
        quantity: '',
        minQuantity: '',
        unitCost: '',
        supplier: '',
        location: '',
      });
    } catch (err: any) {
      alert(err.message || 'Failed to save spare part');
    } finally {
      setSaving(false);
    }
  };

  // ── Add Provider ──────────────────────────────────────────────────────────

  const handleSaveProvider = async () => {
    if (!provForm.name || !provForm.type) return;
    setSaving(true);
    try {
      const payload: Partial<ServiceProvider> = {
        name: provForm.name,
        type: provForm.type,
        phone: provForm.phone,
        email: provForm.email,
        address: provForm.address,
        specialties: provForm.specialties,
        rating: provForm.rating ? Number(provForm.rating) : 0,
        notes: provForm.notes,
      };
      const created = await createServiceProvider(payload);
      setProviders((prev) => [created, ...prev]);
      setShowProviderForm(false);
      setProvForm({
        name: '',
        type: '',
        phone: '',
        email: '',
        address: '',
        specialties: '',
        rating: '',
        notes: '',
      });
    } catch (err: any) {
      alert(err.message || 'Failed to save provider');
    } finally {
      setSaving(false);
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
        <p className="text-sm font-medium text-slate-600">Loading maintenance data...</p>
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
        <h3 className="text-lg font-bold text-slate-900 mb-1">Failed to load maintenance data</h3>
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
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_80%_70%,#10b981,transparent_50%)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 items-center justify-center shadow-lg">
              <Wrench className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Fleet Maintenance
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                Manage services, repairs, spare parts and suppliers.
              </p>
            </div>
          </div>
          {canWriteRole && activeTab === 'services' && (
            <Button
              onClick={() => setShowServiceForm(true)}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/25 rounded-xl transition-all duration-300 hover:shadow-emerald-500/40 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Service
            </Button>
          )}
          {canWriteRole && activeTab === 'parts' && (
            <Button
              onClick={() => setShowPartForm(true)}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/25 rounded-xl transition-all duration-300 hover:shadow-emerald-500/40 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Part
            </Button>
          )}
          {canWriteRole && activeTab === 'suppliers' && (
            <Button
              onClick={() => setShowProviderForm(true)}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/25 rounded-xl transition-all duration-300 hover:shadow-emerald-500/40 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Provider
            </Button>
          )}
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <MiniStat
          label="Total Services"
          value={stats.totalServices}
          icon={Wrench}
          variant="emerald"
        />
        <MiniStat
          label="Total Cost"
          value={formatGH(stats.totalCost)}
          icon={DollarSign}
          variant="blue"
        />
        <MiniStat
          label="Low Stock Parts"
          value={stats.lowStock}
          icon={AlertTriangle}
          variant="red"
        />
        <MiniStat
          label="Active Work Orders"
          value={stats.activeWO}
          icon={Clock}
          variant="amber"
        />
      </div>

      {/* ── Tab Navigation ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                resetSearch();
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200',
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Search Bar ──────────────────────────────────────────────────────── */}
      <div className="relative max-w-md group">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors duration-300" />
        <Input
          placeholder={
            activeTab === 'services'
              ? 'Search by service type or workshop...'
              : activeTab === 'repairs'
              ? 'Search by title, vehicle, or assignee...'
              : activeTab === 'parts'
              ? 'Search by name, part #, category...'
              : 'Search by name, type, or specialty...'
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
        />
      </div>

      {/* ── Services Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'services' && (
        <>
          {filteredServices.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No service records found"
              subtitle={search ? 'Try adjusting your search.' : 'Log your first service to get started.'}
            />
          ) : (
            <DataTable>
              <TableHeader>
                <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Service Type</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Workshop</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Cost</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right hidden xl:table-cell">Mileage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((svc) => {
                  const v = svc._vehicle || vehicleMap.get(svc.vehicleId);
                  return (
                    <TableRow
                      key={svc.id}
                      className="border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          {formatDate(svc.serviceDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {v ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/20 flex-shrink-0">
                              <Truck className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                {v.plateNumber}
                              </p>
                              <p className="text-xs text-slate-400 truncate">
                                {v.year} {v.make} {v.model}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold"
                        >
                          {svc.serviceType}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-slate-600 dark:text-slate-400 truncate block max-w-[180px]">
                          {svc.workshop || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {formatGH(svc.cost || 0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right hidden xl:table-cell">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {svc.mileageKm ? `${svc.mileageKm.toLocaleString()} km` : '—'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </DataTable>
          )}
        </>
      )}

      {/* ── Repairs Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'repairs' && (
        <>
          {filteredRepairs.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No repair orders found"
              subtitle={search ? 'Try adjusting your search.' : 'No in-progress or completed work orders.'}
            />
          ) : (
            <DataTable>
              <TableHeader>
                <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Vehicle</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Assigned To</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actual Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRepairs.map((wo) => {
                  const v = vehicleMap.get(wo.vehicleId);
                  const pCfg = priorityConfig[wo.priority] || priorityConfig.medium;
                  const sCfg = woStatusConfig[wo.status] || woStatusConfig.pending;
                  return (
                    <TableRow
                      key={wo.id}
                      className="border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
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
                        {v ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/20 flex-shrink-0">
                              <Truck className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                              {v.plateNumber}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border shadow-sm',
                            pCfg.color
                          )}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full', pCfg.dot)} />
                          {pCfg.label}
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
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-slate-600 dark:text-slate-400 truncate block max-w-[160px]">
                          {wo.assignedTo || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {wo.actualCost ? formatGH(wo.actualCost) : '—'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </DataTable>
          )}
        </>
      )}

      {/* ── Spare Parts Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'parts' && (
        <>
          {filteredParts.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No spare parts found"
              subtitle={search ? 'Try adjusting your search.' : 'Add your first spare part to get started.'}
            />
          ) : (
            <DataTable>
              <TableHeader>
                <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Part #</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Category</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Qty</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center hidden xl:table-cell">Min Qty</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Unit Cost</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden xl:table-cell">Supplier</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden 2xl:table-cell">Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParts.map((part) => {
                  const isLow = (part.quantity ?? 0) <= (part.minQuantity ?? 0);
                  return (
                    <TableRow
                      key={part.id}
                      className="border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isLow && (
                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          )}
                          <span className={cn('text-sm font-semibold', isLow ? 'text-red-700 dark:text-red-400' : 'text-slate-900 dark:text-white')}>
                            {part.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                          {part.partNumber || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge
                          variant="outline"
                          className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
                        >
                          {part.category || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            'inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 rounded-lg text-sm font-bold',
                            isLow
                              ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                              : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          )}
                        >
                          {part.quantity ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center hidden xl:table-cell">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {part.minQuantity ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {formatGH(part.unitCost || 0)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <span className="text-sm text-slate-600 dark:text-slate-400 truncate block max-w-[140px]">
                          {part.supplier || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden 2xl:table-cell">
                        <span className="text-sm text-slate-500 dark:text-slate-400 truncate block max-w-[140px]">
                          {part.location || '—'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </DataTable>
          )}
        </>
      )}

      {/* ── Suppliers Tab ───────────────────────────────────────────────────── */}
      {activeTab === 'suppliers' && (
        <>
          {filteredProviders.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No suppliers found"
              subtitle={search ? 'Try adjusting your search.' : 'Add your first service provider.'}
            />
          ) : (
            <DataTable>
              <TableHeader>
                <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Phone</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden xl:table-cell">Email</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden 2xl:table-cell">Specialties</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProviders.map((prov) => (
                  <TableRow
                    key={prov.id}
                    className="border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/20 flex-shrink-0">
                          <Truck className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                          {prov.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold"
                      >
                        {prov.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {prov.phone || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <span className="text-sm text-slate-500 dark:text-slate-400 truncate block max-w-[200px]">
                        {prov.email || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="hidden 2xl:table-cell">
                      <span className="text-sm text-slate-500 dark:text-slate-400 truncate block max-w-[200px]">
                        {prov.specialties || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Stars rating={prov.rating ?? 0} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTable>
          )}
        </>
      )}

      {/* ── Add Service Modal ──────────────────────────────────────────────────── */}
      {showServiceForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowServiceForm(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" onClick={(e) => e.stopPropagation()}>
            <div className="p-[1px] rounded-2xl bg-gradient-to-br from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-2xl shadow-black/20">
              <div className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner flex flex-col max-h-[90vh]">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <Wrench className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        Add Service Record
                      </CardTitle>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Log a vehicle maintenance service entry.
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowServiceForm(false)} className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Vehicle *
                    </Label>
                    <Select
                      value={svcForm.vehicleId}
                      onValueChange={(v) => setSvcForm((p) => ({ ...p, vehicleId: v }))}
                    >
                      <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300">
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg max-h-60">
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.plateNumber} — {v.year} {v.make} {v.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Service Date *
                      </Label>
                      <Input
                        type="date"
                        value={svcForm.serviceDate}
                        onChange={(e) => setSvcForm((p) => ({ ...p, serviceDate: e.target.value }))}
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Mileage (km)
                      </Label>
                      <Input
                        type="number"
                        value={svcForm.mileageKm}
                        onChange={(e) => setSvcForm((p) => ({ ...p, mileageKm: e.target.value }))}
                        placeholder="e.g. 45000"
                        min="0"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Service Type *
                    </Label>
                    <Input
                      value={svcForm.serviceType}
                      onChange={(e) => setSvcForm((p) => ({ ...p, serviceType: e.target.value }))}
                      placeholder="e.g. Oil Change, Brake Service, Engine Overhaul..."
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Parts Replaced
                    </Label>
                    <Textarea
                      value={svcForm.partsReplaced}
                      onChange={(e) => setSvcForm((p) => ({ ...p, partsReplaced: e.target.value }))}
                      placeholder="List any parts that were replaced..."
                      className="min-h-[80px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Workshop
                      </Label>
                      <Input
                        value={svcForm.workshop}
                        onChange={(e) => setSvcForm((p) => ({ ...p, workshop: e.target.value }))}
                        placeholder="e.g. AutoCare Garage"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Cost (GH₵)
                      </Label>
                      <Input
                        type="number"
                        value={svcForm.cost}
                        onChange={(e) => setSvcForm((p) => ({ ...p, cost: e.target.value }))}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowServiceForm(false)}
                    className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveService}
                    disabled={saving || !svcForm.vehicleId || !svcForm.serviceDate || !svcForm.serviceType}
                    className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20 rounded-xl transition-all duration-300 active:scale-[0.98]"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Save Service
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Spare Part Modal ──────────────────────────────────────────────── */}
      {showPartForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowPartForm(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" onClick={(e) => e.stopPropagation()}>
            <div className="p-[1px] rounded-2xl bg-gradient-to-br from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-2xl shadow-black/20">
              <div className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner flex flex-col max-h-[90vh]">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        Add Spare Part
                      </CardTitle>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Register a new spare part in inventory.
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowPartForm(false)} className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Name *
                      </Label>
                      <Input
                        value={partForm.name}
                        onChange={(e) => setPartForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. Oil Filter"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Part # *
                      </Label>
                      <Input
                        value={partForm.partNumber}
                        onChange={(e) => setPartForm((p) => ({ ...p, partNumber: e.target.value }))}
                        placeholder="e.g. OF-2024-A"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Category
                    </Label>
                    <Input
                      value={partForm.category}
                      onChange={(e) => setPartForm((p) => ({ ...p, category: e.target.value }))}
                      placeholder="e.g. Filters, Brakes, Electrical..."
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Quantity
                      </Label>
                      <Input
                        type="number"
                        value={partForm.quantity}
                        onChange={(e) => setPartForm((p) => ({ ...p, quantity: e.target.value }))}
                        placeholder="0"
                        min="0"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Min Qty
                      </Label>
                      <Input
                        type="number"
                        value={partForm.minQuantity}
                        onChange={(e) => setPartForm((p) => ({ ...p, minQuantity: e.target.value }))}
                        placeholder="0"
                        min="0"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Unit Cost (GH₵)
                      </Label>
                      <Input
                        type="number"
                        value={partForm.unitCost}
                        onChange={(e) => setPartForm((p) => ({ ...p, unitCost: e.target.value }))}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Supplier
                      </Label>
                      <Input
                        value={partForm.supplier}
                        onChange={(e) => setPartForm((p) => ({ ...p, supplier: e.target.value }))}
                        placeholder="e.g. AutoParts Ghana"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Storage Location
                      </Label>
                      <Input
                        value={partForm.location}
                        onChange={(e) => setPartForm((p) => ({ ...p, location: e.target.value }))}
                        placeholder="e.g. Warehouse A, Shelf 3"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowPartForm(false)}
                    className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSavePart}
                    disabled={saving || !partForm.name || !partForm.partNumber}
                    className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20 rounded-xl transition-all duration-300 active:scale-[0.98]"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Save Part
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Provider Modal ────────────────────────────────────────────────── */}
      {showProviderForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowProviderForm(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" onClick={(e) => e.stopPropagation()}>
            <div className="p-[1px] rounded-2xl bg-gradient-to-br from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-2xl shadow-black/20">
              <div className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner flex flex-col max-h-[90vh]">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <Truck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        Add Service Provider
                      </CardTitle>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Register a new supplier or workshop.
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowProviderForm(false)} className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Name *
                      </Label>
                      <Input
                        value={provForm.name}
                        onChange={(e) => setProvForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. AutoCare Garage"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Type *
                      </Label>
                      <Input
                        value={provForm.type}
                        onChange={(e) => setProvForm((p) => ({ ...p, type: e.target.value }))}
                        placeholder="e.g. Workshop, Parts Dealer..."
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Phone
                      </Label>
                      <Input
                        value={provForm.phone}
                        onChange={(e) => setProvForm((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="e.g. 024 123 4567"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Email
                      </Label>
                      <Input
                        type="email"
                        value={provForm.email}
                        onChange={(e) => setProvForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder="e.g. info@autocare.com"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Address
                    </Label>
                    <Input
                      value={provForm.address}
                      onChange={(e) => setProvForm((p) => ({ ...p, address: e.target.value }))}
                      placeholder="e.g. 123 Nkrumah Ave, Accra"
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Specialties
                    </Label>
                    <Input
                      value={provForm.specialties}
                      onChange={(e) => setProvForm((p) => ({ ...p, specialties: e.target.value }))}
                      placeholder="e.g. Engine repair, Electrical, Body work..."
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Rating (0-5)
                    </Label>
                    <Input
                      type="number"
                      value={provForm.rating}
                      onChange={(e) => setProvForm((p) => ({ ...p, rating: e.target.value }))}
                      placeholder="0"
                      min="0"
                      max="5"
                      step="0.5"
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Notes
                    </Label>
                    <Textarea
                      value={provForm.notes}
                      onChange={(e) => setProvForm((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Any additional notes about this provider..."
                      className="min-h-[80px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowProviderForm(false)}
                    className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveProvider}
                    disabled={saving || !provForm.name || !provForm.type}
                    className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20 rounded-xl transition-all duration-300 active:scale-[0.98]"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Save Provider
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
  icon: typeof Wrench;
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
