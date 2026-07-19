import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tint = 'emerald' | 'amber' | 'red' | 'indigo' | 'slate';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tint?: Tint;
  subtitle?: string;
  className?: string;
}

const tintStyles: Record<Tint, { bg: string; text: string; border: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
  red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
  slate: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100' },
};

export function StatCard({ label, value, icon: Icon, tint = 'emerald', subtitle, className }: StatCardProps) {
  const style = tintStyles[tint];
  return (
    <div className={cn(
      "group relative bg-white rounded-xl border border-slate-200/80 p-5",
      "hover:shadow-md hover:border-slate-300/80 transition-all duration-200",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-foreground tracking-tight tabular-nums">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          'w-11 h-11 rounded-xl flex items-center justify-center border transition-transform duration-200 group-hover:scale-105',
          style.bg, style.text, style.border
        )}>
          <Icon className="w-5 h-5" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}
