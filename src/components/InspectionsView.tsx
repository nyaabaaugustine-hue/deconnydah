import { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Plus,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  Calendar,
  User,
  Truck,
  FileText,
  Eye,
  Loader2,
  ClipboardList,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { notify } from '../lib/notify';
import { getInspections, createInspection, canWrite, type Inspection } from '@/lib/apiClient';

const checklistDefinitions = [
  { key: 'tyres', label: 'Tyres & Wheels' },
  { key: 'lights', label: 'Lights & Indicators' },
  { key: 'brakes', label: 'Brake System' },
  { key: 'engine_oil', label: 'Engine Oil Level' },
  { key: 'coolant', label: 'Coolant Level' },
  { key: 'battery', label: 'Battery Condition' },
  { key: 'windshield', label: 'Windshield & Wipers' },
  { key: 'mirrors', label: 'Mirrors' },
  { key: 'horn', label: 'Horn' },
  { key: 'seatbelt', label: 'Seatbelts' },
  { key: 'fire_extinguisher', label: 'Fire Extinguisher' },
  { key: 'first_aid', label: 'First Aid Kit' },
];

const statusConfig = {
  pass: { label: 'Pass', color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800', icon: CheckCircle2, dot: 'bg-emerald-500' },
  fail: { label: 'Fail', color: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800', icon: XCircle, dot: 'bg-red-500' },
  flagged: { label: 'Flagged', color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800', icon: AlertTriangle, dot: 'bg-amber-500' },
};

type StatusKey = 'pass' | 'fail' | 'flagged';

// ── Stat Variants ─────────────────────────────────────────────────────────────

const statVariants = {
  emerald: { gradient: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20' },
  red: { gradient: 'from-red-500 to-red-600', shadow: 'shadow-red-500/20' },
  amber: { gradient: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/20' },
};

export function InspectionsView({ role }: { role: string }) {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);

  const [formData, setFormData] = useState({
    vehicleId: '',
    driverName: '',
    inspectionDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [checklist, setChecklist] = useState<Record<string, { status: StatusKey; note: string }>>(
    Object.fromEntries(checklistDefinitions.map((c) => [c.key, { status: 'pass' as StatusKey, note: '' }]))
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getInspections();
        if (!cancelled) setInspections(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load inspections');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => inspections.filter((insp) => {
    const matchesSearch = insp.driverName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || insp.overallStatus === statusFilter;
    return matchesSearch && matchesStatus;
  }), [inspections, search, statusFilter]);

  const stats = {
    total: inspections.length,
    passed: inspections.filter((i) => i.overallStatus === 'pass').length,
    failed: inspections.filter((i) => i.overallStatus === 'fail').length,
    flagged: inspections.filter((i) => i.overallStatus === 'flagged').length,
  };

  const computeOverall = (checks: Record<string, { status: StatusKey; note: string }>) => {
    const values = Object.values(checks);
    if (values.some((v) => v.status === 'fail')) return 'fail';
    if (values.some((v) => v.status === 'flagged')) return 'flagged';
    return 'pass';
  };

  const handleSubmit = async () => {
    if (!formData.vehicleId || !formData.driverName) return;
    setSubmitting(true);
    try {
      const newInspection = await createInspection({
        vehicleId: formData.vehicleId,
        driverName: formData.driverName,
        inspectionDate: formData.inspectionDate,
        overallStatus: computeOverall(checklist),
        checklist: checklistDefinitions.map((c) => ({
          key: c.key,
          label: c.label,
          status: checklist[c.key].status,
          note: checklist[c.key].note || undefined,
        })),
        notes: formData.notes,
        photoCount: 0,
      });
      setInspections((prev) => [newInspection, ...prev]);
      setShowForm(false);
      resetForm();
      notify.success('Inspection submitted');
    } catch (err: any) {
      notify.error(err.message || 'Failed to submit inspection');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ vehicleId: '', driverName: '', inspectionDate: new Date().toISOString().split('T')[0], notes: '' });
    setChecklist(Object.fromEntries(checklistDefinitions.map((c) => [c.key, { status: 'pass' as StatusKey, note: '' }])));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-indigo-400/30 to-indigo-600/30 blur-lg -z-10" />
        </div>
        <p className="text-sm font-medium text-slate-600">Loading inspections...</p>
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
        <h3 className="text-lg font-bold text-slate-900 mb-1">Failed to load inspections</h3>
        <p className="text-sm text-red-600 mb-6">{error}</p>
        <Button onClick={() => window.location.reload()} className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/20 rounded-xl">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Premium Header ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-8 shadow-xl">
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_20%_30%,white,transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_80%_70%,#818cf8,transparent_50%)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 items-center justify-center shadow-lg">
              <ClipboardList className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Daily Inspections</h1>
              <p className="text-sm text-slate-300 mt-1">Review daily vehicle inspection checklists submitted by drivers.</p>
            </div>
          </div>
          {canWrite(role) && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/25 rounded-xl transition-all duration-300 hover:shadow-indigo-500/40 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Inspection
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <MiniStat label="Total" value={stats.total} icon={ClipboardList} variant="indigo" />
        <MiniStat label="Passed" value={stats.passed} icon={CheckCircle2} variant="emerald" />
        <MiniStat label="Failed" value={stats.failed} icon={XCircle} variant={stats.failed > 0 ? 'red' : 'slate'} />
        <MiniStat label="Flagged" value={stats.flagged} icon={AlertTriangle} variant={stats.flagged > 0 ? 'amber' : 'slate'} />
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors duration-300" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by driver name..."
            className="pl-10 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-300"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-11 w-full sm:w-44 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl">
            <Filter className="w-4 h-4 mr-2 text-slate-400" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pass">✅ Passed</SelectItem>
            <SelectItem value="fail">❌ Failed</SelectItem>
            <SelectItem value="flagged">⚠️ Flagged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Inspection Cards ────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mb-4">
              <ClipboardList className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No inspections found</h3>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or add a new inspection.</p>
          </div>
        ) : (
          filtered.map((insp) => {
            const cfg = statusConfig[insp.overallStatus] || statusConfig.pass;
            const StatusIcon = cfg.icon;
            const passCount = insp.checklist?.filter((c) => c.status === 'pass').length ?? 0;
            const failCount = insp.checklist?.filter((c) => c.status === 'fail').length ?? 0;
            const flagCount = insp.checklist?.filter((c) => c.status === 'flagged').length ?? 0;

            return (
              <div key={insp.id} className="group relative">
                <div className="p-[1px] rounded-2xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:shadow-slate-200/50 dark:group-hover:shadow-black/20">
                  <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-inner transition-all duration-300">
                    <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm transition-all duration-300 group-hover:scale-105', cfg.color)}>
                          <StatusIcon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                              {insp.id.slice(0, 8).toUpperCase()}
                            </h3>
                            <Badge variant="outline" className={cn('text-xs font-medium border shadow-sm', cfg.color)}>
                              <span className={cn('w-1.5 h-1.5 rounded-full mr-1', cfg.dot)} />
                              {cfg.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                            Vehicle: {insp.vehicleId.slice(0, 8)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <User className="w-3.5 h-3.5" />
                          <span className="font-medium text-slate-700 dark:text-slate-300">{insp.driverName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(insp.inspectionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-emerald-200 dark:border-emerald-800 shadow-sm">
                            <CheckCircle2 className="w-3 h-3" /> {passCount}
                          </span>
                          {flagCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-xs font-semibold border border-amber-200 dark:border-amber-800 shadow-sm">
                              <AlertTriangle className="w-3 h-3" /> {flagCount}
                            </span>
                          )}
                          {failCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 text-xs font-semibold border border-red-200 dark:border-red-800 shadow-sm">
                              <XCircle className="w-3 h-3" /> {failCount}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedInspection(insp)}
                          className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          Review
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <InspectionFormModal
          formData={formData}
          setFormData={setFormData}
          checklist={checklist}
          setChecklist={setChecklist}
          onClose={() => { setShowForm(false); resetForm(); }}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}

      {selectedInspection && (
        <InspectionReviewModal inspection={selectedInspection} onClose={() => setSelectedInspection(null)} />
      )}
    </div>
  );
}

// ── Mini Stat ─────────────────────────────────────────────────────────────────

const miniStatVariants: Record<string, { gradient: string; shadow: string }> = {
  indigo: { gradient: 'from-indigo-500 to-indigo-600', shadow: 'shadow-indigo-500/20' },
  emerald: { gradient: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20' },
  red: { gradient: 'from-red-500 to-red-600', shadow: 'shadow-red-500/20' },
  amber: { gradient: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/20' },
  slate: { gradient: 'from-slate-500 to-slate-600', shadow: 'shadow-slate-500/20' },
};

function MiniStat({ label, value, icon: Icon, variant }: {
  label: string;
  value: number;
  icon: typeof ClipboardList;
  variant: 'indigo' | 'emerald' | 'red' | 'amber' | 'slate';
}) {
  const cfg = miniStatVariants[variant] || miniStatVariants.slate;
  return (
    <div className="group relative">
      <div className="p-[1px] rounded-2xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-300 group-hover:shadow-md">
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-inner">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{label}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
            </div>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg transition-all duration-300 group-hover:scale-110', cfg.gradient, cfg.shadow)}>
              <Icon className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Form Modal ────────────────────────────────────────────────────────────────

function InspectionFormModal({
  formData, setFormData, checklist, setChecklist, onClose, onSubmit, submitting,
}: {
  formData: { vehicleId: string; driverName: string; inspectionDate: string; notes: string };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
  checklist: Record<string, { status: StatusKey; note: string }>;
  setChecklist: React.Dispatch<React.SetStateAction<typeof checklist>>;
  onClose: () => void; onSubmit: () => void; submitting: boolean;
}) {
  const setStatus = (key: string, status: StatusKey) => setChecklist((prev) => ({ ...prev, [key]: { ...prev[key], status } }));
  const setNote = (key: string, note: string) => setChecklist((prev) => ({ ...prev, [key]: { ...prev[key], note } }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 ease-smooth-in" onClick={(e) => e.stopPropagation()}>
        <div className="p-[1px] rounded-2xl bg-gradient-to-br from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-2xl shadow-black/20">
          <div className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner flex flex-col max-h-[90vh]">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50/50 to-transparent dark:from-indigo-950/20 dark:to-transparent flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <ClipboardList className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">New Daily Inspection</CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Complete the pre-departure checklist</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4" /></Button>
            </CardHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(['vehicleId', 'driverName', 'inspectionDate'] as const).map((field) => (
                  <div key={field} className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {field === 'vehicleId' ? 'Vehicle ID *' : field === 'driverName' ? 'Driver Name *' : 'Inspection Date'}
                    </Label>
                    <Input
                      value={formData[field]}
                      onChange={(e) => setFormData((prev) => ({ ...prev, [field]: field === 'inspectionDate' ? e.target.value : e.target.value }))}
                      placeholder={field === 'vehicleId' ? 'Enter vehicle UUID' : field === 'driverName' ? 'e.g. Kwame Mensah' : ''}
                      type={field === 'inspectionDate' ? 'date' : 'text'}
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-300"
                    />
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Pre-Departure Checklist</h3>
                  <p className="text-xs text-slate-400">Mark each item as Pass, Fail, or Flagged</p>
                </div>
                <div className="space-y-2">
                  {checklistDefinitions.map((item) => {
                    const current = checklist[item.key];
                    return (
                      <div key={item.key} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                          <div className="flex items-center gap-1.5">
                            {(['pass', 'fail', 'flagged'] as const).map((status) => {
                              const cfg = statusConfig[status];
                              const isActive = current.status === status;
                              return (
                                <button
                                  key={status}
                                  onClick={() => setStatus(item.key, status)}
                                  className={cn(
                                    'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all duration-200',
                                    isActive
                                      ? cfg.color + ' shadow-sm'
                                      : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                  )}
                                >
                                  {cfg.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {(current.status === 'fail' || current.status === 'flagged') && (
                          <Input
                            value={current.note}
                            onChange={(e) => setNote(item.key, e.target.value)}
                            placeholder={`Add note for ${item.label.toLowerCase()}...`}
                            className="mt-2 h-8 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">General Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any additional observations or notes for the supervisor..."
                  className="min-h-[80px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-300"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={onClose} className="rounded-xl border-slate-200 dark:border-slate-700 transition-all duration-200">Cancel</Button>
              <Button
                onClick={onSubmit}
                disabled={submitting || !formData.vehicleId || !formData.driverName}
                className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-lg shadow-indigo-500/20 rounded-xl transition-all duration-300 active:scale-[0.98]"
              >
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Submit Inspection
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Review Modal ──────────────────────────────────────────────────────────────

function InspectionReviewModal({ inspection, onClose }: { inspection: Inspection; onClose: () => void }) {
  const cfg = statusConfig[inspection.overallStatus] || statusConfig.pass;
  const StatusIcon = cfg.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 ease-smooth-in" onClick={(e) => e.stopPropagation()}>
        <div className="p-[1px] rounded-2xl bg-gradient-to-br from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-2xl shadow-black/20">
          <div className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner flex flex-col max-h-[90vh]">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6">
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm', cfg.color)}>
                  <StatusIcon className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Inspection Report</CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{inspection.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4" /></Button>
            </CardHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <MetaItem icon={User} label="Driver" value={inspection.driverName} />
                <MetaItem icon={Calendar} label="Date" value={new Date(inspection.inspectionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} />
                <MetaItem icon={Truck} label="Vehicle" value={inspection.vehicleId.slice(0, 8)} />
              </div>

              <div className={cn('rounded-xl border p-4 flex items-center gap-3 shadow-sm', cfg.color)}>
                <StatusIcon className="w-6 h-6 flex-shrink-0" />
                <div>
                  <p className="font-bold text-sm">Overall Status: {cfg.label}</p>
                  <p className="text-xs opacity-80">
                    {inspection.overallStatus === 'pass' && 'Vehicle cleared for departure.'}
                    {inspection.overallStatus === 'fail' && 'Vehicle NOT roadworthy. Do not dispatch.'}
                    {inspection.overallStatus === 'flagged' && 'Vehicle requires attention before departure.'}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">Checklist Details</h3>
                <div className="space-y-2">
                  {(inspection.checklist || []).map((item) => {
                    const itemCfg = statusConfig[item.status] || statusConfig.pass;
                    const ItemIcon = itemCfg.icon;
                    return (
                      <div key={item.key} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border shadow-sm', itemCfg.color)}>
                          <ItemIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-md border', itemCfg.color)}>{itemCfg.label}</span>
                          </div>
                          {item.note && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">"{item.note}"</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {inspection.notes && (
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Driver Notes</h3>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-600 dark:text-slate-400">{inspection.notes}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-end">
              <Button variant="outline" onClick={onClose} className="rounded-xl border-slate-200 dark:border-slate-700">Close</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{value}</p>
    </div>
  );
}
