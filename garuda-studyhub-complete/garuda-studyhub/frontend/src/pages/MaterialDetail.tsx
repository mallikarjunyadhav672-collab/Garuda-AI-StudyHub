import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bookmark, CheckCircle2, Download, FileText, Star, Tag } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { Badge, Button, Card, ErrorState, LinkButton, Spinner } from '../components/ui';
import { formatBytes } from '../lib/format';

export default function MaterialDetail() {
  const { id } = useParams();
  const [m, setM] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloaded, setDownloaded] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/materials/${id}`);
      setM(data.data.material);
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const toggleBookmark = async () => {
    try {
      if (m.bookmarked) await api.delete(`/materials/${m.id}/bookmark`);
      else await api.post(`/materials/${m.id}/bookmark`);
      load();
    } catch { /* ignore */ }
  };

  const download = async () => {
    try {
      await api.get(`/materials/${m.id}/download`);
      setDownloaded(true);
    } catch { /* ignore */ }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} retry={load} />;

  return (
    <div className="max-w-4xl">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-brand-800 to-brand-600 px-6 py-8 text-white flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0"><FileText size={28} /></div>
          <div className="flex-1">
            <div className="flex flex-wrap gap-2">
              <Badge tone="slate">{m.category}</Badge>
              <Badge tone="blue">{m.exam}</Badge>
            </div>
            <h1 className="text-2xl font-extrabold mt-2">{m.title}</h1>
            <p className="text-brand-100 text-sm mt-1">{m.pages} pages · {formatBytes(m.fileSize)} · {m.fileType.toUpperCase()}</p>
          </div>
          <button onClick={toggleBookmark} className={`btn shrink-0 ${m.bookmarked ? 'bg-amber-400/20 text-amber-200 border border-amber-300/40' : 'border border-white/30 text-white hover:bg-white/10'}`}>
            <Bookmark size={16} fill={m.bookmarked ? 'currentColor' : 'none'} /> {m.bookmarked ? 'Saved' : 'Save'}
          </button>
        </div>
        <div className="p-6">
          <p className="text-ink-600 leading-relaxed">{m.description}</p>

          {m.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {m.tags.map((t: string) => (
                <span key={t} className="chip bg-ink-100 text-ink-600"><Tag size={11} /> {t}</span>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl bg-ink-50 border border-ink-200 p-4">
            <div className="flex items-center gap-1">
              <Star size={16} className="text-amber-400" fill="currentColor" />
              <span className="font-extrabold text-ink-900">{m.rating.toFixed(1)}</span>
              <span className="text-sm text-ink-400">({m.ratingCount} ratings)</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-ink-500"><Download size={15} /> {m.downloads.toLocaleString('en-IN')} downloads</div>
            <div className="flex-1" />
            <Button variant="success" onClick={download}>
              <Download size={16} /> {downloaded ? 'Downloaded ✓' : 'Download PDF'}
            </Button>
          </div>

          <div className="mt-6">
            <h3 className="font-bold text-ink-900 mb-3">What's inside</h3>
            <ul className="space-y-2">
              {['Complete topic coverage', 'Solved examples with explanations', 'Practice questions with answers', 'Exam-relevant shortcuts & tricks'].map((t) => (
                <li key={t} className="flex items-center gap-2.5 text-sm text-ink-600"><CheckCircle2 size={16} className="text-emerald-500" /> {t}</li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex gap-3">
            <LinkButton to="/materials" variant="secondary">← All materials</LinkButton>
            <LinkButton to="/mock">Practice with mocks</LinkButton>
          </div>
        </div>
      </Card>
    </div>
  );
}
