import { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Search,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  Plus,
  MoreVertical,
  User,
  Loader2,
  X,
  Shield,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  getVehicles,
  getDrivers,
  getDocumentsForVehicle,
  createVehicle,
  daysUntilExpiry,
  canWrite,
} from '@/lib/apiClient';
import type { Vehicle, Driver, VehicleDocument, VehicleStatus } from '@/types/fleet';

// ── Premium status configuration ──────────────────────────────────────────────

const statusConfig: Record<VehicleStatus, { label: string; dot: string; gradient: string; icon: typeof CheckCircle2 }> = {
  active: {
    label: 'Active',
    dot: 'bg-emerald-500',
    gradient: 'from-emerald-500/20 via-emerald-500/10 to-transparent',
    icon: CheckCircle2,
  },
  in_repair: {
    label: 'In Repair',
    dot: 'bg-amber-500',
    gradient: 'from-amber-500/20 via-amber-500/10 to-transparent',
    icon: Wrench,
  },
  decommissioned: {
    label: 'Decommissioned',
    dot: 'bg-slate-500',
    gradient: 'from-slate-500/20 via-slate-500/10 to-transparent',
    icon: X,
  },
  sold: {
    label: 'Sold',
    dot: 'bg-blue-500',
    gradient: 'from-blue-500/20 via-blue-500/10 to-transparent',
    icon: Shield,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getExpiryInfo(vehicleId: string, docType: string, documents: VehicleDocument[]) {
  const doc = documents.find(d => d.vehicleId === vehicleId && d.docType === docType);
  if (!doc || !doc.expiryDate) return { days: null, expired: false, soon: false };
  const days = daysUntilExpiry(doc.expiryDate);
  return { days, expired: days !== null && days < 0, soon: days !== null && days >= 0 && days <= 30 };
}

// ── Stat card variants ────────────────────────────────────────────────────────

const statCardVariants = {
  emerald: {
    gradient: 'from-emerald-600 to-emerald-500',
    lightBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  amber: {
    gradient: 'from-amber-600 to-amber-500',
    lightBg: 'bg-amber-50 dark:bg-amber-950/50',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  red: {
    gradient: 'from-red-600 to-red-500',
    lightBg: 'bg-red-50 dark:bg-red-950/50',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-300',
    iconBg: 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
  },
  slate: {
    gradient: 'from-slate-600 to-slate-500',
    lightBg: 'bg-slate-50 dark:bg-slate-950/50',
    border: 'border-slate-200 dark:border-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    iconBg: 'bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400',
    dot: 'bg-slate-500',
  },
};

// ── Main Component ────────────────────────────────────────────────────────────

export function FleetDashboard({ onSelectVehicle, role }: { onSelectVehicle: (id: string) => void; role: string }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showExpirySoon, setShowExpirySoon] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormData, setAddFormData] = useState({
    plateNumber: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    vin: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '',
  });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');

  // ── Data Loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [v, d] = await Promise.all([getVehicles(), getDrivers()]);
        if (cancelled) return;
        setVehicles(v);
        setDrivers(d);

        const docArrays = await Promise.all(v.map(veh => getDocumentsForVehicle(veh.id)));
        if (cancelled) return;
        setDocuments(docArrays.flat());
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load fleet data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Derived State ──────────────────────────────────────────────────────────

  const getDriver = (id: string | null | undefined): Driver | undefined => {
    if (!id) return undefined;
    return drivers.find(d => d.id === id);
  };

  const filtered = useMemo(() => {
    return vehicles.filter(v => {
      const matchesSearch = v.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
        v.make.toLowerCase().includes(search.toLowerCase()) ||
        v.model.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || v.status === statusFilter;

      if (showExpirySoon) {
        const ins = getExpiryInfo(v.id, 'insurance_policy', documents);
        const reg = getExpiryInfo(v.id, 'registration_certificate', documents);
        if (!ins.expired && !ins.soon && !reg.expired && !reg.soon) return false;
      }

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, showExpirySoon, vehicles, documents]);

  const stats = {
    total: vehicles.length,
    active: vehicles.filter(v => v.status === 'active').length,
    inRepair: vehicles.filter(v => v.status === 'in_repair').length,
    expiringSoon: vehicles.filter(v => {
      const ins = getExpiryInfo(v.id, 'insurance_policy', documents);
      const reg = getExpiryInfo(v.id, 'registration_certificate', documents);
      return ins.expired || ins.soon || reg.expired || reg.soon;
    }).length,
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleAddVehicle = async () => {
    if (!addFormData.plateNumber || !addFormData.make || !addFormData.model || !addFormData.vin) return;
    setAddSaving(true);
    setAddError('');
    try {
      const newVehicle = await createVehicle({
        plateNumber: addFormData.plateNumber,
        make: addFormData.make,
        model: addFormData.model,
        year: addFormData.year,
        vin: addFormData.vin,
        purchaseDate: addFormData.purchaseDate,
        purchasePrice: Number(addFormData.purchasePrice) || 0,
        status: 'active',
      });
      setVehicles(prev => [newVehicle, ...prev]);
      setShowAddModal(false);
      setAddFormData({ plateNumber: '', make: '', model: '', year: new Date().getFullYear(), vin: '', purchaseDate: new Date().toISOString().split('T')[0], purchasePrice: '' });
    } catch (err: any) {
      setAddError(err.message || 'Failed to add vehicle');
    } finally {
      setAddSaving(false);
    }
  };

  // ── Loading / Error States ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 blur-lg -z-10" />
        </div>
        <p className="text-sm font-medium text-slate-600">Loading fleet data...</p>
        <p className="text-xs text-slate-400 mt-1">Fetching vehicles, drivers, and documents</p>
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
        <h3 className="text-lg font-bold text-slate-900 mb-1">Failed to load fleet</h3>
        <p className="text-sm text-red-600 mb-6">{error}</p>
        <Button
          onClick={() => window.location.reload()}
          className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:shadow-emerald-500/30"
        >
          <Loader2 className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Premium Header Section ──────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-8 shadow-xl">
        {/* Ambient background glow */}
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_20%_30%,white,transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_80%_70%,#34d399,transparent_50%)]" />
        
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 items-center justify-center shadow-lg">
              <Truck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Fleet Overview</h1>
              <p className="text-sm text-slate-300 mt-1">
                Monitor vehicle status, compliance, and alerts across your fleet.
              </p>
            </div>
          </div>
          {canWrite(role) && (
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:shadow-emerald-500/40 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Vehicle
            </Button>
          )}
        </div>
      </div>

      {/* ── Premium Stats Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Total Vehicles"
          value={stats.total}
          icon={Truck}
          variant="emerald"
        />
        <StatCard
          label="Active"
          value={stats.active}
          icon={CheckCircle2}
          variant="emerald"
        />
        <StatCard
          label="In Repair"
          value={stats.inRepair}
          icon={Wrench}
          variant="amber"
        />
        <StatCard
          label="Expiring Soon"
          value={stats.expiringSoon}
          icon={AlertTriangle}
          variant={stats.expiringSoon > 0 ? 'red' : 'slate'}
        />
      </div>

      {/* ── Filters Section ─────────────────────────────────────────────────── */}
      <div className="relative">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 group">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors duration-300" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by plate, make, or model..."
              className="pl-10 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300 rounded-xl"
            />
          </div>
          <div className="flex gap-3">
            <div className="relative group">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11 w-full sm:w-44 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl transition-all duration-300 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-black/20">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">✅ Active</SelectItem>
                  <SelectItem value="in_repair">🔧 In Repair</SelectItem>
                  <SelectItem value="decommissioned">⛔ Decommissioned</SelectItem>
                  <SelectItem value="sold">💰 Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant={showExpirySoon ? 'default' : 'outline'}
              onClick={() => setShowExpirySoon(!showExpirySoon)}
              className={cn(
                'h-11 rounded-xl transition-all duration-300 border-slate-200 dark:border-slate-800',
                showExpirySoon
                  ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white border-transparent shadow-lg shadow-red-500/20'
                  : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
              )}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Expiring Soon
            </Button>
          </div>
        </div>
      </div>

      {/* ── Fleet Table ─────────────────────────────────────────────────────── */}
      <div className="relative">
        {/* Outer shell (double-bezel) */}
        <div className="p-1.5 rounded-2xl bg-gradient-to-br from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                    <TableHead className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-6 py-4">Plate Number</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-6 py-4">Make / Model</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-6 py-4">Status</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-6 py-4">Driver</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-6 py-4">Insurance</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-6 py-4">Registration</TableHead>
                    <TableHead className="text-right px-6 py-4">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-20">
                        <div className="flex flex-col items-center">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mb-4">
                            <Search className="w-7 h-7 text-slate-400" />
                          </div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No vehicles found</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try adjusting your search or filters.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((vehicle) => {
                      const cfg = statusConfig[vehicle.status];
                      const driver = getDriver(vehicle.currentDriverId);
                      const insInfo = getExpiryInfo(vehicle.id, 'insurance_policy', documents);
                      const regInfo = getExpiryInfo(vehicle.id, 'registration_certificate', documents);
                      const StatusIcon = cfg.icon;

                      return (
                        <TableRow
                          key={vehicle.id}
                          className="group cursor-pointer transition-all duration-200 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                          onClick={() => onSelectVehicle(vehicle.id)}
                        >
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center flex-shrink-0 group-hover:from-emerald-50 group-hover:to-emerald-100 dark:group-hover:from-emerald-900/30 dark:group-hover:to-emerald-800/30 transition-all duration-300">
                                <Truck className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300" />
                              </div>
                              <span className="text-sm font-bold text-slate-900 dark:text-white font-mono tracking-tight">
                                {vehicle.plateNumber}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{vehicle.make} {vehicle.model}</p>
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{vehicle.year}</p>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r overflow-hidden" style={{ background: 'transparent' }}>
                              <div className={cn('absolute inset-0 opacity-10 rounded-xl', cfg.gradient)} />
                              <span className={cn('w-2 h-2 rounded-full relative', cfg.dot)} />
                              <span className={cn('relative', cfg === statusConfig.active && 'text-emerald-700 dark:text-emerald-400', cfg === statusConfig.in_repair && 'text-amber-700 dark:text-amber-400', cfg === statusConfig.decommissioned && 'text-slate-600 dark:text-slate-400', cfg === statusConfig.sold && 'text-blue-700 dark:text-blue-400')}>
                                {cfg.label}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
                                <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                              </div>
                              <span className="text-sm text-slate-600 dark:text-slate-400">
                                {driver ? driver.fullName : <span className="text-slate-400 dark:text-slate-600 italic text-xs">Unassigned</span>}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <ExpiryBadge info={insInfo} />
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <ExpiryBadge info={regInfo} />
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-all duration-200"
                                onClick={() => onSelectVehicle(vehicle.id)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Vehicle Modal ───────────────────────────────────────────────── */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Outer shell (double-bezel) */}
            <div className="p-1.5 rounded-2xl bg-gradient-to-br from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-2xl shadow-black/20">
              <div className="rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Plus className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add New Vehicle</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Enter the vehicle details below.</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddModal(false)}
                      className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Plate Number *</label>
                      <Input
                        value={addFormData.plateNumber}
                        onChange={(e) => setAddFormData(p => ({ ...p, plateNumber: e.target.value }))}
                        placeholder="GR-2841-21"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">VIN *</label>
                      <Input
                        value={addFormData.vin}
                        onChange={(e) => setAddFormData(p => ({ ...p, vin: e.target.value }))}
                        placeholder="JTEBN14J1M0123456"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Make *</label>
                      <Input
                        value={addFormData.make}
                        onChange={(e) => setAddFormData(p => ({ ...p, make: e.target.value }))}
                        placeholder="Toyota"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Model *</label>
                      <Input
                        value={addFormData.model}
                        onChange={(e) => setAddFormData(p => ({ ...p, model: e.target.value }))}
                        placeholder="Hilux"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Year</label>
                      <Input
                        type="number"
                        value={addFormData.year}
                        onChange={(e) => setAddFormData(p => ({ ...p, year: Number(e.target.value) }))}
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Purchase Date</label>
                      <Input
                        type="date"
                        value={addFormData.purchaseDate}
                        onChange={(e) => setAddFormData(p => ({ ...p, purchaseDate: e.target.value }))}
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Purchase Price (GH₵)</label>
                      <Input
                        type="number"
                        value={addFormData.purchasePrice}
                        onChange={(e) => setAddFormData(p => ({ ...p, purchasePrice: e.target.value }))}
                        placeholder="380000"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </div>
                  {addError && (
                    <div className="px-4 py-3 rounded-xl bg-gradient-to-r from-red-50 to-red-50/50 dark:from-red-950/50 dark:to-red-900/30 border border-red-200 dark:border-red-800">
                      <p className="text-sm font-medium text-red-700 dark:text-red-400">{addError}</p>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddVehicle}
                    disabled={addSaving || !addFormData.plateNumber || !addFormData.make || !addFormData.model || !addFormData.vin}
                    className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20 rounded-xl transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {addSaving ? 'Adding...' : 'Add Vehicle'}
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

// ── Premium Stat Card Component ───────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  variant,
}: {
  label: string;
  value: number;
  icon: typeof Truck;
  variant: keyof typeof statCardVariants;
}) {
  const cfg = statCardVariants[variant];

  return (
    <div className="group relative">
      {/* Outer shell (double-bezel) */}
      <div className="p-[1px] rounded-2xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-300 group-hover:shadow-md">
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-inner transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                {label}
              </p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2 tracking-tight">
                {value}
              </p>
            </div>
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm transition-all duration-300 group-hover:scale-110', cfg.border, cfg.lightBg)}>
              <Icon className={cn('w-6 h-6', cfg.text)} />
            </div>
          </div>
          {/* Subtle gradient bar */}
          <div className={cn('mt-4 h-1 rounded-full bg-gradient-to-r opacity-60', cfg.gradient)} style={{ width: `${Math.min((value / 100) * 100, 100)}%` }} />
        </div>
      </div>
    </div>
  );
}

// ── Premium Expiry Badge ──────────────────────────────────────────────────────

function ExpiryBadge({ info }: { info: { days: number | null; expired: boolean; soon: boolean } }) {
  const { days, expired, soon } = info;

  if (days === null) return <span className="text-sm text-slate-400 dark:text-slate-500">—</span>;

  if (expired) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-red-50 to-red-50/50 dark:from-red-950/50 dark:to-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold border border-red-200 dark:border-red-800 shadow-sm">
        <AlertTriangle className="w-3 h-3" />
        Expired
      </span>
    );
  }

  if (soon) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-50 to-amber-50/50 dark:from-amber-950/50 dark:to-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-semibold border border-amber-200 dark:border-amber-800 shadow-sm">
        <AlertTriangle className="w-3 h-3" />
        {days}d
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-50 to-emerald-50/50 dark:from-emerald-950/50 dark:to-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-emerald-200 dark:border-emerald-800 shadow-sm">
      <CheckCircle2 className="w-3 h-3" />
      {days}d
    </span>
  );
}
