import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Bell, BookOpen, Briefcase, Inbox, MessageSquareQuote, Newspaper, Shield, Timer, Users, ListChecks } from 'lucide-react';

const tabs = [
  { to: '/admin', label: 'Dashboard', icon: BarChart3, exact: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/admin/materials', label: 'Materials', icon: BookOpen },
  { to: '/admin/mocks', label: 'Mock Tests', icon: Timer },
  { to: '/admin/quiz', label: 'Quiz Bank', icon: ListChecks },
  { to: '/admin/affairs', label: 'Current Affairs', icon: Newspaper },
  { to: '/admin/videos', label: 'Videos', icon: Timer },
  { to: '/admin/contact', label: 'Contact', icon: Inbox },
  { to: '/admin/notifications', label: 'Notify', icon: Bell },
  { to: '/admin/testimonials', label: 'Testimonials', icon: MessageSquareQuote },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <div>
      <div className="mb-6 flex items-center gap-2 rounded-2xl bg-ink-900 px-4 py-3 text-white">
        <Shield size={18} className="text-amber-400" />
        <span className="font-extrabold">Admin Panel</span>
        <span className="text-xs text-ink-400 ml-1">Full platform management</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-6">
        {tabs.map((t) => {
          const active = t.exact ? location.pathname === t.to : location.pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                active ? 'bg-brand-600 text-white shadow-sm' : 'bg-white border border-ink-200 text-ink-600 hover:border-brand-300 hover:text-brand-700'
              }`}
            >
              <t.icon size={15} /> {t.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
