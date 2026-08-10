import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Crosshair, Target, TrendingUp, Trophy } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { Badge, Card, EmptyState, ErrorState, LinkButton, PageHeader, Spinner, StatCard } from '../components/ui';
import { formatDuration } from '../lib/format';

export default function MockAnalytics() {
  const [a, setA] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/mocks/analytics');
      setA(data.data);
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} retry={load} />;

  const maxAcc = Math.max(100, ...a.trend.map((t: any) => t.accuracy));

  return (
    <div>
      <PageHeader
        eyebrow="Performance Analytics"
        title="Your Mock Test Analytics"
        description="Track accuracy, subject-wise performance and improvement over time."
        actions={<LinkButton to="/mock" variant="secondary">← Back to tests</LinkButton>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Tests taken" value={a.totalTests} icon={<Target size={20} />} tone="brand" />
        <StatCard label="Avg accuracy" value={`${a.averageAccuracy}%`} icon={<Crosshair size={20} />} tone="green" />
        <StatCard label="Best score" value={a.bestScore} icon={<Trophy size={20} />} tone="amber" />
        <StatCard label="Total time" value={formatDuration(a.totalTimeSeconds)} icon={<Clock size={20} />} tone="violet" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <h3 className="font-bold text-ink-900 px-5 pt-5">Accuracy trend</h3>
          {a.trend.length ? (
            <div className="p-5">
              <div className="flex items-end gap-3 h-44">
                {a.trend.map((t: any) => (
                  <div key={t.id} className="flex-1 flex flex-col items-center gap-1.5" title={t.title}>
                    <span className="text-[10px] font-bold text-ink-500">{t.accuracy}%</span>
                    <div className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400" style={{ height: `${(t.accuracy / maxAcc) * 100}%` }} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-ink-400 mt-2 text-center">Test number (oldest → newest)</p>
            </div>
          ) : (
            <EmptyState icon="📈" title="No trend yet" description="Complete a mock to see your accuracy trend." />
          )}
        </Card>

        <Card>
          <h3 className="font-bold text-ink-900 px-5 pt-5">Subject-wise accuracy</h3>
          <div className="p-5 space-y-4">
            {a.subjectWise.length ? a.subjectWise.map((s: any) => (
              <div key={s.subject}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-semibold text-ink-700">{s.subject}</span>
                  <span className={`font-bold ${s.accuracy >= 60 ? 'text-emerald-600' : s.accuracy >= 40 ? 'text-amber-600' : 'text-red-500'}`}>{s.accuracy}%</span>
                </div>
                <div className="h-2.5 bg-ink-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${s.accuracy >= 60 ? 'bg-emerald-500' : s.accuracy >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${s.accuracy}%` }} />
                </div>
                <p className="text-xs text-ink-400 mt-1">{s.correct}/{s.total} correct · {s.marks} marks</p>
              </div>
            )) : (
              <EmptyState icon="🎯" title="No subject data" description="Attempt sectional tests to unlock subject analysis." />
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <h3 className="font-bold text-ink-900 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-brand-600" /> Smart suggestions</h3>
        <ul className="space-y-2 text-sm text-ink-600">
          <li>• Focus 60% of your practice on subjects below 60% accuracy.</li>
          <li>• Attempt sectional tests for weak subjects twice a week.</li>
          <li>• Review solutions within 48 hours of each mock — that's when learning sticks.</li>
          <li>• Target 2 full-length mocks per week in the final month.</li>
        </ul>
      </Card>
    </div>
  );
}
