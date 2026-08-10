import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, BookOpen, Download, FileText, Search, Star } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Select, Spinner } from '../components/ui';
import { formatBytes } from '../lib/format';

interface Material {
  id: number; title: string; description: string; category?: string; exam: string; pages: number;
  fileType: string; fileSize: number; downloads: number; rating: number; ratingCount: number;
  tags: string[]; bookmarked?: boolean;
}

export function MaterialCard({ m, onToggle }: { m: Material; onToggle?: () => void }) {
  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      if (m.bookmarked) await api.delete(`/materials/${m.id}/bookmark`);
      else await api.post(`/materials/${m.id}/bookmark`);
      onToggle?.();
    } catch { /* ignore */ }
  };

  const color = (m.category || '').toLowerCase().includes('quant') ? '#4f46e5'
    : (m.category || '').toLowerCase().includes('reason') ? '#7c3aed'
    : (m.category || '').toLowerCase().includes('english') ? '#0891b2'
    : (m.category || '').toLowerCase().includes('awareness') ? '#059669' : '#d97706';

  return (
    <Link to={`/materials/${m.id}`} className="card group hover:border-brand-300 hover:shadow-lg transition-all duration-200 flex flex-col h-full p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="h-14 w-14 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md" style={{ background: color }}>
          <FileText size={24} />
        </div>
        <button onClick={toggle} className={`p-2 rounded-lg shrink-0 transition-all ${m.bookmarked ? 'bg-brand-100 text-brand-600' : 'bg-ink-100 text-ink-300 group-hover:bg-brand-100 group-hover:text-brand-500'}`}>
          <Bookmark size={18} fill={m.bookmarked ? 'currentColor' : 'none'} />
        </button>
      </div>
      <h3 className="font-bold text-ink-900 leading-snug line-clamp-2 mb-2 group-hover:text-brand-600 transition">{m.title}</h3>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <Badge tone="slate">{m.category || 'General'}</Badge>
        <Badge tone="blue">{m.exam}</Badge>
        <Badge tone="violet">PDF</Badge>
      </div>
      <p className="text-sm text-ink-500 line-clamp-2 mb-4 flex-1">{m.description}</p>
      <div className="pt-4 border-t border-ink-100 flex items-center justify-between text-xs text-ink-400">
        <span className="flex items-center gap-1"><Download size={13} /> {m.downloads.toLocaleString('en-IN')}</span>
        <span className="flex items-center gap-1"><Star size={13} className="text-amber-400 fill-amber-400" /> {m.rating.toFixed(1)}</span>
        <span className="text-right">{m.pages}p · {formatBytes(m.fileSize)}</span>
      </div>
    </Link>
  );
}

export default function Materials({ bookmarks = false }: { bookmarks?: boolean }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('popular');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      if (bookmarks) {
        const { data } = await api.get('/materials/bookmarks');
        setMaterials(data.data.materials);
        setTotal(data.data.materials.length);
      } else {
        const qs = new URLSearchParams();
        if (search) qs.set('search', search);
        if (category) qs.set('category', category);
        qs.set('sort', sort);
        qs.set('limit', '24');
        const { data } = await api.get(`/materials?${qs}`);
        setMaterials(data.data.materials);
        setTotal(data.data.total);
      }
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [bookmarks, category, sort]);
  useEffect(() => {
    api.get('/materials/categories').then(({ data }) => setCategories(data.data.categories)).catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Study Materials"
        title={bookmarks ? 'Your Bookmarks' : 'Study Materials'}
        description={bookmarks ? 'Your saved notes and guides for quick access.' : 'Curated study notes, handbooks, and PDFs organized by subject and exam.'}
        actions={
          <div className="flex flex-wrap gap-2 items-center">
            <button onClick={() => setSort(sort === 'popular' ? 'latest' : 'popular')} className="btn-secondary !gap-1.5 text-sm">
              {sort === 'popular' ? '🔥 Popular' : '🕒 Latest'}
            </button>
            <Link to={bookmarks ? '/materials' : '/materials/bookmarks'} className={`text-sm ${bookmarks ? 'btn-primary' : 'btn-secondary'}`}>
              <Bookmark size={16} /> {bookmarks ? 'All materials' : 'Bookmarks'}
            </Link>
          </div>
        }
      />

      <div className="bg-white rounded-2xl border border-ink-200/50 p-6 mb-8 shadow-sm">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="label">Search materials</label>
              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <Input placeholder="Search by title, topic, or keywords…" className="!pl-11" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Filter by subject</label>
              <Select value={category} onChange={(e) => { setCategory(e.target.value); }}>
                <option value="">All subjects</option>
                {categories.map((c) => <option key={c.id} value={c.slug}>{c.name} ({c.count})</option>)}
              </Select>
            </div>
          </div>
          <div className="flex gap-3 justify-between">
            <Button type="submit" variant="primary" className="flex-1 sm:flex-none">
              <Search size={16} /> Search Materials
            </Button>
            {(search || category || sort !== 'popular') && (
              <Button type="button" variant="ghost" onClick={() => { setSearch(''); setCategory(''); setSort('popular'); load(); }}>
                Clear filters
              </Button>
            )}
          </div>
        </form>
      </div>

      {loading ? <Spinner label="Loading materials…" /> : error ? <ErrorState message={error} retry={load} /> : materials.length === 0 ? (
        <Card><EmptyState icon="📚" title="No materials found" description="Try adjusting your filters or search terms. Check back soon for more content." /></Card>
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm font-medium text-ink-600">
              <span className="text-brand-600 font-bold">{materials.length}</span> of <span className="font-bold">{total}</span> material{total === 1 ? '' : 's'}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {materials.map((m) => <MaterialCard key={m.id} m={m} onToggle={() => load()} />)}
          </div>
        </>
      )}
    </div>
  );
}
