import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { api, handleError } from '../../lib/api';
import { Alert, Badge, Button, Card, EmptyState, ErrorState, Field, Input, Select, Spinner } from '../../components/ui';
import { formatDate } from '../../lib/format';

export default function AdminQuiz() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ questionText: '', options: ['', '', '', ''], correctIndex: 0, explanation: '', category: 'General', difficulty: 'Medium' });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/quiz/questions');
      setQuestions(data.data.questions);
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/quiz/questions', form);
      setModalOpen(false);
      setNotice('Question added ✓');
      load();
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      setError(handleError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await api.delete(`/quiz/questions/${id}`);
      setNotice('Deleted ✓');
      load();
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      setError(handleError(err));
    }
  };

  if (loading) return <Spinner />;
  if (error && !questions.length) return <ErrorState message={error} retry={load} />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Quiz Question Bank</h1>
          <p className="text-sm text-ink-500 mt-0.5">The daily quiz pulls the 10 most recent questions.</p>
        </div>
        <Button onClick={() => { setModalOpen(true); setForm({ questionText: '', options: ['', '', '', ''], correctIndex: 0, explanation: '', category: 'General', difficulty: 'Medium' }); }}><Plus size={16} /> Add question</Button>
      </div>

      {notice && <div className="mb-4"><Alert tone="green">{notice}</Alert></div>}

      {questions.length === 0 ? (
        <Card><EmptyState icon="🧠" title="No questions yet" action={<Button onClick={() => setModalOpen(true)}><Plus size={15} /> Add the first question</Button>} /></Card>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <Card key={q.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-ink-800">{q.questionText}</p>
                  <p className="text-xs text-ink-400 mt-1">✓ Correct: {q.options[q.correctIndex]} · {formatDate(q.date)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone="slate">{q.category}</Badge>
                  <Badge tone={q.difficulty === 'Easy' ? 'green' : q.difficulty === 'Hard' ? 'red' : 'amber'}>{q.difficulty}</Badge>
                  <button onClick={() => remove(q.id)} className="p-2 rounded-lg text-ink-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={15} /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
              <h3 className="font-extrabold text-ink-900">Add Quiz Question</h3>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-ink-100"><X size={18} /></button>
            </div>
            <form onSubmit={save} className="p-6 overflow-y-auto max-h-[calc(92vh-8rem)]">
              {error && <div className="mb-4"><Alert>{error}</Alert></div>}
              <div className="space-y-4">
                <Field label="Question"><textarea required className="input min-h-20" value={form.questionText} onChange={(e) => setForm({ ...form, questionText: e.target.value })} /></Field>
                <div className="grid sm:grid-cols-2 gap-2">
                  {form.options.map((opt: string, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <button type="button" onClick={() => setForm({ ...form, correctIndex: i })} className={`h-8 w-8 rounded-lg shrink-0 text-xs font-bold transition ${form.correctIndex === i ? 'bg-emerald-500 text-white' : 'bg-white border border-ink-300 text-ink-400'}`} title="Set correct">
                        {String.fromCharCode(65 + i)}
                      </button>
                      <Input required placeholder={`Option ${String.fromCharCode(65 + i)}`} value={opt} onChange={(e) => setForm({ ...form, options: form.options.map((o: string, x: number) => (x === i ? e.target.value : o)) })} />
                    </div>
                  ))}
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <Field label="Category"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
                  <Field label="Difficulty">
                    <Select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                      <option>Easy</option><option>Medium</option><option>Hard</option>
                    </Select>
                  </Field>
                  <Field label="Explanation"><Input value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} /></Field>
                </div>
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" loading={saving}>Add question</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
