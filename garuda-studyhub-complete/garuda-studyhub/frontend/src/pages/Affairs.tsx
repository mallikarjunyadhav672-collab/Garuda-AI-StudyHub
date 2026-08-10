import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, Search, TrendingUp } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Spinner } from '../components/ui';
import { formatDate, timeAgo } from '../lib/format';

interface Affair {
  id: number; title: string; summary: string; category?: string; date: string;
  tags: string[]; imageColor: string; source?: string; isFeatured: boolean;
}

export function AffairCard({ a }: { a: Affair }) {
  return (
    <Link to={`/affairs/${a.id}`} className="card group overflow-hidden hover:border-brand-300 hover:shadow-lg transition-all duration-200 flex flex-col h-full">
      <div className="h-3" style={{ background: a.imageColor || '#4f46e5' }} />
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          {a.isFeatured && <Badge tone="red"><TrendingUp size={12} /> Featured</Badge>}
          <Badge tone="slate">{a.category || 'General'}</Badge>
        </div>
        <h3 className="font-bold text-ink-900 leading-snug line-clamp-2 group-hover:text-brand-700 transition mb-2">{a.title}</h3>
        <p className="text-sm text-ink-500 line-clamp-2 mb-4 flex-1">{a.summary}</p>
        <div className="pt-4 border-t border-ink-100 flex items-center justify-between text-xs text-ink-400">
          <span>{formatDate(a.date)}</span>
          <span className="text-brand-600 font-bold group-hover:text-brand-700 transition">Read →</span>
        </div>
      </div>
    </Link>
  );
}

export default function Affairs() {
  const [affairs, setAffairs] = useState<Affair[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [period, setPeriod] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (search) qs.set('q', search);
      if (category) qs.set('category', category);
      if (period) qs.set('period', period);
      qs.set('limit', '24');
      const { data } = await api.get(`/affairs?${qs}`);
      setAffairs(data.data.affairs);
      setTotal(data.data.total);
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [category, period]);
  useEffect(() => {
    api.get('/affairs/categories').then(({ data }) => setCategories(data.data.categories)).catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Current Affairs"
        title="Stay Updated. Stay Ahead."
        description="Daily, weekly and monthly current affairs curated for exam relevance — SSC, Banking, Railways & State PSC."
      />

      {/* Search & Filter Card */}
      <div className="bg-white rounded-2xl border border-ink-200/50 p-6 mb-8 shadow-sm">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="label">Search updates</label>
              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <Input placeholder="Search by topic, keywords…" className="!pl-11" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Time period</label>
              <select className="input" value={period} onChange={(e) => setPeriod(e.target.value)}>
                <option value="">All time</option>
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-between">
            <select className="input flex-1 sm:flex-none" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
            <Button type="submit" variant="primary" className="!gap-2"><Search size={16} /> Search</Button>
            {(search || category || period) && (
              <Button type="button" variant="ghost" onClick={() => { setSearch(''); setCategory(''); setPeriod(''); load(); }}>
                Clear
              </Button>
            )}
          </div>
        </form>
      </div>

      {loading ? <Spinner /> : error ? <ErrorState message={error} retry={load} /> : affairs.length === 0 ? (
        <Card><EmptyState icon="📰" title="No news found" description="Try a different search or filter." /></Card>
      ) : (
        <>
          <p className="text-sm text-ink-500 mb-4">{total} updates</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {affairs.map((a) => <AffairCard key={a.id} a={a} />)}
          </div>
        </>
      )}
    </div>
  );
}
