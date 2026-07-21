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
import {
  getExpenses,
  createExpense,
  updateExpense,
  getVehicles,
  getDrivers,
  type Expense,
} from '@/lib/apiClient';
import type { Vehicle, Driver } from '@/types/fleet';
import { cn } from '@/lib/utils';
import { notify } from '../lib/notify';
import {
  Loader2,
  Plus,
  DollarSign,
  TrendingUp,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'registration', label: 'Registration' },
  { value: 'repairs', label: 'Repairs' },
  { value: 'salary', label: 'Salary' },
  { value: 'toll', label: 'Toll' },
  { value: 'parking', label: 'Parking' },
  { value: 'fine', label: 'Fine' },
  { value: 'other', label: 'Other' },
] as const;

const STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  fuel: 'bg-blue-100 text-blue-800 border-blue-200',
  maintenance: 'bg-orange-100 text-orange-800 border-orange-200',
  insurance: 'bg-purple-100 text-purple-800 border-purple-200',
  registration: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  repairs: 'bg-rose-100 text-rose-800 border-rose-200',
  salary: 'bg-teal-100 text-teal-800 border-teal-200',
  toll: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  parking: 'bg-violet-100 text-violet-800 border-violet-200',
  fine: 'bg-red-100 text-red-800 border-red-200',
  other: 'bg-gray-100 text-gray-800 border-gray-200',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
};

interface ExpenseFormData {
  category: string;
  description: string;
  amount: string;
  expenseDate: string;
  vehicleId: string;
  driverId: string;
  notes: string;
}

const INITIAL_FORM: ExpenseFormData = {
  category: '',
  description: '',
  amount: '',
  expenseDate: new Date().toISOString().split('T')[0],
  vehicleId: '',
  driverId: '',
  notes: '',
};

export function ExpensesView({ role }: { role: string }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ExpenseFormData>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ExpenseFormData, string>>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const canApprove = role === 'admin' || role === 'manager';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [expData, vehData, drvData] = await Promise.all([
        getExpenses(),
        getVehicles(),
        getDrivers(),
      ]);
      setExpenses(Array.isArray(expData) ? expData : []);
      setVehicles(Array.isArray(vehData) ? vehData : []);
      setDrivers(Array.isArray(drvData) ? drvData : []);
    } catch (err) {
      console.error('Failed to load expenses data:', err);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        !searchQuery ||
        e.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === 'all' || e.category === categoryFilter;
      const matchesStatus =
        statusFilter === 'all' || e.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [expenses, searchQuery, categoryFilter, statusFilter]);

  const summary = useMemo(() => {
    const total = expenses.length;
    const totalAmount = expenses.reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
      0
    );
    const pending = expenses.filter((e) => e.status === 'pending').length;
    const approved = expenses.filter((e) => e.status === 'approved').length;
    return { total, totalAmount, pending, approved };
  }, [expenses]);

  const vehicleMap = useMemo(
    () => new Map(vehicles.map((v) => [v.id, v])),
    [vehicles]
  );
  const driverMap = useMemo(
    () => new Map(drivers.map((d) => [d.id, d])),
    [drivers]
  );

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof ExpenseFormData, string>> = {};
    if (!form.category) errors.category = 'Category is required';
    if (!form.description.trim()) errors.description = 'Description is required';
    if (!form.amount || Number(form.amount) <= 0)
      errors.amount = 'Valid amount is required';
    if (!form.expenseDate) errors.expenseDate = 'Date is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      await createExpense({
        category: form.category,
        description: form.description.trim(),
        amount: Number(form.amount),
        expenseDate: form.expenseDate,
        vehicleId: form.vehicleId || undefined,
        driverId: form.driverId || undefined,
        notes: form.notes.trim() || undefined,
        status: 'pending',
      });
      setDialogOpen(false);
      setForm(INITIAL_FORM);
      setFormErrors({});
      await fetchAll();
      notify.success('Expense created');
    } catch (err) {
      console.error('Failed to create expense:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (
    id: string,
    status: 'approved' | 'rejected'
  ) => {
    try {
      await updateExpense(id, { status });
      await fetchAll();
      notify.success(`Expense ${status}`);
    } catch (err) {
      console.error('Failed to update expense status:', err);
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
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-green-100 bg-gradient-to-br from-white to-green-50/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Expenses
            </CardTitle>
            <div className="rounded-lg bg-green-100 p-2">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
            <p className="mt-1 text-xs text-gray-400">All recorded expenses</p>
          </CardContent>
        </Card>

        <Card className="border-green-100 bg-gradient-to-br from-white to-green-50/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Amount
            </CardTitle>
            <div className="rounded-lg bg-green-100 p-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(summary.totalAmount)}
            </p>
            <p className="mt-1 text-xs text-gray-400">Combined spend</p>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-gradient-to-br from-white to-amber-50/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Pending Approval
            </CardTitle>
            <div className="rounded-lg bg-amber-100 p-2">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              {summary.pending}
            </p>
            <p className="mt-1 text-xs text-gray-400">Awaiting review</p>
          </CardContent>
        </Card>

        <Card className="border-green-100 bg-gradient-to-br from-white to-green-50/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Approved
            </CardTitle>
            <div className="rounded-lg bg-green-100 p-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {summary.approved}
            </p>
            <p className="mt-1 text-xs text-gray-400">Confirmed expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="mr-2 h-3.5 w-3.5 text-gray-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canApprove && (
              <Button
                onClick={() => {
                  setForm(INITIAL_FORM);
                  setFormErrors({});
                  setDialogOpen(true);
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
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
                <DollarSign className="h-8 w-8 text-gray-300" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-gray-900">
                No expenses found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {expenses.length === 0
                  ? 'Get started by adding your first expense.'
                  : 'Try adjusting your search or filter criteria.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((expense) => {
                    const vehicle = expense.vehicleId
                      ? vehicleMap.get(expense.vehicleId)
                      : null;
                    const StatusIcon =
                      STATUS_ICONS[expense.status] || Clock;

                    return (
                      <TableRow
                        key={expense.id}
                        className="group transition-colors hover:bg-green-50/40"
                      >
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(expense.expenseDate)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs font-medium capitalize',
                              CATEGORY_COLORS[expense.category] ||
                                CATEGORY_COLORS.other
                            )}
                          >
                            {expense.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm font-medium text-gray-800">
                          {expense.description}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {vehicle?.plateNumber || '—'}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-gray-900">
                          {formatCurrency(Number(expense.amount) || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'inline-flex items-center gap-1.5 text-xs font-medium capitalize',
                              STATUS_STYLES[expense.status] ||
                                STATUS_STYLES.pending
                            )}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {expense.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {canApprove && expense.status === 'pending' && (
                            <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleStatusChange(expense.id, 'approved')
                                }
                                className="h-7 px-2 text-green-600 hover:bg-green-50 hover:text-green-700"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleStatusChange(expense.id, 'rejected')
                                }
                                className="h-7 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
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

      {/* Add Expense Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setFormErrors({});
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="rounded-lg bg-green-100 p-1.5">
                <Plus className="h-4 w-4 text-green-600" />
              </div>
              Add New Expense
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">
                Category <span className="text-red-500">*</span>
              </label>
              <Select
                value={form.category}
                onValueChange={(val) => {
                  setForm((f) => ({ ...f, category: val }));
                  if (formErrors.category)
                    setFormErrors((e) => ({ ...e, category: undefined }));
                }}
              >
                <SelectTrigger
                  className={cn(
                    formErrors.category && 'border-red-300 focus:ring-red-500'
                  )}
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.category && (
                <p className="text-xs text-red-500">{formErrors.category}</p>
              )}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">
                Description <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Fuel top-up for Accra–Kumasi trip"
                value={form.description}
                onChange={(e) => {
                  setForm((f) => ({ ...f, description: e.target.value }));
                  if (formErrors.description)
                    setFormErrors((e) => ({ ...e, description: undefined }));
                }}
                className={cn(
                  formErrors.description && 'border-red-300 focus:ring-red-500'
                )}
              />
              {formErrors.description && (
                <p className="text-xs text-red-500">{formErrors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Amount (GH₵) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, amount: e.target.value }));
                    if (formErrors.amount)
                      setFormErrors((e) => ({ ...e, amount: undefined }));
                  }}
                  className={cn(
                    formErrors.amount && 'border-red-300 focus:ring-red-500'
                  )}
                />
                {formErrors.amount && (
                  <p className="text-xs text-red-500">{formErrors.amount}</p>
                )}
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Expense Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={form.expenseDate}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, expenseDate: e.target.value }));
                    if (formErrors.expenseDate)
                      setFormErrors((e) => ({
                        ...e,
                        expenseDate: undefined,
                      }));
                  }}
                  className={cn(
                    formErrors.expenseDate &&
                      'border-red-300 focus:ring-red-500'
                  )}
                />
                {formErrors.expenseDate && (
                  <p className="text-xs text-red-500">
                    {formErrors.expenseDate}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Vehicle <span className="text-gray-400">(optional)</span>
                </label>
                <Select
                  value={form.vehicleId}
                  onValueChange={(val) =>
                    setForm((f) => ({ ...f, vehicleId: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plateNumber}
                        {v.make ? ` — ${v.make}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">
                Notes <span className="text-gray-400">(optional)</span>
              </label>
              <Input
                placeholder="Additional notes..."
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
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
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}