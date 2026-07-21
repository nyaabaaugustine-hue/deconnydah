import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Loader2,
  Plus,
  Fuel,
  DollarSign,
  TrendingDown,
  Search,
  Droplets,
  X,
  AlertTriangle,
  Calendar,
  Truck,
  CreditCard,
  Hash,
  Gauge,
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
import {
  getFuelEntries,
  createFuelEntry,
  getVehicles,
  getDrivers,
  canWrite,
  type FuelEntry,
} from '@/lib/apiClient';
import type { Vehicle, Driver } from '@/types/fleet';

// ── Config ────────────────────────────────────────────────────────────────────

const statVariants = {
  amber: { gradient: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/20' },
  orange: { gradient: 'from-orange-500 to-orange-600', shadow: 'shadow-orange-500/20' },
  emerald: { gradient: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20' },
  blue: { gradient: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20' },
};

const fuelTypeConfig: Record<string, { label: string; color: string; dot: string }> = {
  Diesel: {
    label: 'Diesel',
    color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  Petrol: {
    label: 'Petrol',
    color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatGH(n: number): string {
  return `GH\u20B5${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string | undefined | null): string {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Main Component ────────────────────────────────────────────────────────────

export function FuelView({ role }: { role: string }) {
  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [fuelTypeFilter, setFuelTypeFilter] = useState<string>('all');

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    vehicleId: '',
    driverId: '',
    fuelDate: new Date().toISOString().split('T')[0],
    station: '',
    fuelType: 'Diesel',
    liters: '',
    costPerLiter: '',
    totalCost: '',
    mileageKm: '',
    fuelCard: '',
    receiptNumber: '',
  });

  const canWriteRole = canWrite(role);

  // ── Data Loading ──────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fuel, vehs, drvs] = await Promise.all([
        getFuelEntries(),
        getVehicles(),
        getDrivers(),
      ]);
      fuel.sort((a, b) => new Date(b.fuelDate).getTime() - new Date(a.fuelDate).getTime());
      setEntries(fuel);
      setVehicles(vehs);
      setDrivers(drvs);
    } catch (err: any) {
      setError(err.message || 'Failed to load fuel data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Maps ──────────────────────────────────────────────────────────────────

  const vehicleMap = useMemo(() => {
    const map = new Map<string, Vehicle>();
    vehicles.forEach((v) => map.set(v.id, v));
    return map;
  }, [vehicles]);

  const driverMap = useMemo(() => {
    const map = new Map<string, Driver>();
    drivers.forEach((d) => map.set(d.id, d));
    return map;
  }, [drivers]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalCost = entries.reduce((sum, e) => sum + (e.totalCost || 0), 0);
    const totalLiters = entries.reduce((sum, e) => sum + (e.liters || 0), 0);
    const avgCostPerLiter = totalLiters > 0 ? totalCost / totalLiters : 0;
    return {
      totalEntries: entries.length,
      totalCost,
      totalLiters,
      avgCostPerLiter,
    };
  }, [entries]);

  // ── Filtered Entries ──────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const stationMatch =
        !search ||
        e.station.toLowerCase().includes(search.toLowerCase());
      const typeMatch =
        fuelTypeFilter === 'all' || e.fuelType === fuelTypeFilter;
      return stationMatch && typeMatch;
    });
  }, [entries, search, fuelTypeFilter]);

  // ── Auto-calculate total cost ─────────────────────────────────────────────

  const updateForm = (field: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'liters' || field === 'costPerLiter') {
        const liters = field === 'liters' ? Number(value) : Number(prev.liters);
        const costPerLiter = field === 'costPerLiter' ? Number(value) : Number(prev.costPerLiter);
        if (liters > 0 && costPerLiter > 0) {
          next.totalCost = (liters * costPerLiter).toFixed(2);
        } else {
          next.totalCost = '';
        }
      }
      return next;
    });
  };

  // ── Reset form ────────────────────────────────────────────────────────────

  const resetForm = () =>
    setForm({
      vehicleId: '',
      driverId: '',
      fuelDate: new Date().toISOString().split('T')[0],
      station: '',
      fuelType: 'Diesel',
      liters: '',
      costPerLiter: '',
      totalCost: '',
      mileageKm: '',
      fuelCard: '',
      receiptNumber: '',
    });

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.vehicleId || !form.fuelDate || !form.station || !form.fuelType || !form.liters) return;
    setSaving(true);
    try {
      const payload: Partial<FuelEntry> = {
        vehicleId: form.vehicleId,
        driverId: form.driverId || undefined,
        fuelDate: form.fuelDate,
        station: form.station,
        fuelType: form.fuelType,
        liters: Number(form.liters),
        costPerLiter: form.costPerLiter ? Number(form.costPerLiter) : 0,
        totalCost: form.totalCost ? Number(form.totalCost) : 0,
        mileageKm: form.mileageKm ? Number(form.mileageKm) : undefined,
        fuelCard: form.fuelCard,
        receiptNumber: form.receiptNumber,
      };
      const created = await createFuelEntry(payload);
      setEntries((prev) => [{ ...created }, ...prev].sort((a, b) => new Date(b.fuelDate).getTime() - new Date(a.fuelDate).getTime()));
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      alert(err.message || 'Failed to save fuel entry');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading State ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-amber-400/30 to-amber-600/30 blur-lg -z-10" />
        </div>
        <p className="text-sm font-medium text-slate-600">Loading fuel data...</p>
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
        <h3 className="text-lg font-bold text-slate-900 mb-1">Failed to load fuel data</h3>
        <p className="text-sm text-red-600 mb-6">{error}</p>
        <Button
          onClick={loadAll}
          className="bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-500/20 rounded-xl"
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950 p-8 shadow-xl">
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_20%_30%,white,transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_80%_70%,#f59e0b,transparent_50%)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 items-center justify-center shadow-lg">
              <Fuel className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Fuel Management
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                Track fuel purchases, costs, and consumption across your fleet.
              </p>
            </div>
          </div>
          {canWriteRole && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-lg shadow-amber-500/25 rounded-xl transition-all duration-300 hover:shadow-amber-500/40 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Fuel Entry
            </Button>
          )}
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <MiniStat
          label="Total Entries"
          value={stats.totalEntries}
          icon={Fuel}
          variant="amber"
        />
        <MiniStat
          label="Total Fuel Cost"
          value={formatGH(stats.totalCost)}
          icon={DollarSign}
          variant="orange"
        />
        <MiniStat
          label="Avg Cost/Liter"
          value={formatGH(stats.avgCostPerLiter)}
          icon={TrendingDown}
          variant="emerald"
        />
        <MiniStat
          label="Total Liters"
          value={stats.totalLiters.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          icon={Droplets}
          variant="blue"
        />
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors duration-300" />
          <Input
            placeholder="Search by station name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-300"
          />
        </div>
        <Select value={fuelTypeFilter} onValueChange={setFuelTypeFilter}>
          <SelectTrigger className="h-11 w-full sm:w-44 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl">
            <Droplets className="w-4 h-4 mr-2 text-slate-400" />
            <SelectValue placeholder="Filter by fuel type" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg">
            <SelectItem value="all">All Fuel Types</SelectItem>
            <SelectItem value="Diesel">Diesel</SelectItem>
            <SelectItem value="Petrol">Petrol</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Fuel}
          title="No fuel entries found"
          subtitle={
            search || fuelTypeFilter !== 'all'
              ? 'Try adjusting your filters.'
              : 'Add your first fuel entry to get started.'
          }
        />
      ) : (
        <DataTable>
          <TableHeader>
            <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Station</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fuel Type</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Liters</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right hidden lg:table-cell">Cost/Liter</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total Cost</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden xl:table-cell">Driver</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden 2xl:table-cell">Receipt #</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((entry) => {
              const v = vehicleMap.get(entry.vehicleId);
              const d = entry.driverId ? driverMap.get(entry.driverId) : null;
              const fCfg = fuelTypeConfig[entry.fuelType] || fuelTypeConfig.Diesel;
              return (
                <TableRow
                  key={entry.id}
                  className="border-slate-100 dark:border-slate-800/50 hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      {formatDate(entry.fuelDate)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {v ? (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-sm shadow-amber-500/20 flex-shrink-0">
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
                      <span className="text-sm text-slate-400">{'\u2014'}</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm text-slate-600 dark:text-slate-400 truncate block max-w-[180px]">
                      {entry.station || '\u2014'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border shadow-sm',
                        fCfg.color
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full', fCfg.dot)} />
                      {fCfg.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {(entry.liters || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </span>
                  </TableCell>
                  <TableCell className="text-right hidden lg:table-cell">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {entry.costPerLiter ? formatGH(entry.costPerLiter) : '\u2014'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {formatGH(entry.totalCost || 0)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <span className="text-sm text-slate-600 dark:text-slate-400 truncate block max-w-[140px]">
                      {d ? d.fullName : '\u2014'}
                    </span>
                  </TableCell>
                  <TableCell className="hidden 2xl:table-cell">
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-mono truncate block max-w-[120px]">
                      {entry.receiptNumber || '\u2014'}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </DataTable>
      )}

      {/* ── Add Fuel Entry Modal ──────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => { setShowForm(false); resetForm(); }}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" onClick={(e) => e.stopPropagation()}>
            <div className="p-[1px] rounded-2xl bg-gradient-to-br from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-2xl shadow-black/20">
              <div className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner flex flex-col max-h-[90vh]">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                      <Fuel className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        Add Fuel Entry
                      </CardTitle>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Log a fuel purchase for your fleet.
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); resetForm(); }} className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {/* Row: Vehicle + Driver */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Vehicle *
                      </Label>
                      <Select
                        value={form.vehicleId}
                        onValueChange={(v) => updateForm('vehicleId', v)}
                      >
                        <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-300">
                          <SelectValue placeholder="Select vehicle" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg max-h-60">
                          {vehicles.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.plateNumber} {'\u2014'} {v.year} {v.make} {v.model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Driver
                      </Label>
                      <Select
                        value={form.driverId}
                        onValueChange={(v) => updateForm('driverId', v)}
                      >
                        <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-300">
                          <SelectValue placeholder="Select driver (optional)" />
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
                  </div>

                  {/* Row: Fuel Date + Fuel Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Fuel Date *
                      </Label>
                      <Input
                        type="date"
                        value={form.fuelDate}
                        onChange={(e) => updateForm('fuelDate', e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Fuel Type *
                      </Label>
                      <Select
                        value={form.fuelType}
                        onValueChange={(v) => updateForm('fuelType', v)}
                      >
                        <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-300">
                          <SelectValue placeholder="Select fuel type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg">
                          <SelectItem value="Diesel">Diesel</SelectItem>
                          <SelectItem value="Petrol">Petrol</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Station */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Station *
                    </Label>
                    <Input
                      value={form.station}
                      onChange={(e) => updateForm('station', e.target.value)}
                      placeholder="e.g. GOIL Tamale, Shell Spintex..."
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-300"
                    />
                  </div>

                  {/* Row: Liters + Cost/Liter + Total Cost */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Liters *
                      </Label>
                      <Input
                        type="number"
                        value={form.liters}
                        onChange={(e) => updateForm('liters', e.target.value)}
                        placeholder="0.0"
                        min="0"
                        step="0.1"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Cost Per Liter (GH\u20B5)
                      </Label>
                      <Input
                        type="number"
                        value={form.costPerLiter}
                        onChange={(e) => updateForm('costPerLiter', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Total Cost (GH\u20B5)
                      </Label>
                      <Input
                        type="number"
                        value={form.totalCost}
                        onChange={(e) => updateForm('totalCost', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-300 font-semibold"
                      />
                    </div>
                  </div>

                  {/* Row: Mileage + Fuel Card + Receipt # */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Mileage (km)
                      </Label>
                      <Input
                        type="number"
                        value={form.mileageKm}
                        onChange={(e) => updateForm('mileageKm', e.target.value)}
                        placeholder="e.g. 45000"
                        min="0"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Fuel Card
                      </Label>
                      <Input
                        value={form.fuelCard}
                        onChange={(e) => updateForm('fuelCard', e.target.value)}
                        placeholder="e.g. GOIL Card #1234"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Receipt Number
                      </Label>
                      <Input
                        value={form.receiptNumber}
                        onChange={(e) => updateForm('receiptNumber', e.target.value)}
                        placeholder="e.g. RCT-2024-001"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => { setShowForm(false); resetForm(); }}
                    className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={saving || !form.vehicleId || !form.fuelDate || !form.station || !form.fuelType || !form.liters}
                    className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg shadow-amber-500/20 rounded-xl transition-all duration-300 active:scale-[0.98]"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Save Entry
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
  icon: typeof Fuel;
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
  icon: typeof Fuel;
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
