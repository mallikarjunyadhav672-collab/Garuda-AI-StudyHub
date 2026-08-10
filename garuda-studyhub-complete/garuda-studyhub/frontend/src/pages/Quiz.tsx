import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, CalendarCheck, Flame, History, Trophy, Zap } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { Badge, Card, EmptyState, ErrorState, LinkButton, PageHeader, Spinner, StatCard } from '../components/ui';
import { formatDate } from '../lib/format';

export default function Quiz() {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/quiz/previous'), api.get('/quiz/streak')])
      .then(([p, s]) => { setAttempts(p.data.data.attempts); setStreak(s.data.data.streak); })
      .catch((e) => setError(handleError(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} retry={() => window.location.reload()} />;

  const totalScore = attempts.reduce((a, x) => a + x.score, 0);
  const best = attempts.length ? Math.max(...attempts.map((x) => x.score)) : 0;
  const avg = attempts.length ? Math.round((totalScore / attempts.length) * 10) / 10 : 0;

  // Weekly chart data — last 7 days
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const scoreByDay: Record<string, number> = {};
  attempts.forEach((a) => (scoreByDay[a.date] = a.score));
  const maxScore = Math.max(10, ...last7.map((d) => scoreByDay[d] || 0));

  return (
    <div>
      <PageHeader
        eyebrow="Daily Quiz"
        title="Quiz Dashboard"
        description="10 questions every day. Build streaks, sharpen your GK and stay exam-ready."
        actions={<LinkButton to="/quiz/today"><Zap size={16} /> Attempt Today's Quiz</LinkButton>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard label="Current streak" value={<span className="flex items-center gap-1">{streak} <Flame size={20} className="text-orange-500" /></span>} sub="Consecutive days" icon={<Flame size={20} />} tone="amber" />
        <StatCard label="Quizzes completed" value={attempts.length} sub="All-time attempts" icon={<CalendarCheck size={20} />} tone="brand" />
        <StatCard label="Total score" value={totalScore} sub={`${attempts.length} quiz${attempts.length === 1 ? '' : 'zes'}`} icon={<Trophy size={20} />} tone="violet" />
        <StatCard label="Best score" value={`${best}/10`} sub={`Avg ${avg}/10`} icon={<Award size={20} />} tone="green" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        {/* Weekly activity chart */}
        <Card className="lg:col-span-2">
          <h3 className="font-bold text-ink-900 px-5 pt-5">This week's quiz scores</h3>
          {attempts.length ? (
            <div className="p-5">
              <div className="flex items-end gap-2 h-44">
                {last7.map((day, i) => {
                  const score = scoreByDay[day] ?? 0;
                  const h = Math.max(6, (score / maxScore) * 100);
                  const attempted = scoreByDay[day] !== undefined;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className={`text-[10px] font-bold ${attempted ? 'text-ink-700' : 'text-ink-300'}`}>{attempted ? score : '—'}</span>
                      <div
                        className={`w-full rounded-t-lg transition-all ${attempted ? 'bg-gradient-to-t from-orange-500 to-amber-400' : 'bg-ink-100'}`}
                        style={{ height: `${attempted ? h : 8}%` }}
                      />
                      <span className="text-[10px] text-ink-400">{weekdayNames[new Date(day).getDay()]}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-ink-400 mt-3 text-center">Orange = quiz attempted that day · dashed line = missed</p>
            </div>
          ) : (
            <EmptyState icon="📊" title="No data yet" description="Attempt today's quiz to start your chart." />
          )}

          <div className="px-5 pb-5">
            <h3 className="font-bold text-ink-900 mb-3">Previous attempts</h3>
            {attempts.length ? (
              <div className="divide-y divide-ink-100 max-h-80 overflow-y-auto">
                {attempts.map((a) => (
                  <Link key={a.id} to={`/quiz/result/${a.id}`} className="flex items-center gap-4 py-3 hover:bg-ink-50 rounded-lg -mx-1 px-1 transition">
                    <div className="rounded-xl bg-brand-50 text-brand-600 p-2.5"><History size={18} /></div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-ink-800">Quiz · {formatDate(a.date)}</p>
                      <p className="text-xs text-ink-400">Streak at the time: {a.streak} day{a.streak === 1 ? '' : 's'}</p>
                    </div>
                    <span className={`font-extrabold text-lg ${a.score >= 7 ? 'text-emerald-600' : a.score >= 5 ? 'text-amber-600' : 'text-red-500'}`}>{a.score}<span className="text-xs text-ink-400 font-medium">/{a.total}</span></span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState icon="🎯" title="No attempts yet" description="Today's quiz is waiting — start your streak!" action={<LinkButton to="/quiz/today">Take today's quiz</LinkButton>} />
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="font-bold text-ink-900 mb-3">How streaks work</h3>
            <ul className="space-y-3 text-sm text-ink-600">
              <li className="flex gap-2.5"><span className="text-lg">📅</span> Complete the daily quiz every day.</li>
              <li className="flex gap-2.5"><span className="text-lg">🔥</span> Your streak grows by 1 each consecutive day.</li>
              <li className="flex gap-2.5"><span className="text-lg">🏆</span> Longer streaks unlock leaderboard prestige.</li>
              <li className="flex gap-2.5"><span className="text-lg">⏰</span> Only one attempt per day — make it count!</li>
            </ul>
            <Link to="/quiz/leaderboard" className="btn-secondary w-full mt-4"><Trophy size={15} /> View leaderboard</Link>
            <Link to="/mock" className="btn-ghost w-full mt-2"><CalendarCheck size={15} /> Practice mocks</Link>
          </Card>

          <div className="rounded-2xl bg-gradient-to-br from-orange-600 to-amber-500 text-white p-5 shadow-lg shadow-orange-500/20">
            <p className="text-xs font-bold uppercase tracking-widest text-orange-100">Tip</p>
            <p className="text-sm font-semibold mt-2 leading-relaxed">
              Consistent daily quizzing improves your General Awareness by ~15% in 30 days. Don't break the chain! 🔥
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
