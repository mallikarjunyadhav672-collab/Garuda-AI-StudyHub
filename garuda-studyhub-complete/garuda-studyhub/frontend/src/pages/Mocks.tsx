import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Clock, PlayCircle, Search, Timer, Trophy } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Spinner } from '../components/ui';
import { formatMinutes } from '../lib/format';

interface Mock {
  id: number; title: string; type: string; exam: string; totalQuestions: number; duration: number;
  totalMarks: number; negativeMarking: number; isLive: boolean; attempts: number; avgScore: number;
  difficulty: string; instructions?: string;
}

const diffTone: Record<string, string> = { Easy: 'green', Medium: 'amber', Hard: 'red' };

export function MockCard({ m }: { m: Mock }) {
  return (
    <Link to={`/mock/${m.id}/instructions`} className="card group hover:border-brand-300 hover:shadow-lg transition-all duration-200 flex flex-col h-full p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <Badge tone={m.type === 'Full length' ? 'violet' : m.type === 'Sectional' ? 'blue' : 'green'}>{m.type}</Badge>
        <Badge tone={diffTone[m.difficulty] || 'slate'}>{m.difficulty}</Badge>
      </div>
      <h3 className="font-bold text-ink-900 leading-snug line-clamp-2 group-hover:text-brand-700 transition mb-1">{m.title}</h3>
      <p className="text-xs font-semibold text-brand-600 mb-4 uppercase tracking-wider">{m.exam}</p>
      <div className="grid grid-cols-3 gap-3 mb-6 flex-1">
        <div className="rounded-xl bg-brand-50 p-3 text-center border border-brand-200/50"><p className="font-extrabold text-ink-900 text-base">{m.totalQuestions}</p><p className="text-[10px] text-ink-500 mt-1">Questions</p></div>
        <div className="rounded-xl bg-blue-50 p-3 text-center border border-blue-200/50"><p className="font-extrabold text-ink-900 text-base">{formatMinutes(m.duration)}</p><p className="text-[10px] text-ink-500 mt-1">Duration</p></div>
        <div className="rounded-xl bg-violet-50 p-3 text-center border border-violet-200/50"><p className="font-extrabold text-ink-900 text-base">{m.totalMarks}</p><p className="text-[10px] text-ink-500 mt-1">Marks</p></div>
      </div>
      <div className="pt-4 border-t border-ink-100 flex items-center justify-between text-xs text-ink-400 mb-4">
        <span>{m.attempts} attempts · avg {m.avgScore}/{m.totalMarks}</span>
        {m.isLive ? <Badge tone="red"><span className="animate-pulse">●</span> Live</Badge> : null}
      </div>
      <Button variant="primary" className="w-full justify-center !py-2.5 !gap-2"><PlayCircle size={17} /> Start Test</Button>
    </Link>
  );
}

export default function Mocks() {
  const [mocks, setMocks] = useState<Mock[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [type, setType] = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (type !== 'All') qs.set('type', type);
      if (difficulty !== 'All') qs.set('difficulty', difficulty);
      if (search) qs.set('search', search);
      const { data } = await api.get(`/mocks?${qs}`);
      setMocks(data.data.mocks);
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [type, difficulty]);
  useEffect(() => {
    api.get('/mocks/categories').then(({ data }) => setCategories(data.data.categories)).catch(() => {});
  }, []);

  const fullLength = mocks.filter((m) => m.type === 'Full length');
  const sectional = mocks.filter((m) => m.type === 'Sectional');

  return (
    <div>
      <PageHeader
        eyebrow="Mock Tests"
        title="Practice. Analyze. Improve."
        description="Exam-pattern mocks with auto-scoring, negative marking, solutions and All-India ranking."
        actions={
          <>
            <Link to="/mock/analytics" className="btn-secondary"><BarChart3 size={16} /> My Analytics</Link>
            <Link to="/mock/leaderboard" className="btn-secondary"><Trophy size={16} /> Leaderboard</Link>
          </>
        }
      />

      {/* Search & Filter Card */}
      <div className="bg-white rounded-2xl border border-ink-200/50 p-6 mb-8 shadow-sm">
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="label">Search tests</label>
              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <Input placeholder="Search by title, exam, topic…" className="!pl-11" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
              </div>
            </div>
            <div>
              <label className="label">Difficulty</label>
              <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="All">All levels</option>
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-between">
            <select className="input flex-1 sm:flex-none" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="All">All types</option>
              <option>Full length</option>
              <option>Sectional</option>
              <option>Topic</option>
            </select>
            <Button variant="primary" onClick={load} className="!gap-2"><Search size={16} /> Filter Tests</Button>
          </div>
        </div>
      </div>

      {loading ? <Spinner /> : error ? <ErrorState message={error} retry={load} /> : mocks.length === 0 ? (
        <Card><EmptyState icon="⏱️" title="No tests match" description="Try different filters." /></Card>
      ) : (
        <div className="space-y-8">
          {type === 'All' || type === 'Full length' ? (
            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-4 flex items-center gap-2"><Timer size={18} className="text-brand-600" /> Full-length tests</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {fullLength.map((m) => <MockCard key={m.id} m={m} />)}
              </div>
            </section>
          ) : null}
          {type === 'All' || type === 'Sectional' ? (
            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-brand-600" /> Sectional tests</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {sectional.map((m) => <MockCard key={m.id} m={m} />)}
              </div>
            </section>
          ) : null}
          <p className="text-xs text-ink-400 flex items-center gap-1.5"><Clock size={12} /> Negative marking applies as per test instructions.</p>
        </div>
      )}
    </div>
  );
}
