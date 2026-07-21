'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bell,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Inbox,
  CheckCheck,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { notify } from '../lib/notify';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  type Notification,
} from '@/lib/apiClient';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const TYPE_CONFIG: Record<
  Notification['type'],
  { icon: typeof Info; color: string; bg: string; ring: string }
> = {
  info: {
    icon: Info,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    ring: 'ring-blue-500/20',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    ring: 'ring-amber-500/20',
  },
  alert: {
    icon: AlertCircle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    ring: 'ring-red-500/20',
  },
  success: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    ring: 'ring-emerald-500/20',
  },
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export function NotificationsView() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filtered = useMemo(() => {
    const sorted = [...notifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (filter === 'unread') return sorted.filter((n) => !n.isRead);
    if (filter === 'read') return sorted.filter((n) => n.isRead);
    return sorted;
  }, [notifications, filter]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      await markNotificationRead(id);
    } catch {
      await fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      await fetchNotifications();
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNotification(id);
      notify.success('Notification deleted');
    } catch {
      await fetchNotifications();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-slate-500">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[130px] rounded-xl border-slate-200 bg-white">
              <Filter className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            >
              <CheckCheck className="mr-1.5 h-4 w-4" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* ── Loading State ───────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      )}

      {/* ── Empty State ─────────────────────────────────────────────────── */}
      {!loading && filtered.length === 0 && (
        <Card className="rounded-2xl border-0 bg-white shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Inbox className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">
              No notifications
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              {filter !== 'all'
                ? `No ${filter} notifications to display`
                : 'You\'re all caught up!'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Notification List ───────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((notification) => {
            const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.info;
            const Icon = config.icon;

            return (
              <Card
                key={notification.id}
                onClick={() => !notification.isRead && handleMarkRead(notification.id)}
                className={cn(
                  'group relative cursor-pointer rounded-2xl border-0 shadow-sm transition-all duration-200 hover:shadow-md',
                  notification.isRead
                    ? 'bg-slate-50/80 opacity-75 hover:opacity-100'
                    : 'bg-white hover:bg-slate-50'
                )}
              >
                <CardContent className="flex items-start gap-4 p-5">
                  {/* Unread dot */}
                  {!notification.isRead && (
                    <div className="absolute left-3 top-3 h-2.5 w-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/30" />
                  )}

                  {/* Icon */}
                  <div
                    className={cn(
                      'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1',
                      config.bg,
                      config.ring
                    )}
                  >
                    <Icon className={cn('h-5 w-5', config.color)} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3
                          className={cn(
                            'text-sm leading-snug',
                            notification.isRead
                              ? 'font-medium text-slate-600'
                              : 'font-semibold text-slate-900'
                          )}
                        >
                          {notification.title}
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-slate-500">
                          {notification.message}
                        </p>
                      </div>

                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDelete(e, notification.id)}
                        disabled={deletingId === notification.id}
                        className="h-8 w-8 shrink-0 rounded-xl p-0 text-slate-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Meta row */}
                    <div className="mt-2.5 flex items-center gap-3">
                      <span className="text-xs text-slate-400">
                        {timeAgo(notification.createdAt)}
                      </span>
                      {notification.category && (
                        <Badge
                          variant="secondary"
                          className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500"
                        >
                          {notification.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
