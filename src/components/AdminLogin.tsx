import { useState } from 'react';
import { Loader2, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/lib/apiClient';

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
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left: Brand Panel */}
      <div className="hidden lg:flex lg:w-[55%] relative bg-slate-900 flex-col justify-between p-12 overflow-hidden">
        {/* Subtle geometric accents */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] border border-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] border border-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />
          <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] border border-white/[0.03] rounded-full -translate-x-1/2 -translate-y-1/2" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center">
              <img src="/favicon.png" alt="Logo" className="w-11 h-11 rounded-xl object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Degoony Evergreen</h1>
              <p className="text-sm text-slate-400">Logistics & Transport Gh Ltd</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight mb-6">
            The Evergreen Digital Fleet Record System
          </h2>
          <p className="text-lg text-slate-400 leading-relaxed">
            Comprehensive vehicle lifecycle management, driver performance analytics, and fleet-wide insights — all in one secure platform.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-slate-500">
            Cyber Technologies Ghana &middot; CyberVotex (Augustine Nyaaba)
          </p>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center mb-4">
              <img src="/favicon.png" alt="Logo" className="w-14 h-14 rounded-xl object-cover" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Degoony Evergreen</h1>
            <p className="text-sm text-slate-500">Fleet Record System</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h2>
              <p className="text-sm text-slate-500 mt-1">Sign in to access the fleet management dashboard.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-slate-700">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 rounded-xl"
                    placeholder="Enter your username"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 rounded-xl"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 active:scale-[0.98]"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400 mt-8 lg:hidden">
            Cyber Technologies Ghana &middot; CyberVotex (Augustine Nyaaba)
          </p>
        </div>
      </div>
    </div>
  );
}
