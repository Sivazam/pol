'use client';

/**
 * Admin → Users tab.
 *
 * ADMIN-only. Lists staff accounts and lets admin:
 *   - provision new users (email + temp password + role + optional mandal)
 *   - activate / deactivate accounts
 *   - reset passwords (sets `mustChangePassword`)
 *   - update an existing user's role / mandal assignment
 *
 * No self-signup anywhere in the app — this is the only entry point.
 */

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, KeyRound, Pencil, ShieldOff, ShieldCheck, RefreshCw } from 'lucide-react';

type Role = 'ADMIN' | 'OFFICER' | 'VIEWER';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  mandalId: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface Mandal { id: string; name: string; code: string }

function generateTempPassword(): string {
  // 16 chars: uppercase + lowercase + digit + symbol — meets gov complexity policy.
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const sym = '!@#$%&*+=?';
  const all = upper + lower + digits + sym;
  const arr = new Uint32Array(16);
  crypto.getRandomValues(arr);
  let pwd = upper[arr[0] % upper.length] + lower[arr[1] % lower.length]
          + digits[arr[2] % digits.length] + sym[arr[3] % sym.length];
  for (let i = 4; i < 16; i++) pwd += all[arr[i] % all.length];
  return pwd;
}

export default function AdminUsersTab() {
  const sessionRole = useAppStore((s) => s.sessionRole);
  const [users, setUsers] = useState<User[]>([]);
  const [mandals, setMandals] = useState<Mandal[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);

  // Create form
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('VIEWER');
  const [mandalId, setMandalId] = useState<string>('');
  const [tempPassword, setTempPassword] = useState(generateTempPassword());
  const [submitting, setSubmitting] = useState(false);
  const [editingRole, setEditingRole] = useState<Role>('VIEWER');
  const [editingMandalId, setEditingMandalId] = useState<string>('');
  const [savingAccess, setSavingAccess] = useState(false);

  const isAdmin = sessionRole === 'ADMIN';

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMandals() {
    try {
      const res = await fetch('/api/mandals');
      if (res.ok) {
        const data = await res.json();
        setMandals(Array.isArray(data) ? data : data.mandals || []);
      }
    } catch { /* noop */ }
  }

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchMandals();
    }
  }, [isAdmin]);

  async function handleCreate() {
    if (!email || !name || !tempPassword) {
      toast.error('Email, name and temp password are required');
      return;
    }
    if (role === 'OFFICER' && !mandalId) {
      toast.error('OFFICER role requires a mandal');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, role, mandalId: mandalId || null, tempPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      toast.success(`User ${data.user.email} provisioned. Share the temp password securely.`);
      setCreateOpen(false);
      setEmail(''); setName(''); setRole('VIEWER'); setMandalId('');
      setTempPassword(generateTempPassword());
      fetchUsers();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(user: User) {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, action: user.isActive ? 'deactivate' : 'activate' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      toast.success(user.isActive ? 'User deactivated' : 'User activated');
      fetchUsers();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleResetPassword(newTemp: string) {
    if (!resetTarget) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resetTarget.id, action: 'reset-password', newTempPassword: newTemp }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      toast.success('Password reset. Share the new temp password securely.');
      setResetTarget(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleUpdateAccess() {
    if (!editTarget) return;
    if (editingRole === 'OFFICER' && !editingMandalId) {
      toast.error('OFFICER role requires a mandal');
      return;
    }

    setSavingAccess(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editTarget.id,
          action: 'update-access',
          role: editingRole,
          mandalId: editingRole === 'OFFICER' ? editingMandalId : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update access');
      toast.success('User access updated');
      setEditTarget(null);
      setEditingRole('VIEWER');
      setEditingMandalId('');
      fetchUsers();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingAccess(false);
    }
  }

  if (!isAdmin) {
    return (
      <Card><CardContent className="p-6 text-sm text-slate-500">
        Only ADMIN users can manage staff accounts.
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Staff Accounts</CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              All accounts are admin-provisioned. Self-signup is disabled.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => { setTempPassword(generateTempPassword()); setCreateOpen(true); }}>
              <Plus className="w-4 h-4 mr-1.5" /> New User
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Role</TableHead>
                <TableHead className="text-xs">Mandal</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Last Login</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="text-xs font-mono">{u.email}</TableCell>
                  <TableCell className="text-xs">{u.name || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'ADMIN' ? 'destructive' : u.role === 'OFFICER' ? 'default' : 'secondary'} className="text-[10px]">
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {u.mandalId ? mandals.find((m) => m.id === u.mandalId)?.code ?? u.mandalId : '—'}
                  </TableCell>
                  <TableCell>
                    {u.isActive
                      ? <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300 dark:text-emerald-400">Active</Badge>
                      : <Badge variant="outline" className="text-[10px] text-rose-700 border-rose-300 dark:text-rose-400">Disabled</Badge>}
                    {u.mustChangePassword && (
                      <Badge variant="outline" className="ml-1 text-[10px] text-amber-700 border-amber-300 dark:text-amber-400">Must change</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditTarget(u);
                        setEditingRole(u.role);
                        setEditingMandalId(u.mandalId || '');
                      }}
                      title="Edit access"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-600" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setResetTarget(u)} title="Reset password">
                      <KeyRound className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleToggle(u)} title={u.isActive ? 'Deactivate' : 'Activate'}>
                      {u.isActive
                        ? <ShieldOff className="w-3.5 h-3.5 text-rose-600" />
                        : <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-xs text-slate-500 py-6">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Provision new staff account</DialogTitle>
            <DialogDescription>
              The temp password must be conveyed via a secure out-of-band channel. The user will be forced to change it on first login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="u-email">Email</Label>
              <Input id="u-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="officer.name@polavaram.ap.gov.in" />
            </div>
            <div>
              <Label htmlFor="u-name">Full name</Label>
              <Input id="u-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="u-role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger id="u-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEWER">VIEWER (masked PII)</SelectItem>
                  <SelectItem value="OFFICER">OFFICER (single mandal, full PII)</SelectItem>
                  <SelectItem value="ADMIN">ADMIN (full access)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role === 'OFFICER' && (
              <div>
                <Label htmlFor="u-mandal">Mandal</Label>
                <Select value={mandalId} onValueChange={setMandalId}>
                  <SelectTrigger id="u-mandal"><SelectValue placeholder="Select mandal" /></SelectTrigger>
                  <SelectContent>
                    {mandals.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name} ({m.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="u-pwd">Temporary password</Label>
              <div className="flex gap-2">
                <Input id="u-pwd" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} className="font-mono" />
                <Button type="button" variant="outline" onClick={() => setTempPassword(generateTempPassword())}>
                  Regen
                </Button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Min 12 chars. Auto-generated 16-char passwords meet policy.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting}>{submitting ? 'Creating…' : 'Create user'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit access dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit access for {editTarget?.email}</DialogTitle>
            <DialogDescription>
              Update the user's role and mandal scope. OFFICER accounts are restricted to a single mandal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="edit-role">Role</Label>
              <Select value={editingRole} onValueChange={(v) => {
                const nextRole = v as Role;
                setEditingRole(nextRole);
                if (nextRole !== 'OFFICER') setEditingMandalId('');
              }}>
                <SelectTrigger id="edit-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEWER">VIEWER (masked PII)</SelectItem>
                  <SelectItem value="OFFICER">OFFICER (single mandal, full PII)</SelectItem>
                  <SelectItem value="ADMIN">ADMIN (full access)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editingRole === 'OFFICER' && (
              <div>
                <Label htmlFor="edit-mandal">Mandal</Label>
                <Select value={editingMandalId} onValueChange={setEditingMandalId}>
                  <SelectTrigger id="edit-mandal"><SelectValue placeholder="Select mandal" /></SelectTrigger>
                  <SelectContent>
                    {mandals.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name} ({m.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={savingAccess}>Cancel</Button>
            <Button onClick={handleUpdateAccess} disabled={savingAccess}>{savingAccess ? 'Saving…' : 'Save access'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password for {resetTarget?.email}</DialogTitle>
            <DialogDescription>
              The user will be forced to change this on next login.
            </DialogDescription>
          </DialogHeader>
          <ResetPasswordForm onSubmit={handleResetPassword} onCancel={() => setResetTarget(null)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResetPasswordForm({
  onSubmit, onCancel,
}: { onSubmit: (pwd: string) => void; onCancel: () => void }) {
  const [pwd, setPwd] = useState(generateTempPassword());
  const [busy, setBusy] = useState(false);
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="reset-pwd">New temporary password</Label>
        <div className="flex gap-2">
          <Input id="reset-pwd" value={pwd} onChange={(e) => setPwd(e.target.value)} className="font-mono" />
          <Button type="button" variant="outline" onClick={() => setPwd(generateTempPassword())}>Regen</Button>
        </div>
      </div>
      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button onClick={async () => { setBusy(true); await onSubmit(pwd); setBusy(false); }} disabled={busy || pwd.length < 12}>
          Reset password
        </Button>
      </DialogFooter>
    </>
  );
}
