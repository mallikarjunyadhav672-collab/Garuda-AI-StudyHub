import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, Clock, FileQuestion, ListChecks, Scale, Timer } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { Alert, Card, ErrorState, LinkButton, Spinner } from '../components/ui';
import { formatMinutes } from '../lib/format';

export default function MockInstructions() {
  const { id } = useParams();
  const [mock, setMock] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/mocks/${id}`).then(({ data }) => setMock(data.data.mock)).catch((e) => setError(handleError(e))).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} retry={() => window.location.reload()} />;

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-brand-800 to-brand-600 px-6 py-8 text-white">
          <p className="text-xs text-brand-200 font-bold uppercase tracking-widest">Mock test</p>
          <h1 className="text-2xl font-extrabold mt-1">{mock.title}</h1>
          <p className="text-brand-100 text-sm mt-1">{mock.exam} · {mock.type}</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { icon: FileQuestion, label: 'Questions', value: mock.totalQuestions },
              { icon: Timer, label: 'Duration', value: formatMinutes(mock.duration) },
              { icon: Scale, label: 'Marks', value: `${mock.totalMarks}` },
              { icon: AlertCircle, label: 'Negative', value: `-${mock.negativeMarking}` },
            ].map((s, i) => (
              <div key={i} className="rounded-xl bg-ink-50 border border-ink-200 p-3 text-center">
                <s.icon size={18} className="mx-auto text-brand-600" />
                <p className="font-extrabold text-ink-900 mt-1.5">{s.value}</p>
                <p className="text-[11px] text-ink-400">{s.label}</p>
              </div>
            ))}
          </div>

          <h2 className="font-bold text-ink-900 mb-3 flex items-center gap-2"><ListChecks size={18} className="text-brand-600" /> Instructions</h2>
          {mock.instructions ? (
            <p className="text-sm text-ink-600 leading-relaxed bg-brand-50 border border-brand-100 rounded-xl p-4">{mock.instructions}</p>
          ) : (
            <ul className="space-y-2 text-sm text-ink-600">
              <li>• The test will start immediately after you click "Start Test".</li>
              <li>• The timer runs continuously and the test auto-submits when time runs out.</li>
              <li>• Each question carries marks as shown; wrong answers incur negative marking.</li>
              <li>• You can navigate between questions using the palette and change answers anytime.</li>
              <li>• Results, solutions and analytics are available immediately after submission.</li>
            </ul>
          )}

          <div className="mt-6 flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
            <Clock size={18} className="shrink-0" />
            Once started, the timer cannot be paused. Ensure you have a stable connection.
          </div>

          <div className="mt-6 flex justify-between items-center">
            <Link to="/mock" className="btn-secondary">← Back</Link>
            <LinkButton to={`/mock/${mock.id}/attempt`} className="!px-8 !py-3">Start Test →</LinkButton>
          </div>
        </div>
      </Card>
    </div>
  );
}
