import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Flame, Timer } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { Alert, Badge, Button, Card, Spinner } from '../components/ui';

export default function QuizToday() {
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<any>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/quiz/today').then(({ data }) => {
      setQuiz(data.data);
      setTimeLeft(10 * 60);
    }).catch((e) => setError(handleError(e))).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!quiz || quiz.attempted || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((p) => (p <= 1 ? 0 : p - 1)), 1000);
    return () => clearInterval(t);
  }, [quiz, timeLeft]);

  const submit = async () => {
    if (!quiz || quiz.attempted) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/quiz/today/submit', { answers, timeTaken: 600 - timeLeft });
      navigate(`/quiz/result/${data.data.attemptId}`, { replace: true });
    } catch (err) {
      setError(handleError(err));
      setSubmitting(false);
    }
  };

  const mm = useMemo(() => {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [timeLeft]);

  if (loading) return <Spinner />;
  if (error) return <div className="max-w-lg mx-auto"><Alert>{error}</Alert></div>;

  if (quiz.attempted) {
    return (
      <div className="max-w-lg mx-auto text-center">
        <Card className="p-10">
          <div className="text-5xl mb-3">✅</div>
          <h1 className="text-2xl font-extrabold text-ink-900">Today's quiz done!</h1>
          <p className="text-ink-500 mt-2 text-sm">You've already completed today's quiz. Come back tomorrow for a fresh set.</p>
          <div className="mt-6 flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => navigate('/quiz/previous')}>View history</Button>
            <Button variant="primary" onClick={() => navigate('/mock')}>Practice mocks</Button>
          </div>
        </Card>
      </div>
    );
  }

  const q = quiz.questions[current];

  if (!q) return <Card><div className="p-10 text-center text-ink-500">No questions available today.</div></Card>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-ink-900">Today's Daily Quiz</h1>
          <p className="text-sm text-ink-500 mt-0.5">{quiz.questions.length} questions · 10 minutes</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="chip bg-orange-50 text-orange-600 border border-orange-200"><Flame size={12} /> Streak day</span>
          <div className={`rounded-xl px-4 py-2 font-mono font-extrabold ${timeLeft < 120 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-brand-50 text-brand-700'}`}>
            <Timer size={14} className="inline mr-1" />{mm}
          </div>
        </div>
      </div>

      <div className="h-1.5 bg-ink-200 rounded-full overflow-hidden mb-6">
        <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all" style={{ width: `${((current + 1) / quiz.questions.length) * 100}%` }} />
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="chip bg-brand-50 text-brand-700 border border-brand-200">Question {current + 1} of {quiz.questions.length}</span>
          <Badge tone="slate">{q.category || 'General'}</Badge>
        </div>
        <h2 className="text-lg font-semibold text-ink-900 leading-relaxed">{q.questionText}</h2>
        <div className="mt-6 space-y-3">
          {q.options.map((opt: string, i: number) => {
            const selected = answers[q.id] === i;
            return (
              <button
                key={i}
                onClick={() => setAnswers({ ...answers, [q.id]: i })}
                className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition ${
                  selected ? 'border-orange-500 bg-orange-50' : 'border-ink-200 hover:border-orange-300 hover:bg-ink-50'
                }`}
              >
                <span className={`h-7 w-7 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${selected ? 'bg-orange-500 text-white' : 'bg-ink-100 text-ink-500'}`}>{String.fromCharCode(65 + i)}</span>
                <span className="text-sm font-medium text-ink-800">{opt}</span>
                {selected && <CheckCircle2 size={18} className="ml-auto text-orange-500 shrink-0" />}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-ink-100">
          <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent(current - 1)}>← Previous</Button>
          {current < quiz.questions.length - 1 ? (
            <Button onClick={() => setCurrent(current + 1)}>Next →</Button>
          ) : (
            <Button variant="success" onClick={submit} loading={submitting}>Submit Quiz ✓</Button>
          )}
        </div>
      </Card>
    </div>
  );
}
