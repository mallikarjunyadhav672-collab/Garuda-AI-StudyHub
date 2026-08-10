import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Lightbulb, XCircle } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { Badge, Button, Card, ErrorState, Spinner } from '../components/ui';

export default function MockSolutions() {
  const { sessionId } = useParams();
  const [solutions, setSolutions] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'wrong' | 'correct'>('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/mocks/${sessionId}/solutions`).then(({ data }) => setSolutions(data.data.solutions)).catch((e) => setError(handleError(e))).finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} retry={() => window.location.reload()} />;

  const filtered = solutions.filter((s) => (filter === 'wrong' ? s.selected !== null && !s.isCorrect : filter === 'correct' ? s.isCorrect : true));
  const wrongCount = solutions.filter((s) => s.selected !== null && !s.isCorrect).length;
  const correctCount = solutions.filter((s) => s.isCorrect).length;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Solutions & Explanations</h1>
          <p className="text-sm text-ink-500 mt-1">Review every question to understand your mistakes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={filter === 'all' ? 'primary' : 'secondary'} onClick={() => setFilter('all')}>All ({solutions.length})</Button>
          <Button variant={filter === 'wrong' ? 'danger' : 'secondary'} onClick={() => setFilter('wrong')}>Wrong ({wrongCount})</Button>
          <Button variant={filter === 'correct' ? 'success' : 'secondary'} onClick={() => setFilter('correct')}>Correct ({correctCount})</Button>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((s, i) => (
          <Card key={s.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-ink-900 leading-relaxed">
                <span className="text-ink-400 font-bold mr-2">Q{i + 1}.</span>{s.questionText}
              </p>
              {s.unanswered ? (
                <Badge tone="amber">Skipped</Badge>
              ) : s.isCorrect ? (
                <span className="chip bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0"><CheckCircle2 size={12} /> Correct</span>
              ) : (
                <span className="chip bg-red-50 text-red-600 border border-red-200 shrink-0"><XCircle size={12} /> Wrong</span>
              )}
            </div>
            <div className="mt-3 space-y-1.5">
              {s.options.map((opt: string, oi: number) => {
                const isCorrectOpt = oi === s.correctIndex;
                const isSelected = oi === s.selected;
                return (
                  <div
                    key={oi}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm border ${
                      isCorrectOpt ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                      : isSelected ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-ink-50 border-ink-200 text-ink-600'
                    }`}
                  >
                    <span className="font-bold">{String.fromCharCode(65 + oi)}.</span> {opt}
                    {isCorrectOpt && <CheckCircle2 size={15} className="ml-auto text-emerald-600 shrink-0" />}
                    {isSelected && !isCorrectOpt && <XCircle size={15} className="ml-auto text-red-500 shrink-0" />}
                  </div>
                );
              })}
            </div>
            {s.explanation && (
              <div className="mt-3 flex gap-2 rounded-xl bg-brand-50 border border-brand-100 p-3 text-sm text-ink-700">
                <Lightbulb size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p>{s.explanation}</p>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <Link to="/mock" className="btn-secondary">← Back to tests</Link>
        <Link to="/mock/analytics" className="btn-primary">View Analytics</Link>
      </div>
    </div>
  );
}
