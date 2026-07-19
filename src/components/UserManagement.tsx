import { useState, useEffect } from 'react';
import { Users, Plus, Shield, Eye, Pencil, Trash2, X, Loader2, Key, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getUsers, createUser, updateUserRole, deleteUser, resetUserPassword, type ManagedUser } from '@/lib/apiClient';

const roleConfig = {
  admin: { label: 'Admin', color: 'text-red-700 bg-red-50 border-red-200', icon: Shield, desc: 'Full access — manage users, delete everything' },
  manager: { label: 'Manager', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: Pencil, desc: 'Read & write fleet data, cannot delete or manage users' },
  viewer: { label: 'Viewer', color: 'text-slate-700 bg-slate-100 border-slate-200', icon: Eye, desc: 'Read-only dashboard access' },
};

export function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [resetUser, setResetUser] = useState<ManagedUser | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<ManagedUser | null>(null);

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-sm text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          </div>
          <p className="text-sm text-muted-foreground">Manage who can access the fleet dashboard.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" /> Add User
        </Button>
      </div>

      <div className="grid gap-4">
        {users.map((user) => {
          const cfg = roleConfig[user.role] || roleConfig.viewer;
          const RoleIcon = cfg.icon;
          return (
            <Card key={user.id} className="group hover:shadow-md transition-all border-border/60">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <span className="text-lg font-bold text-primary">
                    {user.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold">{user.displayName}</h3>
                    <Badge variant="outline" className={cn('text-xs font-medium border', cfg.color)}>
                      <RoleIcon className="w-3 h-3 mr-1" />
                      {cfg.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    @{user.username} &middot; {cfg.desc}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditUser(user)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Role
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setResetUser(user)}>
                    <Key className="w-3.5 h-3.5 mr-1" /> Password
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteUserTarget(user)}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadUsers(); }} />}
      {editUser && <EditRoleModal user={editUser} onClose={() => setEditUser(null)} onSaved={() => { setEditUser(null); loadUsers(); }} />}
      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />}
      {deleteUserTarget && <DeleteUserModal user={deleteUserTarget} onClose={() => setDeleteUserTarget(null)} onDeleted={() => { setDeleteUserTarget(null); loadUsers(); }} />}
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ username: '', password: '', displayName: '', role: 'viewer' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await createUser(form);
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <Card className="w-full max-w-md shadow-2xl border-border/50" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-bold">Create New User</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"><X className="w-4 h-4" /></Button>
        </CardHeader>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="e.g. John Mensah" />
          </div>
          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="e.g. john" />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{roleConfig[form.role as keyof typeof roleConfig]?.desc}</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-border/50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !form.username || !form.password || !form.displayName}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserCheck className="w-4 h-4 mr-2" />}
            Create User
          </Button>
        </div>
      </Card>
    </div>
  );
}

function EditRoleModal({ user, onClose, onSaved }: { user: ManagedUser; onClose: () => void; onSaved: () => void }) {
  const [role, setRole] = useState(user.role);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await updateUserRole(user.id, { displayName, role });
      onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <Card className="w-full max-w-md shadow-2xl border-border/50" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-bold">Edit: {user.username}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"><X className="w-4 h-4" /></Button>
        </CardHeader>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{roleConfig[role as keyof typeof roleConfig]?.desc}</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border/50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserCheck className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </Card>
    </div>
  );
}

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <Card className="w-full max-w-md shadow-2xl border-border/50" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-bold">Reset Password: {user.username}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"><X className="w-4 h-4" /></Button>
        </CardHeader>
        <div className="p-6 space-y-4">
          {done ? (
            <div className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-sm text-emerald-700">Password reset. All sessions for this user were revoked.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </>
          )}
        </div>
        <div className="px-6 py-4 border-t border-border/50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>{done ? 'Close' : 'Cancel'}</Button>
          {!done && (
            <Button onClick={handleReset} disabled={submitting || password.length < 6}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Key className="w-4 h-4 mr-2" />}
              Reset Password
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function DeleteUserModal({ user, onClose, onDeleted }: { user: ManagedUser; onClose: () => void; onDeleted: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await deleteUser(user.id);
      onDeleted();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <Card className="w-full max-w-md shadow-2xl border-border/50" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-bold text-destructive">Delete User</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"><X className="w-4 h-4" /></Button>
        </CardHeader>
        <div className="p-6">
          <p className="text-sm">Are you sure you want to delete <strong>{user.displayName}</strong> (@{user.username})? This action cannot be undone.</p>
        </div>
        <div className="px-6 py-4 border-t border-border/50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Delete User
          </Button>
        </div>
      </Card>
    </div>
  );
}
