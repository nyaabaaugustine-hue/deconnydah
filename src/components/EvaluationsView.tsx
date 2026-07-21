import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  AlertTriangle,
  Calendar,
  ClipboardCheck,
  Shield,
  Clock,
  Award,
  Star,
  TrendingUp,
  CheckCircle2,
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
  getDrivers,
  canWrite,
  canDelete,
} from '@/lib/apiClient';
import type { Driver } from '@/types/fleet';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DriverEvaluation {
  id: string;
  driverId: string;
  driverName?: string;
  evaluatorName: string;
  evaluationDate: string;
  period: string;
  safetyScore: number | null;
  punctualityScore: number | null;
  drivingSkillScore: number | null;
  overallScore: number | null;
  strengths: string;
  improvements: string;
  comments: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const statVariants = {
  emerald: { gradient: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20' },
  blue: { gradient: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20' },
  amber: { gradient: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/20' },
  slate: { gradient: 'from-slate-500 to-slate-600', shadow: 'shadow-slate-500/20' },
};

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  draft: {
    label: 'Draft',
    color: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-500',
  },
  finalized: {
    label: 'Finalized',
    color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string | undefined | null): string {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function scoreBadge(score: number | null) {
  if (score === null || score === undefined) return <span className="text-sm text-slate-400">{'\u2014'}</span>;
  const color = score >= 80
    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
    : score >= 60
      ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800'
      : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border shadow-sm', color)}>
      {score}
    </span>
  );
}

// ── API stubs (to be replaced when apiClient adds these) ─────────────────────

async function getDriverEvaluations(): Promise<DriverEvaluation[]> {
  const res = await fetch('/api/driver-evaluations');
  if (!res.ok) throw new Error('Failed to load evaluations');
  return res.json();
}

async function createDriverEvaluation(data: Partial<DriverEvaluation>): Promise<DriverEvaluation> {
  const res = await fetch('/api/driver-evaluations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to create evaluation');
  return res.json();
}

async function updateDriverEvaluation(id: string, data: Partial<DriverEvaluation>): Promise<DriverEvaluation> {
  const res = await fetch(`/api/driver-evaluations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to update evaluation');
  return res.json();
}

async function deleteDriverEvaluation(id: string): Promise<void> {
  const res = await fetch(`/api/driver-evaluations/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete evaluation');
}

// ── Main Component ────────────────────────────────────────────────────────────

export function EvaluationsView({ role }: { role: string }) {
  const [evaluations, setEvaluations] = useState<DriverEvaluation[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [showForm, setShowForm] = useState(false);
  const [editingEval, setEditingEval] = useState<DriverEvaluation | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    driverId: '',
    evaluatorName: '',
    evaluationDate: new Date().toISOString().split('T')[0],
    period: '',
    safetyScore: '',
    punctualityScore: '',
    drivingSkillScore: '',
    overallScore: '',
    strengths: '',
    improvements: '',
    comments: '',
    status: 'draft',
  });

  const canWriteRole = canWrite(role);
  const canDeleteRole = canDelete(role);

  // ── Data Loading ──────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [evs, drvs] = await Promise.all([
        getDriverEvaluations(),
        getDrivers(),
      ]);
      evs.sort((a, b) => new Date(b.evaluationDate).getTime() - new Date(a.evaluationDate).getTime());
      setEvaluations(evs);
      setDrivers(drvs);
    } catch (err: any) {
      setError(err.message || 'Failed to load evaluations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Driver Map ────────────────────────────────────────────────────────────

  const driverMap = useMemo(() => {
    const map = new Map<string, Driver>();
    drivers.forEach((d) => map.set(d.id, d));
    return map;
  }, [drivers]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = evaluations.length;
    const finalized = evaluations.filter((e) => e.status === 'finalized').length;
    const draft = evaluations.filter((e) => e.status === 'draft').length;
    const scores = evaluations.filter((e) => e.overallScore !== null).map((e) => e.overallScore!);
    const avgOverall = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
    return { total, finalized, avgOverall, draft };
  }, [evaluations]);

  // ── Filtered ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return evaluations.filter((e) => {
      const driverName = driverMap.get(e.driverId)?.fullName || e.driverName || '';
      const matchesSearch =
        !search ||
        driverName.toLowerCase().includes(search.toLowerCase()) ||
        e.period.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [evaluations, search, statusFilter, driverMap]);

  // ── Form Handlers ─────────────────────────────────────────────────────────

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () =>
    setForm({
      driverId: '',
      evaluatorName: '',
      evaluationDate: new Date().toISOString().split('T')[0],
      period: '',
      safetyScore: '',
      punctualityScore: '',
      drivingSkillScore: '',
      overallScore: '',
      strengths: '',
      improvements: '',
      comments: '',
      status: 'draft',
    });

  const openCreate = () => {
    resetForm();
    setEditingEval(null);
    setShowForm(true);
  };

  const openEdit = (ev: DriverEvaluation) => {
    setForm({
      driverId: ev.driverId,
      evaluatorName: ev.evaluatorName,
      evaluationDate: ev.evaluationDate,
      period: ev.period,
      safetyScore: ev.safetyScore?.toString() ?? '',
      punctualityScore: ev.punctualityScore?.toString() ?? '',
      drivingSkillScore: ev.drivingSkillScore?.toString() ?? '',
      overallScore: ev.overallScore?.toString() ?? '',
      strengths: ev.strengths || '',
      improvements: ev.improvements || '',
      comments: ev.comments || '',
      status: ev.status,
    });
    setEditingEval(ev);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.driverId || !form.period) return;
    setSaving(true);
    try {
      const payload: Partial<DriverEvaluation> = {
        driverId: form.driverId,
        evaluatorName: form.evaluatorName,
        evaluationDate: form.evaluationDate,
        period: form.period,
        safetyScore: form.safetyScore ? Number(form.safetyScore) : null,
        punctualityScore: form.punctualityScore ? Number(form.punctualityScore) : null,
        drivingSkillScore: form.drivingSkillScore ? Number(form.drivingSkillScore) : null,
        overallScore: form.overallScore ? Number(form.overallScore) : null,
        strengths: form.strengths,
        improvements: form.improvements,
        comments: form.comments,
        status: form.status,
      };
      if (editingEval) {
        const updated = await updateDriverEvaluation(editingEval.id, payload);
        setEvaluations((prev) => prev.map((e) => (e.id === editingEval.id ? updated : e)));
      } else {
        const created = await createDriverEvaluation(payload);
        setEvaluations((prev) => [created, ...prev]);
      }
      setShowForm(false);
      resetForm();
      setEditingEval(null);
      notify.success(editingEval ? 'Evaluation updated' : 'Evaluation created');
    } catch (err: any) {
      notify.error(err.message || 'Failed to save evaluation');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDriverEvaluation(id);
      setEvaluations((prev) => prev.filter((e) => e.id !== id));
      setDeletingId(null);
      notify.success('Evaluation deleted');
    } catch (err: any) {
      notify.error(err.message || 'Failed to delete evaluation');
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
        <p className="text-sm font-medium text-slate-600">Loading evaluations...</p>
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
        <h3 className="text-lg font-bold text-slate-900 mb-1">Failed to load evaluations</h3>
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
              <ClipboardCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Evaluations
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                Performance evaluations, safety scores, and driving assessments.
              </p>
            </div>
          </div>
          {canWriteRole && (
            <Button
              onClick={openCreate}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/25 rounded-xl transition-all duration-300 hover:shadow-emerald-500/40 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Evaluation
            </Button>
          )}
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <MiniStat label="Total Evaluations" value={stats.total} icon={ClipboardCheck} variant="emerald" />
        <MiniStat label="Finalized" value={stats.finalized} icon={CheckCircle2} variant="emerald" />
        <MiniStat label="Avg Overall Score" value={stats.avgOverall || '\u2014'} icon={Star} variant="blue" />
        <MiniStat label="Draft" value={stats.draft} icon={Clock} variant="slate" />
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors duration-300" />
          <Input
            placeholder="Search by driver name or period..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-11 w-full sm:w-44 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="finalized">Finalized</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No evaluations found"
          subtitle={
            search || statusFilter !== 'all'
              ? 'Try adjusting your filters.'
              : 'Add your first evaluation to get started.'
          }
        />
      ) : (
        <DataTable>
          <TableHeader>
            <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Period</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Safety</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center hidden md:table-cell">Punctuality</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center hidden lg:table-cell">Skill</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Overall</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
              {canWriteRole && <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((ev) => {
              const driver = driverMap.get(ev.driverId);
              const sCfg = statusConfig[ev.status] || statusConfig.draft;
              return (
                <TableRow
                  key={ev.id}
                  className="border-slate-100 dark:border-slate-800/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/20 flex-shrink-0">
                        <ClipboardCheck className="w-3.5 h-3.5 text-white" />
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[160px]">
                        {driver?.fullName || ev.driverName || '\u2014'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      {formatDate(ev.evaluationDate)}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {ev.period || '\u2014'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {scoreBadge(ev.safetyScore)}
                  </TableCell>
                  <TableCell className="text-center hidden md:table-cell">
                    {scoreBadge(ev.punctualityScore)}
                  </TableCell>
                  <TableCell className="text-center hidden lg:table-cell">
                    {scoreBadge(ev.drivingSkillScore)}
                  </TableCell>
                  <TableCell className="text-center">
                    {scoreBadge(ev.overallScore)}
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
                  {canWriteRole && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {deletingId === ev.id ? (
                          <div className="flex gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(ev.id)}
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
                              onClick={() => openEdit(ev)}
                              className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all duration-200"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            {canDeleteRole && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingId(ev.id)}
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

      {/* ── Add/Edit Evaluation Modal ──────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => { setShowForm(false); resetForm(); setEditingEval(null); }}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 ease-smooth-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-[1px] rounded-2xl bg-gradient-to-br from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-2xl shadow-black/20">
              <div className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner flex flex-col max-h-[90vh]">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      {editingEval ? <Pencil className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        {editingEval ? 'Edit Evaluation' : 'Add New Evaluation'}
                      </CardTitle>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {editingEval ? 'Update evaluation details.' : 'Record a new driver evaluation.'}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); resetForm(); setEditingEval(null); }} className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {/* Row: Driver + Evaluator */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Driver *
                      </Label>
                      <Select
                        value={form.driverId}
                        onValueChange={(v) => updateForm('driverId', v)}
                      >
                        <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300">
                          <SelectValue placeholder="Select driver" />
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
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Evaluator Name
                      </Label>
                      <Input
                        value={form.evaluatorName}
                        onChange={(e) => updateForm('evaluatorName', e.target.value)}
                        placeholder="e.g. John Smith"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </div>

                  {/* Row: Date + Period */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Evaluation Date
                      </Label>
                      <Input
                        type="date"
                        value={form.evaluationDate}
                        onChange={(e) => updateForm('evaluationDate', e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Period *
                      </Label>
                      <Input
                        value={form.period}
                        onChange={(e) => updateForm('period', e.target.value)}
                        placeholder="e.g. Q1 2024"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </div>

                  {/* Score Row 1: Safety + Punctuality */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Safety Score (0-100)
                      </Label>
                      <Input
                        type="number"
                        value={form.safetyScore}
                        onChange={(e) => updateForm('safetyScore', e.target.value)}
                        placeholder="0"
                        min="0"
                        max="100"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Punctuality Score (0-100)
                      </Label>
                      <Input
                        type="number"
                        value={form.punctualityScore}
                        onChange={(e) => updateForm('punctualityScore', e.target.value)}
                        placeholder="0"
                        min="0"
                        max="100"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </div>

                  {/* Score Row 2: Driving Skill + Overall */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Driving Skill Score (0-100)
                      </Label>
                      <Input
                        type="number"
                        value={form.drivingSkillScore}
                        onChange={(e) => updateForm('drivingSkillScore', e.target.value)}
                        placeholder="0"
                        min="0"
                        max="100"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Overall Score (0-100)
                      </Label>
                      <Input
                        type="number"
                        value={form.overallScore}
                        onChange={(e) => updateForm('overallScore', e.target.value)}
                        placeholder="0"
                        min="0"
                        max="100"
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </div>

                  {/* Strengths */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Strengths
                    </Label>
                    <textarea
                      value={form.strengths}
                      onChange={(e) => updateForm('strengths', e.target.value)}
                      placeholder="Key strengths observed..."
                      rows={2}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 resize-none transition-all duration-300"
                    />
                  </div>

                  {/* Improvements */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Areas for Improvement
                    </Label>
                    <textarea
                      value={form.improvements}
                      onChange={(e) => updateForm('improvements', e.target.value)}
                      placeholder="Areas that need improvement..."
                      rows={2}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 resize-none transition-all duration-300"
                    />
                  </div>

                  {/* Comments */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Comments
                    </Label>
                    <textarea
                      value={form.comments}
                      onChange={(e) => updateForm('comments', e.target.value)}
                      placeholder="Additional comments..."
                      rows={3}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 resize-none transition-all duration-300"
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Status
                    </Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => updateForm('status', v)}
                    >
                      <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="finalized">Finalized</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => { setShowForm(false); resetForm(); setEditingEval(null); }}
                    className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={saving || !form.driverId || !form.period}
                    className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20 rounded-xl transition-all duration-300 active:scale-[0.98]"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : editingEval ? (
                      <Pencil className="w-4 h-4 mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {editingEval ? 'Save Changes' : 'Add Evaluation'}
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
  icon: typeof ClipboardCheck;
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
  icon: typeof ClipboardCheck;
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
