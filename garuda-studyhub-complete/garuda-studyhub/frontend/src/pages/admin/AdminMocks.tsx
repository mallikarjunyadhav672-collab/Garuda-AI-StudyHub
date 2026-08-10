import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { api, handleError } from '../../lib/api';
import { Alert, Badge, Button, Card, EmptyState, ErrorState, Field, Input, Select, Spinner } from '../../components/ui';

interface QRow {
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  marks: number;
  subject: string;
}

const blankQ: QRow = { questionText: '', options: ['', '', '', ''], correctIndex: 0, explanation: '', marks: 1, subject: '' };

export default function AdminMocks() {
  const [mocks, setMocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ title: '', type: 'Full length', exam: '', duration: 60, negativeMarking: 0.25, difficulty: 'Medium', isLive: false, instructions: '' });
  const [questions, setQuestions] = useState<QRow[]>([blankQ]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/mocks');
      setMocks(data.data.mocks);
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
    const validQuestions = questions.filter((q) => q.questionText.trim() && q.options.every((o) => o.trim()));
    if (!validQuestions.length) {
      setError('Add at least one complete question (text + 4 options).');
      setSaving(false);
      return;
    }
    try {
      await api.post('/mocks', {
        ...form,
        totalMarks: validQuestions.reduce((a, q) => a + q.marks, 0),
        questions: validQuestions,
      });
      setModalOpen(false);
      setNotice('Mock test created ✓');
      load();
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      setError(handleError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm('Delete this mock test and all its questions?')) return;
    try {
      await api.delete(`/mocks/${id}`);
      setNotice('Deleted ✓');
      load();
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      setError(handleError(err));
    }
  };

  const setQ = (i: number, patch: Partial<QRow>) => setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));

  if (loading) return <Spinner />;
  if (error && !mocks.length) return <ErrorState message={error} retry={load} />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Mock Tests</h1>
          <p className="text-sm text-ink-500 mt-0.5">Create tests with a built-in question builder.</p>
        </div>
        <Button onClick={() => { setModalOpen(true); setQuestions([blankQ]); }}><Plus size={16} /> Create test</Button>
      </div>

      {notice && <div className="mb-4"><Alert tone="green">{notice}</Alert></div>}

      {mocks.length === 0 ? (
        <Card><EmptyState icon="⏱️" title="No tests yet" action={<Button onClick={() => setModalOpen(true)}><Plus size={15} /> Create the first test</Button>} /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-head">Test</th>
                  <th className="table-head">Type</th>
                  <th className="table-head">Questions</th>
                  <th className="table-head">Duration</th>
                  <th className="table-head">Attempts</th>
                  <th className="table-head">Status</th>
                  <th className="table-head text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {mocks.map((m) => (
                  <tr key={m.id} className="hover:bg-ink-50/50">
                    <td className="table-cell"><p className="font-semibold text-ink-800 max-w-64 truncate">{m.title}</p><p className="text-xs text-ink-400">{m.exam}</p></td>
                    <td className="table-cell"><Badge tone={m.type === 'Full length' ? 'violet' : 'blue'}>{m.type}</Badge></td>
                    <td className="table-cell font-bold">{m.totalQuestions}</td>
                    <td className="table-cell">{m.duration} min</td>
                    <td className="table-cell font-bold">{m.attempts}</td>
                    <td className="table-cell">{m.is_live ? <Badge tone="red">Live</Badge> : <Badge tone="green">Active</Badge>}</td>
                    <td className="table-cell text-right">
                      <button onClick={() => remove(m.id)} className="p-2 rounded-lg text-ink-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 shrink-0">
              <h3 className="font-extrabold text-ink-900">Create Mock Test</h3>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-ink-100"><X size={18} /></button>
            </div>
            <form onSubmit={save} className="p-6 overflow-y-auto">
              {error && <div className="mb-4"><Alert>{error}</Alert></div>}
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Title"><Input required className="sm:col-span-2" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. SSC CGL Tier-1 Full Length Mock #2" /></Field>
                <Field label="Type">
                  <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option>Full length</option><option>Sectional</option><option>Topic</option>
                  </Select>
                </Field>
                <Field label="Exam"><Input required value={form.exam} onChange={(e) => setForm({ ...form, exam: e.target.value })} placeholder="SSC CGL" /></Field>
                <Field label="Duration (minutes)"><Input type="number" min={1} required value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} /></Field>
                <Field label="Negative marking">
                  <Select value={String(form.negativeMarking)} onChange={(e) => setForm({ ...form, negativeMarking: Number(e.target.value) })}>
                    <option value="0">0 (none)</option><option value="0.25">0.25</option><option value="0.33">0.33</option><option value="0.5">0.5</option><option value="1">1</option>
                  </Select>
                </Field>
                <Field label="Difficulty">
                  <Select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                    <option>Easy</option><option>Medium</option><option>Hard</option>
                  </Select>
                </Field>
                <Field label="Live test">
                  <label className="flex items-center gap-2 pt-2 cursor-pointer">
                    <input type="checkbox" checked={form.isLive} onChange={(e) => setForm({ ...form, isLive: e.target.checked })} className="h-5 w-5 rounded accent-brand-600" />
                    <span className="text-sm text-ink-600">Mark as live test</span>
                  </label>
                </Field>
                <Field label="Instructions"><textarea className="input min-h-20 sm:col-span-2" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="Test instructions shown before starting…" /></Field>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-ink-900">Questions ({questions.filter((q) => q.questionText.trim()).length})</h4>
                  <Button type="button" variant="secondary" onClick={() => setQuestions([...questions, { ...blankQ }])}><Plus size={14} /> Add question</Button>
                </div>
                <div className="space-y-4">
                  {questions.map((q, i) => (
                    <div key={i} className="rounded-xl border border-ink-200 p-4 bg-ink-50/40">
                      <div className="flex items-start gap-3">
                        <span className="chip bg-brand-600 text-white shrink-0 mt-1">Q{i + 1}</span>
                        <div className="flex-1 space-y-3">
                          <Input placeholder={`Question ${i + 1} text…`} required value={q.questionText} onChange={(e) => setQ(i, { questionText: e.target.value })} />
                          <div className="grid sm:grid-cols-2 gap-2">
                            {q.options.map((opt, oi) => (
                              <div key={oi} className="flex items-center gap-2">
                                <button type="button" onClick={() => setQ(i, { correctIndex: oi })} className={`h-7 w-7 rounded-lg shrink-0 text-xs font-bold transition ${q.correctIndex === oi ? 'bg-emerald-500 text-white' : 'bg-white border border-ink-300 text-ink-400'}`} title="Set as correct">
                                  {String.fromCharCode(65 + oi)}
                                </button>
                                <Input placeholder={`Option ${String.fromCharCode(65 + oi)}`} required value={opt} onChange={(e) => setQ(i, { options: q.options.map((o, x) => (x === oi ? e.target.value : o)) })} />
                              </div>
                            ))}
                          </div>
                          <div className="grid sm:grid-cols-3 gap-2">
                            <Input placeholder="Marks" type="number" value={String(q.marks)} onChange={(e) => setQ(i, { marks: Number(e.target.value) })} />
                            <Input placeholder="Subject (e.g. Quant)" value={q.subject} onChange={(e) => setQ(i, { subject: e.target.value })} />
                            <Input placeholder="Explanation" value={q.explanation} onChange={(e) => setQ(i, { explanation: e.target.value })} />
                          </div>
                        </div>
                        <button type="button" onClick={() => setQuestions((qs) => qs.filter((_, x) => x !== i))} className="p-2 rounded-lg text-ink-300 hover:text-red-500 hover:bg-red-50 shrink-0"><Trash2 size={15} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-6 justify-end">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" loading={saving}>Create test</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
