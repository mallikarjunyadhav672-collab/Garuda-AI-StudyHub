import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BookOpen, Briefcase, Calendar, Clock, Flame, LineChart, Target,
  Timer, TrendingUp, Trophy, Zap,
} from 'lucide-react';
import { api, handleError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, LinkButton, PageHeader, Spinner, StatCard } from '../components/ui';
import { deadlineLabel, deadlineTone, formatDate, timeAgo } from '../lib/format';

interface Stats {
  studyStreak: number;
  totalMocksTaken: number;
  avgAccuracy: number;
  totalQuizzesCompleted: number;
  quizScore: number;
  totalStudyTimeSeconds: number;
  rank: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, videosRes] = await Promise.all([api.get('/users/me/stats'), api.get('/videos')]);
      setData({ ...statsRes.data.data, recentVideos: videosRes.data.data.videos.slice(0, 3) });
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <Spinner label="Loading your dashboard…" />;
  if (error) return <ErrorState message={error} retry={load} />;

  const s: Stats = data.stats;
  const hours = Math.floor(s.totalStudyTimeSeconds / 3600);
  const mins = Math.floor((s.totalStudyTimeSeconds % 3600) / 60);

  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const scoreByDay: Record<string, number> = {};
  data.weekly.forEach((w: any) => (scoreByDay[w.date] = w.score || 0));

  return (
    <div>
      <PageHeader
        eyebrow="Welcome back"
        title={`Hello, ${user?.name.split(' ')[0]}`}
        description="Here's your preparation snapshot. Keep the streak alive and achieve your goals!"
        actions={
          <div className="flex flex-wrap gap-2">
            <LinkButton to="/mock" variant="secondary" className="!gap-2"><Timer size={17} /> Take a Mock</LinkButton>
            <LinkButton to="/quiz/today" variant="primary" className="!gap-2"><Zap size={17} /> Today's Quiz</LinkButton>
          </div>
        }
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard label="Study streak" value={<span className="flex items-center gap-2">{s.studyStreak} <Flame size={22} className="text-orange-500 fill-orange-500" /></span>} sub={`${s.studyStreak} day${s.studyStreak === 1 ? '' : 's'} in a row`} icon={<Flame size={22} />} tone="amber" />
        <StatCard label="Mocks taken" value={s.totalMocksTaken} sub="Completed tests" icon={<Timer size={22} />} tone="brand" />
        <StatCard label="Avg accuracy" value={`${s.avgAccuracy}%`} sub="Across all attempts" icon={<Target size={22} />} tone="green" />
        <StatCard label="All-India rank" value={`#${s.rank}`} sub={`Top ${Math.round(100 / s.rank)}% percentile`} icon={<Trophy size={22} />} tone="violet" />
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        {/* Weekly progress */}
        <Card className="lg:col-span-2">
          <CardHeader title="Weekly practice" subtitle="Quiz scores over the last 7 days" />
          <div className="p-5">
            <div className="flex items-end gap-2 h-44">
              {last7.map((day, i) => {
                const score = scoreByDay[day] ?? 0;
                const max = Math.max(10, ...Object.values(scoreByDay).map(Number));
                const h = Math.max(6, (score / max) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold text-ink-500">{score}</span>
                    <div className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 transition-all" style={{ height: `${h}%` }} />
                    <span className="text-[10px] text-ink-400">{weekdayNames[new Date(day).getDay()]}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded-xl bg-ink-50 p-3"><p className="text-lg font-extrabold text-ink-900">{s.totalQuizzesCompleted}</p><p className="text-[11px] text-ink-500">Quizzes</p></div>
              <div className="rounded-xl bg-ink-50 p-3"><p className="text-lg font-extrabold text-ink-900">{s.quizScore}</p><p className="text-[11px] text-ink-500">Quiz points</p></div>
              <div className="rounded-xl bg-ink-50 p-3"><p className="text-lg font-extrabold text-ink-900">{hours}h {mins}m</p><p className="text-[11px] text-ink-500">Study time</p></div>
              <div className="rounded-xl bg-ink-50 p-3"><p className="text-lg font-extrabold text-ink-900">{user?.isPremium ? 'Premium' : 'Free'}</p><p className="text-[11px] text-ink-500">Plan</p></div>
            </div>
          </div>
        </Card>

        {/* AI recommendation */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-gradient-to-br from-brand-800 to-brand-600 text-white p-6 shadow-lg shadow-brand-600/20">
            <div className="flex items-center gap-2 text-brand-200 text-xs font-bold uppercase tracking-widest">
              <TrendingUp size={14} /> AI Recommendation
            </div>
            <p className="mt-3 font-semibold leading-relaxed">
              {s.totalMocksTaken === 0
                ? 'Start with a full-length SSC CGL mock to baseline your score. Then the AI will personalise your plan.'
                : `Your accuracy is ${s.avgAccuracy}%. Spend 30 min daily on sectional mocks for your weakest subject to push past 80%.`}
            </p>
            <Link to="/ai/assistant" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-100 hover:text-white">
              Ask Garuda AI <ArrowRight size={15} />
            </Link>
          </div>

          <Card>
            <CardHeader title="Continue watching" action={<Link to="/videos" className="text-xs font-bold text-brand-600">View all</Link>} />
            <div className="p-4 space-y-3">
              {data.recentVideos?.length ? (
                data.recentVideos.slice(0, 3).map((v: any) => (
                  <Link key={v.id} to={`/videos/${v.id}`} className="flex items-center gap-3 hover:bg-ink-50 rounded-xl p-2 -m-1 transition">
                    <div className="h-12 w-20 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: v.thumbnail_color || '#4f46e5' }}><PlayIcon /></div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-800 truncate">{v.title}</p>
                      <p className="text-xs text-ink-400">{v.educator}</p>
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyState icon="🎬" title="No videos yet" description="Explore the video library to start learning." />
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-2 gap-6">
        {/* Recent mocks */}
        <Card>
          <CardHeader title="Recent mock tests" action={<Link to="/mock/analytics" className="text-xs font-bold text-brand-600">Analytics</Link>} />
          <div className="p-4">
            {data.recentMocks.length ? (
              <div className="divide-y divide-ink-100">
                {data.recentMocks.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-4 py-3">
                    <div className="rounded-xl bg-brand-50 text-brand-600 p-2.5"><LineChart size={18} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink-800 truncate">{m.title}</p>
                      <p className="text-xs text-ink-400">{formatDate(m.created_at)} · Rank #{m.rank}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-ink-900">{m.score}<span className="text-ink-400 text-xs font-medium">/{m.total_marks}</span></p>
                      <p className={`text-xs font-bold ${m.accuracy >= 60 ? 'text-emerald-600' : m.accuracy >= 40 ? 'text-amber-600' : 'text-red-500'}`}>{m.accuracy}%</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="📝" title="No mocks attempted yet" description="Take your first mock test to see analytics here." action={<LinkButton to="/mock">Browse mocks</LinkButton>} />
            )}
          </div>
        </Card>

        {/* Upcoming exams + saved jobs */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Upcoming exam deadlines" action={<Link to="/jobs" className="text-xs font-bold text-brand-600">All jobs</Link>} />
            <div className="p-4 divide-y divide-ink-100">
              {data.upcomingExams.map((j: any) => (
                <Link key={j.id} to={`/jobs/${j.id}`} className="flex items-center gap-3 py-3 hover:bg-ink-50 rounded-lg -mx-1 px-1 transition">
                  <div className="rounded-xl bg-ink-100 text-ink-600 p-2.5"><Calendar size={18} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink-800 truncate">{j.role}</p>
                    <p className="text-xs text-ink-400">{j.org}</p>
                  </div>
                  <Badge tone={deadlineTone(j.last_date)}>{deadlineLabel(j.last_date)}</Badge>
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Saved jobs" action={<Link to="/jobs/saved" className="text-xs font-bold text-brand-600">View all</Link>} />
            <div className="p-4">
              {data.savedJobs.length ? (
                <div className="space-y-2">
                  {data.savedJobs.map((j: any) => (
                    <Link key={j.id} to={`/jobs/${j.id}`} className="flex items-center gap-2 text-sm font-semibold text-ink-700 hover:text-brand-700">
                      <Briefcase size={14} className="text-brand-500" /> {j.role}
                      <span className="text-ink-400 font-normal">· {j.org}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState icon="💼" title="Nothing saved yet" description="Save jobs you're interested in to track them here." />
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M8 5v14l11-7z" /></svg>
  );
}
