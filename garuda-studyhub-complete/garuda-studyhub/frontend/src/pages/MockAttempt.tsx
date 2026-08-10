import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Flag, List, XCircle } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { Alert, Button, Card, Spinner } from '../components/ui';

interface Question {
  id: number; questionText: string; options: string[]; marks: number; negativeMarks: number; subject?: string;
}

export default function MockAttempt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mock, setMock] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const startRef = useRef(Date.now());
  const submittedRef = useRef(false);

  useEffect(() => {
    api.get(`/mocks/${id}`)
      .then(({ data }) => {
        setMock(data.data.mock);
        setTimeLeft(data.data.mock.duration * 60);
        startRef.current = Date.now();
      })
      .catch((e) => setError(handleError(e)))
      .finally(() => setLoading(false));
  }, [id]);

  // Timer
  useEffect(() => {
    if (!mock || timeLeft <= 0) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          submit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [mock, timeLeft]);

  const questions: Question[] = mock?.questions || [];
  const answeredCount = Object.keys(answers).length;

  const submit = async (auto = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const timeTaken = Math.floor((Date.now() - startRef.current) / 1000);
      const { data } = await api.post(`/mocks/${id}/submit`, { answers, timeTaken });
      navigate(`/mock/result/${data.data.sessionId}`, { replace: true });
    } catch (err) {
      setError(handleError(err));
      submittedRef.current = false;
      setSubmitting(false);
    }
  };

  const mm = useMemo(() => {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [timeLeft]);

  if (loading) return <Spinner label="Preparing your test…" />;
  if (error) return <div className="max-w-lg mx-auto"><Alert>{error}</Alert></div>;

  const q = questions[current];
  const progress = ((answeredCount / Math.max(1, questions.length)) * 100).toFixed(0);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Top bar */}
      <div className="sticky top-16 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-white/95 backdrop-blur border-b border-ink-200 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink-900 truncate">{mock.title}</p>
          <p className="text-xs text-ink-400">{questions.length} questions · {mock.totalMarks} marks · Negative {mock.negativeMarking}</p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-ink-500">
          <span className="h-3 w-3 rounded bg-emerald-500" /> Answered {answeredCount}
          <span className="h-3 w-3 rounded bg-red-400 ml-2" /> {questions.length - answeredCount} left
        </div>
        <div className={`rounded-xl px-4 py-2 font-mono font-extrabold text-lg ${timeLeft < 300 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-brand-50 text-brand-700'}`}>{mm}</div>
        <Button onClick={() => setConfirmOpen(true)} loading={submitting}>Submit</Button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-ink-200 rounded-full mt-4 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-brand-600 to-emerald-500 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="grid lg:grid-cols-[1fr_260px] gap-6 mt-6">
        {/* Question */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="chip bg-brand-50 text-brand-700 border border-brand-200">Question {current + 1} of {questions.length}</span>
            {q.subject && <span className="chip bg-ink-100 text-ink-600">{q.subject}</span>}
          </div>
          <h2 className="text-lg font-semibold text-ink-900 leading-relaxed">{q.questionText}</h2>
          <div className="mt-6 space-y-3">
            {q.options.map((opt, i) => {
              const selected = answers[q.id] === i;
              return (
                <button
                  key={i}
                  onClick={() => setAnswers({ ...answers, [q.id]: i })}
                  className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition ${
                    selected ? 'border-brand-600 bg-brand-50' : 'border-ink-200 hover:border-brand-300 hover:bg-ink-50'
                  }`}
                >
                  <span className={`h-7 w-7 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${selected ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500'}`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-sm font-medium text-ink-800">{opt}</span>
                  {selected && <CheckCircle2 size={18} className="ml-auto text-brand-600 shrink-0" />}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-ink-100">
            <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent(current - 1)}>← Previous</Button>
            {current < questions.length - 1 ? (
              <Button onClick={() => setCurrent(current + 1)}>Save & Next →</Button>
            ) : (
              <Button variant="success" onClick={() => setConfirmOpen(true)}>Finish Test ✓</Button>
            )}
          </div>
        </Card>

        {/* Palette */}
        <Card className="p-5 h-fit lg:sticky lg:top-40">
          <p className="font-bold text-ink-900 text-sm mb-3 flex items-center gap-2"><List size={16} className="text-brand-600" /> Question palette</p>
          <div className="grid grid-cols-6 lg:grid-cols-5 gap-1.5">
            {questions.map((qq, i) => {
              const isAnswered = answers[qq.id] !== undefined;
              const isCurrent = i === current;
              return (
                <button
                  key={qq.id}
                  onClick={() => setCurrent(i)}
                  className={`h-8 rounded-lg text-xs font-bold transition ${
                    isCurrent ? 'ring-2 ring-brand-500 ring-offset-1' : ''
                  } ${isAnswered ? 'bg-emerald-500 text-white' : 'bg-ink-100 text-ink-500 hover:bg-ink-200'}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-1.5 text-xs text-ink-500">
            <p className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-emerald-500" /> Answered ({answeredCount})</p>
            <p className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-ink-200" /> Not answered ({questions.length - answeredCount})</p>
            <p className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-brand-600" /> Current question</p>
          </div>
        </Card>
      </div>

      {/* Confirm modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmOpen(false)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="mx-auto h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center"><AlertTriangle size={24} className="text-amber-600" /></div>
            <h3 className="text-lg font-extrabold text-ink-900 text-center mt-3">Submit test?</h3>
            <p className="text-sm text-ink-500 text-center mt-1.5">
              You've answered <b className="text-ink-800">{answeredCount}</b> of {questions.length} questions.{' '}
              {answeredCount < questions.length && <span className="text-amber-600 font-semibold">Unanswered questions will score zero.</span>}
            </p>
            <div className="flex gap-3 mt-6">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmOpen(false)}>Keep practicing</Button>
              <Button variant="success" className="flex-1" loading={submitting} onClick={() => submit()}>Submit now</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
