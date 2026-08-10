import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award, Crown, Medal, Trophy } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Avatar, Badge, Card, ErrorState, PageHeader, Spinner } from '../components/ui';
import { initialsColor } from '../lib/format';

type Tab = 'mock' | 'quiz';

export default function Leaderboard() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const initial: Tab = params.get('test') ? 'mock' : (window.location.pathname.includes('quiz') ? 'quiz' : 'mock');
  const [tab, setTab] = useState<Tab>(initial);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    const url = tab === 'mock' ? '/mocks/leaderboard' : '/quiz/leaderboard';
    api.get(url).then(({ data }) => setRows(tab === 'mock' ? data.data.leaderboard : data.data.leaderboard))
      .catch((e) => setError(handleError(e)))
      .finally(() => setLoading(false));
  }, [tab]);

  const medal = (i: number) => (i === 0 ? <Crown size={18} className="text-amber-400" /> : i === 1 ? <Medal size={17} className="text-ink-400" /> : i === 2 ? <Medal size={17} className="text-amber-600" /> : <span className="w-[18px] text-center font-bold text-ink-300">{i + 1}</span>);

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        eyebrow="All-India Ranking"
        title="Leaderboard"
        description="See where you stand among thousands of aspirants."
      />

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('mock')} className={`chip !px-4 !py-2 cursor-pointer text-sm ${tab === 'mock' ? 'bg-brand-600 text-white' : 'bg-white border border-ink-200 text-ink-600 hover:border-brand-300'}`}>
          <Trophy size={13} /> Mock Tests
        </button>
        <button onClick={() => setTab('quiz')} className={`chip !px-4 !py-2 cursor-pointer text-sm ${tab === 'quiz' ? 'bg-brand-600 text-white' : 'bg-white border border-ink-200 text-ink-600 hover:border-brand-300'}`}>
          <Award size={13} /> Daily Quiz
        </button>
      </div>

      {loading ? <Spinner /> : error ? <ErrorState message={error} retry={() => window.location.reload()} /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-head">Rank</th>
                  <th className="table-head">Aspirant</th>
                  {tab === 'mock' ? (
                    <>
                      <th className="table-head">Test</th>
                      <th className="table-head text-right">Score</th>
                      <th className="table-head text-right">Accuracy</th>
                    </>
                  ) : (
                    <>
                      <th className="table-head">Quizzes</th>
                      <th className="table-head text-right">Points</th>
                      <th className="table-head text-right">Best streak</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((r, i) => {
                  const me = r.user_id === user?.id || r.userId === user?.id;
                  return (
                    <tr key={i} className={me ? 'bg-brand-50/70' : ''}>
                      <td className="table-cell">{medal(i)}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={r.name} src={r.avatar} size={30} />
                          <span className={`font-semibold ${me ? 'text-brand-700' : 'text-ink-800'}`}>
                            {r.name} {me && <Badge tone="blue">You</Badge>}
                          </span>
                        </div>
                      </td>
                      {tab === 'mock' ? (
                        <>
                          <td className="table-cell text-ink-500">{r.test_title || '—'}</td>
                          <td className="table-cell text-right font-extrabold text-ink-900">{r.score}</td>
                          <td className="table-cell text-right"><span className={`font-bold ${r.accuracy >= 60 ? 'text-emerald-600' : 'text-amber-600'}`}>{r.accuracy}%</span></td>
                        </>
                      ) : (
                        <>
                          <td className="table-cell text-ink-500">{r.quizzes}</td>
                          <td className="table-cell text-right font-extrabold text-ink-900">{r.totalScore}</td>
                          <td className="table-cell text-right"><span className="font-bold text-orange-500">🔥 {r.bestStreak}</span></td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
