import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Compass, GraduationCap, Sparkles, Target, TrendingUp } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Alert, Badge, Button, Card, ErrorState, Field, Input, PageHeader, Select, Spinner } from '../components/ui';

const interests = ['government', 'banking', 'civil services', 'railways', 'teaching', 'police', 'engineering', 'finance', 'defence'];

export default function Career() {
  const { user } = useAuth();
  const [form, setForm] = useState({ qualification: '', interest: [] as string[], weeklyHours: '8', location: 'All India' });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.examTarget) setForm((f) => ({ ...f, qualification: user.examTarget || '' }));
  }, [user]);

  const toggleInterest = (i: string) =>
    setForm((f) => ({ ...f, interest: f.interest.includes(i) ? f.interest.filter((x) => x !== i) : [...f.interest, i] }));

  const assess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/ai/career/assess', {
        qualification: form.qualification,
        interest: form.interest,
        weeklyHours: Number(form.weeklyHours),
        location: form.location,
      });
      setResult(data.data.assessment);
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow="AI Career Guidance"
        title="Find Your Best-Fit Exam"
        description="Answer a few questions and Garuda AI will match you with the exams where you have the best chance of selection."
      />

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-ink-900 mb-4 flex items-center gap-2"><Compass size={17} className="text-brand-600" /> Your profile</h3>
          <form onSubmit={assess} className="space-y-4">
            <Field label="Highest qualification">
              <Input required placeholder="e.g. Bachelor of Commerce, 12th pass, B.Tech…" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} />
            </Field>
            <Field label="Where do you live? (state services advantage)">
              <Select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>
                <option>All India</option>
                <option>Telangana</option>
                <option>Andhra Pradesh</option>
                <option>Other</option>
              </Select>
            </Field>
            <Field label="Study hours per week">
              <Input type="number" min={1} max={80} required value={form.weeklyHours} onChange={(e) => setForm({ ...form, weeklyHours: e.target.value })} />
            </Field>
            <div>
              <label className="label">Your interests (select all that apply)</label>
              <div className="flex flex-wrap gap-2">
                {interests.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleInterest(i)}
                    className={`chip !px-3.5 !py-1.5 cursor-pointer capitalize transition ${form.interest.includes(i) ? 'bg-brand-600 text-white' : 'bg-white border border-ink-200 text-ink-600 hover:border-brand-300'}`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              <Sparkles size={16} /> Get My Recommendations
            </Button>
          </form>
        </Card>

        <div>
          {loading ? (
            <Spinner label="Matching you with exams…" />
          ) : !result ? (
            <Card className="p-8 text-center h-full flex flex-col items-center justify-center">
              <div className="text-5xl mb-3">🧭</div>
              <h3 className="text-lg font-extrabold text-ink-900">Your roadmap awaits</h3>
              <p className="text-sm text-ink-500 mt-1 max-w-xs">
                Fill the form and Garuda AI will recommend the top 3 exams matched to your qualification, location and interests.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {result.topMatches.map((m: any, i: number) => (
                <Card key={m.exam} className="p-5 relative overflow-hidden">
                  {i === 0 && <div className="absolute top-0 right-0 rounded-bl-2xl bg-amber-400 text-ink-900 text-[11px] font-extrabold px-3 py-1">BEST MATCH</div>}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-extrabold text-ink-900 flex items-center gap-2">
                        {i === 0 ? <Target size={17} className="text-brand-600" /> : <GraduationCap size={17} className="text-ink-400" />}
                        {m.exam}
                      </p>
                      <p className="text-sm text-ink-500 mt-1.5 leading-relaxed">{m.reason}</p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {m.tags.map((t: string) => <Badge key={t} tone="slate">{t}</Badge>)}
                      </div>
                    </div>
                    <div className="text-center shrink-0">
                      <p className="text-2xl font-extrabold text-brand-600">{m.score}</p>
                      <p className="text-[10px] text-ink-400">match %</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 bg-ink-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-brand-600 to-emerald-400" style={{ width: `${m.score}%` }} />
                  </div>
                  <Link to={m.route} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-700">
                    Start preparing <TrendingUp size={14} />
                  </Link>
                </Card>
              ))}

              <Card className="p-5 bg-gradient-to-r from-brand-800 to-brand-600 !border-0">
                <h4 className="font-bold text-white flex items-center gap-2"><Briefcase size={16} /> Your next steps</h4>
                <ul className="mt-3 space-y-2">
                  {result.nextSteps.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-brand-50"><span className="text-amber-300 font-bold shrink-0">{i + 1}.</span>{s}</li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
