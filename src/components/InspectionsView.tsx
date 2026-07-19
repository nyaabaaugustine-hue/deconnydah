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
  Clock,
  User,
  Truck,
  Calendar,
  FileText,
  Eye,
  Loader2,
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
  pass: { label: 'Pass', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2, dot: 'bg-emerald-500' },
  fail: { label: 'Fail', color: 'text-red-700 bg-red-50 border-red-200', icon: XCircle, dot: 'bg-red-500' },
  flagged: { label: 'Flagged', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: AlertTriangle, dot: 'bg-amber-500' },
};

type StatusKey = 'pass' | 'fail' | 'flagged';

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
    const matchesSearch =
      insp.driverName.toLowerCase().includes(search.toLowerCase());
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
    } catch (err: any) {
      alert(err.message || 'Failed to submit inspection');
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
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">Loading inspections...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Failed to load inspections</h3>
        <p className="text-sm text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Daily Inspections</h1>
          </div>
          <p className="text-sm text-muted-foreground">Review daily vehicle inspection checklists submitted by drivers before departure.</p>
        </div>
        {canWrite(role) && (
          <Button onClick={() => setShowForm(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Add Inspection
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Inspections" value={stats.total} icon={FileText} tint="emerald" />
        <StatCard label="Passed" value={stats.passed} icon={CheckCircle2} tint="emerald" />
        <StatCard label="Failed" value={stats.failed} icon={XCircle} tint="red" />
        <StatCard label="Flagged" value={stats.flagged} icon={AlertTriangle} tint="amber" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by driver name..."
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pass">Passed</SelectItem>
            <SelectItem value="fail">Failed</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-xl">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No inspections found</h3>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or add a new inspection.</p>
          </div>
        ) : (
          filtered.map((insp) => {
            const cfg = statusConfig[insp.overallStatus] || statusConfig.pass;
            const StatusIcon = cfg.icon;
            const passCount = insp.checklist?.filter((c) => c.status === 'pass').length ?? 0;
            const failCount = insp.checklist?.filter((c) => c.status === 'fail').length ?? 0;
            const flagCount = insp.checklist?.filter((c) => c.status === 'flagged').length ?? 0;

            return (
              <Card key={insp.id} className="group hover:shadow-md transition-all duration-200 border-border/60">
                <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center border', cfg.color)}>
                      <StatusIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold">{insp.id.slice(0, 8).toUpperCase()}</h3>
                        <Badge variant="outline" className={cn('text-xs font-medium border', cfg.color)}>
                          {cfg.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">Vehicle: {insp.vehicleId.slice(0, 8)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-3.5 h-3.5" />
                      <span className="font-medium">{insp.driverName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(insp.inspectionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> {passCount}
                      </span>
                      {flagCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                          <AlertTriangle className="w-3 h-3" /> {flagCount}
                        </span>
                      )}
                      {failCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                          <XCircle className="w-3 h-3" /> {failCount}
                        </span>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSelectedInspection(insp)}>
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
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

function StatCard({ label, value, icon: Icon, tint }: {
  label: string;
  value: number;
  icon: typeof FileText;
  tint: 'emerald' | 'red' | 'amber';
}) {
  const tints = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  };
  return (
    <Card className="shadow-sm border-border/60">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center border', tints[tint])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InspectionFormModal({
  formData,
  setFormData,
  checklist,
  setChecklist,
  onClose,
  onSubmit,
  submitting,
}: {
  formData: { vehicleId: string; driverName: string; inspectionDate: string; notes: string };
  setFormData: React.Dispatch<React.SetStateAction<{ vehicleId: string; driverName: string; inspectionDate: string; notes: string }>>;
  checklist: Record<string, { status: StatusKey; note: string }>;
  setChecklist: React.Dispatch<React.SetStateAction<Record<string, { status: StatusKey; note: string }>>>;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const setStatus = (key: string, status: StatusKey) => {
    setChecklist((prev) => ({ ...prev, [key]: { ...prev[key], status } }));
  };
  const setNote = (key: string, note: string) => {
    setChecklist((prev) => ({ ...prev, [key]: { ...prev[key], note } }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <Card className="w-full max-w-3xl shadow-2xl border-border/50 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-primary/10 flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">New Daily Inspection</CardTitle>
              <p className="text-xs text-muted-foreground">Complete the pre-departure checklist</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="font-medium">Vehicle ID *</Label>
              <Input
                value={formData.vehicleId}
                onChange={(e) => setFormData((prev) => ({ ...prev, vehicleId: e.target.value }))}
                placeholder="Enter vehicle UUID"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-medium">Driver Name *</Label>
              <Input
                value={formData.driverName}
                onChange={(e) => setFormData((prev) => ({ ...prev, driverName: e.target.value }))}
                placeholder="e.g. Kwame Mensah"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-medium">Inspection Date</Label>
              <Input
                type="date"
                value={formData.inspectionDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, inspectionDate: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Pre-Departure Checklist</h3>
              <p className="text-xs text-muted-foreground">Mark each item as Pass, Fail, or Flagged</p>
            </div>
            <div className="space-y-2">
              {checklistDefinitions.map((item) => {
                const current = checklist[item.key];
                return (
                  <div key={item.key} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{item.label}</span>
                      <div className="flex items-center gap-1.5">
                        {(['pass', 'fail', 'flagged'] as const).map((status) => {
                          const cfg = statusConfig[status];
                          const isActive = current.status === status;
                          return (
                            <button
                              key={status}
                              onClick={() => setStatus(item.key, status)}
                              className={cn(
                                'px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
                                isActive ? cfg.color : 'bg-background text-muted-foreground border-border hover:border-border'
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
                        className="mt-2 h-8 text-sm"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-medium">General Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional observations or notes for the supervisor..."
              className="min-h-[80px]"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border/50 bg-muted/30 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={onSubmit}
            disabled={submitting || !formData.vehicleId || !formData.driverName}
            className="bg-primary hover:bg-primary/90"
          >
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Submit Inspection
          </Button>
        </div>
      </Card>
    </div>
  );
}

function InspectionReviewModal({ inspection, onClose }: { inspection: Inspection; onClose: () => void }) {
  const cfg = statusConfig[inspection.overallStatus] || statusConfig.pass;
  const StatusIcon = cfg.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <Card className="w-full max-w-3xl shadow-2xl border-border/50 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="border-b border-border/50 bg-muted/30 flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', cfg.color)}>
              <StatusIcon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Inspection Report</CardTitle>
              <p className="text-xs text-muted-foreground font-mono">{inspection.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MetaItem icon={User} label="Driver" value={inspection.driverName} />
            <MetaItem icon={Calendar} label="Date" value={new Date(inspection.inspectionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} />
            <MetaItem icon={Truck} label="Vehicle" value={inspection.vehicleId.slice(0, 8)} />
          </div>

          <div className={cn('rounded-xl border p-4 flex items-center gap-3', cfg.color)}>
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
            <h3 className="text-sm font-semibold mb-3">Checklist Details</h3>
            <div className="space-y-2">
              {(inspection.checklist || []).map((item) => {
                const itemCfg = statusConfig[item.status] || statusConfig.pass;
                const ItemIcon = itemCfg.icon;
                return (
                  <div key={item.key} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-background">
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border', itemCfg.color)}>
                      <ItemIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{item.label}</span>
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-md border', itemCfg.color)}>
                          {itemCfg.label}
                        </span>
                      </div>
                      {item.note && <p className="text-xs text-muted-foreground mt-1 italic">"{item.note}"</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {inspection.notes && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Driver Notes</h3>
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-sm text-muted-foreground">{inspection.notes}</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border/50 bg-muted/30 flex items-center justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </Card>
    </div>
  );
}

function MetaItem({ icon: Icon, label, value }: { icon: typeof Truck; label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-semibold truncate">{value}</p>
    </div>
  );
}
