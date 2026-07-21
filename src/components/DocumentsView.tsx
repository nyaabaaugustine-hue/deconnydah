import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Loader2,
  Plus,
  FileText,
  Download,
  Upload,
  Search,
  FolderOpen,
  Calendar,
  AlertTriangle,
  Filter,
  X,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CardHeader, CardTitle } from '@/components/ui/card';
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
  getDocumentsForVehicle,
  getVehicles,
  createDocument,
  daysUntilExpiry,
  canWrite,
} from '@/lib/apiClient';
import type { VehicleDocument, Vehicle } from '@/types/fleet';

// ── Config ────────────────────────────────────────────────────────────────────

const statVariants = {
  indigo: { gradient: 'from-indigo-500 to-indigo-600', shadow: 'shadow-indigo-500/20' },
  red: { gradient: 'from-red-500 to-red-600', shadow: 'shadow-red-500/20' },
  blue: { gradient: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20' },
  amber: { gradient: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/20' },
};

const docTypeConfig: Record<string, { label: string; color: string; dot: string }> = {
  purchase_invoice: {
    label: 'Purchase Invoice',
    color: 'text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50 border-violet-200 dark:border-violet-800',
    dot: 'bg-violet-500',
  },
  insurance_policy: {
    label: 'Insurance Policy',
    color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
  registration_certificate: {
    label: 'Registration Cert',
    color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
};

const DOC_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'purchase_invoice', label: 'Purchase Invoice' },
  { value: 'insurance_policy', label: 'Insurance Policy' },
  { value: 'registration_certificate', label: 'Registration Cert' },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string | undefined | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function expiryClass(expiryDate: string | null): string {
  const days = daysUntilExpiry(expiryDate);
  if (days === null) return '';
  if (days < 0) return 'text-red-600 dark:text-red-400 font-semibold';
  if (days <= 30) return 'text-amber-600 dark:text-amber-400 font-semibold';
  return 'text-slate-700 dark:text-slate-300';
}

function expiryIcon(expiryDate: string | null): 'expired' | 'soon' | 'ok' | 'none' {
  const days = daysUntilExpiry(expiryDate);
  if (days === null) return 'none';
  if (days < 0) return 'expired';
  if (days <= 30) return 'soon';
  return 'ok';
}

// ── Enriched Document ─────────────────────────────────────────────────────────

interface EnrichedDoc extends VehicleDocument {
  _vehicle?: Vehicle;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function DocumentsView({ role }: { role: string }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allDocs, setAllDocs] = useState<EnrichedDoc[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');

  // Upload dialog
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form
  const [uploadForm, setUploadForm] = useState({
    vehicleId: '',
    docType: '' as string,
    issueDate: '',
    expiryDate: '',
    notes: '',
  });

  // View dialog
  const [viewDoc, setViewDoc] = useState<EnrichedDoc | null>(null);

  const canWriteRole = canWrite(role);

  // ── Data Loading ──────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const v = await getVehicles();
      setVehicles(v);

      const docResults = await Promise.allSettled(
        v.map((veh) => getDocumentsForVehicle(veh.id))
      );

      const enriched: EnrichedDoc[] = [];
      docResults.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          res.value.forEach((doc) => {
            enriched.push({ ...doc, _vehicle: v[idx] });
          });
        }
      });

      enriched.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
      setAllDocs(enriched);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Vehicle Map ───────────────────────────────────────────────────────────

  const vehicleMap = useMemo(() => {
    const map = new Map<string, Vehicle>();
    vehicles.forEach((v) => map.set(v.id, v));
    return map;
  }, [vehicles]);

  // ── Summary Stats ─────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = allDocs.length;
    const expiringSoon = allDocs.filter(
      (d) => d.expiryDate && (daysUntilExpiry(d.expiryDate) ?? Infinity) >= 0 && (daysUntilExpiry(d.expiryDate) ?? Infinity) <= 30
    ).length;
    const insurance = allDocs.filter((d) => d.docType === 'insurance_policy').length;
    const registration = allDocs.filter((d) => d.docType === 'registration_certificate').length;
    return { total, expiringSoon, insurance, registration };
  }, [allDocs]);

  // ── Filtered Documents ────────────────────────────────────────────────────

  const filteredDocs = useMemo(() => {
    return allDocs.filter((doc) => {
      if (docTypeFilter !== 'all' && doc.docType !== docTypeFilter) return false;
      if (vehicleFilter !== 'all' && doc.vehicleId !== vehicleFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const fileNameMatch = doc.fileName.toLowerCase().includes(q);
        const v = doc._vehicle || vehicleMap.get(doc.vehicleId);
        const vMatch = v
          ? `${v.plateNumber} ${v.make} ${v.model}`.toLowerCase().includes(q)
          : false;
        if (!fileNameMatch && !vMatch) return false;
      }
      return true;
    });
  }, [allDocs, search, docTypeFilter, vehicleFilter, vehicleMap]);

  // ── Upload Handling ───────────────────────────────────────────────────────

  const resetUploadForm = () => {
    setUploadForm({ vehicleId: '', docType: '', issueDate: '', expiryDate: '', notes: '' });
    setSelectedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.vehicleId || !uploadForm.docType || !uploadForm.issueDate) return;
    setUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Get presigned URL
      const res = await fetch('/api/uploads/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: selectedFile.name,
          contentType: selectedFile.type,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to get upload URL' }));
        throw new Error(err.error || 'Failed to get presigned URL');
      }

      const { uploadUrl, objectKey } = await res.json();
      setUploadProgress(30);

      // Step 2: PUT file to MinIO
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: { 'Content-Type': selectedFile.type },
      });

      if (!uploadRes.ok) {
        throw new Error('File upload to storage failed');
      }
      setUploadProgress(70);

      // Step 3: Create document record
      const docPayload: Partial<VehicleDocument> = {
        vehicleId: uploadForm.vehicleId,
        docType: uploadForm.docType as VehicleDocument['docType'],
        fileName: selectedFile.name,
        issueDate: uploadForm.issueDate,
        expiryDate: uploadForm.expiryDate || null,
        notes: uploadForm.notes || null,
      };

      const created = await createDocument(docPayload);
      const v = vehicleMap.get(uploadForm.vehicleId);
      setAllDocs((prev) => [{ ...created, _vehicle: v }, ...prev]);
      setUploadProgress(100);

      setShowUpload(false);
      resetUploadForm();
      notify.success('Document uploaded');
    } catch (err: any) {
      notify.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // ── Loading State ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-indigo-400/30 to-indigo-600/30 blur-lg -z-10" />
        </div>
        <p className="text-sm font-medium text-slate-600">Loading documents...</p>
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
        <h3 className="text-lg font-bold text-slate-900 mb-1">Failed to load documents</h3>
        <p className="text-sm text-red-600 mb-6">{error}</p>
        <Button
          onClick={loadAll}
          className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20 rounded-xl"
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-8 shadow-xl">
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_20%_30%,white,transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_80%_70%,#6366f1,transparent_50%)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 items-center justify-center shadow-lg">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Documents
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                Manage vehicle documents, policies, and registrations.
              </p>
            </div>
          </div>
          {canWriteRole && (
            <Button
              onClick={() => setShowUpload(true)}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/25 rounded-xl transition-all duration-300 hover:shadow-indigo-500/40 active:scale-[0.98]"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          )}
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <MiniStat label="Total Documents" value={stats.total} icon={FileText} variant="indigo" />
        <MiniStat
          label="Expiring Soon"
          value={stats.expiringSoon}
          icon={AlertTriangle}
          variant="red"
        />
        <MiniStat label="Insurance Policies" value={stats.insurance} icon={FileText} variant="blue" />
        <MiniStat
          label="Registration Certs"
          value={stats.registration}
          icon={FileText}
          variant="amber"
        />
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors duration-300" />
          <Input
            placeholder="Search by file name or vehicle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-300"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
            <SelectTrigger className="w-[170px] h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-300">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg">
              {DOC_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="w-[200px] h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-300">
              <SelectValue placeholder="All Vehicles" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg max-h-60">
              <SelectItem value="all">All Vehicles</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.plateNumber} — {v.make} {v.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Documents Table ──────────────────────────────────────────────────── */}
      {filteredDocs.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No documents found"
          subtitle={
            search || docTypeFilter !== 'all' || vehicleFilter !== 'all'
              ? 'Try adjusting your filters.'
              : 'Upload your first document to get started.'
          }
        />
      ) : (
        <DataTable>
          <TableHeader>
            <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                File Name
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                Vehicle
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Doc Type
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                Issue Date
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                Expiry Date
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden xl:table-cell">
                Notes
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocs.map((doc) => {
              const v = doc._vehicle || vehicleMap.get(doc.vehicleId);
              const cfg = docTypeConfig[doc.docType] || docTypeConfig.purchase_invoice;
              const expiry = expiryIcon(doc.expiryDate);
              return (
                <TableRow
                  key={doc.id}
                  className="border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  {/* File Name */}
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-500/20 flex-shrink-0">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">
                        {doc.fileName}
                      </span>
                    </div>
                  </TableCell>

                  {/* Vehicle */}
                  <TableCell className="hidden md:table-cell">
                    {v ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {v.plateNumber}
                        </span>
                        <span className="text-xs text-slate-400">
                          {v.make} {v.model}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </TableCell>

                  {/* Doc Type Badge */}
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border shadow-sm',
                        cfg.color
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                      {cfg.label}
                    </span>
                  </TableCell>

                  {/* Issue Date */}
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      {formatDate(doc.issueDate)}
                    </div>
                  </TableCell>

                  {/* Expiry Date */}
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-center gap-1.5">
                      {expiry === 'expired' && (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      )}
                      {expiry === 'soon' && (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      )}
                      <span className={cn('text-sm', expiryClass(doc.expiryDate))}>
                        {formatDate(doc.expiryDate)}
                      </span>
                    </div>
                  </TableCell>

                  {/* Notes */}
                  <TableCell className="hidden xl:table-cell">
                    <span className="text-sm text-slate-500 dark:text-slate-400 truncate block max-w-[180px]">
                      {doc.notes || '—'}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewDoc(doc)}
                        className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all duration-200"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </DataTable>
      )}

      {/* ── Upload Dialog ───────────────────────────────────────────────────── */}
      {showUpload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => {
            if (!uploading) {
              setShowUpload(false);
              resetUploadForm();
            }
          }}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 ease-smooth-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-[1px] rounded-2xl bg-gradient-to-br from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-2xl shadow-black/20">
              <div className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner flex flex-col max-h-[90vh]">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                      <Upload className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        Upload Document
                      </CardTitle>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Upload a vehicle document to cloud storage.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!uploading) {
                        setShowUpload(false);
                        resetUploadForm();
                      }
                    }}
                    className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {/* File Input */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      File *
                    </Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        'w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed transition-all duration-300',
                        selectedFile
                          ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30'
                          : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20'
                      )}
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center flex-shrink-0">
                        <Upload className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        {selectedFile ? (
                          <>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {selectedFile.name}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                              Click to choose a file
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              PDF, JPG, PNG, DOC, XLS — Max 50 MB
                            </p>
                          </>
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Vehicle */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Vehicle *
                    </Label>
                    <Select
                      value={uploadForm.vehicleId}
                      onValueChange={(val) => setUploadForm((p) => ({ ...p, vehicleId: val }))}
                    >
                      <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-300">
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg max-h-60">
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.plateNumber} — {v.year} {v.make} {v.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Doc Type */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Document Type *
                    </Label>
                    <Select
                      value={uploadForm.docType}
                      onValueChange={(val) => setUploadForm((p) => ({ ...p, docType: val }))}
                    >
                      <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-300">
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg">
                        {DOC_TYPE_OPTIONS.filter((o) => o.value !== 'all').map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Issue Date *
                      </Label>
                      <Input
                        type="date"
                        value={uploadForm.issueDate}
                        onChange={(e) =>
                          setUploadForm((p) => ({ ...p, issueDate: e.target.value }))
                        }
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Expiry Date
                      </Label>
                      <Input
                        type="date"
                        value={uploadForm.expiryDate}
                        onChange={(e) =>
                          setUploadForm((p) => ({ ...p, expiryDate: e.target.value }))
                        }
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-300"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Notes
                    </Label>
                    <Textarea
                      value={uploadForm.notes}
                      onChange={(e) =>
                        setUploadForm((p) => ({ ...p, notes: e.target.value }))
                      }
                      placeholder="Any additional notes about this document..."
                      className="min-h-[80px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-300"
                    />
                  </div>

                  {/* Upload Progress */}
                  {uploading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-600 dark:text-slate-400">
                          Uploading...
                        </span>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {uploadProgress}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowUpload(false);
                      resetUploadForm();
                    }}
                    disabled={uploading}
                    className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={
                      uploading ||
                      !selectedFile ||
                      !uploadForm.vehicleId ||
                      !uploadForm.docType ||
                      !uploadForm.issueDate
                    }
                    className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-lg shadow-indigo-500/20 rounded-xl transition-all duration-300 active:scale-[0.98]"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {uploading ? 'Uploading...' : 'Upload Document'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── View Document Dialog ────────────────────────────────────────────── */}
      {viewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setViewDoc(null)}
        >
          <div
            className="w-full max-w-md animate-in zoom-in-95 duration-300 ease-smooth-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-[1px] rounded-2xl bg-gradient-to-br from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-2xl shadow-black/20">
              <div className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        Document Details
                      </CardTitle>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewDoc(null)}
                    className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>

                <div className="p-6 space-y-5">
                  {/* File Name */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      File Name
                    </p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white break-all">
                      {viewDoc.fileName}
                    </p>
                  </div>

                  {/* Vehicle */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Vehicle
                    </p>
                    {(() => {
                      const v = viewDoc._vehicle || vehicleMap.get(viewDoc.vehicleId);
                      return v ? (
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="font-semibold">{v.plateNumber}</span>
                          <span className="text-slate-400 ml-1.5">
                            {v.year} {v.make} {v.model}
                          </span>
                        </p>
                      ) : (
                        <p className="text-sm text-slate-400">Unknown vehicle</p>
                      );
                    })()}
                  </div>

                  {/* Doc Type */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Document Type
                    </p>
                    {(() => {
                      const cfg = docTypeConfig[viewDoc.docType] || docTypeConfig.purchase_invoice;
                      return (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border shadow-sm',
                            cfg.color
                          )}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Issue Date
                      </p>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {formatDate(viewDoc.issueDate)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Expiry Date
                      </p>
                      <div className="flex items-center gap-1.5">
                        {expiryIcon(viewDoc.expiryDate) === 'expired' && (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        )}
                        {expiryIcon(viewDoc.expiryDate) === 'soon' && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        )}
                        <span className={cn('text-sm', expiryClass(viewDoc.expiryDate))}>
                          {formatDate(viewDoc.expiryDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {viewDoc.notes && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Notes
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                        {viewDoc.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setViewDoc(null)}
                    className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                  >
                    Close
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
  icon: typeof FileText;
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
  icon: typeof FileText;
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
