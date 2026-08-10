import { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Circle, Clock, RotateCcw, Sparkles, Target } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { Alert, Button, Card, Field, Input, LinkButton, PageHeader, Select, Spinner } from '../components/ui';
import { formatDate } from '../lib/format';

const examOptions = ['SSC CGL', 'SSC CHSL', 'UPSC CSE', 'IBPS PO', 'SBI Clerk', 'RRB NTPC', 'TSPSC Group 1', 'APPSC Group 2', 'Police / Defence', 'CTET / Teaching', 'Other'];

export default function AIPlanner() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ exam: 'SSC CGL', targetDate: '', dailyHours: '6', focusAreas: 'Quantitative Aptitude, Reasoning, English, General Awareness' });
  const [view, setView] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/ai/plans');
      setPlans(data.data.plans);
      if (data.data.plans.length && view === null) setView(data.data.plans[0].id);
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setGenerating(true);
    try {
      const { data } = await api.post('/ai/planner/generate', {
        exam: form.exam,
        targetDate: form.targetDate,
        dailyHours: Number(form.dailyHours),
        focusAreas: form.focusAreas.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setView(data.data.planId);
      load();
    } catch (err) {
      setError(handleError(err));
    } finally {
      setGenerating(false);
    }
  };

  const markDay = async (planId: number, dayIndex: number) => {
    try {
      const { data } = await api.put(`/ai/planner/${planId}`, { completedDay: dayIndex });
      setPlans((ps) => ps.map((p) => (p.id === planId ? { ...p, progress: data.data.progress, weeklySchedule: data.data.weeklySchedule } : p)));
    } catch { /* ignore */ }
  };

  const activePlan = plans.find((p) => p.id === view) || plans[0];

  return (
    <div>
      <PageHeader
        eyebrow="AI Study Planner"
        title="Your Personal Study Plan"
        description="Generate a week-by-week schedule from your exam date and daily hours. AI-optimized, fully editable."
      />

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      <div className="grid lg:grid-cols-[340px_1fr] gap-6">
        {/* Generator form */}
        <Card className="p-5 h-fit lg:sticky lg:top-24">
          <h3 className="font-bold text-ink-900 mb-4 flex items-center gap-2"><Sparkles size={17} className="text-brand-600" /> Generate new plan</h3>
          <form onSubmit={generate} className="space-y-4">
            <Field label="Target exam">
              <Select value={form.exam} onChange={(e) => setForm({ ...form, exam: e.target.value })}>
                {examOptions.map((o) => <option key={o}>{o}</option>)}
              </Select>
            </Field>
            <Field label="Exam date">
              <Input type="date" required value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
            </Field>
            <Field label="Daily study hours">
              <Input type="number" min={1} max={14} required value={form.dailyHours} onChange={(e) => setForm({ ...form, dailyHours: e.target.value })} />
            </Field>
            <Field label="Focus areas (comma separated)">
              <textarea className="input min-h-20" value={form.focusAreas} onChange={(e) => setForm({ ...form, focusAreas: e.target.value })} />
            </Field>
            <Button type="submit" className="w-full" loading={generating}>
              <Sparkles size={16} /> Generate Plan
            </Button>
          </form>
          <div className="mt-5 rounded-xl bg-brand-50 border border-brand-100 p-3 text-xs text-ink-600 leading-relaxed">
            💡 The planner balances your focus areas across morning, mid-day and evening slots, six days a week.
          </div>
        </Card>

        {/* Plan view */}
        <div>
          {loading ? (
            <Spinner />
          ) : !activePlan ? (
            <Card className="p-12 text-center">
              <div className="text-5xl mb-3">🗓️</div>
              <h3 className="text-lg font-extrabold text-ink-900">No plan yet</h3>
              <p className="text-sm text-ink-500 mt-1 max-w-sm mx-auto">Fill in your exam date and daily hours on the left, then hit "Generate Plan" — your personalized schedule will appear here.</p>
            </Card>
          ) : (
            <div className="space-y-5">
              {/* Plan header */}
              <Card className="p-5 bg-gradient-to-r from-brand-800 to-brand-600 !border-0">
                <div className="flex flex-wrap items-center justify-between gap-3 text-white">
                  <div>
                    <h3 className="font-extrabold text-lg flex items-center gap-2"><Target size={18} /> {activePlan.title}</h3>
                    <p className="text-brand-100 text-sm mt-1 flex items-center gap-3">
                      <span><CalendarDays size={13} className="inline mr-1" />Target: {formatDate(activePlan.targetDate)}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-extrabold">{activePlan.progress}%</p>
                    <p className="text-xs text-brand-100">completed</p>
                  </div>
                </div>
                <div className="mt-4 h-2.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full transition-all" style={{ width: `${activePlan.progress}%` }} />
                </div>
              </Card>

              {/* Weekly schedule */}
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {activePlan.weeklySchedule.map((day: any, di: number) => {
                  const done = day.subjects.filter((s: any) => s.completed).length;
                  const total = day.subjects.length;
                  return (
                    <Card key={di} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-bold text-ink-900">{day.day}</p>
                        <button onClick={() => markDay(activePlan.id, di)} className={`chip cursor-pointer ${done === total ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-ink-100 text-ink-500 hover:bg-emerald-50 hover:text-emerald-700'}`}>
                          {done === total ? <CheckCircle2 size={11} /> : <Circle size={11} />} {done}/{total}
                        </button>
                      </div>
                      <div className="space-y-2">
                        {day.subjects.map((s: any, si: number) => (
                          <div key={si} className={`rounded-lg px-3 py-2 text-sm border flex items-center justify-between ${s.completed ? 'bg-emerald-50/60 border-emerald-100 text-ink-400' : 'bg-ink-50 border-ink-200'}`}>
                            <span className={`font-semibold ${s.completed ? 'line-through' : 'text-ink-700'}`}>{s.name}</span>
                            <span className="flex items-center gap-1 text-xs text-ink-400"><Clock size={11} /> {s.hours}h</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-ink-400">Mark a day complete when you finish all its slots — progress updates automatically.</p>
                <Button variant="ghost" onClick={() => api.put(`/ai/planner/${activePlan.id}`, { isActive: !activePlan.isActive }).then(load)}>
                  <RotateCcw size={14} /> {activePlan.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
