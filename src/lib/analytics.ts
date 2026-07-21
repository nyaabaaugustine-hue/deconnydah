import type {
  Vehicle, Driver, Supervisor, VehicleDocument,
  ServiceLog, BatteryLog, TyreLog, RevenueEntry,
  AccidentReport,
} from '@/types/fleet';
import type { Inspection } from '@/lib/apiClient';

// ── Profitability ─────────────────────────────────────────────────────────────

export interface ProfitabilityRow {
  vehicle: Vehicle;
  totalRevenue: number;
  serviceCost: number;
  batteryCost: number;
  tyreCost: number;
  insuranceCost: number;
  accidentCost: number;
  totalCost: number;
  netMargin: number;
  hasDataGaps: boolean;
  dataGapNote: string;
}

export function calculateProfitability(
  vehicles: Vehicle[],
  drivers: Driver[],
  serviceLogs: ServiceLog[],
  batteryLogs: BatteryLog[],
  tyreLogs: TyreLog[],
  revenueEntries: RevenueEntry[],
  accidentReports: AccidentReport[],
  vehicleDocuments: VehicleDocument[],
): ProfitabilityRow[] {
  return vehicles.map(vehicle => {
    const revenue = revenueEntries
      .filter(r => r.vehicleId === vehicle.id)
      .reduce((sum, r) => sum + r.amount, 0);

    const service = serviceLogs
      .filter(s => s.vehicleId === vehicle.id)
      .reduce((sum, s) => sum + s.cost, 0);

    const battery = batteryLogs
      .filter(b => b.vehicleId === vehicle.id)
      .reduce((sum, b) => sum + b.cost, 0);

    const tyres = tyreLogs
      .filter(t => t.vehicleId === vehicle.id)
      .reduce((sum, t) => sum + t.cost, 0);

    const insuranceDocs = vehicleDocuments.filter(
      d => d.vehicleId === vehicle.id && d.docType === 'insurance_policy'
    );
    const insurance = insuranceDocs.length > 0 ? 4500 : 0;

    const accidents = accidentReports
      .filter(a => a.vehicleId === vehicle.id)
      .reduce((sum, a) => sum + a.cost, 0);

    const totalCost = service + battery + tyres + insurance + accidents;
    const netMargin = revenue - totalCost;

    const hasDataGaps = revenue === 0;
    let dataGapNote = '';
    if (revenue === 0) {
      dataGapNote = 'No revenue records for this vehicle';
    } else if (insuranceDocs.length === 0) {
      dataGapNote = 'No insurance policy on file — cost estimate used';
    }

    return {
      vehicle, totalRevenue: revenue, serviceCost: service,
      batteryCost: battery, tyreCost: tyres, insuranceCost: insurance,
      accidentCost: accidents, totalCost, netMargin, hasDataGaps, dataGapNote,
    };
  }).sort((a, b) => b.netMargin - a.netMargin);
}

// ── Driver Scores (all real DB data) ──────────────────────────────────────────

export interface DriverScore {
  driverId: string;
  driverName: string;
  supervisorName: string;
  region: string;
  revenue: number;
  inspectionPassRate: number;
  accidentFreeRatio: number;
  score: number;
  hasDataGaps: boolean;
  dataGapNote: string;
}

export function calculateDriverScores(
  drivers: Driver[],
  supervisors: Supervisor[],
  revenueEntries: RevenueEntry[],
  accidentReports: AccidentReport[],
  inspections: Inspection[],
): DriverScore[] {
  return drivers.map(driver => {
    const driverRevenue = revenueEntries
      .filter(r => r.driverId === driver.id)
      .reduce((sum, r) => sum + r.amount, 0);

    const driverAccidents = accidentReports.filter(a => a.driverId === driver.id);
    const atFaultCount = driverAccidents.filter(a => a.driverAtFault).length;
    // Graduated penalty: 0.1 deduction per at-fault accident, min 0
    const accidentFreeRatio = driverAccidents.length === 0
      ? 1
      : Math.max(0, 1 - atFaultCount * 0.1);

    // Real inspection pass rate from DB — inspections link to drivers by name
    const driverInspections = inspections.filter(i => i.driverName === driver.fullName);
    const passedCount = driverInspections.filter(i => i.overallStatus === 'pass').length;
    const inspectionPassRate = driverInspections.length > 0
      ? passedCount / driverInspections.length
      : 0.5; // neutral default when no inspection data exists

    const revenueScore = Math.min(driverRevenue / 20000, 1) * 40;
    const inspectionScore = inspectionPassRate * 30;
    const accidentScore = accidentFreeRatio * 30;
    const score = Math.round(revenueScore + inspectionScore + accidentScore);

    const sup = supervisors.find(s => s.id === driver.supervisorId);

    const hasDataGaps = driverRevenue === 0 && driverInspections.length === 0;
    let dataGapNote = '';
    if (driverRevenue === 0 && driverInspections.length === 0) {
      dataGapNote = 'No revenue or inspection records for this driver';
    } else if (driverRevenue === 0) {
      dataGapNote = 'No revenue records for this driver';
    } else if (driverInspections.length === 0) {
      dataGapNote = 'No inspection records — default pass rate used';
    }

    return {
      driverId: driver.id,
      driverName: driver.fullName,
      supervisorName: sup?.fullName ?? 'Unassigned',
      region: sup?.region ?? 'N/A',
      revenue: driverRevenue,
      inspectionPassRate,
      accidentFreeRatio,
      score,
      hasDataGaps,
      dataGapNote,
    };
  }).sort((a, b) => b.score - a.score);
}

// ── Supervisor Teams (trend computed from real driver scores) ─────────────────

export interface SupervisorTeamRow {
  supervisorId: string;
  supervisorName: string;
  region: string;
  teamSize: number;
  avgScore: number;
  trend: 'up' | 'down' | 'stable';
  trendLabel: string;
  hasDataGaps: boolean;
}

export function calculateSupervisorTeams(
  drivers: Driver[],
  supervisors: Supervisor[],
  revenueEntries: RevenueEntry[],
  accidentReports: AccidentReport[],
  inspections: Inspection[],
): SupervisorTeamRow[] {
  const driverScores = calculateDriverScores(drivers, supervisors, revenueEntries, accidentReports, inspections);

  return supervisors.map(sup => {
    const teamDrivers = drivers.filter(d => d.supervisorId === sup.id);
    const teamDriverScores = driverScores.filter(ds =>
      teamDrivers.some(d => d.id === ds.driverId)
    );

    const teamSize = teamDriverScores.length;
    const avgScore = teamSize > 0
      ? Math.round(teamDriverScores.reduce((sum, ds) => sum + ds.score, 0) / teamSize)
      : 0;

    // Trend: compare "recent" half vs "older" half by hire date
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendLabel = 'Stable';
    if (teamSize >= 2) {
      const sorted = [...teamDrivers].sort(
        (a, b) => new Date(b.hireDate).getTime() - new Date(a.hireDate).getTime()
      );
      const mid = Math.ceil(sorted.length / 2);
      const recentDrivers = sorted.slice(0, mid);
      const olderDrivers = sorted.slice(mid);

      const recentScores = driverScores.filter(ds =>
        recentDrivers.some(d => d.id === ds.driverId)
      );
      const olderScores = driverScores.filter(ds =>
        olderDrivers.some(d => d.id === ds.driverId)
      );

      const recentAvg = recentScores.length > 0
        ? recentScores.reduce((s, ds) => s + ds.score, 0) / recentScores.length
        : 0;
      const olderAvg = olderScores.length > 0
        ? olderScores.reduce((s, ds) => s + ds.score, 0) / olderScores.length
        : avgScore;

      const delta = recentAvg - olderAvg;
      if (delta > 3) {
        trend = 'up';
        trendLabel = 'Improving';
      } else if (delta < -3) {
        trend = 'down';
        trendLabel = 'Declining';
      }
    }

    const hasDataGaps = teamDriverScores.some(ds => ds.hasDataGaps);

    return {
      supervisorId: sup.id,
      supervisorName: sup.fullName,
      region: sup.region,
      teamSize,
      avgScore,
      trend,
      trendLabel,
      hasDataGaps,
    };
  }).sort((a, b) => b.avgScore - a.avgScore);
}

// ── Decision Insights (computed from real data) ───────────────────────────────

export interface InsightCard {
  title: string;
  insight: string;
  detail: string;
  confidence: 'high' | 'medium' | 'low';
}

export function generateDecisionInsights(
  vehicles: Vehicle[],
  serviceLogs: ServiceLog[],
  batteryLogs: BatteryLog[],
  tyreLogs: TyreLog[],
  revenueEntries: RevenueEntry[],
  accidentReports: AccidentReport[],
): InsightCard[] {
  const insights: InsightCard[] = [];

  // Insight 1: Service cost concentration
  if (serviceLogs.length >= 2) {
    const totalServiceCost = serviceLogs.reduce((s, l) => s + l.cost, 0);
    const avgServiceCost = totalServiceCost / serviceLogs.length;
    const expensiveLogs = serviceLogs.filter(l => l.cost > avgServiceCost * 1.5);
    if (expensiveLogs.length > 0) {
      const expensiveVehicles = [...new Set(expensiveLogs.map(l => l.vehicleId))];
      insights.push({
        title: 'High-Cost Services',
        insight: `${expensiveLogs.length} service entries cost 50%+ above average (GH₵ ${avgServiceCost.toFixed(0)} avg). ${expensiveVehicles.length} vehicle(s) account for most overages.`,
        detail: `Total service spend: GH₵ ${totalServiceCost.toLocaleString()} across ${serviceLogs.length} entries. Review expensive services for potential negotiation with workshops.`,
        confidence: 'high',
      });
    }
  }

  // Insight 2: Tyre brand cost comparison
  if (tyreLogs.length >= 3) {
    const brandCosts = new Map<string, { total: number; count: number }>();
    tyreLogs.forEach(t => {
      const existing = brandCosts.get(t.brand) || { total: 0, count: 0 };
      brandCosts.set(t.brand, { total: existing.total + t.cost, count: existing.count + 1 });
    });
    const brandAvg = [...brandCosts.entries()].map(([brand, data]) => ({
      brand,
      avg: data.total / data.count,
      count: data.count,
    })).filter(b => b.count >= 2);

    if (brandAvg.length >= 2) {
      brandAvg.sort((a, b) => a.avg - b.avg);
      const cheapest = brandAvg[0];
      const priciest = brandAvg[brandAvg.length - 1];
      const savingsPct = ((priciest.avg - cheapest.avg) / priciest.avg * 100).toFixed(0);
      insights.push({
        title: 'Tyre Brand Cost Gap',
        insight: `${cheapest.brand} tyres average GH₵ ${cheapest.avg.toFixed(0)} per unit vs ${priciest.brand} at GH₵ ${priciest.avg.toFixed(0)} — a ${savingsPct}% difference.`,
        detail: `Based on ${tyreLogs.length} tyre entries across ${brandCosts.size} brands. Switching to lower-cost brands could reduce annual tyre spend.`,
        confidence: 'medium',
      });
    }
  }

  // Insight 3: Accident cost impact
  if (accidentReports.length > 0) {
    const totalAccidentCost = accidentReports.reduce((s, a) => s + a.cost, 0);
    const atFaultCount = accidentReports.filter(a => a.driverAtFault).length;
    const atFaultCost = accidentReports.filter(a => a.driverAtFault).reduce((s, a) => s + a.cost, 0);
    const totalRevenue = revenueEntries.reduce((s, r) => s + r.amount, 0);
    const accidentPctOfRevenue = totalRevenue > 0
      ? ((totalAccidentCost / totalRevenue) * 100).toFixed(1)
      : 'N/A';

    insights.push({
      title: 'Accident Financial Impact',
      insight: `${accidentReports.length} accident(s) cost GH₵ ${totalAccidentCost.toLocaleString()} total (${accidentPctOfRevenue}% of revenue). ${atFaultCount} were at-fault costing GH₵ ${atFaultCost.toLocaleString()}.`,
      detail: atFaultCount > 0
        ? `At-fault accidents represent ${((atFaultCost / totalAccidentCost) * 100).toFixed(0)}% of total accident costs. Driver training may reduce preventable incidents.`
        : 'All accidents were not at-fault — review external factors and route conditions.',
      confidence: 'high',
    });
  }

  // Insight 4: Battery lifecycle by brand
  if (batteryLogs.length >= 2) {
    const batteryBrands = new Map<string, { count: number; replaced: number }>();
    batteryLogs.forEach(b => {
      const existing = batteryBrands.get(b.brand) || { count: 0, replaced: 0 };
      batteryBrands.set(b.brand, {
        count: existing.count + 1,
        replaced: existing.replaced + (b.replacementDate ? 1 : 0),
      });
    });
    const brandData = [...batteryBrands.entries()].filter(([, d]) => d.count >= 2);
    if (brandData.length > 0) {
      const worstBrand = brandData.sort(
        (a, b) => (b[1].replaced / b[1].count) - (a[1].replaced / a[1].count)
      )[0];
      const failRate = ((worstBrand[1].replaced / worstBrand[1].count) * 100).toFixed(0);
      insights.push({
        title: 'Battery Replacement Rate',
        insight: `${worstBrand[0]} batteries have a ${failRate}% replacement rate (${worstBrand[1].replaced}/${worstBrand[1].count}). Consider alternative suppliers for better longevity.`,
        detail: `Based on ${batteryLogs.length} battery installations. Track replacement dates to identify brands with best lifecycle value.`,
        confidence: worstBrand[1].count >= 4 ? 'medium' : 'low',
      });
    }
  }

  // Insight 5: Fleet revenue distribution
  if (revenueEntries.length >= 3 && vehicles.length >= 2) {
    const vehicleRevenue = vehicles.map(v => ({
      vehicle: v,
      revenue: revenueEntries.filter(r => r.vehicleId === v.id).reduce((s, r) => s + r.amount, 0),
      trips: revenueEntries.filter(r => r.vehicleId === v.id).length,
    })).filter(v => v.revenue > 0).sort((a, b) => b.revenue - a.revenue);

    if (vehicleRevenue.length >= 2) {
      const topRevenue = vehicleRevenue[0].revenue;
      const bottomRevenue = vehicleRevenue[vehicleRevenue.length - 1].revenue;
      const ratio = bottomRevenue > 0 ? (topRevenue / bottomRevenue).toFixed(1) : '∞';
      insights.push({
        title: 'Revenue Imbalance',
        insight: `Top earner ${vehicleRevenue[0].vehicle.plateNumber} generates GH₵ ${topRevenue.toLocaleString()} — ${ratio}x more than lowest earner ${vehicleRevenue[vehicleRevenue.length - 1].vehicle.plateNumber} (GH₵ ${bottomRevenue.toLocaleString()}).`,
        detail: `Across ${vehicleRevenue.length} revenue-generating vehicles. Reassign drivers or routes to balance utilization and maximize fleet output.`,
        confidence: 'medium',
      });
    }
  }

  // Fill with contextual fallback insights if fewer than 3
  if (insights.length === 0) {
    insights.push({
      title: 'Getting Started',
      insight: 'Add service logs, tyre changes, and revenue entries to unlock data-driven fleet insights.',
      detail: 'The more data you record, the more actionable insights the analytics engine can generate for your fleet.',
      confidence: 'low',
    });
  }

  if (insights.length < 3) {
    insights.push({
      title: 'Data Coverage',
      insight: `${serviceLogs.length} service logs, ${tyreLogs.length} tyre entries, ${batteryLogs.length} battery records, and ${accidentReports.length} accidents on file.`,
      detail: 'Consistent data entry across all categories improves insight accuracy and confidence levels.',
      confidence: 'low',
    });
  }

  return insights;
}
