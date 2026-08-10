import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, BookOpen, Timer, CalendarCheck, Newspaper, PlayCircle,
  Bot, Menu, X, Bell, LogOut, User as UserIcon, Settings, Award, Bookmark, ChevronRight, Shield, Compass,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { Avatar, Badge } from './ui';
import logoImg from '../assets/garuda-logo.jpeg';

export function Logo({ dark = false, size = 'md' }: { dark?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const imageSize = size === 'lg' ? 'h-14 w-14' : size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
  const titleSize = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg';
  const textClass = dark ? 'text-white' : 'text-ink-900';

  return (
    <span className="inline-flex items-center gap-3">
      <img src={logoImg} alt="Garuda AI StudyHub" className={`${imageSize} rounded-3xl object-cover shadow-xl shadow-brand-900/20`} />
      <span className={`font-extrabold tracking-tight ${titleSize} ${textClass}`}>
        <span className="block">Garuda AI</span>
        <span className="block text-xs uppercase tracking-[0.24em] text-brand-500">StudyHub</span>
      </span>
    </span>
  );
}

/* ============================ PUBLIC LAYOUT ============================ */
const publicLinks = [
  { to: '/', label: 'Home' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/materials', label: 'Materials' },
  { to: '/mock', label: 'Mock Tests' },
  { to: '/quiz', label: 'Daily Quiz' },
  { to: '/videos', label: 'Videos' },
  { to: '/affairs', label: 'Current Affairs' },
  { to: '/about', label: 'About' },
];

export function PublicLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const location = useLocation();
  const isHome = location.pathname === '/';
  const navBg = isHome ? 'bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-sm' : 'bg-white/95 backdrop-blur-xl border-b border-ink-200/40 shadow-sm';

  useEffect(() => {
    let active = true;
    if (!user) {
      setUnread(0);
      return;
    }
    api.get('/notifications')
      .then((res) => {
        if (active) setUnread(res.data.data.unread || 0);
      })
      .catch(() => {
        if (active) setUnread(0);
      });
    return () => { active = false; };
  }, [user, location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className={`sticky top-0 z-40 transition-all duration-200 ${navBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 lg:h-20">
          <Link to="/" className="flex-shrink-0"><Logo size="sm" /></Link>
          <nav className="hidden lg:flex items-center gap-0.5 ml-8">
            {publicLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive 
                      ? 'text-brand-700 bg-brand-100 shadow-sm' 
                      : 'text-ink-600 hover:text-brand-700 hover:bg-ink-50'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden lg:flex items-center gap-4 ml-auto">
            {user ? (
              <>
                <Link to="/notifications" className="relative p-2.5 rounded-lg text-ink-500 hover:text-ink-700 hover:bg-ink-100 transition-all">
                  <Bell size={20} strokeWidth={1.5} />
                  {unread > 0 && <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1.5 text-[10px] font-semibold text-white">{unread}</span>}
                </Link>
                <Link to="/dashboard" className="btn-primary !py-2 !text-sm">Dashboard</Link>
                <Link to="/profile" className="flex-shrink-0">
                  <Avatar name={user.name} src={user.avatar} size={40} />
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost !text-sm">Sign in</Link>
                <Link to="/register" className="btn-primary">Get Started Free</Link>
              </>
            )}
          </div>
          <button className="lg:hidden p-2 rounded-lg hover:bg-ink-100 transition-colors" onClick={() => setOpen(!open)}>
            {open ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
          </button>
        </div>
        {open && (
          <div className="lg:hidden border-t border-ink-100 bg-white/95 backdrop-blur-sm px-4 py-3 space-y-1 animate-fade-in">
            {publicLinks.map((l) => (
              <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)} className="block px-3 py-3 rounded-lg text-sm font-medium text-ink-700 hover:bg-brand-50 hover:text-brand-700 transition-colors">
                {l.label}
              </NavLink>
            ))}
            <div className="pt-3 border-t border-ink-100 flex gap-2">
              {user ? (
                <Link to="/dashboard" onClick={() => setOpen(false)} className="btn-primary flex-1 !py-2">Dashboard</Link>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)} className="btn-secondary flex-1">Sign in</Link>
                  <Link to="/register" onClick={() => setOpen(false)} className="btn-primary flex-1">Register</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}

function PublicFooter() {
  return (
    <footer className="bg-ink-900 text-ink-300 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo dark />
          <p className="text-sm mt-3 leading-relaxed">
            AI-powered preparation for Indian government exams. Learn smart, practice better, get selected.
          </p>
        </div>
        <div>
          <h4 className="text-white font-bold mb-3">Modules</h4>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" to="/jobs">Job Notifications</Link></li>
            <li><Link className="hover:text-white" to="/materials">Study Materials</Link></li>
            <li><Link className="hover:text-white" to="/mock">Mock Tests</Link></li>
            <li><Link className="hover:text-white" to="/quiz">Daily Quiz</Link></li>
            <li><Link className="hover:text-white" to="/videos">Video Lectures</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-3">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" to="/about">About Us</Link></li>
            <li><Link className="hover:text-white" to="/contact">Contact</Link></li>
            <li><Link className="hover:text-white" to="/faq">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-3">AI Features</h4>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" to="/ai/assistant">AI Assistant</Link></li>
            <li><Link className="hover:text-white" to="/ai/planner">AI Study Planner</Link></li>
            <li><Link className="hover:text-white" to="/career">Career Guidance</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-ink-400">
        © {new Date().getFullYear()} Garuda AI StudyHub · Learn Smart. Practice Better. Get Selected.
      </div>
    </footer>
  );
}

/* ============================ APP SHELL (AUTHENTICATED) ============================ */
const navSections = [
  {
    label: 'Main',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/leaderboard', label: 'Leaderboard', icon: Award },
      { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
      { to: '/achievements', label: 'Achievements', icon: Award },
      { to: '/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    label: 'Prepare',
    items: [
      { to: '/jobs', label: 'Jobs', icon: Briefcase },
      { to: '/materials', label: 'Materials', icon: BookOpen },
      { to: '/mock', label: 'Mock Tests', icon: Timer },
      { to: '/quiz', label: 'Daily Quiz', icon: CalendarCheck },
      { to: '/affairs', label: 'Current Affairs', icon: Newspaper },
      { to: '/videos', label: 'Video Lectures', icon: PlayCircle },
    ],
  },
  {
    label: 'AI Mentor',
    items: [
      { to: '/ai/assistant', label: 'AI Assistant', icon: Bot },
      { to: '/ai/planner', label: 'AI Planner', icon: CalendarCheck },
      { to: '/career', label: 'Career Guidance', icon: Compass },
    ],
  },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dbOk, setDbOk] = useState<boolean | null>(null);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Live database connectivity indicator (sidebar)
  useEffect(() => {
    api
      .get('/health')
      .then((r) => setDbOk(!!r.data.database?.connected))
      .catch(() => setDbOk(false));
  }, []);

  useEffect(() => {
    let active = true;
    if (!user) {
      setUnread(0);
      return;
    }
    api.get('/notifications')
      .then((res) => {
        if (active) setUnread(res.data.data.unread || 0);
      })
      .catch(() => {
        if (active) setUnread(0);
      });
    return () => { active = false; };
  }, [user, location.pathname]);

  const onLogout = async () => {
    await logout();
    navigate('/');
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-ink-800">
        <Link to="/" onClick={() => setSidebarOpen(false)}><Logo dark /></Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 text-[11px] font-bold uppercase tracking-widest text-ink-500 mb-2">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                      isActive ? 'bg-brand-600/20 text-brand-300' : 'text-ink-300 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
        {user?.role === 'admin' || user?.role === 'superadmin' ? (
          <div>
            <p className="px-3 text-[11px] font-bold uppercase tracking-widest text-ink-500 mb-2">Admin</p>
            <NavLink
              to="/admin"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  isActive ? 'bg-amber-500/20 text-amber-300' : 'text-ink-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Shield size={18} />
              Admin Panel
            </NavLink>
          </div>
        ) : null}
      </nav>
      <div className="border-t border-ink-800 p-4">
        <div className="mb-2.5 px-1 flex items-center gap-1.5 text-[11px] font-semibold">
          <span className={`h-2 w-2 rounded-full ${dbOk === null ? 'bg-ink-500' : dbOk ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
          <span className={dbOk === null ? 'text-ink-400' : dbOk ? 'text-emerald-400' : 'text-red-400'}>
            {dbOk === null ? 'Checking database…' : dbOk ? 'Database connected' : 'Database OFFLINE'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Avatar name={user?.name || 'U'} src={user?.avatar} size={40} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{user?.name}</p>
            <p className="text-xs truncate">
              <span className={user?.role === 'admin' || user?.role === 'superadmin' ? 'text-amber-400 font-bold' : 'text-ink-400'}>
                {user?.role === 'admin' || user?.role === 'superadmin' ? '🛡️ ADMIN' : '👤 Student'}
              </span>
              {user?.examTarget ? <span className="text-ink-400"> · {user.examTarget}</span> : null}
            </p>
          </div>
          <div className="flex gap-1">
            <Link to="/profile" className="p-2 rounded-lg text-ink-400 hover:text-white hover:bg-white/10" title="Profile">
              <UserIcon size={17} />
            </Link>
            <Link to="/settings" className="p-2 rounded-lg text-ink-400 hover:text-white hover:bg-white/10" title="Settings">
              <Settings size={17} />
            </Link>
            <button onClick={onLogout} className="p-2 rounded-lg text-ink-400 hover:text-red-400 hover:bg-red-500/10" title="Logout">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-ink-900 z-30">{sidebar}</aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-ink-900">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-ink-200/60 h-16 flex items-center gap-3 px-4 sm:px-6">
          <button className="lg:hidden p-2 rounded-lg hover:bg-ink-100" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="flex-1">
            <Breadcrumb path={location.pathname} />
          </div>
          <Link to="/notifications" className="relative p-2 rounded-lg text-ink-500 hover:bg-ink-100">
            <Bell size={19} />
            {unread > 0 && <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1.5 text-[10px] font-semibold text-white">{unread}</span>}
          </Link>
          <Link to="/profile" className="hidden sm:block">
            <Avatar name={user?.name || 'U'} src={user?.avatar} size={36} />
          </Link>
        </header>
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const crumbs: Record<string, { label: string; icon?: string }> = {
  dashboard: { label: 'Dashboard' },
  jobs: { label: 'Jobs' },
  materials: { label: 'Materials' },
  mock: { label: 'Mock Tests' },
  quiz: { label: 'Daily Quiz' },
  affairs: { label: 'Current Affairs' },
  videos: { label: 'Video Lectures' },
  leaderboard: { label: 'Leaderboard' },
  notifications: { label: 'Notifications' },
  profile: { label: 'Profile' },
  settings: { label: 'Settings' },
  ai: { label: 'AI Mentor' },
  admin: { label: 'Admin' },
};

function Breadcrumb({ path }: { path: string }) {
  const parts = path.split('/').filter(Boolean);
  return (
    <div className="flex items-center gap-1 text-sm">
      <Link to="/dashboard" className="text-ink-400 hover:text-brand-600 font-medium">Home</Link>
      {parts.slice(0, 2).map((p, i) => (
        <span key={i} className="flex items-center gap-1 text-ink-400">
          <ChevronRight size={14} />
          <span className={i === parts.length - 1 ? 'text-ink-800 font-semibold capitalize' : 'capitalize'}>
            {crumbs[p]?.label || p}
          </span>
        </span>
      ))}
    </div>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}
