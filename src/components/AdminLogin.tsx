import { useState } from 'react';
import { Loader2, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/lib/apiClient';
import { notify } from '@/lib/notify';

export function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      notify.success('Welcome back!');
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* ── Left: Brand Panel ─────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://res.cloudinary.com/dwsl2ktt2/image/upload/v1784469601/dgonny_qytmb4.png')",
        }}
      >
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-slate-900/65" />

        {/* Subtle grain texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          }}
        />

        {/* Geometric accents */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] border border-white/[0.04] rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] border border-white/[0.04] rounded-full translate-y-1/3 -translate-x-1/4" />
          <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] border border-white/[0.03] rounded-full -translate-x-1/2 -translate-y-1/2" />
          {/* Subtle glow accent */}
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px]" />
        </div>

        {/* Logo & brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl overflow-hidden shadow-lg shadow-black/20">
              <img
                src="/logo.png"
                alt="Degoony Evergreen Logistics"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                Degoony Evergreen
              </h1>
              <p className="text-sm text-emerald-400">
                Logistics & Transport Gh Ltd
              </p>
            </div>
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10 max-w-lg">
          <p className="text-white/40 text-sm leading-relaxed">
            Fleet management made simple. Track vehicles, drivers, expenses,
            and maintenance — all in one place.
          </p>
        </div>
      </div>

      {/* ── Right: Login Form ─────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="w-14 h-14 rounded-xl overflow-hidden mb-4 shadow-lg shadow-slate-200">
              <img
                src="/logo.png"
                alt="Degoony Evergreen Logistics"
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Degoony Evergreen
            </h1>
            <p className="text-sm text-slate-500">Fleet Record System</p>
          </div>

          {/* Card */}
          <div
            data-animate
            className="relative bg-white rounded-2xl border border-slate-200/80 p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] transition-shadow duration-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_12px_32px_rgba(0,0,0,0.08)]"
            style={{
              animation: 'cardEnter 500ms cubic-bezier(0.23,1,0.32,1) forwards',
              opacity: 0,
              transform: 'translateY(12px) scale(0.98)',
            }}
          >
            {/* Decorative top accent line */}
            <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent rounded-full" />

            <div className="mb-8">
              <h2
                data-animate
                className="text-2xl font-bold text-slate-900 tracking-tight"
                style={{
                  animation: 'textEnter 500ms cubic-bezier(0.23,1,0.32,1) 100ms forwards',
                  opacity: 0,
                  transform: 'translateY(6px)',
                }}
              >
                Welcome back
              </h2>
              <p
                data-animate
                className="text-sm text-slate-500 mt-1.5"
                style={{
                  animation: 'textEnter 500ms cubic-bezier(0.23,1,0.32,1) 180ms forwards',
                  opacity: 0,
                  transform: 'translateY(6px)',
                }}
              >
                Sign in to access the fleet management dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div
                data-animate
                className="space-y-2"
                style={{
                  animation: 'textEnter 400ms cubic-bezier(0.23,1,0.32,1) 260ms forwards',
                  opacity: 0,
                  transform: 'translateY(6px)',
                }}
              >
                <Label
                  htmlFor="username"
                  className="text-sm font-medium text-slate-700"
                >
                  Username
                </Label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors duration-200" />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-11 h-12 bg-slate-50/80 border-slate-200 rounded-xl text-[15px] placeholder:text-slate-400 focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-200"
                    placeholder="Enter your username"
                    required
                  />
                </div>
              </div>

              <div
                data-animate
                className="space-y-2"
                style={{
                  animation: 'textEnter 400ms cubic-bezier(0.23,1,0.32,1) 340ms forwards',
                  opacity: 0,
                  transform: 'translateY(6px)',
                }}
              >
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-slate-700"
                >
                  Password
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors duration-200" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 pr-11 h-12 bg-slate-50/80 border-slate-200 rounded-xl text-[15px] placeholder:text-slate-400 focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-200"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-150"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="p-3.5 rounded-xl bg-red-50 border border-red-200/80"
                  style={{ animation: 'errorIn 300ms cubic-bezier(0.23,1,0.32,1) forwards' }}
                >
                  <p className="text-sm font-medium text-red-600">{error}</p>
                </div>
              )}

              <div
                data-animate
                style={{
                  animation: 'textEnter 400ms cubic-bezier(0.23,1,0.32,1) 420ms forwards',
                  opacity: 0,
                  transform: 'translateY(6px)',
                }}
              >
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30 transition-all duration-200 active:scale-[0.98] text-[15px] disabled:opacity-60 disabled:active:scale-100"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{' '}
                      Signing in…
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Footer hint */}
          <p
            data-animate
            className="text-center text-xs text-slate-400 mt-6"
            style={{
              animation: 'textEnter 400ms cubic-bezier(0.23,1,0.32,1) 550ms forwards',
              opacity: 0,
            }}
          >
            Fleet management by Degoony Evergreen
          </p>
        </div>
      </div>

      {/* ── Keyframe styles ──────────────────────────────────────────── */}
      <style>{`
        @keyframes cardEnter {
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes textEnter {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes errorIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-animate] { animation: none !important; opacity: 1 !important; transform: none !important; }
          .active\:scale-\[0\.98\]:active { transform: none !important; }
        }
      `}</style>
    </div>
  );
}
