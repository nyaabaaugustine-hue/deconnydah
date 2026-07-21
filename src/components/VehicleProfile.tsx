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
  Upload,
  Pencil,
  Trash2,
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
  createDocument,
  createServiceLog,
  createBatteryLog,
  createTyreLog,
  createRevenueEntry,
  createAccidentReport,
  createVehiclePhoto,
  createValuation,
  createInspection,
  updateDocument,
  updateServiceLog,
  updateBatteryLog,
  updateTyreLog,
  updateRevenueEntry,
  updateAccidentReport,
  updateVehiclePhoto,
  updateValuation,
  updateInspection,
  deleteDocument,
  deleteServiceLog,
  deleteBatteryLog,
  deleteTyreLog,
  deleteRevenueEntry,
  deleteAccidentReport,
  deleteVehiclePhoto,
  deleteValuation,
  deleteInspection,
  uploadImageToCloudinary,
  uploadFileToMinIO,
  uploadPhotoToMinIO,
  daysUntilExpiry,
  canWrite,
  canDelete,
} from '@/lib/apiClient';
import { Plus, X } from 'lucide-react';
import { notify } from '@/lib/notify';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/types/fleet';
import type { Inspection as FleetInspection } from '@/lib/apiClient';

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

// Short explainer shown under each section heading, plus the label used on
// that section's "+ Add" button. Keeps every tab self-explanatory for anyone
// new to the system, and makes clear what the Add button will create.
const SECTION_META: Record<string, { description: string; addLabel: string }> = {
  overview: {
    description: 'Key vehicle details and a live financial summary calculated from every record below.',
    addLabel: '',
  },
  documents: {
    description: 'Purchase invoices, insurance policies, registration certificates, and other paperwork for this vehicle — with automatic expiry tracking.',
    addLabel: 'Add Document',
  },
  service: {
    description: 'Every workshop visit — routine servicing, parts replaced, mileage at the time, and cost.',
    addLabel: 'Add Service Record',
  },
  battery: {
    description: 'Battery installs and replacements, including brand, supplier, and cost, so you know when the next swap is due.',
    addLabel: 'Add Battery Record',
  },
  tyre: {
    description: 'Tyre installs by position (front-left, rear-right, etc.), brand, cost, and replacement history.',
    addLabel: 'Add Tyre Record',
  },
  inspection: {
    description: 'Daily pre-trip driver inspections — a pass/fail/flagged checklist plus notes, so issues are caught before they become breakdowns.',
    addLabel: 'Log Inspection',
  },
  revenue: {
    description: 'Trips this vehicle has generated income from — route, client, and amount — used to calculate net margin on the Overview tab.',
    addLabel: 'Add Revenue Entry',
  },
  accidents: {
    description: 'Incident reports for this vehicle, including cost and whether the driver was at fault.',
    addLabel: 'Report Accident',
  },
  photos: {
    description: 'Photo record of the vehicle\'s condition over time — useful for handovers, insurance claims, and resale listings.',
    addLabel: 'Add Photo',
  },
  valuation: {
    description: 'Third-party or internal resale valuations over time, tracking how the vehicle\'s market value is trending.',
    addLabel: 'Add Valuation',
  },
};

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
  const [addModalTab, setAddModalTab] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<{ tab: string; record: any } | null>(null);

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
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-600" />
                    {categories.find((c) => c.id === activeTab)?.label}
                  </h2>
                  {activeTab !== 'overview' && canWrite(role) && (
                    <Button
                      size="sm"
                      onClick={() => setAddModalTab(activeTab)}
                      className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-md shadow-emerald-500/20 rounded-xl flex-shrink-0"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      {SECTION_META[activeTab]?.addLabel || 'Add'}
                    </Button>
                  )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-2xl">
                  {SECTION_META[activeTab]?.description}
                </p>

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
                      {tab === 'documents' && (docs.length === 0 ? <EmptyState icon={FileText} message="No documents on file" /> : docs.map(doc => <DocumentRow key={doc.id} doc={doc} onEdit={canWrite(role) ? () => { setEditingRecord({ tab: 'documents', record: doc }); setAddModalTab('documents'); } : undefined} onDelete={canDelete(role) ? async () => { if (!confirm('Delete this document?')) return; try { await deleteDocument(doc.id); setDocs(prev => prev.filter(r => r.id !== doc.id)); notify.success('Document deleted'); } catch (err: any) { notify.error(err.message || 'Failed to delete'); } } : undefined} />))}
                      {tab === 'service' && (services.length === 0 ? <EmptyState icon={Wrench} message="No service records" /> : services.map(svc => <ServiceRow key={svc.id} service={svc} onEdit={canWrite(role) ? () => { setEditingRecord({ tab: 'service', record: svc }); setAddModalTab('service'); } : undefined} onDelete={canDelete(role) ? async () => { if (!confirm('Delete this service record?')) return; try { await deleteServiceLog(svc.id); setServices(prev => prev.filter(r => r.id !== svc.id)); notify.success('Record deleted'); } catch (err: any) { notify.error(err.message || 'Failed to delete'); } } : undefined} />))}
                      {tab === 'battery' && (batteries.length === 0 ? <EmptyState icon={Battery} message="No battery records" /> : batteries.map(bat => <BatteryRow key={bat.id} battery={bat} onEdit={canWrite(role) ? () => { setEditingRecord({ tab: 'battery', record: bat }); setAddModalTab('battery'); } : undefined} onDelete={canDelete(role) ? async () => { if (!confirm('Delete this battery record?')) return; try { await deleteBatteryLog(bat.id); setBatteries(prev => prev.filter(r => r.id !== bat.id)); notify.success('Record deleted'); } catch (err: any) { notify.error(err.message || 'Failed to delete'); } } : undefined} />))}
                      {tab === 'tyre' && (tyres.length === 0 ? <EmptyState icon={CircleDot} message="No tyre records" /> : tyres.map(tyre => <TyreRow key={tyre.id} tyre={tyre} onEdit={canWrite(role) ? () => { setEditingRecord({ tab: 'tyre', record: tyre }); setAddModalTab('tyre'); } : undefined} onDelete={canDelete(role) ? async () => { if (!confirm('Delete this tyre record?')) return; try { await deleteTyreLog(tyre.id); setTyres(prev => prev.filter(r => r.id !== tyre.id)); notify.success('Record deleted'); } catch (err: any) { notify.error(err.message || 'Failed to delete'); } } : undefined} />))}
                      {tab === 'inspection' && (inspections.length === 0 ? <EmptyState icon={ClipboardCheck} message="No inspections recorded" /> : inspections.map(insp => <InspectionRow key={insp.id} inspection={insp} onEdit={canWrite(role) ? () => { setEditingRecord({ tab: 'inspection', record: insp }); setAddModalTab('inspection'); } : undefined} onDelete={canDelete(role) ? async () => { if (!confirm('Delete this inspection?')) return; try { await deleteInspection(insp.id); setInspections(prev => prev.filter(r => r.id !== insp.id)); notify.success('Record deleted'); } catch (err: any) { notify.error(err.message || 'Failed to delete'); } } : undefined} />))}
                      {tab === 'revenue' && (revenue.length === 0 ? <EmptyState icon={DollarSign} message="No revenue records" /> : revenue.map(rev => <RevenueRow key={rev.id} entry={rev} onEdit={canWrite(role) ? () => { setEditingRecord({ tab: 'revenue', record: rev }); setAddModalTab('revenue'); } : undefined} onDelete={canDelete(role) ? async () => { if (!confirm('Delete this revenue entry?')) return; try { await deleteRevenueEntry(rev.id); setRevenue(prev => prev.filter(r => r.id !== rev.id)); notify.success('Record deleted'); } catch (err: any) { notify.error(err.message || 'Failed to delete'); } } : undefined} />))}
                      {tab === 'accidents' && (accidents.length === 0 ? <EmptyState icon={AlertTriangle} message="No accident reports" /> : accidents.map(acc => <AccidentRow key={acc.id} accident={acc} onEdit={canWrite(role) ? () => { setEditingRecord({ tab: 'accidents', record: acc }); setAddModalTab('accidents'); } : undefined} onDelete={canDelete(role) ? async () => { if (!confirm('Delete this accident report?')) return; try { await deleteAccidentReport(acc.id); setAccidents(prev => prev.filter(r => r.id !== acc.id)); notify.success('Record deleted'); } catch (err: any) { notify.error(err.message || 'Failed to delete'); } } : undefined} />))}
                      {tab === 'photos' && (photos.length === 0 ? <EmptyState icon={Camera} message="No photographs" /> : <div className="grid grid-cols-2 gap-4">{photos.map(photo => <PhotoCard key={photo.id} photo={photo} onEdit={canWrite(role) ? () => { setEditingRecord({ tab: 'photos', record: photo }); setAddModalTab('photos'); } : undefined} onDelete={canDelete(role) ? async () => { if (!confirm('Delete this photo?')) return; try { await deleteVehiclePhoto(photo.id); setPhotos(prev => prev.filter(r => r.id !== photo.id)); notify.success('Photo deleted'); } catch (err: any) { notify.error(err.message || 'Failed to delete'); } } : undefined} />)}</div>)}
                      {tab === 'valuation' && (vals.length === 0 ? <EmptyState icon={TrendingUp} message="No valuations on file" /> : vals.map(val => <ValuationRow key={val.id} valuation={val} onEdit={canWrite(role) ? () => { setEditingRecord({ tab: 'valuation', record: val }); setAddModalTab('valuation'); } : undefined} onDelete={canDelete(role) ? async () => { if (!confirm('Delete this valuation?')) return; try { await deleteValuation(val.id); setVals(prev => prev.filter(r => r.id !== val.id)); notify.success('Record deleted'); } catch (err: any) { notify.error(err.message || 'Failed to delete'); } } : undefined} />))}
                    </div>
                  )
                ))}
              </CardContent>
            </div>
          </div>
        </div>
      </div>

      {addModalTab && (
        <AddRecordModal
          tab={addModalTab}
          vehicleId={vehicleId}
          editingRecord={editingRecord}
          onClose={() => { setAddModalTab(null); setEditingRecord(null); }}
          onCreated={(tab, record) => {
            if (editingRecord) {
              if (tab === 'documents') setDocs((prev) => prev.map(r => r.id === record.id ? record : r));
              if (tab === 'service') setServices((prev) => prev.map(r => r.id === record.id ? record : r));
              if (tab === 'battery') setBatteries((prev) => prev.map(r => r.id === record.id ? record : r));
              if (tab === 'tyre') setTyres((prev) => prev.map(r => r.id === record.id ? record : r));
              if (tab === 'revenue') setRevenue((prev) => prev.map(r => r.id === record.id ? record : r));
              if (tab === 'accidents') setAccidents((prev) => prev.map(r => r.id === record.id ? record : r));
              if (tab === 'photos') setPhotos((prev) => prev.map(r => r.id === record.id ? record : r));
              if (tab === 'valuation') setVals((prev) => prev.map(r => r.id === record.id ? record : r));
              if (tab === 'inspection') setInspections((prev) => prev.map(r => r.id === record.id ? record : r));
            } else {
              if (tab === 'documents') setDocs((prev) => [record, ...prev]);
              if (tab === 'service') setServices((prev) => [record, ...prev]);
              if (tab === 'battery') setBatteries((prev) => [record, ...prev]);
              if (tab === 'tyre') setTyres((prev) => [record, ...prev]);
              if (tab === 'revenue') setRevenue((prev) => [record, ...prev]);
              if (tab === 'accidents') setAccidents((prev) => [record, ...prev]);
              if (tab === 'photos') setPhotos((prev) => [record, ...prev]);
              if (tab === 'valuation') setVals((prev) => [record, ...prev]);
              if (tab === 'inspection') setInspections((prev) => [record, ...prev]);
            }
            setAddModalTab(null);
            setEditingRecord(null);
          }}
        />
      )}
    </div>
  );
}

// ── Add Record Modal ─────────────────────────────────────────────────────────

function AddRecordModal({
  tab,
  vehicleId,
  editingRecord,
  onClose,
  onCreated,
}: {
  tab: string;
  vehicleId: string;
  editingRecord?: { tab: string; record: any } | null;
  onClose: () => void;
  onCreated: (tab: string, record: any) => void;
}) {
  const isEditing = editingRecord?.tab === tab;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const r = editingRecord?.record;

  // Service form
  const [svcForm, setSvcForm] = useState({
    serviceDate: isEditing ? r.serviceDate ?? '' : new Date().toISOString().split('T')[0],
    mileageKm: isEditing ? String(r.mileageKm ?? '') : '',
    serviceType: isEditing ? r.serviceType ?? '' : '',
    partsReplaced: isEditing ? r.partsReplaced ?? '' : '',
    workshop: isEditing ? r.workshop ?? '' : '',
    cost: isEditing ? String(r.cost ?? '') : '',
  });

  // Battery form
  const [batForm, setBatForm] = useState({
    installDate: isEditing ? r.installDate ?? '' : new Date().toISOString().split('T')[0],
    brand: isEditing ? r.brand ?? '' : '',
    supplier: isEditing ? r.supplier ?? '' : '',
    cost: isEditing ? String(r.cost ?? '') : '',
  });

  // Tyre form
  const [tyreForm, setTyreForm] = useState({
    position: isEditing ? r.position ?? 'FL' : 'FL',
    installDate: isEditing ? r.installDate ?? '' : new Date().toISOString().split('T')[0],
    brand: isEditing ? r.brand ?? '' : '',
    cost: isEditing ? String(r.cost ?? '') : '',
  });

  const [docFile, setDocFile] = useState<File | null>(null);
  // Document form
  const [docForm, setDocForm] = useState({
    docType: isEditing ? r.docType ?? 'insurance_policy' : 'insurance_policy',
    fileName: isEditing ? r.fileName ?? '' : '',
    issueDate: isEditing ? r.issueDate ?? '' : new Date().toISOString().split('T')[0],
    expiryDate: isEditing ? r.expiryDate ?? '' : '',
    notes: isEditing ? r.notes ?? '' : '',
  });

  // Revenue form
  const [revForm, setRevForm] = useState({
    tripDate: isEditing ? r.tripDate ?? '' : new Date().toISOString().split('T')[0],
    tripReference: isEditing ? r.tripReference ?? '' : '',
    route: isEditing ? r.route ?? '' : '',
    client: isEditing ? r.client ?? '' : '',
    amount: isEditing ? String(r.amount ?? '') : '',
  });

  // Accident form
  const [accForm, setAccForm] = useState({
    accidentDate: isEditing ? r.accidentDate ?? '' : new Date().toISOString().split('T')[0],
    description: isEditing ? r.description ?? '' : '',
    cost: isEditing ? String(r.cost ?? '') : '',
    driverAtFault: isEditing ? !!r.driverAtFault : false,
  });

  // Photo form
  const [photoForm, setPhotoForm] = useState({
    category: isEditing ? r.category ?? 'exterior' : 'exterior',
    caption: isEditing ? r.caption ?? '' : '',
    takenAt: isEditing ? r.takenAt ?? '' : new Date().toISOString().split('T')[0],
    imageUrl: isEditing ? r.imageUrl ?? '' : '',
  });

  // Valuation form
  const [valForm, setValForm] = useState({
    valuationDate: isEditing ? r.valuationDate ?? '' : new Date().toISOString().split('T')[0],
    source: isEditing ? r.source ?? '' : '',
    amount: isEditing ? String(r.amount ?? '') : '',
    conditionNotes: isEditing ? r.conditionNotes ?? '' : '',
  });

  // Inspection form
  const [inspForm, setInspForm] = useState({
    driverName: isEditing ? r.driverName ?? '' : '',
    inspectionDate: isEditing ? r.inspectionDate ?? '' : new Date().toISOString().split('T')[0],
    overallStatus: isEditing ? r.overallStatus ?? 'pass' : 'pass',
    notes: isEditing ? r.notes ?? '' : '',
  });

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      let record: any;
      if (isEditing) {
        switch (tab) {
          case 'service':
            record = await updateServiceLog(editingRecord!.record.id, {
              serviceDate: svcForm.serviceDate,
              mileageKm: parseInt(svcForm.mileageKm) || 0,
              serviceType: svcForm.serviceType,
              partsReplaced: svcForm.partsReplaced,
              workshop: svcForm.workshop,
              cost: parseFloat(svcForm.cost) || 0,
            });
            break;
          case 'battery':
            record = await updateBatteryLog(editingRecord!.record.id, {
              installDate: batForm.installDate,
              brand: batForm.brand,
              supplier: batForm.supplier,
              cost: parseFloat(batForm.cost) || 0,
            });
            break;
          case 'tyre':
            record = await updateTyreLog(editingRecord!.record.id, {
              position: tyreForm.position as any,
              installDate: tyreForm.installDate,
              brand: tyreForm.brand,
              cost: parseFloat(tyreForm.cost) || 0,
            });
            break;
          case 'documents':
            let editFileName = docForm.fileName;
            if (docFile) {
              try {
                const uploadResult = await uploadFileToMinIO(docFile);
                editFileName = uploadResult.fileName;
              } catch (err) {
                console.error('Document upload failed:', err);
              }
            }
            record = await updateDocument(editingRecord!.record.id, {
              docType: docForm.docType as any,
              fileName: editFileName,
              issueDate: docForm.issueDate,
              expiryDate: docForm.expiryDate || null,
              notes: docForm.notes || null,
            });
            break;
          case 'revenue':
            record = await updateRevenueEntry(editingRecord!.record.id, {
              tripDate: revForm.tripDate,
              tripReference: revForm.tripReference,
              route: revForm.route,
              client: revForm.client,
              amount: parseFloat(revForm.amount) || 0,
            });
            break;
          case 'accidents':
            record = await updateAccidentReport(editingRecord!.record.id, {
              accidentDate: accForm.accidentDate,
              description: accForm.description,
              cost: parseFloat(accForm.cost) || 0,
              driverAtFault: accForm.driverAtFault,
            });
            break;
          case 'photos':
            record = await updateVehiclePhoto(editingRecord!.record.id, {
              category: photoForm.category,
              caption: photoForm.caption,
              takenAt: photoForm.takenAt,
              imageUrl: photoForm.imageUrl || undefined,
            });
            break;
          case 'valuation':
            record = await updateValuation(editingRecord!.record.id, {
              valuationDate: valForm.valuationDate,
              source: valForm.source,
              amount: parseFloat(valForm.amount) || 0,
              conditionNotes: valForm.conditionNotes,
            });
            break;
          case 'inspection':
            record = await updateInspection(editingRecord!.record.id, {
              driverName: inspForm.driverName,
              inspectionDate: inspForm.inspectionDate,
              overallStatus: inspForm.overallStatus,
              checklist: editingRecord!.record.checklist || [],
              notes: inspForm.notes,
            });
            break;
          default:
            return;
        }
      } else {
        switch (tab) {
          case 'service':
            record = await createServiceLog({
              vehicleId,
              serviceDate: svcForm.serviceDate,
              mileageKm: parseInt(svcForm.mileageKm) || 0,
              serviceType: svcForm.serviceType,
              partsReplaced: svcForm.partsReplaced,
              workshop: svcForm.workshop,
              cost: parseFloat(svcForm.cost) || 0,
            });
            break;
          case 'battery':
            record = await createBatteryLog({
              vehicleId,
              installDate: batForm.installDate,
              brand: batForm.brand,
              supplier: batForm.supplier,
              cost: parseFloat(batForm.cost) || 0,
            });
            break;
          case 'tyre':
            record = await createTyreLog({
              vehicleId,
              position: tyreForm.position as any,
              installDate: tyreForm.installDate,
              brand: tyreForm.brand,
              cost: parseFloat(tyreForm.cost) || 0,
            });
            break;
          case 'documents':
            let fileName = docForm.fileName;
            if (docFile) {
              try {
                const uploadResult = await uploadFileToMinIO(docFile);
                fileName = uploadResult.fileName;
              } catch (err) {
                console.error('Document upload failed:', err);
              }
            }
            record = await createDocument({
              vehicleId,
              docType: docForm.docType as any,
              fileName,
              issueDate: docForm.issueDate,
              expiryDate: docForm.expiryDate || null,
              notes: docForm.notes || null,
            });
            break;
          case 'revenue':
            record = await createRevenueEntry({
              vehicleId,
              tripDate: revForm.tripDate,
              tripReference: revForm.tripReference,
              route: revForm.route,
              client: revForm.client,
              amount: parseFloat(revForm.amount) || 0,
            });
            break;
          case 'accidents':
            record = await createAccidentReport({
              vehicleId,
              accidentDate: accForm.accidentDate,
              description: accForm.description,
              cost: parseFloat(accForm.cost) || 0,
              driverAtFault: accForm.driverAtFault,
            });
            break;
          case 'photos':
            record = await createVehiclePhoto({
              vehicleId,
              category: photoForm.category,
              caption: photoForm.caption,
              takenAt: photoForm.takenAt,
              imageUrl: photoForm.imageUrl || undefined,
            });
            break;
          case 'valuation':
            record = await createValuation({
              vehicleId,
              valuationDate: valForm.valuationDate,
              source: valForm.source,
              amount: parseFloat(valForm.amount) || 0,
              conditionNotes: valForm.conditionNotes,
            });
            break;
          case 'inspection':
            record = await createInspection({
              vehicleId,
              driverName: inspForm.driverName,
              inspectionDate: inspForm.inspectionDate,
              overallStatus: inspForm.overallStatus,
              checklist: [],
              notes: inspForm.notes,
            });
            break;
          default:
            return;
        }
      }
      onCreated(tab, record);
      notify.success(isEditing ? 'Record updated' : 'Record added');
    } catch (err: any) {
      setError(err.message || 'Failed to save');
      notify.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const meta = SECTION_META[tab];
  const title = isEditing ? `Edit ${meta?.addLabel?.replace(/^Add |Report |Log /, '') || 'Record'}` : (meta?.addLabel || 'Add Record');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{meta?.description}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* ── Service ──────────────────────────────────────────────── */}
          {tab === 'service' && (
            <>
              <FormField label="Service Date" value={svcForm.serviceDate} onChange={(v) => setSvcForm({ ...svcForm, serviceDate: v })} type="date" />
              <FormField label="Mileage (km)" value={svcForm.mileageKm} onChange={(v) => setSvcForm({ ...svcForm, mileageKm: v })} type="number" placeholder="e.g. 45000" />
              <FormField label="Service Type" value={svcForm.serviceType} onChange={(v) => setSvcForm({ ...svcForm, serviceType: v })} placeholder="e.g. Oil change, Brake service" />
              <FormField label="Parts Replaced" value={svcForm.partsReplaced} onChange={(v) => setSvcForm({ ...svcForm, partsReplaced: v })} placeholder="e.g. Oil filter, Brake pads" />
              <FormField label="Workshop" value={svcForm.workshop} onChange={(v) => setSvcForm({ ...svcForm, workshop: v })} placeholder="e.g. AutoMech Ghana" />
              <FormField label="Cost (GH\u20B5)" value={svcForm.cost} onChange={(v) => setSvcForm({ ...svcForm, cost: v })} type="number" placeholder="0.00" />
            </>
          )}

          {/* ── Battery ─────────────────────────────────────────────── */}
          {tab === 'battery' && (
            <>
              <FormField label="Install Date" value={batForm.installDate} onChange={(v) => setBatForm({ ...batForm, installDate: v })} type="date" />
              <FormField label="Brand" value={batForm.brand} onChange={(v) => setBatForm({ ...batForm, brand: v })} placeholder="e.g. Exide" />
              <FormField label="Supplier" value={batForm.supplier} onChange={(v) => setBatForm({ ...batForm, supplier: v })} placeholder="e.g. Battery World" />
              <FormField label="Cost (GH\u20B5)" value={batForm.cost} onChange={(v) => setBatForm({ ...batForm, cost: v })} type="number" placeholder="0.00" />
            </>
          )}

          {/* ── Tyre ────────────────────────────────────────────────── */}
          {tab === 'tyre' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Position</Label>
                <Select value={tyreForm.position} onValueChange={(v) => setTyreForm({ ...tyreForm, position: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['FL', 'FR', 'RL', 'RR', 'SPARE'].map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <FormField label="Install Date" value={tyreForm.installDate} onChange={(v) => setTyreForm({ ...tyreForm, installDate: v })} type="date" />
              <FormField label="Brand" value={tyreForm.brand} onChange={(v) => setTyreForm({ ...tyreForm, brand: v })} placeholder="e.g. Michelin" />
              <FormField label="Cost (GH\u20B5)" value={tyreForm.cost} onChange={(v) => setTyreForm({ ...tyreForm, cost: v })} type="number" placeholder="0.00" />
            </>
          )}

          {/* ── Documents ───────────────────────────────────────────── */}
          {tab === 'documents' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Document Type</Label>
                <Select value={docForm.docType} onValueChange={(v) => setDocForm({ ...docForm, docType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insurance_policy">Insurance Policy</SelectItem>
                    <SelectItem value="purchase_invoice">Purchase Invoice</SelectItem>
                    <SelectItem value="registration_certificate">Registration Certificate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Upload File</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    id="docFile"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setDocFile(file);
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="docFile"
                    className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
                  >
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span className={docFile ? 'text-slate-800 dark:text-slate-200 font-medium' : 'text-slate-400'}>
                      {docFile ? docFile.name : 'Choose file (PDF, Image, Word)'}
                    </span>
                  </label>
                  {docFile && (
                    <button onClick={() => setDocFile(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Max 25 MB. PDF, JPEG, PNG, Word, or plain text.</p>
              </div>
              <FormField label="Issue Date" value={docForm.issueDate} onChange={(v) => setDocForm({ ...docForm, issueDate: v })} type="date" />
              <FormField label="Expiry Date (optional)" value={docForm.expiryDate} onChange={(v) => setDocForm({ ...docForm, expiryDate: v })} type="date" />
              <FormField label="Notes (optional)" value={docForm.notes} onChange={(v) => setDocForm({ ...docForm, notes: v })} placeholder="Any notes..." />
            </>
          )}

          {/* ── Revenue ─────────────────────────────────────────────── */}
          {tab === 'revenue' && (
            <>
              <FormField label="Trip Date" value={revForm.tripDate} onChange={(v) => setRevForm({ ...revForm, tripDate: v })} type="date" />
              <FormField label="Trip Reference" value={revForm.tripReference} onChange={(v) => setRevForm({ ...revForm, tripReference: v })} placeholder="e.g. TRP-001" />
              <FormField label="Route" value={revForm.route} onChange={(v) => setRevForm({ ...revForm, route: v })} placeholder="e.g. Accra - Kumasi" />
              <FormField label="Client" value={revForm.client} onChange={(v) => setRevForm({ ...revForm, client: v })} placeholder="e.g. Ghana Express" />
              <FormField label="Amount (GH\u20B5)" value={revForm.amount} onChange={(v) => setRevForm({ ...revForm, amount: v })} type="number" placeholder="0.00" />
            </>
          )}

          {/* ── Accidents ───────────────────────────────────────────── */}
          {tab === 'accidents' && (
            <>
              <FormField label="Accident Date" value={accForm.accidentDate} onChange={(v) => setAccForm({ ...accForm, accidentDate: v })} type="date" />
              <FormField label="Description" value={accForm.description} onChange={(v) => setAccForm({ ...accForm, description: v })} placeholder="What happened..." />
              <FormField label="Cost (GH\u20B5)" value={accForm.cost} onChange={(v) => setAccForm({ ...accForm, cost: v })} type="number" placeholder="0.00" />
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="driverAtFault"
                  checked={accForm.driverAtFault}
                  onChange={(e) => setAccForm({ ...accForm, driverAtFault: e.target.checked })}
                  className="rounded border-slate-300 dark:border-slate-600"
                />
                <Label htmlFor="driverAtFault" className="text-sm text-slate-700 dark:text-slate-300">Driver at fault</Label>
              </div>
            </>
          )}

          {/* ── Photos ──────────────────────────────────────────────── */}
          {tab === 'photos' && (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Photo</Label>
                <label className="relative group cursor-pointer block">
                  <div className="w-full h-32 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center gap-2 hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors">
                    {photoForm.imageUrl ? (
                      <img src={photoForm.imageUrl} alt="Preview" className="h-full object-contain rounded" />
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-slate-400" />
                        <span className="text-xs text-slate-400">Click to upload photo</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const url = await uploadImageToCloudinary(file, 'fleet/vehicles');
                        setPhotoForm({ ...photoForm, imageUrl: url });
                      } catch (err) {
                        console.error('Photo upload failed:', err);
                      }
                    }}
                  />
                </label>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Category</Label>
                <Select value={photoForm.category} onValueChange={(v) => setPhotoForm({ ...photoForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['exterior', 'interior', 'damage', 'maintenance', 'other'].map((c) => (
                      <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <FormField label="Caption" value={photoForm.caption} onChange={(v) => setPhotoForm({ ...photoForm, caption: v })} placeholder="Describe the photo" />
              <FormField label="Date Taken" value={photoForm.takenAt} onChange={(v) => setPhotoForm({ ...photoForm, takenAt: v })} type="date" />
            </>
          )}

          {/* ── Valuation ───────────────────────────────────────────── */}
          {tab === 'valuation' && (
            <>
              <FormField label="Valuation Date" value={valForm.valuationDate} onChange={(v) => setValForm({ ...valForm, valuationDate: v })} type="date" />
              <FormField label="Source" value={valForm.source} onChange={(v) => setValForm({ ...valForm, source: v })} placeholder="e.g. Dealer quote, Online tool" />
              <FormField label="Amount (GH\u20B5)" value={valForm.amount} onChange={(v) => setValForm({ ...valForm, amount: v })} type="number" placeholder="0.00" />
              <FormField label="Condition Notes" value={valForm.conditionNotes} onChange={(v) => setValForm({ ...valForm, conditionNotes: v })} placeholder="Vehicle condition..." />
            </>
          )}

          {/* ── Inspection ──────────────────────────────────────────── */}
          {tab === 'inspection' && (
            <>
              <FormField label="Driver Name" value={inspForm.driverName} onChange={(v) => setInspForm({ ...inspForm, driverName: v })} placeholder="e.g. Kofi Asante" />
              <FormField label="Inspection Date" value={inspForm.inspectionDate} onChange={(v) => setInspForm({ ...inspForm, inspectionDate: v })} type="date" />
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Overall Status</Label>
                <Select value={inspForm.overallStatus} onValueChange={(v) => setInspForm({ ...inspForm, overallStatus: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <FormField label="Notes (optional)" value={inspForm.notes} onChange={(v) => setInspForm({ ...inspForm, notes: v })} placeholder="Observations..." />
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20 rounded-xl"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            {isEditing ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl"
      />
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

function DocumentRow({ doc, onEdit, onDelete }: { doc: VehicleDocument; onEdit?: () => void; onDelete?: () => void }) {
  const daysLeft = doc.expiryDate ? daysUntilExpiry(doc.expiryDate) : null;
  const isExpired = daysLeft !== null && daysLeft < 0;
  const isSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;

  return (
    <div className="p-[1px] rounded-xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-200 hover:shadow-md group">
      <div className="rounded-xl bg-white dark:bg-slate-900 p-3 shadow-inner">
        <div className="flex items-center justify-between">
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
        {onEdit && onDelete && (
          <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ServiceRow({ service, onEdit, onDelete }: { service: ServiceLog; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div className="p-[1px] rounded-xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-200 hover:shadow-md group">
      <div className="rounded-xl bg-white dark:bg-slate-900 p-3 shadow-inner">
        <div className="flex items-center justify-between">
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
        {onEdit && onDelete && (
          <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BatteryRow({ battery, onEdit, onDelete }: { battery: BatteryLog; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div className="p-[1px] rounded-xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-200 hover:shadow-md group">
      <div className="rounded-xl bg-white dark:bg-slate-900 p-3 shadow-inner">
        <div className="flex items-center justify-between">
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
        {onEdit && onDelete && (
          <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TyreRow({ tyre, onEdit, onDelete }: { tyre: TyreLog; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div className="p-[1px] rounded-xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-200 hover:shadow-md group">
      <div className="rounded-xl bg-white dark:bg-slate-900 p-3 shadow-inner">
        <div className="flex items-center justify-between">
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
        {onEdit && onDelete && (
          <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function RevenueRow({ entry, onEdit, onDelete }: { entry: RevenueEntry; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div className="p-[1px] rounded-xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-200 hover:shadow-md group">
      <div className="rounded-xl bg-white dark:bg-slate-900 p-3 shadow-inner">
        <div className="flex items-center justify-between">
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
        {onEdit && onDelete && (
          <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AccidentRow({ accident, onEdit, onDelete }: { accident: AccidentReport; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div className="p-[1px] rounded-xl bg-gradient-to-b from-red-200 to-red-50 dark:from-red-900/30 dark:to-red-950/20 shadow-sm transition-all duration-200 hover:shadow-md group">
      <div className="rounded-xl bg-red-50/80 dark:bg-red-950/40 p-3 shadow-inner">
        <div className="flex items-start justify-between">
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
        {onEdit && onDelete && (
          <div className="flex gap-1.5 mt-2 pt-2 border-t border-red-100 dark:border-red-900 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PhotoCard({ photo, onEdit, onDelete }: { photo: VehiclePhoto; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div className="p-[1px] rounded-xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-200 hover:shadow-md group">
      <div className="rounded-xl bg-white dark:bg-slate-900 p-3 shadow-inner">
        <div className="w-full h-32 rounded-lg overflow-hidden mb-2 bg-slate-100 dark:bg-slate-800">
          {photo.imageUrl ? (
            <img src={photo.imageUrl} alt={photo.caption || 'Vehicle photo'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
              <Camera className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
          )}
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{photo.caption || 'Untitled'}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize mt-0.5">{photo.category} &middot; {new Date(photo.takenAt).toLocaleDateString()}</p>
        {onEdit && onDelete && (
          <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ValuationRow({ valuation, onEdit, onDelete }: { valuation: Valuation; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div className="p-[1px] rounded-xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-200 hover:shadow-md group">
      <div className="rounded-xl bg-white dark:bg-slate-900 p-3 shadow-inner">
        <div className="flex items-center justify-between">
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
        {onEdit && onDelete && (
          <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InspectionRow({ inspection, onEdit, onDelete }: { inspection: Inspection; onEdit?: () => void; onDelete?: () => void }) {
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
        {onEdit && onDelete && (
          <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
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
