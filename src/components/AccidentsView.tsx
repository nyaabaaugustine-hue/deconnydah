'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  getAccidentsForVehicle,
  createAccidentReport,
  getVehicles,
  getDrivers,
  canWrite,
} from '@/lib/apiClient';
import type { AccidentReport, Vehicle, Driver } from '@/types/fleet';
import { cn } from '@/lib/utils';
import {
  Loader2,
  Plus,
  AlertTriangle,
  DollarSign,
  Search,
  Filter,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

const FAULT_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'at_fault', label: 'At Fault' },
  { value: 'not_at_fault', label: 'Not At Fault' },
] as const;

interface AccidentFormData {
  vehicleId: string;
  driverId: string;
  accidentDate: string;
  description: string;
  cost: string;
  driverAtFault: boolean;
}

const INITIAL_FORM: AccidentFormData = {
  vehicleId: '',
  driverId: '',
  accidentDate: new Date().toISOString().split('T')[0],
  description: '',
  cost: '',
  driverAtFault: false,
};

export function AccidentsView({ role }: { role: string }) {
  const [accidents, setAccidents] = useState<AccidentReport[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<AccidentFormData>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof AccidentFormData, string>>
  >({});
  const [searchQuery, setSearchQuery] = useState('');
  const [faultFilter, setFaultFilter] = useState('all');

  const writable = canWrite(role);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [vehData, drvData] = await Promise.all([
        getVehicles(),
        getDrivers(),
      ]);
      const vList = Array.isArray(vehData) ? vehData : [];
      const dList = Array.isArray(drvData) ? drvData : [];
      setVehicles(vList);
      setDrivers(dList);

      const allAccidents = await Promise.all(
        vList.map((v) =>
          getAccidentsForVehicle(v.id).catch(() => [] as AccidentReport[])
        )
      );
      setAccidents(allAccidents.flat());
    } catch (err) {
      console.error('Failed to load accidents data:', err);
      setAccidents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const vehicleMap = useMemo(
    () => new Map(vehicles.map((v) => [v.id, v])),
    [vehicles]
  );
  const driverMap = useMemo(
    () => new Map(drivers.map((d) => [d.id, d])),
    [drivers]
  );

  const filtered = useMemo(() => {
    return accidents.filter((a) => {
      const matchesSearch =
        !searchQuery ||
        a.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFault =
        faultFilter === 'all' ||
        (faultFilter === 'at_fault' && a.driverAtFault) ||
        (faultFilter === 'not_at_fault' && !a.driverAtFault);
      return matchesSearch && matchesFault;
    });
  }, [accidents, searchQuery, faultFilter]);

  const summary = useMemo(() => {
    const total = accidents.length;
    const totalCost = accidents.reduce(
      (sum, a) => sum + (Number(a.cost) || 0),
      0
    );
    const atFault = accidents.filter((a) => a.driverAtFault).length;
    const notAtFault = accidents.filter((a) => !a.driverAtFault).length;
    return { total, totalCost, atFault, notAtFault };
  }, [accidents]);

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof AccidentFormData, string>> = {};
    if (!form.vehicleId) errors.vehicleId = 'Vehicle is required';
    if (!form.accidentDate) errors.accidentDate = 'Date is required';
    if (!form.description.trim()) errors.description = 'Description is required';
    if (!form.cost || Number(form.cost) < 0)
      errors.cost = 'Valid cost is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      await createAccidentReport({
        vehicleId: form.vehicleId,
        driverId: form.driverId || undefined,
        accidentDate: form.accidentDate,
        description: form.description.trim(),
        cost: Number(form.cost),
        driverAtFault: form.driverAtFault,
      });
      setDialogOpen(false);
      setForm(INITIAL_FORM);
      setFormErrors({});
      await fetchAll();
    } catch (err) {
      console.error('Failed to create accident report:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (value: number) =>
    `GH₵${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 bg-gradient-to-br from-white to-slate-50/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Accidents
            </CardTitle>
            <div className="rounded-lg bg-slate-100 p-2">
              <AlertTriangle className="h-4 w-4 text-slate-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
            <p className="mt-1 text-xs text-gray-400">All reported incidents</p>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-gradient-to-br from-white to-amber-50/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Cost
            </CardTitle>
            <div className="rounded-lg bg-amber-100 p-2">
              <DollarSign className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-700">
              {formatCurrency(summary.totalCost)}
            </p>
            <p className="mt-1 text-xs text-gray-400">Combined accident cost</p>
          </CardContent>
        </Card>

        <Card className="border-red-100 bg-gradient-to-br from-white to-red-50/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              At Fault
            </CardTitle>
            <div className="rounded-lg bg-red-100 p-2">
              <ShieldAlert className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{summary.atFault}</p>
            <p className="mt-1 text-xs text-gray-400">Driver found at fault</p>
          </CardContent>
        </Card>

        <Card className="border-green-100 bg-gradient-to-br from-white to-green-50/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Not At Fault
            </CardTitle>
            <div className="rounded-lg bg-green-100 p-2">
              <ShieldCheck className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {summary.notAtFault}
            </p>
            <p className="mt-1 text-xs text-gray-400">Driver not at fault</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={faultFilter} onValueChange={setFaultFilter}>
                <SelectTrigger className="w-[170px]">
                  <Filter className="mr-2 h-3.5 w-3.5 text-gray-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FAULT_FILTERS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {writable && (
              <Button
                onClick={() => {
                  setForm(INITIAL_FORM);
                  setFormErrors({});
                  setDialogOpen(true);
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Report Accident
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-gray-100 p-4">
                <Shield className="h-8 w-8 text-gray-300" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-gray-900">
                No accidents found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {accidents.length === 0
                  ? 'No accident reports have been recorded yet.'
                  : 'Try adjusting your search or filter criteria.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>At Fault</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((accident) => {
                    const vehicle = vehicleMap.get(accident.vehicleId);
                    const driver = accident.driverId
                      ? driverMap.get(accident.driverId)
                      : null;

                    return (
                      <TableRow
                        key={accident.id}
                        className={cn(
                          'group transition-colors hover:bg-slate-50/60',
                          accident.driverAtFault && 'border-l-4 border-l-red-400'
                        )}
                      >
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(accident.accidentDate)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-gray-800">
                            {vehicle?.plateNumber || '—'}
                          </div>
                          {vehicle && (
                            <div className="text-xs text-gray-400">
                              {vehicle.make} {vehicle.model}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {driver?.fullName || '—'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-gray-600">
                          {accident.description}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-gray-900">
                          {formatCurrency(Number(accident.cost) || 0)}
                        </TableCell>
                        <TableCell>
                          {accident.driverAtFault ? (
                            <Badge
                              variant="outline"
                              className="bg-red-100 text-red-800 border-red-200 text-xs font-medium"
                            >
                              At Fault
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-green-100 text-green-800 border-green-200 text-xs font-medium"
                            >
                              Not At Fault
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Accident Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open: boolean) => {
          setDialogOpen(open);
          if (!open) {
            setFormErrors({});
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="rounded-lg bg-red-100 p-1.5">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              Report Accident
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">
                Vehicle <span className="text-red-500">*</span>
              </label>
              <Select
                value={form.vehicleId}
                onValueChange={(val) => {
                  setForm((f) => ({ ...f, vehicleId: val }));
                  if (formErrors.vehicleId)
                    setFormErrors((e) => ({ ...e, vehicleId: undefined }));
                }}
              >
                <SelectTrigger
                  className={cn(
                    formErrors.vehicleId && 'border-red-300 focus:ring-red-500'
                  )}
                >
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plateNumber}
                      {v.make ? ` — ${v.make} ${v.model}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.vehicleId && (
                <p className="text-xs text-red-500">{formErrors.vehicleId}</p>
              )}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">
                Driver <span className="text-gray-400">(optional)</span>
              </label>
              <Select
                value={form.driverId}
                onValueChange={(val) =>
                  setForm((f) => ({ ...f, driverId: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Accident Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={form.accidentDate}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, accidentDate: e.target.value }));
                    if (formErrors.accidentDate)
                      setFormErrors((e) => ({
                        ...e,
                        accidentDate: undefined,
                      }));
                  }}
                  className={cn(
                    formErrors.accidentDate &&
                      'border-red-300 focus:ring-red-500'
                  )}
                />
                {formErrors.accidentDate && (
                  <p className="text-xs text-red-500">
                    {formErrors.accidentDate}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Cost (GH₵) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.cost}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, cost: e.target.value }));
                    if (formErrors.cost)
                      setFormErrors((e) => ({ ...e, cost: undefined }));
                  }}
                  className={cn(
                    formErrors.cost && 'border-red-300 focus:ring-red-500'
                  )}
                />
                {formErrors.cost && (
                  <p className="text-xs text-red-500">{formErrors.cost}</p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">
                Description <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Describe the accident details..."
                value={form.description}
                onChange={(e) => {
                  setForm((f) => ({ ...f, description: e.target.value }));
                  if (formErrors.description)
                    setFormErrors((e) => ({ ...e, description: undefined }));
                }}
                className={cn(
                  'min-h-[80px]',
                  formErrors.description && 'border-red-300 focus:ring-red-500'
                )}
              />
              {formErrors.description && (
                <p className="text-xs text-red-500">{formErrors.description}</p>
              )}
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
              <input
                type="checkbox"
                id="driverAtFault"
                checked={form.driverAtFault}
                onChange={(e) =>
                  setForm((f) => ({ ...f, driverAtFault: e.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <label
                htmlFor="driverAtFault"
                className="text-sm font-medium text-gray-700"
              >
                Driver was at fault
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Report Accident
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
