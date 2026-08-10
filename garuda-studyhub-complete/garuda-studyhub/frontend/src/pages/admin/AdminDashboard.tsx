import { useEffect, useState } from 'react';
import { BookOpen, Briefcase, Database, Download, FileQuestion, TrendingUp, Users, Video } from 'lucide-react';
import { api, handleError } from '../../lib/api';
import { Alert, Badge, Card, ErrorState, Spinner, StatCard } from '../../components/ui';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [dbInfo, setDbInfo] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/admin/stats'), api.get('/admin/analytics'), api.get('/health')])
      .then(([s, a, h]) => { setStats(s.data.data.stats); setAnalytics(a.data.data.analytics); setDbInfo(h.data.database); })
      .catch((e) => setError(handleError(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} retry={() => window.location.reload()} />;

  const growth = analytics.userGrowth.map((g: any) => g.count);
  const maxGrowth = Math.max(1, ...growth);
  const examMax = Math.max(1, ...analytics.popularExams.map((e: any) => e.count));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Platform Overview</h1>
          <p className="text-sm text-ink-500 mt-0.5">Live metrics across the Garuda platform.</p>
        </div>
        {/* Live DB status */}
        <Card className="!rounded-xl px-4 py-2.5 flex items-center gap-3 !shadow-sm">
          <div className={`h-3 w-3 rounded-full ${dbInfo?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <div className="flex items-center gap-2">
            <Database size={16} className={dbInfo?.connected ? 'text-emerald-600' : 'text-red-500'} />
            <div>
              <p className="text-xs font-bold text-ink-800">{dbInfo?.connected ? 'Database Connected' : 'Database OFFLINE'}</p>
              {dbInfo?.connected && <p className="text-[10px] text-ink-400">{dbInfo.tables} tables · {dbInfo.users} users</p>}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total users" value={stats.totalUsers.toLocaleString('en-IN')} sub={`+${stats.newUsers7d} in 7 days`} icon={<Users size={20} />} tone="brand" />
        <StatCard label="Active jobs" value={stats.activeJobs} sub={`${stats.totalJobs} total`} icon={<Briefcase size={20} />} tone="blue" />
        <StatCard label="Mock attempts" value={stats.mockAttempts} sub={`${stats.totalMocks} tests`} icon={<FileQuestion size={20} />} tone="violet" />
        <StatCard label="Material downloads" value={stats.totalDownloads.toLocaleString('en-IN')} sub={`${stats.totalMaterials} materials`} icon={<Download size={20} />} tone="green" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card className="p-5">
          <h3 className="font-bold text-ink-900 mb-4 flex items-center gap-2"><TrendingUp size={17} className="text-brand-600" /> User growth (14 days)</h3>
          {growth.length ? (
            <div className="flex items-end gap-1.5 h-40">
              {analytics.userGrowth.map((g: any, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${g.date}: ${g.count}`}>
                  <span className="text-[9px] font-bold text-ink-400">{g.count}</span>
                  <div className="w-full rounded-t bg-gradient-to-t from-brand-600 to-brand-400" style={{ height: `${(g.count / maxGrowth) * 100}%` }} />
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-ink-400 py-10 text-center">No signups in the last 14 days.</p>}
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-ink-900 mb-4">Popular exams by jobs</h3>
          <div className="space-y-3">
            {analytics.popularExams.map((e: any) => (
              <div key={e.exam}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-semibold text-ink-700">{e.exam}</span>
                  <span className="text-ink-500">{e.count} jobs</span>
                </div>
                <div className="h-2 bg-ink-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: `${(e.count / examMax) * 100}%` }} />
                </div>
              </div>
            ))}
            {analytics.popularExams.length === 0 && <p className="text-sm text-ink-400 py-6 text-center">No exam data.</p>}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <Card className="p-4 flex items-center gap-3"><div className="rounded-xl bg-violet-50 text-violet-600 p-2.5"><BookOpen size={18} /></div><div><p className="text-lg font-extrabold text-ink-900">{stats.totalMaterials}</p><p className="text-xs text-ink-400">Materials</p></div></Card>
        <Card className="p-4 flex items-center gap-3"><div className="rounded-xl bg-amber-50 text-amber-600 p-2.5"><FileQuestion size={18} /></div><div><p className="text-lg font-extrabold text-ink-900">{stats.quizAttempts}</p><p className="text-xs text-ink-400">Quiz attempts</p></div></Card>
        <Card className="p-4 flex items-center gap-3"><div className="rounded-xl bg-red-50 text-red-600 p-2.5"><Video size={18} /></div><div><p className="text-lg font-extrabold text-ink-900">{stats.totalVideos}</p><p className="text-xs text-ink-400">Videos</p></div></Card>
        <Card className="p-4 flex items-center gap-3"><div className="rounded-xl bg-emerald-50 text-emerald-600 p-2.5"><Users size={18} /></div><div><p className="text-lg font-extrabold text-ink-900">{stats.premiumUsers}</p><p className="text-xs text-ink-400">Premium users</p></div></Card>
      </div>
    </div>
  );
}
