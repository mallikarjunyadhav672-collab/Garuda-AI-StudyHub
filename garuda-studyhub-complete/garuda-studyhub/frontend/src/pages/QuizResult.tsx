import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarCheck, Flame, Target, Trophy } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { Card, ErrorState, LinkButton, Spinner } from '../components/ui';
import { formatDate } from '../lib/format';

export default function QuizResult() {
  const { id } = useParams();
  const [a, setA] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/quiz/result/${id}`).then(({ data }) => setA(data.data.attempt)).catch((e) => setError(handleError(e))).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} retry={() => window.location.reload()} />;

  const percent = a.total ? Math.round((a.score / a.total) * 100) : 0;

  return (
    <div className="max-w-xl mx-auto">
      <Card className="overflow-hidden text-center">
        <div className={`px-6 py-10 ${percent >= 70 ? 'bg-gradient-to-br from-emerald-700 to-emerald-500' : 'bg-gradient-to-br from-orange-600 to-amber-500'} text-white`}>
          <div className="mx-auto h-20 w-20 rounded-full bg-white/15 border border-white/30 flex items-center justify-center">
            {percent >= 70 ? <Trophy size={38} /> : <Target size={38} />}
          </div>
          <p className="text-sm text-white/80 font-semibold mt-4 uppercase tracking-widest">
            {percent >= 90 ? 'Legendary! 👑' : percent >= 70 ? 'Excellent! 🏆' : percent >= 50 ? 'Good going! 👍' : 'Keep practicing 💪'}
          </p>
          <p className="text-6xl font-extrabold mt-2">{a.score}<span className="text-2xl text-white/70 font-bold">/{a.total}</span></p>
          <p className="text-white/80 mt-2">Daily Quiz · {formatDate(a.date)}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 p-6">
          <div className="rounded-2xl bg-brand-50 p-4">
            <Target size={20} className="mx-auto text-brand-600" />
            <p className="font-extrabold text-ink-900 text-lg mt-1.5">{percent}%</p>
            <p className="text-xs text-ink-500">Accuracy</p>
          </div>
          <div className="rounded-2xl bg-orange-50 p-4">
            <Flame size={20} className="mx-auto text-orange-500" />
            <p className="font-extrabold text-ink-900 text-lg mt-1.5">{a.streak}</p>
            <p className="text-xs text-ink-500">Day streak</p>
          </div>
          <div className="rounded-2xl bg-violet-50 p-4">
            <CalendarCheck size={20} className="mx-auto text-violet-600" />
            <p className="font-extrabold text-ink-900 text-lg mt-1.5">{Math.floor(a.timeTaken / 60)}m {a.timeTaken % 60}s</p>
            <p className="text-xs text-ink-500">Time taken</p>
          </div>
        </div>

        <div className="px-6 pb-6 flex flex-wrap gap-3 justify-center">
          <LinkButton to="/quiz/previous" variant="secondary">View history</LinkButton>
          <LinkButton to="/quiz/leaderboard" variant="secondary">Leaderboard</LinkButton>
          <LinkButton to="/mock">Practice mocks</LinkButton>
        </div>
      </Card>
    </div>
  );
}
