import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, BookmarkCheck, Clock, PlayCircle, Search, TrendingUp, Users } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Spinner, StatCard } from '../components/ui';
import { formatDuration } from '../lib/format';

interface Video {
  id: number; title: string; description: string; category?: string; playlist?: string;
  thumbnailColor: string; duration: number; educator: string; exam: string;
  views: number; likes: number; saved?: boolean; progressSeconds?: number;
}

export function VideoCard({ v, onToggle, showProgress = false }: { v: Video; onToggle?: () => void; showProgress?: boolean }) {
  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      if (v.saved) await api.delete(`/videos/${v.id}/save`);
      else await api.post(`/videos/${v.id}/save`);
      onToggle?.();
    } catch { /* ignore */ }
  };

  const pct = v.duration ? Math.min(100, ((v.progressSeconds || 0) / v.duration) * 100) : 0;

  return (
    <Link to={`/videos/${v.id}`} className="card group overflow-hidden hover:border-brand-300 hover:shadow-lg transition-all duration-200 flex flex-col h-full">
      <div className="relative aspect-video flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${v.thumbnailColor || '#4f46e5'}, ${v.thumbnailColor || '#4f46e5'}88)` }}>
        <PlayCircle size={48} className="opacity-85 group-hover:scale-110 transition-transform" />
        <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-1 text-[11px] font-bold">{formatDuration(v.duration)}</span>
        {showProgress && pct > 0 && (
          <>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
              <div className="h-full bg-emerald-400" style={{ width: `${pct}%` }} />
            </div>
            <span className="absolute top-2 right-2 chip bg-black/70 text-emerald-300 !text-[10px]">{Math.round(pct)}% watched</span>
          </>
        )}
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5 mb-2">
              <Badge tone="violet">{v.category || 'Lecture'}</Badge>
              {v.exam && <Badge tone="slate">{v.exam}</Badge>}
            </div>
            <h3 className="font-bold text-ink-900 leading-snug line-clamp-2 group-hover:text-brand-700 transition">{v.title}</h3>
          </div>
          <button onClick={toggle} className={`p-2 rounded-lg shrink-0 transition ${v.saved ? 'bg-brand-100 text-brand-600' : 'bg-ink-100 text-ink-300 group-hover:bg-brand-100 group-hover:text-brand-500'}`}>
            {v.saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
          </button>
        </div>
        <p className="text-sm text-ink-500 line-clamp-2 mb-4 flex-1">{v.description}</p>
        <div className="pt-3 border-t border-ink-100 flex items-center justify-between text-xs text-ink-400">
          <span className="font-semibold text-ink-600">{v.educator}</span>
          <span>{v.views.toLocaleString('en-IN')} views</span>
        </div>
      </div>
    </Link>
  );
}

export default function Videos({ saved = false }: { saved?: boolean }) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      if (saved) {
        const { data } = await api.get('/videos/saved');
        setVideos(data.data.videos);
      } else {
        const qs = new URLSearchParams();
        if (search) qs.set('search', search);
        if (category) qs.set('category', category);
        qs.set('sort', sort);
        const { data } = await api.get(`/videos?${qs}`);
        setVideos(data.data.videos);
      }
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [saved, category, sort]);
  useEffect(() => {
    api.get('/videos/categories').then(({ data }) => setCategories(data.data.categories)).catch(() => {});
    api.get('/videos/playlists').then(({ data }) => setPlaylists(data.data.playlists)).catch(() => {});
  }, []);

  const continueWatching = videos.filter((v) => (v.progressSeconds || 0) > 0 && (v.progressSeconds || 0) < (v.duration || 1) * 0.95);
  const totalViews = videos.reduce((a, v) => a + v.views, 0);
  const totalHours = videos.reduce((a, v) => a + v.duration, 0) / 3600;

  return (
    <div>
      <PageHeader
        eyebrow="Video Lectures"
        title={saved ? 'Saved Videos' : 'Video Lectures Dashboard'}
        description={saved ? 'Videos you have saved to watch later.' : 'Concept lectures, current affairs analysis and mock discussions by expert educators.'}
        actions={
          <Link to={saved ? '/videos' : '/videos/saved'} className={saved ? 'btn-primary' : 'btn-secondary'}>
            {saved ? 'All videos' : 'Saved videos'}
          </Link>
        }
      />

      {!saved && (
        <>
          {/* Stats strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard label="Videos available" value={videos.length} sub="In the library" icon={<PlayCircle size={20} />} tone="brand" />
            <StatCard label="Total views" value={totalViews.toLocaleString('en-IN')} sub="Across all lectures" icon={<TrendingUp size={20} />} tone="violet" />
            <StatCard label="Learning content" value={`${totalHours.toFixed(1)}h`} sub="Of video lessons" icon={<Clock size={20} />} tone="green" />
            <StatCard label="Educators" value={new Set(videos.map((v) => v.educator)).size} sub="Expert faculty" icon={<Users size={20} />} tone="amber" />
          </div>

          {/* Continue watching */}
          {continueWatching.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-extrabold text-ink-900 mb-4 flex items-center gap-2">
                <PlayCircle size={18} className="text-emerald-600" /> Continue watching
                <span className="chip bg-emerald-50 text-emerald-700 border border-emerald-200">{continueWatching.length}</span>
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {continueWatching.map((v) => <VideoCard key={v.id} v={v} onToggle={() => load()} showProgress />)}
              </div>
            </div>
          )}

          {/* Category quick filters */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              <button onClick={() => { setCategory(''); load(); }} className={`chip cursor-pointer !px-4 !py-1.5 ${category === '' ? 'bg-brand-600 text-white' : 'bg-white border border-ink-200 text-ink-600 hover:border-brand-300'}`}>All</button>
              {categories.map((c) => (
                <button key={c.id} onClick={() => { setCategory(c.slug); load(); }} className={`chip cursor-pointer !px-4 !py-1.5 ${category === c.slug ? 'bg-brand-600 text-white' : 'bg-white border border-ink-200 text-ink-600 hover:border-brand-300'}`}>
                  {c.name} <span className="opacity-60">({c.count})</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Search & Filter Card */}
      <div className="bg-white rounded-2xl border border-ink-200/50 p-6 mb-8 shadow-sm">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="label">Search lectures</label>
              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <Input placeholder="By topic, educator, exam…" className="!pl-11" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Sort by</label>
              <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="newest">Newest first</option>
                <option value="popular">Most viewed</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-between">
            <select className="input flex-1 sm:flex-none" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
            <Button type="submit" variant="primary" className="!gap-2"><Search size={16} /> Search</Button>
            {search && (
              <Button type="button" variant="ghost" onClick={() => { setSearch(''); load(); }}>
                Clear
              </Button>
            )}
          </div>
        </form>
      </div>

      {loading ? <Spinner /> : error ? <ErrorState message={error} retry={load} /> : videos.length === 0 ? (
        <Card><EmptyState icon="🎬" title="No videos found" description="Try different filters." /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {videos.map((v) => <VideoCard key={v.id} v={v} onToggle={() => load()} showProgress />)}
        </div>
      )}
    </div>
  );
}
