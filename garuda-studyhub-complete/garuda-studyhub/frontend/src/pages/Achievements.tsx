import { useEffect, useState } from 'react';
import { Award, Lock } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { Badge, Card, ErrorState, PageHeader, Spinner, StatCard } from '../components/ui';

const iconMap: Record<string, string> = {
  target: '🎯', zap: '⚡', flame: '🔥', crosshair: '🎯', trophy: '🏆', user: '👤',
};

export default function Achievements() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/me/achievements').then(({ data }) => setData(data.data)).catch((e) => setError(handleError(e))).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} retry={() => window.location.reload()} />;

  const earned = data.achievements.filter((a: any) => a.earned).length;

  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow="Badges & milestones"
        title="Achievements"
        description="Earn badges by practicing consistently and hitting performance milestones."
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Badges earned" value={`${earned}/${data.achievements.length}`} icon={<Award size={20} />} tone="amber" />
        <StatCard label="Streak" value={data.stats.studyStreak} icon={<span>🔥</span>} tone="orange" />
        <StatCard label="Mocks" value={data.stats.totalMocksTaken} icon={<span>📝</span>} tone="brand" />
        <StatCard label="Accuracy" value={`${data.stats.avgAccuracy}%`} icon={<span>🎯</span>} tone="green" />
      </div>

      <Card className="p-6">
        <h3 className="font-bold text-ink-900 mb-1">All achievements</h3>
        <p className="text-sm text-ink-500 mb-5">Progress updates automatically as you practice.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {data.achievements.map((a: any) => (
            <div key={a.id} className={`rounded-2xl border-2 p-4 flex items-start gap-3 transition ${a.earned ? 'border-emerald-200 bg-emerald-50/50' : 'border-ink-200 bg-ink-50/60'}`}>
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${a.earned ? 'bg-gradient-to-br from-amber-400 to-orange-400' : 'bg-ink-200'}`}>
                {a.earned ? iconMap[a.icon] || '🏅' : <Lock size={18} className="text-ink-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-ink-900 text-sm">{a.title}</p>
                <p className="text-xs text-ink-500 mt-0.5 leading-relaxed">{a.description}</p>
              </div>
              {a.earned && <Badge tone="green">Earned</Badge>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
