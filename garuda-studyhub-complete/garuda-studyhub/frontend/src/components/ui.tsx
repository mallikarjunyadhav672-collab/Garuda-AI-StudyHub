import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, AlertTriangle } from 'lucide-react';

/* ---------------- Button ---------------- */
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export function Button({
  variant = 'primary',
  loading = false,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; loading?: boolean }) {
  const v: Record<BtnVariant, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    success: 'btn-success',
  };
  return (
    <button className={`${v[variant]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

/* ---------------- Card ---------------- */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-ink-100/60">
      <div>
        <h3 className="text-base font-bold text-ink-900">{title}</h3>
        {subtitle && <p className="text-sm text-ink-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ---------------- Badge ---------------- */
const tones: Record<string, string> = {
  green: 'badge-green',
  blue: 'badge-blue',
  amber: 'badge-amber',
  red: 'badge-red',
  slate: 'badge-slate',
  violet: 'badge-violet',
};
export function Badge({ tone = 'slate', children }: { tone?: string; children: ReactNode }) {
  return <span className={tones[tone] || tones.slate}>{children}</span>;
}

/* ---------------- Form fields ---------------- */
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className || ''}`} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`input ${props.className || ''}`} />;
}
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-xs text-ink-400 mt-1">{hint}</p>}
    </div>
  );
}

/* ---------------- States ---------------- */
export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-ink-400">
      <Loader2 className="animate-spin text-brand-500" size={28} />
      <p className="text-sm mt-3">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon = '📭',
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-bold text-ink-800">{title}</h3>
      {description && <p className="text-sm text-ink-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertTriangle className="text-amber-500" size={32} />
      <h3 className="text-lg font-bold text-ink-800 mt-3">Something went wrong</h3>
      <p className="text-sm text-ink-500 mt-1 max-w-md">{message}</p>
      {retry && (
        <Button variant="secondary" className="mt-4" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Spinner label="Loading…" />
    </div>
  );
}

/* ---------------- Misc ---------------- */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex-1">
        {eyebrow && <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-2">{eyebrow}</p>}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-900 tracking-tight leading-tight">{title}</h1>
        {description && <p className="text-ink-500 mt-2 max-w-2xl text-sm sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, sub, icon, tone = 'brand' }: { label: string; value: ReactNode; sub?: string; icon: ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600 border-brand-200/50',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-200/50',
    amber: 'bg-amber-50 text-amber-600 border-amber-200/50',
    red: 'bg-red-50 text-red-600 border-red-200/50',
    violet: 'bg-violet-50 text-violet-600 border-violet-200/50',
    blue: 'bg-sky-50 text-sky-600 border-sky-200/50',
  };
  const iconBg: Record<string, string> = {
    brand: 'bg-brand-100',
    green: 'bg-emerald-100',
    amber: 'bg-amber-100',
    red: 'bg-red-100',
    violet: 'bg-violet-100',
    blue: 'bg-sky-100',
  };
  return (
    <Card className={`p-6 border-2 ${tones[tone]} hover:shadow-md transition-all`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink-400">{label}</p>
          <p className="text-3xl font-extrabold text-ink-900 mt-2.5">{value}</p>
          {sub && <p className="text-xs text-ink-500 mt-2">{sub}</p>}
        </div>
        <div className={`rounded-lg p-3 ${iconBg[tone]} text-ink-600 shrink-0`}>{icon}</div>
      </div>
    </Card>
  );
}

export function Avatar({ name, src, size = 40 }: { name: string; src?: string; size?: number }) {
  const colors = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#e11d48'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 997;
  const bg = colors[hash % colors.length];
  const init = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  if (src) return <img src={src} alt={name} style={{ width: size, height: size }} className="rounded-full object-cover" />;
  return (
    <div
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.38 }}
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
    >
      {init}
    </div>
  );
}

export function LinkButton({ to, variant = 'primary', children, className = '' }: { to: string; variant?: BtnVariant; children: ReactNode; className?: string }) {
  const v: Record<BtnVariant, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    success: 'btn-success',
  };
  return (
    <Link to={to} className={`${v[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function Alert({ tone = 'red', children }: { tone?: 'red' | 'green' | 'amber' | 'blue'; children: ReactNode }) {
  const tones: Record<string, string> = {
    red: 'bg-red-50 text-red-700 border-red-200/70 shadow-sm shadow-red-500/5',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 shadow-sm shadow-emerald-500/5',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/70 shadow-sm shadow-amber-500/5',
    blue: 'bg-sky-50 text-sky-700 border-sky-200/70 shadow-sm shadow-sky-500/5',
  };
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm font-medium transition-all ${tones[tone]}`}>
      {children}
    </div>
  );
}
