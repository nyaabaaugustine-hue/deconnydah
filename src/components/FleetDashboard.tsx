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
  ArrowRight,
  Loader2,
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

const statusConfig: Record<VehicleStatus, { label: string; color: string; dot: string }> = {
  active: { label: 'Active', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  in_repair: { label: 'In Repair', color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  decommissioned: { label: 'Decommissioned', color: 'text-slate-700 bg-slate-100 border-slate-200', dot: 'bg-slate-400' },
  sold: { label: 'Sold', color: 'text-blue-700 bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
};

function getExpiryInfo(vehicleId: string, docType: string, documents: VehicleDocument[]) {
  const doc = documents.find(d => d.vehicleId === vehicleId && d.docType === docType);
  if (!doc || !doc.expiryDate) return { days: null, expired: false, soon: false };
  const days = daysUntilExpiry(doc.expiryDate);
  return { days, expired: days !== null && days < 0, soon: days !== null && days >= 0 && days <= 30 };
}

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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [v, d] = await Promise.all([getVehicles(), getDrivers()]);
        if (cancelled) return;
        setVehicles(v);
        setDrivers(d);

        // Load documents for all vehicles in parallel
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-4" />
        <p className="text-sm text-slate-500">Loading fleet data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Failed to load fleet</h3>
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fleet Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor vehicle status, compliance, and alerts across your fleet.</p>
        </div>
        {canWrite(role) && (
          <Button onClick={() => setShowAddModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Vehicle
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Vehicles" value={stats.total} icon={Truck} tint="emerald" />
        <StatCard label="Active" value={stats.active} icon={CheckCircle2} tint="emerald" />
        <StatCard label="In Repair" value={stats.inRepair} icon={Wrench} tint="amber" />
        <StatCard label="Expiring Soon" value={stats.expiringSoon} icon={AlertTriangle} tint="red" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by plate, make, or model..."
            className="pl-10 bg-white border-slate-200"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-white border-slate-200">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="in_repair">In Repair</SelectItem>
            <SelectItem value="decommissioned">Decommissioned</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={showExpirySoon ? 'default' : 'outline'}
          onClick={() => setShowExpirySoon(!showExpirySoon)}
          className={cn(
            'border-slate-200',
            showExpirySoon ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' : 'bg-white hover:bg-slate-50'
          )}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Expiring Soon
        </Button>
      </div>

      {/* Fleet Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Plate Number</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Make / Model</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Current Driver</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Insurance Expiry</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Reg. Expiry</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-slate-400">
                    No vehicles found matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((vehicle) => {
                  const cfg = statusConfig[vehicle.status];
                  const driver = getDriver(vehicle.currentDriverId);
                  const insInfo = getExpiryInfo(vehicle.id, 'insurance_policy', documents);
                  const regInfo = getExpiryInfo(vehicle.id, 'registration_certificate', documents);

                  return (
                    <tr key={vehicle.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => onSelectVehicle(vehicle.id)}>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-900 font-mono">{vehicle.plateNumber}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Truck className="w-4 h-4 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{vehicle.make} {vehicle.model}</p>
                            <p className="text-xs text-slate-400">{vehicle.year}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border', cfg.color)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)}></span>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-sm text-slate-600">
                            {driver ? driver.fullName : <span className="text-slate-400 italic">Unassigned</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <ExpiryBadge info={insInfo} />
                      </td>
                      <td className="px-6 py-4">
                        <ExpiryBadge info={regInfo} />
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" onClick={() => onSelectVehicle(vehicle.id)}>
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Add New Vehicle</h2>
              <p className="text-sm text-slate-500 mt-1">Enter the vehicle details below.</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Plate Number *</label>
                  <Input value={addFormData.plateNumber} onChange={(e) => setAddFormData(p => ({ ...p, plateNumber: e.target.value }))} placeholder="GR-2841-21" className="bg-white border-slate-200" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">VIN *</label>
                  <Input value={addFormData.vin} onChange={(e) => setAddFormData(p => ({ ...p, vin: e.target.value }))} placeholder="VIN number" className="bg-white border-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Make *</label>
                  <Input value={addFormData.make} onChange={(e) => setAddFormData(p => ({ ...p, make: e.target.value }))} placeholder="Toyota" className="bg-white border-slate-200" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Model *</label>
                  <Input value={addFormData.model} onChange={(e) => setAddFormData(p => ({ ...p, model: e.target.value }))} placeholder="Hilux" className="bg-white border-slate-200" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Year</label>
                  <Input type="number" value={addFormData.year} onChange={(e) => setAddFormData(p => ({ ...p, year: Number(e.target.value) }))} className="bg-white border-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Purchase Date</label>
                  <Input type="date" value={addFormData.purchaseDate} onChange={(e) => setAddFormData(p => ({ ...p, purchaseDate: e.target.value }))} className="bg-white border-slate-200" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Purchase Price</label>
                  <Input type="number" value={addFormData.purchasePrice} onChange={(e) => setAddFormData(p => ({ ...p, purchasePrice: e.target.value }))} placeholder="380000" className="bg-white border-slate-200" />
                </div>
              </div>
              {addError && (
                <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700">{addError}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="border-slate-200">Cancel</Button>
              <Button
                onClick={handleAddVehicle}
                disabled={addSaving || !addFormData.plateNumber || !addFormData.make || !addFormData.model || !addFormData.vin}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {addSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Vehicle
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string;
  value: number;
  icon: typeof Truck;
  tint: 'emerald' | 'amber' | 'red';
}) {
  const tints = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    red: 'bg-red-50 text-red-600 border-red-100',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center border', tints[tint])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function ExpiryBadge({ info }: { info: { days: number | null; expired: boolean; soon: boolean } }) {
  const { days, expired, soon } = info;

  if (days === null) return <span className="text-sm text-slate-400">N/A</span>;

  if (expired) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 text-red-700 text-xs font-medium">
        <AlertTriangle className="w-3 h-3" />
        Expired ({Math.abs(days)}d ago)
      </span>
    );
  }

  if (soon) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium">
        <AlertTriangle className="w-3 h-3" />
        {days}d left
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 text-xs font-medium">
      <CheckCircle2 className="w-3 h-3" />
      {days}d left
    </span>
  );
}
