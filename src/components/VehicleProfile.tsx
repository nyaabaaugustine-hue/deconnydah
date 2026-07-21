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
  TrendingDown,
  Truck,
  CheckCircle2,
  Loader2,
  Hash,
  Calendar,
  User,
  Wallet,
  ClipboardCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn, formatGHS } from '@/lib/utils';
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
  getInspectionsForVehicle,
  daysUntilExpiry,
} from '@/lib/apiClient';
import type { Inspection } from '@/lib/apiClient';
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
  Inspection as FleetInspection,
} from '@/types/fleet';

const categories = [
  { id: 'overview', label: 'Overview', icon: Truck },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'service', label: 'Service History', icon: Wrench },
  { id: 'battery', label: 'Battery History', icon: Battery },
  { id: 'tyre', label: 'Tyre History', icon: CircleDot },
  { id: 'inspection', label: 'Daily Inspections', icon: ClipboardCheck },
  { id: 'revenue', label: 'Revenue History', icon: DollarSign },
  { id: 'accidents', label: 'Accident Reports', icon: AlertTriangle },
  { id: 'photos', label: 'Photographs', icon: Camera },
  { id: 'valuation', label: 'Resale Valuation', icon: TrendingUp },
];

const statusConfig: Record<VehicleStatus, { label: string; color: string; dot: string; ring: string }> = {
  active: { label: 'Active', color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500', ring: 'ring-emerald-500/20' },
  in_repair: { label: 'In Repair', color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800', dot: 'bg-amber-500', ring: 'ring-amber-500/20' },
  decommissioned: { label: 'Decommissioned', color: 'text-slate-700 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700', dot: 'bg-slate-400', ring: 'ring-slate-400/20' },
  sold: { label: 'Sold', color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800', dot: 'bg-blue-500', ring: 'ring-blue-500/20' },
};

// ── Variants ─────────────────────────────────────────────────────────────────

const statBoxVariants = {
  emerald: { bg: 'from-emerald-500/10 to-emerald-500/5 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400', icon: 'bg-emerald-600' },
  amber: { bg: 'from-amber-500/10 to-amber-500/5 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400', icon: 'bg-amber-600' },
  red: { bg: 'from-red-500/10 to-red-500/5 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400', icon: 'bg-red-600' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function VehicleProfile({ vehicleId, onBack, role }: { vehicleId: string; onBack: () => void; role: string }) {
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
  const [inspections, setInspections] = useState<Inspection[]>([]);
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

        const [driverData, docsData, svcData, batData, tyrData, revData, accData, phoData, valData, inspData] = await Promise.all([
          v.currentDriverId ? getDriver(v.currentDriverId) : Promise.resolve(null),
          getDocumentsForVehicle(vehicleId),
          getServiceLogsForVehicle(vehicleId),
          getBatteryLogsForVehicle(vehicleId),
          getTyreLogsForVehicle(vehicleId),
          getRevenueForVehicle(vehicleId),
          getAccidentsForVehicle(vehicleId),
          getPhotosForVehicle(vehicleId),
          getValuationsForVehicle(vehicleId),
          getInspectionsForVehicle(vehicleId),
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
        setInspections(inspData);
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
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 blur-lg -z-10" />
        </div>
        <p className="text-sm font-medium text-slate-600">Loading vehicle profile...</p>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20 mb-6">
          <AlertTriangle className="w-8 h-8 text-white" />
        </div>
        <p className="text-lg font-bold text-slate-900 mb-2">{error || 'Vehicle not found'}</p>
        <Button onClick={onBack} className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/20 rounded-xl">Back to Dashboard</Button>
      </div>
    );
  }

  const cfg = statusConfig[vehicle.status];
  const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
  const totalServiceCost = services.reduce((sum, s) => sum + s.cost, 0);
  const totalBatteryCost = batteries.reduce((sum, b) => sum + b.cost, 0);
  const totalTyreCost = tyres.reduce((sum, t) => sum + t.cost, 0);
  const totalCosts = totalServiceCost + totalBatteryCost + totalTyreCost;
  const netMargin = totalRevenue - totalCosts;
  const isPositive = netMargin >= 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Premium Header Banner ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-6 sm:p-8 shadow-xl">
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_20%_20%,white,transparent_35%)]" />
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_80%_70%,#34d399,transparent_50%)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm rounded-xl transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className={cn('hidden sm:flex w-14 h-14 rounded-2xl items-center justify-center bg-white/10 ring-4 backdrop-blur-sm', cfg.ring)}>
              <Truck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{vehicle.plateNumber}</h1>
              <p className="text-sm text-slate-300 mt-1">{vehicle.make} {vehicle.model} &middot; {vehicle.year}</p>
            </div>
          </div>
          <span className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border w-fit shadow-sm backdrop-blur-sm', cfg.color)}>
            <span className={cn('w-2 h-2 rounded-full animate-pulse', cfg.dot)}></span>
            {cfg.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ── Sidebar Tabs (Double-bezel) ─────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="p-[1px] rounded-2xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm">
            <div className="rounded-2xl bg-white dark:bg-slate-900 p-2 shadow-inner sticky top-4">
              <nav className="space-y-1">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const active = activeTab === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveTab(cat.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left',
                        active
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-500/20 will-change-transform'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                      )}
                    >
                      <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-white' : 'text-slate-400 dark:text-slate-500')} />
                      <span className="truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* ── Content Area (Double-bezel) ─────────────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="p-[1px] rounded-2xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm">
            <div className="rounded-2xl bg-white dark:bg-slate-900 min-h-[500px] shadow-inner">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                  <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-600" />
                  {categories.find((c) => c.id === activeTab)?.label}
                </h2>

                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      <InfoCard icon={Hash} label="Plate Number" value={vehicle.plateNumber} />
                      <InfoCard icon={Hash} label="VIN" value={vehicle.vin} />
                      <InfoCard icon={Calendar} label="Purchase Date" value={new Date(vehicle.purchaseDate).toLocaleDateString()} />
                      <InfoCard icon={Wallet} label="Purchase Price" value={formatGHS(vehicle.purchasePrice)} />
                      <InfoCard icon={User} label="Current Driver" value={driver?.fullName || 'Unassigned'} />
                      <InfoCard icon={CheckCircle2} label="Status" value={cfg.label} />
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Financial Summary</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatBox icon={DollarSign} label="Total Revenue" value={formatGHS(totalRevenue)} variant="emerald" />
                        <StatBox icon={Wrench} label="Total Costs" value={formatGHS(totalCosts)} sublabel={`Service ${formatGHS(totalServiceCost)}`} variant="amber" />
                        <StatBox icon={isPositive ? TrendingUp : TrendingDown} label="Net Margin" value={formatGHS(netMargin)} variant={isPositive ? 'emerald' : 'red'} />
                      </div>
                    </div>
                  </div>
                )}

                {['documents', 'service', 'battery', 'tyre', 'inspection', 'revenue', 'accidents', 'photos', 'valuation'].map((tab) => (
                  activeTab === tab && (
                    <div key={tab} className="space-y-3">
                      {tab === 'documents' && (docs.length === 0 ? <EmptyState icon={FileText} message="No documents on file" /> : docs.map(doc => <DocumentRow key={doc.id} doc={doc} />))}
                      {tab === 'service' && (services.length === 0 ? <EmptyState icon={Wrench} message="No service records" /> : services.map(svc => <ServiceRow key={svc.id} service={svc} />))}
                      {tab === 'battery' && (batteries.length === 0 ? <EmptyState icon={Battery} message="No battery records" /> : batteries.map(bat => <BatteryRow key={bat.id} battery={bat} />))}
                      {tab === 'tyre' && (tyres.length === 0 ? <EmptyState icon={CircleDot} message="No tyre records" /> : tyres.map(tyre => <TyreRow key={tyre.id} tyre={tyre} />))}
                      {tab === 'inspection' && (inspections.length === 0 ? <EmptyState icon={ClipboardCheck} message="No inspections recorded" /> : inspections.map(insp => <InspectionRow key={insp.id} inspection={insp} />))}
                      {tab === 'revenue' && (revenue.length === 0 ? <EmptyState icon={DollarSign} message="No revenue records" /> : revenue.map(rev => <RevenueRow key={rev.id} entry={rev} />))}
                      {tab === 'accidents' && (accidents.length === 0 ? <EmptyState icon={AlertTriangle} message="No accident reports" /> : accidents.map(acc => <AccidentRow key={acc.id} accident={acc} />))}
                      {tab === 'photos' && (photos.length === 0 ? <EmptyState icon={Camera} message="No photographs" /> : <div className="grid grid-cols-2 gap-4">{photos.map(photo => <PhotoCard key={photo.id} photo={photo} />)}</div>)}
                      {tab === 'valuation' && (vals.length === 0 ? <EmptyState icon={TrendingUp} message="No valuations on file" /> : vals.map(val => <ValuationRow key={val.id} valuation={val} />))}
                    </div>
                  )
                ))}
              </CardContent>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-Components ───────────────────────────────────────────────────────────

function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="p-[1px] rounded-xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-200 hover:shadow-md group">
      <div className="rounded-xl bg-white dark:bg-slate-900 p-3.5 shadow-inner flex items-start gap-3 transition-all duration-200">
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:border-emerald-200 dark:group-hover:border-emerald-800 transition-colors duration-200">
          <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, sublabel, variant }: {
  icon: React.ElementType; label: string; value: string; sublabel?: string; variant: 'emerald' | 'amber' | 'red';
}) {
  const v = statBoxVariants[variant];
  return (
    <div className={cn('relative overflow-hidden p-4 rounded-xl border bg-gradient-to-br shadow-sm transition-all duration-200 hover:shadow-md group', v.bg)}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-wider opacity-80">{label}</p>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110', v.icon)}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {sublabel && <p className="text-xs mt-1 opacity-70">{sublabel}</p>}
    </div>
  );
}

function DocumentRow({ doc }: { doc: VehicleDocument }) {
  const daysLeft = doc.expiryDate ? daysUntilExpiry(doc.expiryDate) : null;
  const isExpired = daysLeft !== null && daysLeft < 0;
  const isSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;

  return (
    <div className="p-[1px] rounded-xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-200 hover:shadow-md group">
      <div className="rounded-xl bg-white dark:bg-slate-900 p-3 shadow-inner flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/30 transition-colors duration-200">
            <FileText className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-200" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{doc.fileName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{doc.docType.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <div className="text-right">
          {isExpired && <Badge variant="outline" className="text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 font-semibold"><AlertTriangle className="w-3 h-3 mr-1" />Expired</Badge>}
          {isSoon && <Badge variant="outline" className="text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 font-semibold">{daysLeft}d left</Badge>}
          {!isExpired && !isSoon && daysLeft !== null && <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 font-semibold"><CheckCircle2 className="w-3 h-3 mr-1" />{daysLeft}d</Badge>}
        </div>
      </div>
    </div>
  );
}

function ServiceRow({ service }: { service: ServiceLog }) {
  return (
    <div className="p-[1px] rounded-xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-200 hover:shadow-md group">
      <div className="rounded-xl bg-white dark:bg-slate-900 p-3 shadow-inner flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center group-hover:bg-amber-100 dark:group-hover:bg-amber-900/50 transition-colors duration-200"><Wrench className="w-5 h-5 text-amber-600 dark:text-amber-400" /></div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{service.serviceType}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{service.workshop} &middot; {Number(service.mileageKm).toLocaleString()} km</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatGHS(service.cost)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(service.serviceDate).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

function BatteryRow({ battery }: { battery: BatteryLog }) {
  return (
    <div className="p-[1px] rounded-xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-200 hover:shadow-md group">
      <div className="rounded-xl bg-white dark:bg-slate-900 p-3 shadow-inner flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/30 transition-colors duration-200"><Battery className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" /></div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{battery.brand}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{battery.supplier}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatGHS(battery.cost)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(battery.installDate).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

function TyreRow({ tyre }: { tyre: TyreLog }) {
  return (
    <div className="p-[1px] rounded-xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-200 hover:shadow-md group">
      <div className="rounded-xl bg-white dark:bg-slate-900 p-3 shadow-inner flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-amber-50 dark:group-hover:bg-amber-950/30 transition-colors"><CircleDot className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" /></div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{tyre.brand} &middot; {tyre.position}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(tyre.installDate).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatGHS(tyre.cost)}</p>
          {tyre.replacementDate && <p className="text-xs text-amber-600 dark:text-amber-400">Replaced: {new Date(tyre.replacementDate).toLocaleDateString()}</p>}
        </div>
      </div>
    </div>
  );
}

function RevenueRow({ entry }: { entry: RevenueEntry }) {
  return (
    <div className="p-[1px] rounded-xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-200 hover:shadow-md group">
      <div className="rounded-xl bg-white dark:bg-slate-900 p-3 shadow-inner flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors"><DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /></div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{entry.route}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{entry.client} &middot; {entry.tripReference}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatGHS(entry.amount)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(entry.tripDate).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

function AccidentRow({ accident }: { accident: AccidentReport }) {
  return (
    <div className="p-[1px] rounded-xl bg-gradient-to-b from-red-200 to-red-50 dark:from-red-900/30 dark:to-red-950/20 shadow-sm transition-all duration-200 hover:shadow-md group">
      <div className="rounded-xl bg-red-50/80 dark:bg-red-950/40 p-3 shadow-inner flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" /></div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{accident.description}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{accident.driverAtFault ? 'At Fault' : 'Not at Fault'}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatGHS(accident.cost)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(accident.accidentDate).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

function PhotoCard({ photo }: { photo: VehiclePhoto }) {
  return (
    <div className="p-[1px] rounded-xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-200 hover:shadow-md group">
      <div className="rounded-xl bg-white dark:bg-slate-900 p-3 shadow-inner">
        <div className="w-full h-32 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-lg flex items-center justify-center mb-2 group-hover:from-emerald-50 group-hover:to-emerald-100 dark:group-hover:from-emerald-900/30 dark:group-hover:to-emerald-800/30 transition-all duration-300">
          <Camera className="w-8 h-8 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors duration-300" />
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{photo.caption}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize mt-0.5">{photo.category} &middot; {new Date(photo.takenAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
}

function ValuationRow({ valuation }: { valuation: Valuation }) {
  return (
    <div className="p-[1px] rounded-xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-200 hover:shadow-md group">
      <div className="rounded-xl bg-white dark:bg-slate-900 p-3 shadow-inner flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors"><TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /></div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{valuation.source}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{valuation.conditionNotes}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatGHS(valuation.amount)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(valuation.valuationDate).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

function InspectionRow({ inspection }: { inspection: Inspection }) {
  const statusColors: Record<string, { label: string; bg: string; icon: string; ring: string }> = {
    pass: { label: 'Pass', bg: 'from-emerald-500 to-emerald-600 text-white', icon: 'bg-emerald-50 text-emerald-600', ring: 'shadow-emerald-500/20' },
    fail: { label: 'Fail', bg: 'from-red-500 to-red-600 text-white', icon: 'bg-red-50 text-red-600', ring: 'shadow-red-500/20' },
    flagged: { label: 'Flagged', bg: 'from-amber-500 to-amber-600 text-white', icon: 'bg-amber-50 text-amber-600', ring: 'shadow-amber-500/20' },
  };
  const cfg = statusColors[inspection.overallStatus] || statusColors.flagged;
  const passCount = inspection.checklist.filter(c => c.status === 'pass').length;
  const totalCount = inspection.checklist.length;

  return (
    <div className="p-[1px] rounded-xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-200 hover:shadow-md group">
      <div className="rounded-xl bg-white dark:bg-slate-900 p-3 shadow-inner">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
              <ClipboardCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{inspection.driverName}</p>
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold shadow-sm', cfg.bg)}>
                  {cfg.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                {new Date(inspection.inspectionDate).toLocaleDateString()}
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                {passCount}/{totalCount} passed
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="flex items-center gap-1.5 -mt-0.5">
              {inspection.checklist.slice(0, 4).map((item) => (
                <span
                  key={item.key}
                  className={cn(
                    'w-2 h-2 rounded-full',
                    item.status === 'pass' && 'bg-emerald-500',
                    item.status === 'fail' && 'bg-red-500',
                    item.status === 'flagged' && 'bg-amber-400',
                  )}
                  title={item.label}
                />
              ))}
              {inspection.checklist.length > 4 && (
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 ml-0.5">+{inspection.checklist.length - 4}</span>
              )}
            </div>
            {inspection.notes && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 max-w-[180px] truncate">{inspection.notes}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-slate-400 dark:text-slate-500" />
      </div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}
