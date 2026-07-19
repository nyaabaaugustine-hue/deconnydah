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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">Crunching analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Failed to load analytics</h3>
        <p className="text-sm text-destructive mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="text-sm text-primary hover:underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fleet Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Answering key management questions based on fleet data.</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="ytd">Year to Date</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProfitabilityCard data={profitability} />
        <DriverPerformanceCard data={driverScores} />
        <SupervisorTeamsCard data={supervisorTeams} />
        <DecisionValueCard data={insights} />
      </div>
    </div>
  );
}

function ProfitabilityCard({ data }: { data: ReturnType<typeof calculateProfitability> }) {
  const chartData = data.map(row => ({
    name: row.vehicle.plateNumber,
    revenue: row.totalRevenue,
    cost: row.totalCost,
  }));

  const hasDataGaps = data.some(row => row.hasDataGaps);

  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <CardTitle className="text-base font-bold">Vehicle Profitability</CardTitle>
          </div>
          <Info className="w-4 h-4 text-muted-foreground" />
        </div>
        <CardDescription className="text-xs pt-1">
          Net Margin = Revenue - (Service + Battery + Tyre + Insurance + Accident Costs)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="revenue" fill="hsl(160 84% 39%)" radius={[4, 4, 0, 0]} name="Revenue" />
              <Bar dataKey="cost" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} name="Cost" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {hasDataGaps && (
          <div className="mt-4 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Data incomplete: some vehicles have no revenue records.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DriverPerformanceCard({ data }: { data: ReturnType<typeof calculateDriverScores> }) {
  const chartData = data.slice(0, 6).map(d => ({
    driver: d.driverName.split(' ')[0],
    score: d.score,
    inspections: Math.round(d.inspectionPassRate * 100),
    accidents: Math.round(d.accidentFreeRatio * 100),
    revenue: Math.min(Math.round((d.revenue / 20000) * 100), 100),
  }));

  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <CardTitle className="text-base font-bold">Driver Performance Scores</CardTitle>
          </div>
          <Info className="w-4 h-4 text-muted-foreground" />
        </div>
        <CardDescription className="text-xs pt-1">
          Composite score: Inspection pass rate, accident-free ratio, revenue generated.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 -ml-4">
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
        <div className="mt-4 text-xs text-muted-foreground bg-muted/50 border border-border/50 rounded-md p-2 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Formula: (Revenue * 0.4) + (Inspections * 0.3) + (Safety * 0.3)</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SupervisorTeamsCard({ data }: { data: ReturnType<typeof calculateSupervisorTeams> }) {
  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
            </div>
            <CardTitle className="text-base font-bold">Supervisor Team Strength</CardTitle>
          </div>
          <Info className="w-4 h-4 text-muted-foreground" />
        </div>
        <CardDescription className="text-xs pt-1">
          Aggregate driver scores by supervisor with trend analysis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Supervisor</TableHead>
              <TableHead className="text-xs text-center">Team Size</TableHead>
              <TableHead className="text-xs text-center">Avg Score</TableHead>
              <TableHead className="text-xs text-right">Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.supervisorId}>
                <TableCell className="font-medium">{row.supervisorName}</TableCell>
                <TableCell className="text-center">{row.teamSize}</TableCell>
                <TableCell className="text-center font-mono font-semibold">{row.avgScore}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {row.trend === 'up' && <ArrowUp className="w-4 h-4 text-emerald-500" />}
                    {row.trend === 'down' && <ArrowDown className="w-4 h-4 text-destructive" />}
                    {row.trend === 'stable' && <Minus className="w-4 h-4 text-muted-foreground" />}
                    <span className={cn(
                      'text-xs font-medium',
                      row.trend === 'up' && 'text-emerald-600',
                      row.trend === 'down' && 'text-destructive',
                      row.trend === 'stable' && 'text-muted-foreground',
                    )}>
                      {row.trendLabel}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DecisionValueCard({ data }: { data: ReturnType<typeof generateDecisionInsights> }) {
  const confidenceColors = {
    high: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-muted text-muted-foreground',
  };

  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-rose-600" />
            </div>
            <CardTitle className="text-base font-bold">Long-Term Value Decisions</CardTitle>
          </div>
          <Info className="w-4 h-4 text-muted-foreground" />
        </div>
        <CardDescription className="text-xs pt-1">
          Correlations between maintenance patterns and resale value.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((insight, idx) => (
          <div key={idx} className="bg-muted/30 border border-border/50 rounded-lg p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-3">
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', confidenceColors[insight.confidence])}>
                <Lightbulb className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{insight.title}</p>
                  <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded', confidenceColors[insight.confidence])}>
                    {insight.confidence}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{insight.insight}</p>
                <p className="text-xs text-muted-foreground/70 mt-1 italic">{insight.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
