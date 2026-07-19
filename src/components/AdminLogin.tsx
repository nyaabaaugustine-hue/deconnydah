import { useState } from 'react';
import { Truck, ShieldCheck, Loader2, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      if (username === 'admin' && password === 'admin') {
        onLogin();
      } else {
        setError('Invalid credentials. Use admin / admin for the demo.');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Background Image Side */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src="https://res.cloudinary.com/dwsl2ktt2/image/upload/v1781345822/trackker_h8mkk8.png"
          alt="Degoony Evergreen Fleet Tracking"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-emerald-900/70 to-teal-900/80" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="Degoony Evergreen Logo" className="w-12 h-12 rounded-xl object-cover border border-white/20" />
            <div>
              <h1 className="text-lg font-bold tracking-tight">Degoony Evergreen</h1>
              <p className="text-sm text-emerald-200">Logistics & Transport Gh Ltd</p>
            </div>
          </div>

          <div className="max-w-md">
            <h2 className="text-4xl font-bold tracking-tight leading-tight mb-4">
              The Evergreen Digital Fleet Record System
            </h2>
            <p className="text-emerald-100/90 text-lg leading-relaxed">
              Comprehensive vehicle lifecycle management, driver performance analytics, and fleet-wide insights — all in one secure platform.
            </p>
          </div>

          <div className="flex items-center gap-6 text-sm text-emerald-200/80">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>13 Record Categories</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Real-time Analytics</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Cloudinary Integrated</span>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form Side */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <img src="/favicon.png" alt="Degoony Evergreen Logo" className="w-12 h-12 rounded-xl object-cover shadow-md" />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">Degoony Evergreen</h1>
              <p className="text-sm text-slate-500">Fleet Record System</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 mb-4">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700">Admin Portal</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h2>
              <p className="text-sm text-slate-500 mt-1">Sign in to access the fleet management dashboard.</p>
            </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-700 font-medium">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 bg-slate-50 border-slate-200 focus:bg-white"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-slate-50 border-slate-200 focus:bg-white"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs text-center text-slate-400">
              Demo credentials: <span className="font-mono font-semibold text-slate-600">admin / admin</span>
            </p>
          </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Cyber Technologies Ghana · CyberVotex (Augustine Nyaaba)
          </p>
        </div>
      </div>
    </div>
  );
}