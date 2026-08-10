import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Briefcase, FileText, PlayCircle } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner } from '../components/ui';
import { deadlineLabel, deadlineTone, formatDuration } from '../lib/format';

type Tab = 'all' | 'jobs' | 'materials' | 'videos';

export default function Bookmarks() {
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/users/me/bookmarks');
      setData(data.data);
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} retry={load} />;

  const showJobs = tab === 'all' || tab === 'jobs';
  const showMaterials = tab === 'all' || tab === 'materials';
  const showVideos = tab === 'all' || tab === 'videos';
  const empty = data.counts.total === 0;

  return (
    <div>
      <PageHeader
        eyebrow="Saved content"
        title="Your Bookmarks"
        description={`${data.counts.total} saved item${data.counts.total === 1 ? '' : 's'} — everything you bookmarked across the platform.`}
      />

      <div className="flex gap-2 mb-6">
        {([
          ['all', `All (${data.counts.total})`],
          ['jobs', `Jobs (${data.counts.jobs})`],
          ['materials', `Materials (${data.counts.materials})`],
          ['videos', `Videos (${data.counts.videos})`],
        ] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className={`chip !px-4 !py-2 cursor-pointer text-sm ${tab === t ? 'bg-brand-600 text-white' : 'bg-white border border-ink-200 text-ink-600 hover:border-brand-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {empty ? (
        <Card><EmptyState icon="🔖" title="No bookmarks yet" description="Save jobs, materials and videos to find them here instantly." action={<Link to="/jobs" className="btn-primary">Browse jobs</Link>} /></Card>
      ) : (
        <div className="space-y-8">
          {showJobs && data.jobs.length > 0 && (
            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-4 flex items-center gap-2"><Briefcase size={18} className="text-brand-600" /> Saved jobs</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {data.jobs.map((j: any) => (
                  <Link key={j.id} to={`/jobs/${j.id}`} className="card p-4 hover:border-brand-300 hover:shadow-md transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase text-brand-600">{j.org}</p>
                        <p className="font-bold text-ink-900 truncate mt-0.5">{j.role}</p>
                      </div>
                      <Badge tone={deadlineTone(j.last_date)}>{deadlineLabel(j.last_date)}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {showMaterials && data.materials.length > 0 && (
            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-4 flex items-center gap-2"><FileText size={18} className="text-brand-600" /> Saved materials</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {data.materials.map((m: any) => (
                  <Link key={m.id} to={`/materials/${m.id}`} className="card p-4 hover:border-brand-300 hover:shadow-md transition">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-brand-50 text-brand-600 p-2.5 shrink-0"><FileText size={18} /></div>
                      <div className="min-w-0">
                        <p className="font-bold text-ink-900 truncate">{m.title}</p>
                        <p className="text-xs text-ink-400">{m.exam}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {showVideos && data.videos.length > 0 && (
            <section>
              <h2 className="text-lg font-extrabold text-ink-900 mb-4 flex items-center gap-2"><PlayCircle size={18} className="text-brand-600" /> Saved videos</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {data.videos.map((v: any) => (
                  <Link key={v.id} to={`/videos/${v.id}`} className="card p-4 hover:border-brand-300 hover:shadow-md transition">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-16 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: v.thumbnail_color || '#4f46e5' }}>
                        <PlayCircle size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-ink-900 truncate">{v.title}</p>
                        <p className="text-xs text-ink-400">{v.educator} · {formatDuration(v.duration)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
