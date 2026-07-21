'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield,
  Loader2,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  Activity,
  Calendar,
  Users,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

// ── API ───────────────────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: string;
  tableName: string;
  operation: string;
  recordId: string;
  changedBy: string;
  changes: Record<string, unknown> | null;
  createdAt: string;
}

async function fetchAuditLogs(): Promise<AuditLogEntry[]> {
  const token = localStorage.getItem('fleet_auth_token');
  const res = await fetch('/api/audit-logs', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTimestamp(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

const OP_STYLES: Record<string, { label: string; className: string }> = {
  INSERT: {
    label: 'INSERT',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  },
  UPDATE: {
    label: 'UPDATE',
    className: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  },
  DELETE: {
    label: 'DELETE',
    className: 'bg-red-50 text-red-700 ring-red-600/20',
  },
};

const SUMMARY_CARDS = [
  {
    key: 'total',
    label: 'Total Events',
    icon: Activity,
    gradient: 'from-emerald-500 to-emerald-600',
  },
  {
    key: 'today',
    label: "Today's Events",
    icon: Calendar,
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    key: 'users',
    label: 'Unique Users',
    icon: Users,
    gradient: 'from-amber-500 to-amber-600',
  },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export function AuditView() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await fetchAuditLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const tableNames = useMemo(
    () => [...new Set(logs.map((l) => l.tableName))].sort(),
    [logs]
  );

  const filtered = useMemo(() => {
    if (tableFilter === 'all') return logs;
    return logs.filter((l) => l.tableName === tableFilter);
  }, [logs, tableFilter]);

  const summary = useMemo(() => {
    const total = logs.length;
    const today = logs.filter((l) => isToday(l.createdAt)).length;
    const users = new Set(logs.map((l) => l.changedBy).filter(Boolean)).size;
    return { total, today, users };
  }, [logs]);

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Audit &amp; Security Logs
            </h1>
            <p className="text-sm text-slate-500">
              Track all changes across the system
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="w-[180px] rounded-xl border-slate-200 bg-white">
              <Search className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
              <SelectValue placeholder="Filter by table" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Tables</SelectItem>
              {tableNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            className="rounded-xl border-slate-200"
          >
            <RefreshCw
              className={cn('mr-1.5 h-4 w-4', refreshing && 'animate-spin')}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Loading State ───────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      )}

      {/* ── Summary Cards ───────────────────────────────────────────────── */}
      {!loading && logs.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {SUMMARY_CARDS.map((card) => {
            const Icon = card.icon;
            const value =
              card.key === 'total'
                ? summary.total
                : card.key === 'today'
                ? summary.today
                : summary.users;
            return (
              <Card
                key={card.key}
                className="rounded-2xl border-0 bg-white shadow-sm"
              >
                <CardContent className="flex items-center gap-4 p-5">
                  <div
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md',
                      card.gradient
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      {card.label}
                    </p>
                    <p className="mt-0.5 text-2xl font-bold text-slate-900">
                      {value.toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Empty State ─────────────────────────────────────────────────── */}
      {!loading && logs.length === 0 && (
        <Card className="rounded-2xl border-0 bg-white shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <FileText className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">
              No audit logs found
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              System activity will appear here once changes are recorded
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Audit Log Table ─────────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <Card className="rounded-2xl border-0 bg-white shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Timestamp
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Table
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Operation
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Record ID
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Changed By
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Changes
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((entry) => {
                    const opStyle =
                      OP_STYLES[entry.operation] ?? {
                        label: entry.operation,
                        className: 'bg-slate-50 text-slate-600 ring-slate-500/20',
                      };
                    const isExpanded = expandedId === entry.id;
                    const hasChanges =
                      entry.changes &&
                      typeof entry.changes === 'object' &&
                      Object.keys(entry.changes).length > 0;

                    return (
                      <>
                        <TableRow
                          key={entry.id}
                          className="border-b border-slate-50 transition-colors hover:bg-slate-50/50"
                        >
                          <TableCell className="whitespace-nowrap text-sm text-slate-500">
                            {formatTimestamp(entry.createdAt)}
                          </TableCell>
                          <TableCell>
                            <code className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                              {entry.tableName}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn(
                                'rounded-lg px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
                                opStyle.className
                              )}
                            >
                              {opStyle.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-slate-600">
                            {entry.recordId?.slice(0, 8) ?? '—'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-slate-600">
                            {entry.changedBy ?? '—'}
                          </TableCell>
                          <TableCell>
                            {hasChanges && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setExpandedId(isExpanded ? null : entry.id)
                                }
                                className="h-7 gap-1 rounded-lg px-2 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5" />
                                )}
                                {Object.keys(entry.changes ?? {}).length} field
                                {Object.keys(entry.changes ?? {}).length !== 1 ? 's' : ''}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                        {isExpanded && hasChanges && (
                          <TableRow key={`${entry.id}-detail`}>
                            <TableCell colSpan={6} className="bg-slate-50/80 px-6 py-4">
                              <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                  Change Details
                                </p>
                                <pre className="overflow-x-auto text-xs leading-relaxed text-slate-600">
                                  {JSON.stringify(entry.changes, null, 2)}
                                </pre>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
