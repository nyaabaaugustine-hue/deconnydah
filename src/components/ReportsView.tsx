import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  FileText,
  Download,
  BarChart3,
  TrendingUp,
  Truck,
  Users,
  DollarSign,
  Fuel,
  Wrench,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getVehicles,
  getDrivers,
  getExpenses,
  getFuelEntries,
  getServiceLogsForVehicle,
  getRevenueForVehicle,
  type Expense,
  type FuelEntry,
} from '@/lib/apiClient';
import type { Vehicle, Driver, ServiceLog, RevenueEntry } from '@/types/fleet';

type ReportId =
  | 'vehicle-inventory'
  | 'driver-performance'
  | 'expense'
  | 'fuel'
  | 'maintenance'
  | 'revenue';

interface ReportMeta {
  id: ReportId;
  title: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

const reports: ReportMeta[] = [
  {
    id: 'vehicle-inventory',
    title: 'Vehicle Inventory',
    description: 'Complete overview of all fleet vehicles, statuses, and assignments',
    icon: Truck,
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    id: 'driver-performance',
    title: 'Driver Performance',
    description: 'Driver roster with license info, status, and supervisor details',
    icon: Users,
    iconBg: 'bg-green-100 dark:bg-green-900/40',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  {
    id: 'expense',
    title: 'Expense Report',
    description: 'Expense breakdown by category with totals and trends',
    icon: DollarSign,
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'fuel',
    title: 'Fuel Report',
    description: 'Fuel consumption summary and top fuel-consuming vehicles',
    icon: Fuel,
    iconBg: 'bg-orange-100 dark:bg-orange-900/40',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
  {
    id: 'maintenance',
    title: 'Maintenance Report',
    description: 'Service log summary and most serviced vehicles',
    icon: Wrench,
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'revenue',
    title: 'Revenue Report',
    description: 'Revenue overview, trip counts, and per-vehicle breakdown',
    icon: TrendingUp,
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
  },
];

function formatCurrency(n: number): string {
  return `GH\u20B5${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    in_repair: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    decommissioned: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    sold: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  };
  return map[status] ?? 'bg-gray-100 text-gray-700';
}

// ── Sub-component: expanded report content ───────────────────────────────────

function VehicleInventoryContent({
  vehicles,
  drivers,
}: {
  vehicles: Vehicle[];
  drivers: Driver[];
}) {
  const driverMap = new Map(drivers.map((d) => [d.id, d.fullName]));
  const statusCounts = vehicles.reduce(
    (acc, v) => {
      acc[v.status] = (acc[v.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {(['active', 'in_repair', 'decommissioned', 'sold'] as const).map((s) => (
          <div
            key={s}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
          >
            <span className={cn('h-2 w-2 rounded-full', s === 'active' ? 'bg-green-500' : s === 'in_repair' ? 'bg-amber-500' : s === 'decommissioned' ? 'bg-red-500' : 'bg-slate-400')} />
            <span className="font-medium capitalize">{s.replace('_', ' ')}</span>
            <span className="text-muted-foreground">({statusCounts[s] ?? 0})</span>
          </div>
        ))}
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plate</TableHead>
              <TableHead>Make</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Current Driver</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.plateNumber}</TableCell>
                <TableCell>{v.make}</TableCell>
                <TableCell>{v.model}</TableCell>
                <TableCell>{v.year}</TableCell>
                <TableCell>
                  <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize', statusBadge(v.status))}>
                    {v.status.replace('_', ' ')}
                  </span>
                </TableCell>
                <TableCell>{v.currentDriverId ? driverMap.get(v.currentDriverId) ?? '—' : 'Unassigned'}</TableCell>
              </TableRow>
            ))}
            {vehicles.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No vehicles found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DriverPerformanceContent({ drivers }: { drivers: Driver[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>License</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Hire Date</TableHead>
            <TableHead>Supervisor ID</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drivers.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="font-medium">{d.fullName}</TableCell>
              <TableCell>{d.licenseNumber}</TableCell>
              <TableCell>{d.phone}</TableCell>
              <TableCell>{d.hireDate ? new Date(d.hireDate).toLocaleDateString() : '—'}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{d.supervisorId ? d.supervisorId.slice(0, 8) + '…' : '—'}</TableCell>
              <TableCell>
                <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize', d.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400')}>
                  {d.status}
                </span>
              </TableCell>
            </TableRow>
          ))}
          {drivers.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No drivers found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ExpenseReportContent({ expenses }: { expenses: Expense[] }) {
  const byCategory = expenses.reduce(
    (acc, e) => {
      const cat = e.category || 'Uncategorized';
      if (!acc[cat]) acc[cat] = { count: 0, total: 0 };
      acc[cat].count += 1;
      acc[cat].total += e.amount;
      return acc;
    },
    {} as Record<string, { count: number; total: number }>,
  );

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const categories = (Object.entries(byCategory) as [string, { count: number; total: number }][]).sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg border px-4 py-2 text-sm">
          <span className="text-muted-foreground">Total Expenses</span>
          <span className="ml-2 font-semibold">{formatCurrency(totalExpenses)}</span>
        </div>
        <div className="rounded-lg border px-4 py-2 text-sm">
          <span className="text-muted-foreground">Categories</span>
          <span className="ml-2 font-semibold">{categories.length}</span>
        </div>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Count</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map(([cat, data]) => (
              <TableRow key={cat}>
                <TableCell className="font-medium">{cat}</TableCell>
                <TableCell className="text-right">{data.count}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(data.total)}</TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  No expenses found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function FuelReportContent({
  fuelEntries,
  vehicles,
}: {
  fuelEntries: FuelEntry[];
  vehicles: Vehicle[];
}) {
  const totalCost = fuelEntries.reduce((s, e) => s + e.totalCost, 0);
  const totalLiters = fuelEntries.reduce((s, e) => s + e.liters, 0);
  const avgCostPerLiter = totalLiters > 0 ? totalCost / totalLiters : 0;

  const byVehicle = fuelEntries.reduce(
    (acc, e) => {
      const vid = e.vehicleId;
      if (!acc[vid]) acc[vid] = 0;
      acc[vid] += e.totalCost;
      return acc;
    },
    {} as Record<string, number>,
  );

  const vehicleMap = new Map(vehicles.map((v) => [v.id, `${v.plateNumber} (${v.make} ${v.model})`]));
  const top5 = (Object.entries(byVehicle) as [string, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="rounded-lg border px-4 py-2 text-sm">
          <span className="text-muted-foreground">Total Entries</span>
          <span className="ml-2 font-semibold">{fuelEntries.length}</span>
        </div>
        <div className="rounded-lg border px-4 py-2 text-sm">
          <span className="text-muted-foreground">Total Cost</span>
          <span className="ml-2 font-semibold">{formatCurrency(totalCost)}</span>
        </div>
        <div className="rounded-lg border px-4 py-2 text-sm">
          <span className="text-muted-foreground">Avg Cost/Liter</span>
          <span className="ml-2 font-semibold">{formatCurrency(avgCostPerLiter)}</span>
        </div>
      </div>
      <h4 className="text-sm font-medium text-muted-foreground">Top 5 Fuel-Consuming Vehicles</h4>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead className="text-right">Total Fuel Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {top5.map(([vid, cost]) => (
              <TableRow key={vid}>
                <TableCell className="font-medium">{vehicleMap.get(vid) ?? vid}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(cost)}</TableCell>
              </TableRow>
            ))}
            {top5.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                  No fuel entries found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function MaintenanceReportContent({
  serviceLogs,
  vehicles,
}: {
  serviceLogs: ServiceLog[];
  vehicles: Vehicle[];
}) {
  const totalCost = serviceLogs.reduce((s, l) => s + l.cost, 0);

  const byVehicle = serviceLogs.reduce(
    (acc, l) => {
      const vid = l.vehicleId;
      if (!acc[vid]) acc[vid] = { count: 0, cost: 0 };
      acc[vid].count += 1;
      acc[vid].cost += l.cost;
      return acc;
    },
    {} as Record<string, { count: number; cost: number }>,
  );

  const vehicleMap = new Map(vehicles.map((v) => [v.id, `${v.plateNumber} (${v.make} ${v.model})`]));
  const top5 = (Object.entries(byVehicle) as [string, { count: number; cost: number }][])
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="rounded-lg border px-4 py-2 text-sm">
          <span className="text-muted-foreground">Total Services</span>
          <span className="ml-2 font-semibold">{serviceLogs.length}</span>
        </div>
        <div className="rounded-lg border px-4 py-2 text-sm">
          <span className="text-muted-foreground">Total Cost</span>
          <span className="ml-2 font-semibold">{formatCurrency(totalCost)}</span>
        </div>
      </div>
      <h4 className="text-sm font-medium text-muted-foreground">Top 5 Most Serviced Vehicles</h4>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead className="text-right">Service Count</TableHead>
              <TableHead className="text-right">Total Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {top5.map(([vid, data]) => (
              <TableRow key={vid}>
                <TableCell className="font-medium">{vehicleMap.get(vid) ?? vid}</TableCell>
                <TableCell className="text-right">{data.count}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(data.cost)}</TableCell>
              </TableRow>
            ))}
            {top5.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  No service logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function RevenueReportContent({
  allRevenue,
  vehicles,
}: {
  allRevenue: RevenueEntry[];
  vehicles: Vehicle[];
}) {
  const totalRevenue = allRevenue.reduce((s, r) => s + r.amount, 0);
  const totalTrips = allRevenue.length;
  const avgPerTrip = totalTrips > 0 ? totalRevenue / totalTrips : 0;

  const byVehicle = allRevenue.reduce(
    (acc, r) => {
      const vid = r.vehicleId;
      if (!acc[vid]) acc[vid] = { revenue: 0, trips: 0 };
      acc[vid].revenue += r.amount;
      acc[vid].trips += 1;
      return acc;
    },
    {} as Record<string, { revenue: number; trips: number }>,
  );

  const vehicleMap = new Map(vehicles.map((v) => [v.id, `${v.plateNumber} (${v.make} ${v.model})`]));
  const sorted = (Object.entries(byVehicle) as [string, { revenue: number; trips: number }][])
    .sort((a, b) => b[1].revenue - a[1].revenue);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="rounded-lg border px-4 py-2 text-sm">
          <span className="text-muted-foreground">Total Revenue</span>
          <span className="ml-2 font-semibold">{formatCurrency(totalRevenue)}</span>
        </div>
        <div className="rounded-lg border px-4 py-2 text-sm">
          <span className="text-muted-foreground">Total Trips</span>
          <span className="ml-2 font-semibold">{totalTrips.toLocaleString()}</span>
        </div>
        <div className="rounded-lg border px-4 py-2 text-sm">
          <span className="text-muted-foreground">Avg/Trip</span>
          <span className="ml-2 font-semibold">{formatCurrency(avgPerTrip)}</span>
        </div>
      </div>
      <h4 className="text-sm font-medium text-muted-foreground">Revenue by Vehicle</h4>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead className="text-right">Trips</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(([vid, data]) => (
              <TableRow key={vid}>
                <TableCell className="font-medium">{vehicleMap.get(vid) ?? vid}</TableCell>
                <TableCell className="text-right">{data.trips}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(data.revenue)}</TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  No revenue entries found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function ReportsView() {
  const [expanded, setExpanded] = useState<ReportId | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState<ReportId | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [serviceLogs, setServiceLogs] = useState<ServiceLog[]>([]);
  const [allRevenue, setAllRevenue] = useState<RevenueEntry[]>([]);

  useEffect(() => {
    Promise.all([getVehicles(), getDrivers(), getExpenses(), getFuelEntries()])
      .then(([v, d, e, f]) => {
        setVehicles(v);
        setDrivers(d);
        setExpenses(e);
        setFuelEntries(f);
      })
      .finally(() => setLoading(false));
  }, []);

  const loadReport = useCallback(
    async (id: ReportId) => {
      if (expanded === id) {
        setExpanded(null);
        return;
      }

      setLoadingReport(id);
      setExpanded(id);

      if (id === 'maintenance' && serviceLogs.length === 0 && vehicles.length > 0) {
        const allLogs = await Promise.all(vehicles.map((v) => getServiceLogsForVehicle(v.id).catch(() => [] as ServiceLog[])));
        setServiceLogs(allLogs.flat());
      }

      if (id === 'revenue' && allRevenue.length === 0 && vehicles.length > 0) {
        const allRev = await Promise.all(vehicles.map((v) => getRevenueForVehicle(v.id).catch(() => [] as RevenueEntry[])));
        setAllRevenue(allRev.flat());
      }

      setLoadingReport(null);
    },
    [expanded, vehicles, serviceLogs.length, allRevenue.length],
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports &amp; Analytics</h1>
          <p className="text-muted-foreground">Generate and export fleet reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" disabled>
            <FileText className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" disabled>
            <BarChart3 className="mr-2 h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      {/* Report cards grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon;
          const isExpanded = expanded === report.id;
          const isLoading = loadingReport === report.id;

          return (
            <Card
              key={report.id}
              className={cn(
                'transition-shadow hover:shadow-md',
                isExpanded && 'ring-2 ring-primary/20',
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', report.iconBg)}>
                    <Icon className={cn('h-5 w-5', report.iconColor)} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{report.title}</CardTitle>
                    <CardDescription className="mt-0.5 line-clamp-2 text-xs">
                      {report.description}
                    </CardDescription>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => loadReport(report.id)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : isExpanded ? (
                    'Collapse'
                  ) : (
                    'View Report'
                  )}
                </Button>
              </CardContent>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t px-6 pb-6 pt-4">
                  {isLoading ? (
                    <div className="flex h-20 items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      {report.id === 'vehicle-inventory' && (
                        <VehicleInventoryContent vehicles={vehicles} drivers={drivers} />
                      )}
                      {report.id === 'driver-performance' && (
                        <DriverPerformanceContent drivers={drivers} />
                      )}
                      {report.id === 'expense' && (
                        <ExpenseReportContent expenses={expenses} />
                      )}
                      {report.id === 'fuel' && (
                        <FuelReportContent fuelEntries={fuelEntries} vehicles={vehicles} />
                      )}
                      {report.id === 'maintenance' && (
                        <MaintenanceReportContent serviceLogs={serviceLogs} vehicles={vehicles} />
                      )}
                      {report.id === 'revenue' && (
                        <RevenueReportContent allRevenue={allRevenue} vehicles={vehicles} />
                      )}
                    </>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
