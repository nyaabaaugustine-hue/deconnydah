import { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  ShieldCheck,
  Lightbulb,
  Info,
  ArrowUp,
  ArrowDown,
  Minus,
  Loader2,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Award,
  Target,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { cn } from '@/lib/utils';
import {
  getVehicles,
  getDrivers,
  getSupervisors,
  getServiceLogsForVehicle,
  getBatteryLogsForVehicle,
  getTyreLogsForVehicle,
  getRevenueForVehicle,
  getAccidentsForVehicle,
  getDocumentsForVehicle,
} from '@/lib/apiClient';
import type {
  Vehicle, Driver, Supervisor, VehicleDocument,
  ServiceLog, BatteryLog, TyreLog, RevenueEntry, AccidentReport,
} from '@/types/fleet';
import {
  calculateProfitability,
  calculateDriverScores,
  calculateSupervisorTeams,
  generateDecisionInsights,
} from '@/lib/analytics';

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/20 backdrop-blur-sm">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="font-medium text-slate-700 dark:text-slate-300">{entry.name}:</span>
          <span className="font-bold text-slate-900 dark:text-white">GH₵ {Number(entry.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ── Stat Card Variants ────────────────────────────────────────────────────────

const statVariants = {
  emerald: { iconBg: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400' },
  indigo: { iconBg: 'from-indigo-500 to-indigo-600', shadow: 'shadow-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400' },
  amber: { iconBg: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/20', text: 'text-amber-600 dark:text-amber-400' },
  rose: { iconBg: 'from-rose-500 to-rose-600', shadow: 'shadow-rose-500/20', text: 'text-rose-600 dark:text-rose-400' },
};

// ── Main Component ────────────────────────────────────────────────────────────

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState('ytd');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [serviceLogs, setServiceLogs] = useState<ServiceLog[]>([]);
  const [batteryLogs, setBatteryLogs] = useState<BatteryLog[]>([]);
  const [tyreLogs, setTyreLogs] = useState<TyreLog[]>([]);
  const [revenueEntries, setRevenueEntries] = useState<RevenueEntry[]>([]);
  const [accidentReports, setAccidentReports] = useState<AccidentReport[]>([]);
  const [vehicleDocuments, setVehicleDocuments] = useState<VehicleDocument[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [v, d, s] = await Promise.all([getVehicles(), getDrivers(), getSupervisors()]);
        if (cancelled) return;
        setVehicles(v);
        setDrivers(d);
        setSupervisors(s);

        const allService: ServiceLog[] = [];
        const allBattery: BatteryLog[] = [];
        const allTyre: TyreLog[] = [];
        const allRevenue: RevenueEntry[] = [];
        const allAccidents: AccidentReport[] = [];
        const allDocs: VehicleDocument[] = [];

        const subResults = await Promise.all(
          v.map(async (veh) => {
            const [svc, bat, tyr, rev, acc, docs] = await Promise.all([
              getServiceLogsForVehicle(veh.id),
              getBatteryLogsForVehicle(veh.id),
              getTyreLogsForVehicle(veh.id),
              getRevenueForVehicle(veh.id),
              getAccidentsForVehicle(veh.id),
              getDocumentsForVehicle(veh.id),
            ]);
            return { svc, bat, tyr, rev, acc, docs };
          })
        );

        if (cancelled) return;
        for (const r of subResults) {
          allService.push(...r.svc);
          allBattery.push(...r.bat);
          allTyre.push(...r.tyr);
          allRevenue.push(...r.rev);
          allAccidents.push(...r.acc);
          allDocs.push(...r.docs);
        }

        setServiceLogs(allService);
        setBatteryLogs(allBattery);
        setTyreLogs(allTyre);
        setRevenueEntries(allRevenue);
        setAccidentReports(allAccidents);
        setVehicleDocuments(allDocs);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load analytics data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const profitability = useMemo(
    () => calculateProfitability(vehicles, drivers, serviceLogs, batteryLogs, tyreLogs, revenueEntries, accidentReports, vehicleDocuments),
    [vehicles, drivers, serviceLogs, batteryLogs, tyreLogs, revenueEntries, accidentReports, vehicleDocuments],
  );
  const driverScores = useMemo(
    () => calculateDriverScores(drivers, supervisors, revenueEntries, accidentReports),
    [drivers, supervisors, revenueEntries, accidentReports],
  );
  const supervisorTeams = useMemo(
    () => calculateSupervisorTeams(drivers, supervisors, revenueEntries, accidentReports),
    [drivers, supervisors, revenueEntries, accidentReports],
  );
  const insights = useMemo(() => generateDecisionInsights(), []);

  // ── Premium loading ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-indigo-400/30 to-indigo-600/30 blur-lg -z-10" />
        </div>
        <p className="text-sm font-medium text-slate-600">Crunching analytics...</p>
        <p className="text-xs text-slate-400 mt-1">Processing fleet profitability and driver scores</p>
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
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Failed to load analytics</h3>
        <p className="text-sm text-red-600 mb-6">{error}</p>
        <button onClick={() => window.location.reload()} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-4 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* ── Premium Header ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-8 shadow-xl">
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_20%_30%,white,transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_80%_70%,#818cf8,transparent_50%)]" />
        
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 items-center justify-center shadow-lg">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Fleet Analytics</h1>
              <p className="text-sm text-slate-300 mt-1">
                Answering key management questions based on fleet data.
              </p>
            </div>
          </div>
          <div className="relative group">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="h-11 w-full sm:w-44 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 transition-all duration-300 rounded-xl focus:border-white/40 focus:ring-2 focus:ring-white/20">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-black/20">
                <SelectItem value="monthly">📆 Monthly</SelectItem>
                <SelectItem value="quarterly">📊 Quarterly</SelectItem>
                <SelectItem value="ytd">📈 Year to Date</SelectItem>
                <SelectItem value="all">📋 All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── Insight Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <MiniStat label="Total Vehicles" value={vehicles.length} icon={Target} variant="emerald" />
        <MiniStat label="Total Drivers" value={drivers.length} icon={Users} variant="indigo" />
        <MiniStat label="Revenue Entries" value={revenueEntries.length} icon={DollarSign} variant="amber" />
        <MiniStat label="Accident Reports" value={accidentReports.length} icon={AlertTriangle} variant={accidentReports.length > 0 ? 'rose' : 'emerald'} />
      </div>

      {/* ── Analytics Grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProfitabilityCard data={profitability} />
        <DriverPerformanceCard data={driverScores} />
        <SupervisorTeamsCard data={supervisorTeams} />
        <DecisionValueCard data={insights} />
      </div>
    </div>
  );
}

// ── Mini Stat (inline small stat bar) ──────────────────────────────────────────

function MiniStat({ label, value, icon: Icon, variant }: {
  label: string;
  value: number;
  icon: typeof Target;
  variant: keyof typeof statVariants;
}) {
  const cfg = statVariants[variant];
  return (
    <div className="group relative">
      <div className="p-[1px] rounded-2xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-300 group-hover:shadow-md">
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-inner transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
            </div>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg transition-all duration-300 group-hover:scale-110', cfg.iconBg, cfg.shadow)}>
              <Icon className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Profitability Card ─────────────────────────────────────────────────────────

function ProfitabilityCard({ data }: { data: ReturnType<typeof calculateProfitability> }) {
  const chartData = data.map(row => ({
    name: row.vehicle.plateNumber,
    revenue: row.totalRevenue,
    cost: row.totalCost,
  }));

  const hasDataGaps = data.some(row => row.hasDataGaps);

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Vehicle Profitability</CardTitle>
              <CardDescription className="text-xs pt-0.5">
                Net Margin = Revenue - (Service + Battery + Tyre + Insurance + Accident Costs)
              </CardDescription>
            </div>
          </div>
          <Info className="w-4 h-4 text-slate-300 dark:text-slate-600" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72 -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="revenue" fill="hsl(160 84% 39%)" radius={[6, 6, 0, 0]} name="Revenue" />
              <Bar dataKey="cost" fill="hsl(0 84% 60%)" radius={[6, 6, 0, 0]} name="Cost" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {hasDataGaps && (
          <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-amber-50/50 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Data incomplete: some vehicles have no revenue records.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Driver Performance Card ────────────────────────────────────────────────────

function DriverPerformanceCard({ data }: { data: ReturnType<typeof calculateDriverScores> }) {
  const chartData = data.slice(0, 6).map(d => ({
    driver: d.driverName.split(' ')[0],
    score: d.score,
    inspections: Math.round(d.inspectionPassRate * 100),
    accidents: Math.round(d.accidentFreeRatio * 100),
    revenue: Math.min(Math.round((d.revenue / 20000) * 100), 100),
  }));

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-indigo-500 to-indigo-600" />
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Driver Performance Scores</CardTitle>
              <CardDescription className="text-xs pt-0.5">
                Composite: Inspection pass rate, accident-free ratio, revenue generated.
              </CardDescription>
            </div>
          </div>
          <Info className="w-4 h-4 text-slate-300 dark:text-slate-600" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72 -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="driver" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <PolarRadiusAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={30} domain={[0, 100]} />
              <Radar name="Score" dataKey="score" stroke="hsl(245 80% 55%)" fill="hsl(245 80% 55%)" fillOpacity={0.5} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-slate-50/50 dark:from-slate-800/50 dark:to-slate-800/30 border border-slate-200 dark:border-slate-700 flex items-start gap-2">
          <Info className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Formula: (Revenue × 0.4) + (Inspections × 0.3) + (Safety × 0.3)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Supervisor Teams Card ──────────────────────────────────────────────────────

function SupervisorTeamsCard({ data }: { data: ReturnType<typeof calculateSupervisorTeams> }) {
  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Supervisor Team Strength</CardTitle>
              <CardDescription className="text-xs pt-0.5">
                Aggregate driver scores by supervisor with trend analysis.
              </CardDescription>
            </div>
          </div>
          <Info className="w-4 h-4 text-slate-300 dark:text-slate-600" />
        </div>
      </CardHeader>
      <CardContent>
        {/* Outer shell */}
        <div className="p-[1px] rounded-xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800">
          <div className="rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <TableHead className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Supervisor</TableHead>
                  <TableHead className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Team Size</TableHead>
                  <TableHead className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Avg Score</TableHead>
                  <TableHead className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-sm text-slate-400">
                      No supervisor data available.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => (
                    <TableRow key={row.supervisorId} className="border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <TableCell className="font-semibold text-slate-800 dark:text-slate-200">{row.supervisorName}</TableCell>
                      <TableCell className="text-center font-medium text-slate-600 dark:text-slate-400">{row.teamSize}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{row.avgScore}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {row.trend === 'up' && <ArrowUp className="w-4 h-4 text-emerald-500" />}
                          {row.trend === 'down' && <ArrowDown className="w-4 h-4 text-red-500" />}
                          {row.trend === 'stable' && <Minus className="w-4 h-4 text-slate-400" />}
                          <span className={cn(
                            'text-xs font-semibold',
                            row.trend === 'up' && 'text-emerald-600 dark:text-emerald-400',
                            row.trend === 'down' && 'text-red-600 dark:text-red-400',
                            row.trend === 'stable' && 'text-slate-500 dark:text-slate-400',
                          )}>
                            {row.trendLabel}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Decision Value Card ────────────────────────────────────────────────────────

function DecisionValueCard({ data }: { data: ReturnType<typeof generateDecisionInsights> }) {
  const confidenceConfig = {
    high: { bg: 'from-emerald-50 to-emerald-50/50 dark:from-emerald-950/30 dark:to-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400' },
    medium: { bg: 'from-amber-50 to-amber-50/50 dark:from-amber-950/30 dark:to-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400' },
    low: { bg: 'from-slate-50 to-slate-50/50 dark:from-slate-800/30 dark:to-slate-800/20', border: 'border-slate-200 dark:border-slate-700', text: 'text-slate-600 dark:text-slate-400', badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' },
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-rose-500 to-rose-600" />
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Long-Term Value Decisions</CardTitle>
              <CardDescription className="text-xs pt-0.5">
                Correlations between maintenance patterns and resale value.
              </CardDescription>
            </div>
          </div>
          <Info className="w-4 h-4 text-slate-300 dark:text-slate-600" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Award className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-400">No insights available yet.</p>
          </div>
        ) : (
          data.map((insight, idx) => {
            const conf = confidenceConfig[insight.confidence];
            return (
              <div
                key={idx}
                className={cn(
                  'p-4 rounded-xl bg-gradient-to-br border shadow-sm transition-all duration-200 hover:shadow-md',
                  conf.bg, conf.border
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border', conf.border, conf.badge)}>
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{insight.title}</p>
                      <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border', conf.badge, conf.border)}>
                        {insight.confidence}
                      </span>
                    </div>
                    <p className={cn('text-xs mt-1', conf.text)}>{insight.insight}</p>
                    {insight.detail && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic">{insight.detail}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
