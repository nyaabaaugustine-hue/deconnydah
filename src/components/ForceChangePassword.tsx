import { useState, useMemo } from 'react';
import { ShieldAlert, Loader2, Lock, LogOut, EyeOff, Eye, Key, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changePassword } from '@/lib/apiClient';
import { notify } from '@/lib/notify';

/**
 * Blocks all app access until the signed-in user sets a real password.
 * Shown when AuthUser.mustChangePassword is true — for the seeded default
 * admin/admin account on first login, for any account an admin just created,
 * or for any account whose password an admin just reset.
 */
export function ForceChangePassword({ onChanged, onLogout }: { onChanged: () => void; onLogout: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Password strength calculation ──────────────────────────────────
  const strength = useMemo(() => {
    const pw = newPassword;
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '20%', textColor: 'text-red-600' };
    if (score <= 2) return { label: 'Fair', color: 'bg-orange-500', width: '40%', textColor: 'text-orange-600' };
    if (score <= 3) return { label: 'Good', color: 'bg-amber-500', width: '60%', textColor: 'text-amber-600' };
    if (score <= 4) return { label: 'Strong', color: 'bg-emerald-500', width: '80%', textColor: 'text-emerald-600' };
    return { label: 'Very strong', color: 'bg-emerald-600', width: '100%', textColor: 'text-emerald-700' };
  }, [newPassword]);

  // ── Live validation rules ──────────────────────────────────────────
  const rules = useMemo(() => [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'Contains a number', met: /[0-9]/.test(newPassword) },
    { label: 'Passwords match', met: newPassword.length > 0 && newPassword === confirmPassword },
  ], [newPassword, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from your current password.');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      notify.success('Password updated successfully');
      onChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* ── Decorative background ────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-amber-500/[0.04] dark:bg-amber-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-amber-600/[0.04] dark:bg-amber-600/10 blur-[120px]" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div
        data-animate
        className="relative w-full max-w-md"
        style={{
          animation: 'cardEnter 600ms cubic-bezier(0.23,1,0.32,1) forwards',
          opacity: 0,
          transform: 'translateY(16px) scale(0.98)',
        }}
      >
        {/* ── Card ────────────────────────────────────────────────────── */}
        <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2),0_8px_24px_rgba(0,0,0,0.3)] transition-shadow duration-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_12px_32px_rgba(0,0,0,0.08)]">
          {/* Decorative top accent */}
          <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent rounded-full" />

          {/* Header */}
          <div className="mb-7">
            <div
              data-animate
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/60 mb-5"
              style={{
                animation: 'badgeEnter 400ms cubic-bezier(0.23,1,0.32,1) 150ms forwards',
                opacity: 0,
                transform: 'scale(0.9)',
              }}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 tracking-wide uppercase">
                Action required
              </span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 transition-shadow duration-300 hover:shadow-amber-500/30">
                <Key className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Set a new password
              </h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              This account is using a temporary or default password. You must set your own password
              before continuing to the fleet dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Current password */}
            <div
              data-animate
              className="space-y-2"
              style={{
                animation: 'fieldEnter 400ms cubic-bezier(0.23,1,0.32,1) 200ms forwards',
                opacity: 0,
                transform: 'translateY(6px)',
              }}
            >
              <Label htmlFor="currentPassword" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Current password
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors duration-200" />
                <Input
                  id="currentPassword"
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pl-11 pr-11 h-12 bg-slate-50/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-xl text-[15px] placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all duration-200"
                  placeholder="Your current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150"
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div
              data-animate
              className="space-y-2"
              style={{
                animation: 'fieldEnter 400ms cubic-bezier(0.23,1,0.32,1) 280ms forwards',
                opacity: 0,
                transform: 'translateY(6px)',
              }}
            >
              <Label htmlFor="newPassword" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                New password
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors duration-200" />
                <Input
                  id="newPassword"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-11 pr-11 h-12 bg-slate-50/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-xl text-[15px] placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all duration-200"
                  placeholder="Min 8 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength bar */}
              {newPassword.length > 0 && (
                <div className="space-y-1.5">
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${strength.color}`}
                      style={{ width: strength.width }}
                    />
                  </div>
                  <p className={`text-xs font-medium ${strength.textColor}`}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div
              data-animate
              className="space-y-2"
              style={{
                animation: 'fieldEnter 400ms cubic-bezier(0.23,1,0.32,1) 360ms forwards',
                opacity: 0,
                transform: 'translateY(6px)',
              }}
            >
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Confirm new password
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors duration-200" />
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`pl-11 pr-11 h-12 bg-slate-50/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-xl text-[15px] placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all duration-200 ${
                    confirmPassword.length > 0
                      ? newPassword === confirmPassword
                        ? '!border-emerald-400 focus:!border-emerald-500 focus:!ring-emerald-500/10'
                        : '!border-red-300 focus:!border-red-400 focus:!ring-red-500/10'
                      : ''
                  }`}
                  placeholder="Re-enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Validation rules */}
            {newPassword.length > 0 && (
              <div
                className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-1"
                style={{ animation: 'fadeIn 200ms ease-out forwards' }}
              >
                {rules.map((rule) => (
                  <div key={rule.label} className="flex items-center gap-1.5">
                    {rule.met ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                    )}
                    <span className={`text-xs transition-colors duration-200 ${rule.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      {rule.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/80 dark:border-red-800/60"
                style={{ animation: 'errorIn 300ms cubic-bezier(0.23,1,0.32,1) forwards' }}
              >
                <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <div
              data-animate
              style={{
                animation: 'fieldEnter 400ms cubic-bezier(0.23,1,0.32,1) 440ms forwards',
                opacity: 0,
                transform: 'translateY(6px)',
              }}
            >
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 rounded-xl transition-all duration-200 active:scale-[0.98] text-[15px] disabled:opacity-60 disabled:active:scale-100"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating…
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" /> Set new password
                  </>
                )}
              </Button>
            </div>

            {/* Logout */}
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-all duration-200 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out instead
            </button>
          </form>
        </div>
      </div>

      {/* ── Keyframe styles ──────────────────────────────────────────── */}
      <style>{`
        @keyframes cardEnter {
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes badgeEnter {
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fieldEnter {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes errorIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-animate] { animation: none !important; opacity: 1 !important; transform: none !important; }
          .active\:scale-\[0\.98\]:active { transform: none !important; }
        }
      `}</style>
    </div>
  );
}
