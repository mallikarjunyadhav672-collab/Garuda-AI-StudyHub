import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Bookmark, Briefcase, Building2, Calendar, MapPin, Search, TrendingUp } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Badge, Button, Card, EmptyState, ErrorState, Input, LinkButton, PageHeader, Select, Spinner } from '../components/ui';
import { deadlineLabel, deadlineTone, formatDate } from '../lib/format';

interface Job {
  id: number; org: string; role: string; exam: string; posts: number; lastDate: string;
  qualification?: string; location?: string; salary?: string; category?: string; status: string;
  featured: boolean; trend: boolean; saved?: boolean; description?: string;
}

export function JobCard({ job, onToggleSave }: { job: Job; onToggleSave?: (j: Job) => void }) {
  const { user } = useAuth();
  const save = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      if (job.saved) await api.delete(`/jobs/${job.id}/save`);
      else await api.post(`/jobs/${job.id}/save`);
      onToggleSave?.(job);
    } catch { /* ignore */ }
  };

  return (
    <Link to={`/jobs/${job.id}`} className="card group hover:border-brand-300 hover:shadow-lg transition-all duration-200 flex flex-col h-full p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center font-extrabold text-sm shrink-0 shadow-md">
            {job.org.slice(0, 3).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-600">{job.org}</p>
            <h3 className="font-bold text-ink-900 leading-snug line-clamp-2 group-hover:text-brand-700 transition">{job.role}</h3>
          </div>
        </div>
        <button
          onClick={save}
          className={`p-2.5 rounded-lg transition shrink-0 ${job.saved ? 'bg-brand-100 text-brand-600' : 'bg-ink-100 text-ink-300 group-hover:bg-brand-100 group-hover:text-brand-500'}`}
          title={job.saved ? 'Remove from saved' : 'Save job'}
        >
          <Bookmark size={18} fill={job.saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {job.featured && <Badge tone="violet">★ Featured</Badge>}
        {job.trend && <Badge tone="blue"><TrendingUp size={11} /> Trending</Badge>}
        {job.category && <Badge tone="slate">{job.category}</Badge>}
        <Badge tone={deadlineTone(job.lastDate)}><Calendar size={11} /> {deadlineLabel(job.lastDate)}</Badge>
      </div>

      <div className="space-y-2 text-sm text-ink-500 flex-1 mb-4">
        {job.posts > 0 && <p className="flex items-center gap-2.5"><Briefcase size={15} className="text-ink-400 shrink-0" /> {job.posts.toLocaleString('en-IN')} posts</p>}
        {job.location && <p className="flex items-center gap-2.5"><MapPin size={15} className="text-ink-400 shrink-0" /> {job.location}</p>}
        {job.salary && <p className="flex items-center gap-2.5"><Building2 size={15} className="text-ink-400 shrink-0" /> {job.salary}</p>}
      </div>

      <div className="pt-4 border-t border-ink-100 flex items-center justify-between">
        <span className="text-xs text-ink-400">By {formatDate(job.lastDate)}</span>
        <span className="text-sm font-bold text-brand-600 group-hover:text-brand-700 transition">View →</span>
      </div>
    </Link>
  );
}

export default function Jobs({ saved = false }: { saved?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState(params.get('q') || '');
  const [category, setCategory] = useState(params.get('category') || '');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pageSize = 9;

  const isAuthenticated = !!user;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      if (saved) {
        const { data } = await api.get('/jobs/saved');
        setJobs(data.data.jobs);
        setTotal(data.data.jobs.length);
      } else {
        const qs = new URLSearchParams();
        if (search) qs.set('search', search);
        if (category) qs.set('category', category);
        qs.set('sort', sort);
        qs.set('page', String(page));
        qs.set('limit', String(pageSize));
        const { data } = await api.get(`/jobs?${qs}`);
        setJobs(data.data.jobs);
        setTotal(data.data.total);
      }
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [saved, category, sort, page]);
  useEffect(() => {
    api.get('/jobs/categories').then(({ data }) => setCategories(data.data.categories)).catch(() => {});
  }, []);

  const doSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <PageHeader
        eyebrow="Job Notifications"
        title={saved ? 'Saved Jobs' : 'Government Jobs'}
        description={saved ? 'Jobs you have bookmarked for later.' : 'Latest government job notifications with deadlines, eligibility and application tracking.'}
        actions={isAuthenticated && !saved ? (
          <>
            <LinkButton to="/jobs/saved" variant="secondary"><Bookmark size={16} /> Saved ({jobs.filter((j) => j.saved).length || ''})</LinkButton>
            <LinkButton to="/jobs/listing">All jobs</LinkButton>
          </>
        ) : undefined}
      />

      {/* Search & Filter Card */}
      <div className="bg-white rounded-2xl border border-ink-200/50 p-6 mb-8 shadow-sm">
        <form onSubmit={doSearch} className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="label">Search jobs</label>
              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <Input placeholder="Search by role, organization, exam…" className="!pl-11" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Category</label>
              <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
                <option value="">All categories</option>
                {categories.map((c) => <option key={c.id} value={c.slug}>{c.name} ({c.count})</option>)}
              </Select>
            </div>
          </div>
          <div className="flex gap-3 justify-between">
            <Select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="flex-1 sm:flex-none">
              <option value="newest">Newest first</option>
              <option value="deadline">Deadline soon</option>
            </Select>
            <Button type="submit" variant="primary" className="flex-1 sm:flex-none">
              <Search size={16} /> Search
            </Button>
            {(search || category) && (
              <Button type="button" variant="ghost" onClick={() => { setSearch(''); setCategory(''); setPage(1); }}>
                Clear
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Category chips */}
      {!saved && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => { setCategory(''); setPage(1); }} className={`chip cursor-pointer ${category === '' ? 'bg-brand-600 text-white' : 'bg-white border border-ink-200 text-ink-600 hover:border-brand-300'}`}>All</button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => { setCategory(c.slug); setPage(1); }} className={`chip cursor-pointer ${category === c.slug ? 'bg-brand-600 text-white' : 'bg-white border border-ink-200 text-ink-600 hover:border-brand-300'}`}>
              {c.name} <span className="opacity-60">({c.count})</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} retry={load} />
      ) : jobs.length === 0 ? (
        <Card>
          <EmptyState icon="💼" title="No jobs found" description="Try changing your search or category filters." action={<Button variant="secondary" onClick={() => { setSearch(''); setCategory(''); }}>Clear filters</Button>} />
        </Card>
      ) : (
        <>
          <p className="text-sm text-ink-500 mb-4">{total} job{total === 1 ? '' : 's'} found</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {jobs.map((j) => <JobCard key={j.id} job={j} onToggleSave={() => load()} />)}
          </div>
          {!saved && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</Button>
              <span className="text-sm text-ink-500 px-3">Page {page} of {totalPages}</span>
              <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
