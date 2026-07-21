'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Settings,
  Pencil,
  Check,
  X,
  Plus,
  Loader2,
  Save,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';
import { notify } from '../lib/notify';
import {
  getSettings,
  updateSetting,
  createSetting,
  type CompanySetting,
} from '@/lib/apiClient';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'general', label: 'General', gradient: 'from-slate-500 to-slate-600' },
  { value: 'fleet', label: 'Fleet', gradient: 'from-emerald-500 to-emerald-600' },
  { value: 'notifications', label: 'Notifications', gradient: 'from-blue-500 to-blue-600' },
  { value: 'system', label: 'System', gradient: 'from-amber-500 to-amber-600' },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-slate-100 text-slate-600',
  fleet: 'bg-emerald-50 text-emerald-600',
  notifications: 'bg-blue-50 text-blue-600',
  system: 'bg-amber-50 text-amber-600',
};

interface SettingFormData {
  key: string;
  value: string;
  category: string;
  description: string;
}

const INITIAL_FORM: SettingFormData = {
  key: '',
  value: '',
  category: 'general',
  description: '',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function SettingsView() {
  const [settings, setSettings] = useState<CompanySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<SettingFormData>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof SettingFormData, string>>>({});
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSettings();
      setSettings(Array.isArray(data) ? data : []);
    } catch {
      setSettings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const grouped = useMemo(() => {
    const filtered = settings.filter(
      (s) =>
        !searchQuery ||
        s.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const map = new Map<string, CompanySetting[]>();
    for (const cat of CATEGORIES) map.set(cat.value, []);
    for (const s of filtered) {
      const bucket = map.get(s.category) ?? [];
      bucket.push(s);
      map.set(s.category, bucket);
    }
    return map;
  }, [settings, searchQuery]);

  const handleStartEdit = (setting: CompanySetting) => {
    setEditingKey(setting.key);
    setEditValue(setting.value);
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const handleSave = async (key: string) => {
    setSaving(true);
    try {
      await updateSetting(key, { value: editValue });
      setSettings((prev) =>
        prev.map((s) =>
          s.key === key ? { ...s, value: editValue, updatedAt: new Date().toISOString() } : s
        )
      );
      setEditingKey(null);
      notify.success('Setting saved');
    } catch (err) {
      console.error('Failed to update setting:', err);
    } finally {
      setSaving(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof SettingFormData, string>> = {};
    if (!form.key.trim()) errors.key = 'Key is required';
    if (!form.value.trim()) errors.value = 'Value is required';
    if (!form.category) errors.category = 'Category is required';
    if (settings.some((s) => s.key === form.key.trim()))
      errors.key = 'A setting with this key already exists';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    setCreating(true);
    try {
      const created = await createSetting({
        key: form.key.trim(),
        value: form.value.trim(),
        category: form.category,
        description: form.description.trim(),
      });
      setSettings((prev) => [...prev, created]);
      setDialogOpen(false);
      setForm(INITIAL_FORM);
      setFormErrors({});
      notify.success('Setting created');
    } catch (err) {
      console.error('Failed to create setting:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25">
            <Settings className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              System Settings
            </h1>
            <p className="text-sm text-slate-500">
              Manage your company and system configuration
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search settings…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 rounded-xl border-slate-200 bg-white pl-9 text-sm"
            />
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/25 hover:from-emerald-600 hover:to-emerald-700"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Setting
          </Button>
        </div>
      </div>

      {/* ── Loading State ───────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      )}

      {/* ── Empty State ─────────────────────────────────────────────────── */}
      {!loading && settings.length === 0 && (
        <Card className="rounded-2xl border-0 bg-white shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Settings className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">No settings found</h3>
            <p className="mt-1 text-sm text-slate-400">
              Add your first system setting to get started
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Settings by Category ────────────────────────────────────────── */}
      {!loading && settings.length > 0 && (
        <div className="space-y-6">
          {CATEGORIES.map((cat) => {
            const items = grouped.get(cat.value) ?? [];
            if (items.length === 0) return null;
            return (
              <Card key={cat.value} className="rounded-2xl border-0 bg-white shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
                        cat.gradient
                      )}
                    >
                      <Settings className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-800">
                        {cat.label}
                      </CardTitle>
                      <p className="text-xs text-slate-400">
                        {items.length} setting{items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-0 divide-y divide-slate-100 px-6 pb-6">
                  {items.map((setting) => {
                    const isEditing = editingKey === setting.key;
                    return (
                      <div
                        key={setting.key}
                        className="group flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                      >
                        {/* Key + description */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <code className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                              {setting.key}
                            </code>
                            <Badge
                              variant="secondary"
                              className={cn(
                                'rounded-lg px-2 py-0.5 text-[11px] font-medium',
                                CATEGORY_COLORS[setting.category] ?? 'bg-slate-100 text-slate-500'
                              )}
                            >
                              {setting.category}
                            </Badge>
                          </div>
                          {setting.description && (
                            <p className="mt-1 text-xs text-slate-400">
                              {setting.description}
                            </p>
                          )}
                        </div>

                        {/* Value + Edit */}
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-64 rounded-xl border-slate-200 text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSave(setting.key);
                                  if (e.key === 'Escape') handleCancelEdit();
                                }}
                              />
                              <Button
                                size="sm"
                                onClick={() => handleSave(setting.key)}
                                disabled={saving}
                                className="h-8 w-8 rounded-xl bg-emerald-500 p-0 text-white hover:bg-emerald-600"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEdit}
                                className="h-8 w-8 rounded-xl p-0 text-slate-400 hover:bg-red-50 hover:text-red-500"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="min-w-[120px] max-w-[200px] truncate rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
                                {setting.value}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStartEdit(setting)}
                                className="h-8 w-8 rounded-xl p-0 text-slate-300 opacity-0 transition-opacity hover:bg-emerald-50 hover:text-emerald-600 group-hover:opacity-100"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Add Setting Dialog ──────────────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setForm(INITIAL_FORM);
            setFormErrors({});
          }
        }}
      >
        <DialogContent className="rounded-2xl border-0 bg-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900">
              Add New Setting
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Key
              </label>
              <Input
                placeholder="e.g. max_daily_hours"
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                className={cn(
                  'rounded-xl',
                  formErrors.key && 'border-red-300 ring-red-300/20'
                )}
              />
              {formErrors.key && (
                <p className="mt-1 text-xs text-red-500">{formErrors.key}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Value
              </label>
              <Input
                placeholder="e.g. 12"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                className={cn(
                  'rounded-xl',
                  formErrors.value && 'border-red-300 ring-red-300/20'
                )}
              />
              {formErrors.value && (
                <p className="mt-1 text-xs text-red-500">{formErrors.value}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Category
              </label>
              <Select
                value={form.category}
                onValueChange={(val) => setForm((f) => ({ ...f, category: val }))}
              >
                <SelectTrigger
                  className={cn(
                    'rounded-xl',
                    formErrors.category && 'border-red-300 ring-red-300/20'
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.category && (
                <p className="mt-1 text-xs text-red-500">{formErrors.category}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Description
              </label>
              <Textarea
                placeholder="Optional description of this setting"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="rounded-xl"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/25 hover:from-emerald-600 hover:to-emerald-700"
            >
              {creating ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              Create Setting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
