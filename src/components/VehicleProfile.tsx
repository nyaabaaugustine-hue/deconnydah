import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  FileText,
  Wrench,
  Battery,
  CircleDot,
  DollarSign,
  AlertTriangle,
  Camera,
  TrendingUp,
  Truck,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getVehicle,
  getDriver,
  getDocumentsForVehicle,
  getServiceLogsForVehicle,
  getBatteryLogsForVehicle,
  getTyreLogsForVehicle,
  getRevenueForVehicle,
  getAccidentsForVehicle,
  getPhotosForVehicle,
  getValuationsForVehicle,
  daysUntilExpiry,
} from '@/lib/apiClient';
import type {
  Vehicle,
  Driver,
  VehicleDocument,
  ServiceLog,
  BatteryLog,
  TyreLog,
  RevenueEntry,
  AccidentReport,
  VehiclePhoto,
  Valuation,
  VehicleStatus,
} from '@/types/fleet';

const categories = [
  { id: 'overview', label: 'Overview', icon: Truck },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'service', label: 'Service History', icon: Wrench },
  { id: 'battery', label: 'Battery History', icon: Battery },
  { id: 'tyre', label: 'Tyre History', icon: CircleDot },
  { id: 'inspection', label: 'Daily Inspections', icon: FileText },
  { id: 'revenue', label: 'Revenue History', icon: DollarSign },
  { id: 'accidents', label: 'Accident Reports', icon: AlertTriangle },
  { id: 'photos', label: 'Photographs', icon: Camera },
  { id: 'valuation', label: 'Resale Valuation', icon: TrendingUp },
];

const statusConfig: Record<VehicleStatus, { label: string; color: string; dot: string }> = {
  active: { label: 'Active', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  in_repair: { label: 'In Repair', color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  decommissioned: { label: 'Decommissioned', color: 'text-slate-700 bg-slate-100 border-slate-200', dot: 'bg-slate-400' },
  sold: { label: 'Sold', color: 'text-blue-700 bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
};

export function VehicleProfile({ vehicleId, onBack }: { vehicleId: string; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [docs, setDocs] = useState<VehicleDocument[]>([]);
  const [services, setServices] = useState<ServiceLog[]>([]);
  const [batteries, setBatteries] = useState<BatteryLog[]>([]);
  const [tyres, setTyres] = useState<TyreLog[]>([]);
  const [revenue, setRevenue] = useState<RevenueEntry[]>([]);
  const [accidents, setAccidents] = useState<AccidentReport[]>([]);
  const [photos, setPhotos] = useState<VehiclePhoto[]>([]);
  const [vals, setVals] = useState<Valuation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const v = await getVehicle(vehicleId);
        if (cancelled) return;
        if (!v) { setError('Vehicle not found'); setLoading(false); return; }
        setVehicle(v);

        // Fetch driver + all sub-resources in parallel
        const [driverData, docsData, svcData, batData, tyrData, revData, accData, phoData, valData] = await Promise.all([
          v.currentDriverId ? getDriver(v.currentDriverId) : Promise.resolve(null),
          getDocumentsForVehicle(vehicleId),
          getServiceLogsForVehicle(vehicleId),
          getBatteryLogsForVehicle(vehicleId),
          getTyreLogsForVehicle(vehicleId),
          getRevenueForVehicle(vehicleId),
          getAccidentsForVehicle(vehicleId),
          getPhotosForVehicle(vehicleId),
          getValuationsForVehicle(vehicleId),
        ]);
        if (cancelled) return;
        setDriver(driverData);
        setDocs(docsData);
        setServices(svcData);
        setBatteries(batData);
        setTyres(tyrData);
        setRevenue(revData);
        setAccidents(accData);
        setPhotos(phoData);
        setVals(valData);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load vehicle');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [vehicleId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-4" />
        <p className="text-sm text-slate-500">Loading vehicle profile...</p>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">{error || 'Vehicle not found.'}</p>
        <Button onClick={onBack} className="mt-4">Back to Dashboard</Button>
      </div>
    );
  }

  const cfg = statusConfig[vehicle.status];
  const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
  const totalServiceCost = services.reduce((sum, s) => sum + s.cost, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack} className="bg-white border-slate-200 hover:bg-slate-50">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{vehicle.plateNumber}</h1>
            <p className="text-sm text-slate-500 mt-1">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
          </div>
        </div>
        <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border w-fit', cfg.color)}>
          <span className={cn('w-2 h-2 rounded-full', cfg.dot)}></span>
          {cfg.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1">
          <nav className="bg-white rounded-xl border border-slate-200 shadow-sm p-2 space-y-1 sticky top-4">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left',
                    activeTab === cat.id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 min-h-[400px]">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              {categories.find((c) => c.id === activeTab)?.label}
            </h2>

            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoCard label="Plate Number" value={vehicle.plateNumber} />
                  <InfoCard label="VIN" value={vehicle.vin} />
                  <InfoCard label="Purchase Date" value={new Date(vehicle.purchaseDate).toLocaleDateString()} />
                  <InfoCard label="Purchase Price" value={`GH\u20B5 ${vehicle.purchasePrice.toLocaleString()}`} />
                  <InfoCard label="Current Driver" value={driver?.fullName || 'Unassigned'} />
                  <InfoCard label="Status" value={cfg.label} />
                </div>
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <StatBox label="Total Revenue" value={`GH\u20B5 ${totalRevenue.toLocaleString()}`} color="emerald" />
                  <StatBox label="Service Costs" value={`GH\u20B5 ${totalServiceCost.toLocaleString()}`} color="amber" />
                  <StatBox label="Net Margin" value={`GH\u20B5 ${(totalRevenue - totalServiceCost).toLocaleString()}`} color={totalRevenue - totalServiceCost >= 0 ? 'emerald' : 'red'} />
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-3">
                {docs.length === 0 ? (
                  <EmptyState message="No documents on file" />
                ) : (
                  docs.map(doc => <DocumentRow key={doc.id} doc={doc} />)
                )}
              </div>
            )}

            {activeTab === 'service' && (
              <div className="space-y-3">
                {services.length === 0 ? (
                  <EmptyState message="No service records" />
                ) : (
                  services.map(svc => <ServiceRow key={svc.id} service={svc} />)
                )}
              </div>
            )}

            {activeTab === 'battery' && (
              <div className="space-y-3">
                {batteries.length === 0 ? (
                  <EmptyState message="No battery records" />
                ) : (
                  batteries.map(bat => <BatteryRow key={bat.id} battery={bat} />)
                )}
              </div>
            )}

            {activeTab === 'tyre' && (
              <div className="space-y-3">
                {tyres.length === 0 ? (
                  <EmptyState message="No tyre records" />
                ) : (
                  tyres.map(tyre => <TyreRow key={tyre.id} tyre={tyre} />)
                )}
              </div>
            )}

            {activeTab === 'inspection' && (
              <EmptyState message="Daily inspections will appear here" />
            )}

            {activeTab === 'revenue' && (
              <div className="space-y-3">
                {revenue.length === 0 ? (
                  <EmptyState message="No revenue records" />
                ) : (
                  revenue.map(rev => <RevenueRow key={rev.id} entry={rev} />)
                )}
              </div>
            )}

            {activeTab === 'accidents' && (
              <div className="space-y-3">
                {accidents.length === 0 ? (
                  <EmptyState message="No accident reports" />
                ) : (
                  accidents.map(acc => <AccidentRow key={acc.id} accident={acc} />)
                )}
              </div>
            )}

            {activeTab === 'photos' && (
              <div className="space-y-3">
                {photos.length === 0 ? (
                  <EmptyState message="No photographs" />
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {photos.map(photo => <PhotoCard key={photo.id} photo={photo} />)}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'valuation' && (
              <div className="space-y-3">
                {vals.length === 0 ? (
                  <EmptyState message="No valuations on file" />
                ) : (
                  vals.map(val => <ValuationRow key={val.id} valuation={val} />)
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: 'emerald' | 'amber' | 'red' }) {
  const colors = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  };
  return (
    <div className={cn('p-4 rounded-xl border', colors[color])}>
      <p className="text-xs font-medium opacity-75 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}

function DocumentRow({ doc }: { doc: VehicleDocument }) {
  const daysLeft = doc.expiryDate ? daysUntilExpiry(doc.expiryDate) : null;
  const isExpired = daysLeft !== null && daysLeft < 0;
  const isSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
          <FileText className="w-5 h-5 text-slate-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-800">{doc.fileName}</p>
          <p className="text-xs text-slate-500 capitalize">{doc.docType.replace('_', ' ')}</p>
        </div>
      </div>
      <div className="text-right">
        {isExpired && (
          <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        )}
        {isSoon && (
          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
            {daysLeft}d left
          </Badge>
        )}
        {!isExpired && !isSoon && daysLeft !== null && (
          <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {daysLeft}d left
          </Badge>
        )}
      </div>
    </div>
  );
}

function ServiceRow({ service }: { service: ServiceLog }) {
  return (
    <div className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">{service.serviceType}</p>
            <p className="text-xs text-slate-500">{service.workshop} · {service.mileageKm.toLocaleString()} km</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-800">GH\u20B5 {service.cost.toLocaleString()}</p>
          <p className="text-xs text-slate-500">{new Date(service.serviceDate).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

function BatteryRow({ battery }: { battery: BatteryLog }) {
  return (
    <div className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <Battery className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">{battery.brand}</p>
            <p className="text-xs text-slate-500">{battery.supplier}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-800">GH\u20B5 {battery.cost.toLocaleString()}</p>
          <p className="text-xs text-slate-500">Installed: {new Date(battery.installDate).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

function TyreRow({ tyre }: { tyre: TyreLog }) {
  return (
    <div className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <CircleDot className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">{tyre.brand} - {tyre.position}</p>
            <p className="text-xs text-slate-500">Installed: {new Date(tyre.installDate).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-800">GH\u20B5 {tyre.cost.toLocaleString()}</p>
          {tyre.replacementDate && (
            <p className="text-xs text-amber-600">Replaced: {new Date(tyre.replacementDate).toLocaleDateString()}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function RevenueRow({ entry }: { entry: RevenueEntry }) {
  return (
    <div className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">{entry.route}</p>
            <p className="text-xs text-slate-500">{entry.client} · {entry.tripReference}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-emerald-600">GH\u20B5 {entry.amount.toLocaleString()}</p>
          <p className="text-xs text-slate-500">{new Date(entry.tripDate).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

function AccidentRow({ accident }: { accident: AccidentReport }) {
  return (
    <div className="p-3 rounded-lg border border-red-200 bg-red-50/50">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">{accident.description}</p>
            <p className="text-xs text-slate-500 mt-1">
              {accident.driverAtFault ? 'At Fault' : 'Not at Fault'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-red-600">GH\u20B5 {accident.cost.toLocaleString()}</p>
          <p className="text-xs text-slate-500">{new Date(accident.accidentDate).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

function PhotoCard({ photo }: { photo: VehiclePhoto }) {
  return (
    <div className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
      <div className="w-full h-32 bg-slate-100 rounded-lg flex items-center justify-center mb-2">
        <Camera className="w-8 h-8 text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-800">{photo.caption}</p>
      <p className="text-xs text-slate-500 capitalize">{photo.category} · {new Date(photo.takenAt).toLocaleDateString()}</p>
    </div>
  );
}

function ValuationRow({ valuation }: { valuation: Valuation }) {
  return (
    <div className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">{valuation.source}</p>
            <p className="text-xs text-slate-500">{valuation.conditionNotes}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-emerald-600">GH\u20B5 {valuation.amount.toLocaleString()}</p>
          <p className="text-xs text-slate-500">{new Date(valuation.valuationDate).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-200 rounded-lg">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <Truck className="w-6 h-6 text-slate-400" />
      </div>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
