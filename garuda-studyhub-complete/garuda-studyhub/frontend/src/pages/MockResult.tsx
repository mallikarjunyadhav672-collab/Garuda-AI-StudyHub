import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BarChart3, CheckCircle2, Clock, HelpCircle, Medal, Trophy, XCircle } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { Badge, Button, Card, ErrorState, LinkButton, Spinner } from '../components/ui';
import { formatDuration } from '../lib/format';

export default function MockResult() {
  const { sessionId } = useParams();
  const [r, setR] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/mocks/${sessionId}/result`).then(({ data }) => setR(data.data.result)).catch((e) => setError(handleError(e))).finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} retry={() => window.location.reload()} />;

  const percent = r.totalMarks ? Math.round((r.score / r.totalMarks) * 100) : 0;
  const verdict = percent >= 70 ? 'Outstanding! 🏆' : percent >= 50 ? 'Good job! 👍' : percent >= 35 ? 'Keep pushing! 💪' : 'Time to focus 📚';

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="overflow-hidden text-center">
        <div className={`px-6 py-10 ${percent >= 50 ? 'bg-gradient-to-br from-emerald-700 to-emerald-500' : 'bg-gradient-to-br from-brand-800 to-brand-600'} text-white`}>
          <div className="mx-auto h-20 w-20 rounded-full bg-white/15 border border-white/30 flex items-center justify-center">
            {percent >= 50 ? <Trophy size={38} /> : <Medal size={38} />}
          </div>
          <p className="text-sm text-white/80 font-semibold mt-4 uppercase tracking-widest">{verdict}</p>
          <p className="text-5xl font-extrabold mt-2">{r.score}<span className="text-2xl text-white/70 font-bold">/{r.totalMarks}</span></p>
          <p className="text-white/80 mt-2">Score · {percent}% of total marks</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold">
            <Medal size={15} /> Rank #{r.rank} of {r.totalParticipants}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6">
          {[
            { icon: CheckCircle2, label: 'Correct', value: r.correct, color: 'text-emerald-600 bg-emerald-50' },
            { icon: XCircle, label: 'Incorrect', value: r.incorrect, color: 'text-red-600 bg-red-50' },
            { icon: HelpCircle, label: 'Unanswered', value: r.unanswered, color: 'text-amber-600 bg-amber-50' },
            { icon: Clock, label: 'Time taken', value: formatDuration(r.timeTaken), color: 'text-brand-600 bg-brand-50' },
          ].map((s, i) => (
            <div key={i} className={`rounded-2xl p-4 ${s.color.split(' ')[1]}`}>
              <s.icon size={20} className={`mx-auto ${s.color.split(' ')[0]}`} />
              <p className="font-extrabold text-ink-900 text-lg mt-1.5">{s.value}</p>
              <p className="text-xs text-ink-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6">
          <div className="rounded-xl bg-ink-50 border border-ink-200 p-4">
            <div className="flex items-center justify-between text-sm font-semibold mb-2">
              <span className="text-ink-600">Accuracy</span>
              <span className="text-ink-900">{r.accuracy}%</span>
            </div>
            <div className="h-2.5 bg-ink-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${r.accuracy >= 60 ? 'bg-emerald-500' : r.accuracy >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, r.accuracy)}%` }} />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-6">
            <LinkButton to={`/mock/solutions/${r.id}`} variant="secondary"><BarChart3 size={16} /> View Solutions</LinkButton>
            <LinkButton to="/mock/analytics"><BarChart3 size={16} /> My Analytics</LinkButton>
            <LinkButton to={`/mock/${r.testId}/attempt`} variant="secondary">Retake Test</LinkButton>
            <Link to="/mock" className="btn-ghost">← All tests</Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
