import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Phone,
  X,
  ShieldCheck,
  Search,
  Loader2,
  AlertTriangle,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
} from '@/lib/apiClient';
import type { Driver } from '@/types/fleet';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  inactive: { label: 'Inactive', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
  on_leave: { label: 'On Leave', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
};

export function DriverManagement() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getDrivers();
        if (!cancelled) setDrivers(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load drivers');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async (data: { fullName: string; phone: string; licenseNumber: string; hireDate: string; status: string }) => {
    try {
      if (editingDriver) {
        const updated = await updateDriver(editingDriver.id, data);
        setDrivers(prev => prev.map(d => d.id === editingDriver.id ? updated : d));
      } else {
        const created = await createDriver(data);
        setDrivers(prev => [...prev, created]);
      }
      setIsModalOpen(false);
      setEditingDriver(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save driver');
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async (id: string) => {
    try {
      await deleteDriver(id);
      setDrivers(prev => prev.filter(d => d.id !== id));
      setDeletingId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete driver');
      setDeletingId(null);
    }
  };

  const filteredDrivers = useMemo(() => drivers.filter(d => {
    const matchesSearch = d.fullName.toLowerCase().includes(search.toLowerCase()) || d.licenseNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [drivers, search, statusFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">Loading drivers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Failed to load drivers</h3>
        <p className="text-sm text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Driver Roster</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage driver profiles, licenses, and assignments.</p>
        </div>
        <Button onClick={() => { setEditingDriver(null); setIsModalOpen(true); }} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add Driver
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or license..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on_leave">On Leave</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDrivers.map(driver => {
          const cfg = statusConfig[driver.status] || statusConfig.active;
          return (
            <Card key={driver.id} className="group hover:shadow-md transition-all duration-200 border-border/60">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm border-2 border-primary/20">
                      {driver.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className={cn(
                      'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white',
                      driver.status === 'active' ? 'bg-emerald-500' : driver.status === 'on_leave' ? 'bg-amber-500' : 'bg-slate-400'
                    )} />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">{driver.fullName}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">{driver.licenseNumber}</p>
                  </div>
                </div>
                <Badge variant="outline" className={cn('text-xs font-medium border', cfg.color, cfg.bg)}>
                  {cfg.label}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{driver.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>ID: {driver.supervisorId || 'Unassigned'}</span>
                </div>
                <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                  Hired: {new Date(driver.hireDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => { setEditingDriver(driver); setIsModalOpen(true); }} className="flex-1">
                    <Pencil className="w-3 h-3 mr-1.5" />
                    Edit
                  </Button>
                  {deletingId === driver.id ? (
                    <div className="flex gap-1">
                      <Button variant="destructive" size="sm" onClick={() => confirmDelete(driver.id)} className="h-8 px-2 text-xs">
                        Confirm
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeletingId(null)} className="h-8 px-2 text-xs">
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => handleDelete(driver.id)} className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredDrivers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border rounded-xl">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No drivers found</h3>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters.</p>
        </div>
      )}

      {isModalOpen && (
        <DriverFormModal
          driver={editingDriver}
          onSave={handleSave}
          onClose={() => { setIsModalOpen(false); setEditingDriver(null); }}
        />
      )}
    </div>
  );
}

function DriverFormModal({
  driver,
  onSave,
  onClose,
}: {
  driver: Driver | null;
  onSave: (d: { fullName: string; phone: string; licenseNumber: string; hireDate: string; status: string }) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    fullName: driver?.fullName ?? '',
    phone: driver?.phone ?? '',
    licenseNumber: driver?.licenseNumber ?? '',
    hireDate: driver?.hireDate ?? new Date().toISOString().split('T')[0],
    status: driver?.status ?? 'active',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg shadow-2xl border-border/50 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/50 pb-4">
          <div>
            <CardTitle className="text-xl font-bold">
              {driver ? 'Edit Driver' : 'Add New Driver'}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {driver ? 'Update driver information' : 'Fill in the driver details below'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground">
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5 pt-6">
            <div className="flex flex-col items-center gap-3 pb-4 border-b border-border/50">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20">
                <User className="w-8 h-8 text-primary/60" />
              </div>
              <p className="text-xs text-muted-foreground">Driver avatar</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={formData.fullName} onChange={(e) => handleChange('fullName', e.target.value)} required placeholder="e.g. Kwame Mensah" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} required placeholder="+233 24 000 0000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input id="licenseNumber" value={formData.licenseNumber} onChange={(e) => handleChange('licenseNumber', e.target.value)} required placeholder="B.123456" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hireDate">Hire Date</Label>
                <Input id="hireDate" type="date" value={formData.hireDate} onChange={(e) => handleChange('hireDate', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <div className="flex justify-end gap-3 p-6 border-t border-border/50">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {driver ? 'Save Changes' : 'Add Driver'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
