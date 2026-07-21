import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Shield,
  Eye,
  Pencil,
  Trash2,
  X,
  Loader2,
  Key,
  UserCheck,
  Search,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { notify } from '../lib/notify';
import { getUsers, createUser, updateUserRole, deleteUser, resetUserPassword, type ManagedUser } from '@/lib/apiClient';

const roleConfig: Record<string, { label: string; color: string; dot: string; icon: typeof Shield; desc: string; gradient: string }> = {
  admin: {
    label: 'Admin',
    color: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800',
    dot: 'bg-red-500',
    icon: Shield,
    desc: 'Full access — manage users, delete everything',
    gradient: 'from-red-500/20 via-red-500/10 to-transparent',
  },
  manager: {
    label: 'Manager',
    color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
    icon: Pencil,
    desc: 'Read & write fleet data, cannot delete or manage users',
    gradient: 'from-blue-500/20 via-blue-500/10 to-transparent',
  },
  viewer: {
    label: 'Viewer',
    color: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
    icon: Eye,
    desc: 'Read-only dashboard access',
    gradient: 'from-slate-500/20 via-slate-500/10 to-transparent',
  },
};

export function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [resetUser, setResetUser] = useState<ManagedUser | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<ManagedUser | null>(null);
  const [search, setSearch] = useState('');

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = useMemo(() => users.filter(u => {
    return u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase());
  }), [users, search]);

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    managers: users.filter(u => u.role === 'manager').length,
    viewers: users.filter(u => u.role === 'viewer').length,
  };

  // ── Premium Loading State ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-violet-400/30 to-violet-600/30 blur-lg -z-10" />
        </div>
        <p className="text-sm font-medium text-slate-600">Loading users...</p>
      </div>
    );
  }

  // ── Premium Error State ────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-red-400/30 to-red-600/30 blur-lg -z-10" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Failed to load users</h3>
        <p className="text-sm text-red-600 mb-6">{error}</p>
        <Button onClick={() => window.location.reload()} className="bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-lg shadow-violet-500/20 rounded-xl">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Premium Header ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 p-8 shadow-xl">
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_20%_30%,white,transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_80%_70%,#8b5cf6,transparent_50%)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 items-center justify-center shadow-lg">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">User Management</h1>
              <p className="text-sm text-slate-300 mt-1">Manage who can access the fleet dashboard and their permissions.</p>
            </div>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 text-white shadow-lg shadow-violet-500/25 rounded-xl transition-all duration-300 hover:shadow-violet-500/40 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <MiniStat label="Total Users" value={stats.total} icon={Users} variant="violet" />
        <MiniStat label="Admins" value={stats.admins} icon={Shield} variant="red" />
        <MiniStat label="Managers" value={stats.managers} icon={Pencil} variant="blue" />
        <MiniStat label="Viewers" value={stats.viewers} icon={Eye} variant="slate" />
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-violet-500 transition-colors duration-300" />
          <Input
            placeholder="Search by name or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 rounded-xl transition-all duration-300"
          />
        </div>
      </div>

      {/* ── User Cards Grid ───────────────────────────────────────────────── */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No users found</h3>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your search or add a new user.</p>
          </div>
        ) : (
          filtered.map((user) => {
            const cfg = roleConfig[user.role] || roleConfig.viewer;
            const initials = user.displayName.charAt(0).toUpperCase();

            return (
              <div key={user.id} className="group relative">
                {/* Double-bezel card */}
                <div className="p-[1px] rounded-2xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:shadow-slate-200/50 dark:group-hover:shadow-black/20">
                  <div className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner transition-all duration-300">
                    {/* Top gradient bar */}
                    <div className={cn('h-1 bg-gradient-to-r opacity-60', cfg.gradient.replace('via-', '/10 via-').replace('to-', '/5 to-'))} />

                    <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center border-2 border-slate-200 dark:border-slate-700 group-hover:border-violet-200 dark:group-hover:border-violet-800 transition-colors duration-300 flex-shrink-0">
                          <span className="text-xl font-bold text-slate-700 dark:text-slate-300">{initials}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">{user.displayName}</h3>
                            <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border shadow-sm',
                              cfg.color
                            )}>
                              <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono">@{user.username}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cfg.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditUser(user)}
                          className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-violet-600 dark:hover:text-violet-400 transition-all duration-200"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1.5" />
                          Role
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setResetUser(user)}
                          className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-amber-600 dark:hover:text-amber-400 transition-all duration-200"
                        >
                          <Key className="w-3.5 h-3.5 mr-1.5" />
                          Password
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300 transition-all duration-200"
                          onClick={() => setDeleteUserTarget(user)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadUsers(); }} />}
      {editUser && <EditRoleModal user={editUser} onClose={() => setEditUser(null)} onSaved={() => { setEditUser(null); loadUsers(); }} />}
      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />}
      {deleteUserTarget && <DeleteUserModal user={deleteUserTarget} onClose={() => setDeleteUserTarget(null)} onDeleted={() => { setDeleteUserTarget(null); loadUsers(); }} />}
    </div>
  );
}

// ── Mini Stat ─────────────────────────────────────────────────────────────────

const miniStatVariants = {
  violet: { gradient: 'from-violet-500 to-violet-600', shadow: 'shadow-violet-500/20' },
  red: { gradient: 'from-red-500 to-red-600', shadow: 'shadow-red-500/20' },
  blue: { gradient: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20' },
  slate: { gradient: 'from-slate-500 to-slate-600', shadow: 'shadow-slate-500/20' },
};

function MiniStat({ label, value, icon: Icon, variant }: {
  label: string;
  value: number;
  icon: typeof Users;
  variant: keyof typeof miniStatVariants;
}) {
  const cfg = miniStatVariants[variant];
  return (
    <div className="group relative">
      <div className="p-[1px] rounded-2xl bg-gradient-to-b from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-sm transition-all duration-300 group-hover:shadow-md">
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-inner transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
            </div>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg transition-all duration-300 group-hover:scale-110', cfg.gradient, cfg.shadow)}>
              <Icon className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create User Modal ─────────────────────────────────────────────────────────

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ username: '', password: '', displayName: '', role: 'viewer' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await createUser(form);
      notify.success('User created');
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      <div className="w-full max-w-lg animate-in zoom-in-95 duration-300 ease-smooth-in" onClick={(e) => e.stopPropagation()}>
        <div className="p-[1px] rounded-2xl bg-gradient-to-br from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-2xl shadow-black/20">
          <div className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Create New User</CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Add a new user to the system</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Display Name</Label>
                <Input
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="e.g. John Mensah"
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 rounded-xl transition-all duration-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Username</Label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="e.g. john"
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 rounded-xl transition-all duration-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 rounded-xl transition-all duration-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                    <SelectItem value="admin">🛡️ Admin</SelectItem>
                    <SelectItem value="manager">✏️ Manager</SelectItem>
                    <SelectItem value="viewer">👁️ Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400 dark:text-slate-500">{roleConfig[form.role]?.desc}</p>
              </div>
              {error && (
                <div className="px-4 py-3 rounded-xl bg-gradient-to-r from-red-50 to-red-50/50 dark:from-red-950/50 dark:to-red-900/30 border border-red-200 dark:border-red-800">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-3">
              <Button variant="outline" onClick={onClose} className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !form.username || !form.password || !form.displayName}
                className="bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-600 text-white shadow-lg shadow-violet-500/20 rounded-xl transition-all duration-300 active:scale-[0.98]"
              >
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserCheck className="w-4 h-4 mr-2" />}
                Create User
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Edit Role Modal ───────────────────────────────────────────────────────────

function EditRoleModal({ user, onClose, onSaved }: { user: ManagedUser; onClose: () => void; onSaved: () => void }) {
  const [role, setRole] = useState(user.role);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await updateUserRole(user.id, { displayName, role });
      notify.success('User updated');
      onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  const cfg = roleConfig[role] || roleConfig.viewer;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      <div className="w-full max-w-lg animate-in zoom-in-95 duration-300 ease-smooth-in" onClick={(e) => e.stopPropagation()}>
        <div className="p-[1px] rounded-2xl bg-gradient-to-br from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-2xl shadow-black/20">
          <div className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <Pencil className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Edit: {user.username}</CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Update user role and display name</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Display Name</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 rounded-xl transition-all duration-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role</Label>
                <Select value={role} onValueChange={(value) => setRole(value as "admin" | "manager" | "viewer")}>
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                    <SelectItem value="admin">🛡️ Admin</SelectItem>
                    <SelectItem value="manager">✏️ Manager</SelectItem>
                    <SelectItem value="viewer">👁️ Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400 dark:text-slate-500">{cfg.desc}</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-3">
              <Button variant="outline" onClick={onClose} className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={submitting}
                className="bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-600 text-white shadow-lg shadow-violet-500/20 rounded-xl transition-all duration-300 active:scale-[0.98]"
              >
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserCheck className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reset Password Modal ──────────────────────────────────────────────────────

function ResetPasswordModal({ user, onClose }: { user: ManagedUser; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async () => {
    setSubmitting(true);
    setError('');
    try {
      await resetUserPassword(user.id, password);
      setDone(true);
      notify.success('Password changed');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      <div className="w-full max-w-lg animate-in zoom-in-95 duration-300 ease-smooth-in" onClick={(e) => e.stopPropagation()}>
        <div className="p-[1px] rounded-2xl bg-gradient-to-br from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-2xl shadow-black/20">
          <div className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Key className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Reset Password</CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">For @{user.username}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>

            <div className="p-6 space-y-4">
              {done ? (
                <div className="px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-50/50 dark:from-emerald-950/50 dark:to-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Password reset successfully. All sessions for this user have been revoked.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">New Password</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 rounded-xl transition-all duration-300"
                    />
                  </div>
                  {error && (
                    <div className="px-4 py-3 rounded-xl bg-gradient-to-r from-red-50 to-red-50/50 dark:from-red-950/50 dark:to-red-900/30 border border-red-200 dark:border-red-800">
                      <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-3">
              <Button variant="outline" onClick={onClose} className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200">
                {done ? 'Close' : 'Cancel'}
              </Button>
              {!done && (
                <Button
                  onClick={handleReset}
                  disabled={submitting || password.length < 6}
                  className="bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-600 text-white shadow-lg shadow-violet-500/20 rounded-xl transition-all duration-300 active:scale-[0.98]"
                >
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Key className="w-4 h-4 mr-2" />}
                  Reset Password
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Delete User Modal ─────────────────────────────────────────────────────────

function DeleteUserModal({ user, onClose, onDeleted }: { user: ManagedUser; onClose: () => void; onDeleted: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await deleteUser(user.id);
      notify.success('User deleted');
      onDeleted();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      <div className="w-full max-w-lg animate-in zoom-in-95 duration-300 ease-smooth-in" onClick={(e) => e.stopPropagation()}>
        <div className="p-[1px] rounded-2xl bg-gradient-to-br from-slate-200 to-white dark:from-slate-700 dark:to-slate-800 shadow-2xl shadow-black/20">
          <div className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Delete User</CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">This action cannot be undone</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>

            <div className="p-6">
              <div className="px-4 py-3 rounded-xl bg-gradient-to-r from-red-50 to-red-50/50 dark:from-red-950/50 dark:to-red-900/30 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-400">
                  Are you sure you want to delete <strong>{user.displayName}</strong> (@{user.username})? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-3">
              <Button variant="outline" onClick={onClose} className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={submitting}
                className="rounded-xl shadow-lg transition-all duration-300 active:scale-[0.98]"
              >
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Delete User
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
